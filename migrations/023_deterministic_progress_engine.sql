-- ============================================================
-- Migration 023: Deterministic Progress Computation Engine
--
-- Replaces trigger-based mutable progress with query-based
-- deterministic computation. Zero side effects on status change.
--
-- toolkit_reports is the single source of truth.
-- status only controls inclusion in computation.
-- Progress is computed on read, never stored via triggers.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART 1: DEDUPLICATION CONSTRAINT
-- ════════════════════════════════════════════════════════════

-- Only one approved report per (tool, target, period, submitter).
-- Pending/rejected reports are unconstrained.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_approved_per_slot
  ON public.toolkit_reports (tool_id, nbsap_target_id, period, submitted_by)
  WHERE status = 'approved' AND nbsap_target_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- PART 1.5: PERFORMANCE INDEX
-- ════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_reports_target_status_approved
  ON public.toolkit_reports (nbsap_target_id, status)
  WHERE nbsap_target_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- PART 2: CORE COMPUTATION FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- ── 2a. Target progress ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_target_progress(p_target_id INTEGER)
RETURNS INTEGER
LANGUAGE sql STABLE
AS $fn$
  SELECT LEAST(100, GREATEST(0, COALESCE(
    SUM(CEIL(20 * tw.weight))::INTEGER,
    0
  )))
  FROM public.toolkit_reports tr
  JOIN public.tool_weights tw
    ON tw.tool_id = tr.tool_id::TEXT
   AND tw.active = true
  WHERE tr.nbsap_target_id = p_target_id
    AND tr.status = 'approved';
$fn$;

-- ── 2b. Indicator progress ──────────────────────────────────
-- Blends target progress (70%) with approval rate (30%).
-- Inlines target progress logic to avoid hierarchical coupling.
CREATE OR REPLACE FUNCTION public.compute_indicator_progress(p_indicator_id INTEGER)
RETURNS INTEGER
LANGUAGE sql STABLE
AS $fn$
  SELECT GREATEST(0, LEAST(100, COALESCE(
    (
      -- 70%: target progress (inlined, not delegated)
      (SELECT LEAST(100, GREATEST(0, COALESCE(
          SUM(CEIL(20 * tw.weight))::INTEGER, 0
        )))
        FROM public.toolkit_reports tr
        JOIN public.tool_weights tw
          ON tw.tool_id = tr.tool_id::TEXT AND tw.active = true
        WHERE tr.nbsap_target_id = i.nbsap_target_id
          AND tr.status = 'approved'
      ) * 0.7

      +

      -- 30%: approval rate of linked reports
      CASE
        WHEN (SELECT COUNT(*) FROM public.toolkit_reports tr2
              WHERE tr2.nbsap_target_id = i.nbsap_target_id) = 0
        THEN 0
        ELSE (
          (SELECT COUNT(*) FROM public.toolkit_reports tr3
           WHERE tr3.nbsap_target_id = i.nbsap_target_id
             AND tr3.status = 'approved')::NUMERIC
          * 100.0
          / (SELECT COUNT(*) FROM public.toolkit_reports tr4
             WHERE tr4.nbsap_target_id = i.nbsap_target_id)
        ) * 0.3
      END
    )::INTEGER,
    0
  )))
  FROM public.indicators i
  WHERE i.id = p_indicator_id;
$fn$;

-- ── 2c. Status from progress (pure, immutable) ──────────────
CREATE OR REPLACE FUNCTION public.compute_indicator_status(p_progress INTEGER)
RETURNS indicator_status
LANGUAGE sql IMMUTABLE
AS $fn$
  SELECT CASE
    WHEN p_progress >= 70 THEN 'on-track'::indicator_status
    WHEN p_progress >= 40 THEN 'at-risk'::indicator_status
    ELSE 'behind'::indicator_status
  END;
$fn$;

-- ── 2d. System metrics (computed from approved reports) ──────
CREATE OR REPLACE FUNCTION public.compute_system_metrics()
RETURNS TABLE (
  metric_type TEXT,
  metric_value NUMERIC
)
LANGUAGE sql STABLE
AS $fn$
  SELECT 'forest_ha_total'::TEXT,
    COALESCE(SUM(
      CASE
        WHEN tr.tool_id = 'T02' THEN COALESCE((tr.form_data->>'forest_ha')::NUMERIC, 0)
        WHEN tr.tool_id = 'T03' THEN
          COALESCE((tr.form_data->>'coverage_change_ha')::NUMERIC, 0) +
          COALESCE((tr.form_data->>'restoration_ha')::NUMERIC, 0)
        ELSE 0
      END
    ), 0)
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id IN ('T02', 'T03')

  UNION ALL

  SELECT 'wetland_ha_total',
    COALESCE(SUM(COALESCE((tr.form_data->>'wetland_ha')::NUMERIC, 0)), 0)
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T02'

  UNION ALL

  SELECT 'finance_rwf_allocated',
    COALESCE(SUM(COALESCE((tr.form_data->>'budget_allocated')::NUMERIC, 0)), 0)
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T05'

  UNION ALL

  SELECT 'finance_rwf_disbursed',
    COALESCE(SUM(COALESCE((tr.form_data->>'budget_disbursed')::NUMERIC, 0)), 0)
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T05'

  UNION ALL

  SELECT 'finance_rwf_utilized',
    COALESCE(SUM(COALESCE((tr.form_data->>'budget_utilized')::NUMERIC, 0)), 0)
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T01'

  UNION ALL

  SELECT 'hwc_incidents_total',
    COALESCE(SUM(
      CASE
        WHEN tr.tool_id = 'T04' THEN COALESCE((tr.form_data->>'hwc_incidents')::NUMERIC, 0)
        WHEN tr.tool_id = 'T03' THEN COALESCE((tr.form_data->>'illegal_cases')::NUMERIC, 0)
        ELSE 0
      END
    ), 0)
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id IN ('T03', 'T04')

  UNION ALL

  SELECT 'eia_compliance_full',
    COUNT(*)::NUMERIC
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T06'
    AND tr.form_data->>'eia_compliance' = 'Full compliance'

  UNION ALL

  SELECT 'eia_compliance_partial',
    COUNT(*)::NUMERIC
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T06'
    AND tr.form_data->>'eia_compliance' = 'Partial compliance'

  UNION ALL

  SELECT 'eia_compliance_non',
    COUNT(*)::NUMERIC
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T06'
    AND tr.form_data->>'eia_compliance' = 'Non-compliant'

  UNION ALL

  SELECT 'districts_reporting',
    COUNT(DISTINCT tr.form_data->>'district')::NUMERIC
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T02'
    AND tr.form_data->>'district' IS NOT NULL
    AND tr.form_data->>'district' != ''

  UNION ALL

  SELECT 'companies_reporting',
    COUNT(DISTINCT tr.form_data->>'company')::NUMERIC
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T06'
    AND tr.form_data->>'company' IS NOT NULL
    AND tr.form_data->>'company' != ''

  UNION ALL

  SELECT 'protected_areas_monitored',
    COUNT(DISTINCT tr.form_data->>'area_name')::NUMERIC
  FROM public.toolkit_reports tr
  WHERE tr.status = 'approved' AND tr.tool_id = 'T03'
    AND tr.form_data->>'area_name' IS NOT NULL
    AND tr.form_data->>'area_name' != '';
$fn$;


-- ════════════════════════════════════════════════════════════
-- PART 3: READ VIEWS
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_target_progress AS
  SELECT
    t.id,
    t.goal,
    t.title,
    t.description,
    t.responsible_stakeholders,
    public.compute_target_progress(t.id) AS progress,
    (SELECT COUNT(*) FROM public.toolkit_reports tr
     WHERE tr.nbsap_target_id = t.id AND tr.status = 'approved')
      AS approved_report_count,
    (SELECT COUNT(*) FROM public.toolkit_reports tr
     WHERE tr.nbsap_target_id = t.id AND tr.status = 'pending')
      AS pending_report_count
  FROM public.nbsap_targets t;

CREATE OR REPLACE VIEW public.v_indicator_progress AS
  SELECT
    i.id,
    i.name,
    i.definition,
    i.tier,
    i.nbsap_target_id,
    i.target_2030,
    i.baseline,
    i.current_value,
    i.km_gbf,
    i.periodicity,
    i.data_source,
    i.responsible,
    public.compute_indicator_progress(i.id) AS progress,
    public.compute_indicator_status(
      public.compute_indicator_progress(i.id)
    ) AS status
  FROM public.indicators i;

CREATE OR REPLACE VIEW public.v_system_metrics AS
  SELECT * FROM public.compute_system_metrics();


-- ════════════════════════════════════════════════════════════
-- PART 4: OPTIONAL CACHE LAYER
-- Deploy only if view queries exceed 200ms under load.
-- For current scale (22 targets, 79 indicators), views are
-- fast enough. This section is safe to run but unused until
-- frontend is pointed at progress_cache instead of views.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.progress_cache (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('target', 'indicator')),
  entity_id   INTEGER NOT NULL,
  progress    INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
  status      TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_type, entity_id)
);

ALTER TABLE public.progress_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'progress_cache'
      AND policyname = 'Authenticated users can read progress cache'
  ) THEN
    CREATE POLICY "Authenticated users can read progress cache"
      ON public.progress_cache FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_progress_cache()
RETURNS void
LANGUAGE plpgsql
AS $fn$
BEGIN
  INSERT INTO public.progress_cache (entity_type, entity_id, progress, computed_at)
  SELECT 'target', t.id, public.compute_target_progress(t.id), NOW()
  FROM public.nbsap_targets t
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    progress = EXCLUDED.progress,
    computed_at = EXCLUDED.computed_at;

  INSERT INTO public.progress_cache (entity_type, entity_id, progress, status, computed_at)
  SELECT 'indicator', i.id,
    public.compute_indicator_progress(i.id),
    public.compute_indicator_status(public.compute_indicator_progress(i.id))::TEXT,
    NOW()
  FROM public.indicators i
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    progress = EXCLUDED.progress,
    status = EXCLUDED.status,
    computed_at = EXCLUDED.computed_at;
END;
$fn$;


-- ════════════════════════════════════════════════════════════
-- PART 5: GRANTS
-- ════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.compute_target_progress(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_indicator_progress(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_indicator_status(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_system_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_progress_cache() TO authenticated;
GRANT SELECT ON public.v_target_progress TO authenticated;
GRANT SELECT ON public.v_indicator_progress TO authenticated;
GRANT SELECT ON public.v_system_metrics TO authenticated;
GRANT SELECT ON public.progress_cache TO authenticated;


-- ════════════════════════════════════════════════════════════
-- PART 6: DROP MUTATION TRIGGERS
-- ════════════════════════════════════════════════════════════
-- DO NOT RUN until frontend is switched to views (Phase 3).
-- Uncomment after validation confirms computed values match.
--
-- DROP TRIGGER IF EXISTS trigger_update_target_progress ON public.toolkit_reports;
-- DROP TRIGGER IF EXISTS trigger_reverse_progress_on_delete ON public.toolkit_reports;
-- DROP TRIGGER IF EXISTS trigger_update_system_metrics ON public.toolkit_reports;
-- DROP TRIGGER IF EXISTS trigger_reverse_metrics_on_delete ON public.toolkit_reports;
--
-- DROP FUNCTION IF EXISTS public.update_target_progress_from_reports();
-- DROP FUNCTION IF EXISTS public.reverse_progress_on_report_delete();
-- DROP FUNCTION IF EXISTS public.reverse_system_metrics_on_delete();
-- DROP FUNCTION IF EXISTS public.calculate_indicator_progress(INTEGER, INTEGER);
