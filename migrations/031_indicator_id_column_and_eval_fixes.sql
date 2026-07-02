-- ============================================================
-- Migration 031: indicator_id column + evaluation layer fixes
-- ============================================================
-- Phase 3 of the report data model cleanup.
--
-- Problems fixed:
--
--   1. toolkit_reports had no typed indicator_id column.
--      The indicator was buried in form_data->>'indicator'
--      (a string inside a JSONB blob), making it impossible
--      to index, join, or enforce referential integrity.
--
--   2. v_eval_latest_value (migration 030) had two bugs:
--        • Read form_data->>'related_indicator' — wrong key;
--          the form stores the indicator under key 'indicator'.
--        • Read form_data->>'current_value' — wrong key;
--          the form stores the submitted value under 'current_status'
--          (renamed to 'reported_value' in new submissions after
--          the Phase 3 frontend change).
--
-- Changes:
--   • Add indicator_id INTEGER column to toolkit_reports
--   • Backfill from form_data->>'indicator' for existing rows
--   • Add FK to indicators table and a covering index
--   • Recreate all five evaluation views using the new column
--     and the correct form_data field names
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART 1: indicator_id COLUMN
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.toolkit_reports
  ADD COLUMN IF NOT EXISTS indicator_id INTEGER
    REFERENCES public.indicators(id) ON DELETE SET NULL;

-- Backfill existing rows from form_data->>'indicator'
UPDATE public.toolkit_reports r
SET indicator_id = (r.form_data->>'indicator')::INTEGER
WHERE r.indicator_id IS NULL
  AND r.form_data->>'indicator' IS NOT NULL
  AND r.form_data->>'indicator' ~ '^\d+$'
  AND EXISTS (
    SELECT 1 FROM public.indicators i
    WHERE i.id = (r.form_data->>'indicator')::INTEGER
  );

CREATE INDEX IF NOT EXISTS idx_reports_indicator_id
  ON public.toolkit_reports (indicator_id)
  WHERE indicator_id IS NOT NULL;

-- Fast lookup: approved reports per indicator for the eval layer
CREATE INDEX IF NOT EXISTS idx_reports_approved_by_indicator
  ON public.toolkit_reports (indicator_id, nbsap_target_id, submitted_at DESC)
  WHERE status = 'approved'
    AND indicator_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- PART 2: RECREATE EVALUATION VIEWS
-- CASCADE drops v_eval_indicator_completion, v_eval_indicator_trend,
-- v_eval_performance_status, and v_eval_target_rollup automatically.
-- ════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.v_eval_latest_value CASCADE;

-- ── View 1: v_eval_latest_value ──────────────────────────────
-- Uses the new indicator_id column instead of casting form_data.
-- Reads submitted value from:
--   reported_value  (new submissions after Phase 3 frontend change)
--   current_status  (existing submissions before Phase 3)
CREATE VIEW public.v_eval_latest_value
  WITH (security_invoker = true)
AS
SELECT DISTINCT ON (r.nbsap_target_id, r.indicator_id, r.period)
  r.nbsap_target_id,
  r.indicator_id,
  r.period,
  COALESCE(
    r.form_data->>'reported_value',
    r.form_data->>'current_status'
  )                                           AS submitted_value,
  public.extract_first_numeric(
    COALESCE(
      r.form_data->>'reported_value',
      r.form_data->>'current_status'
    )
  )                                           AS numeric_value,
  r.submitted_at,
  r.submitted_by,
  r.institution,
  r.id                                        AS report_id,
  r.tool_id
FROM public.toolkit_reports r
WHERE r.status = 'approved'
  AND r.indicator_id IS NOT NULL
ORDER BY
  r.nbsap_target_id,
  r.indicator_id,
  r.period,
  r.submitted_at DESC;

GRANT SELECT ON public.v_eval_latest_value TO authenticated;


-- ── View 2: v_eval_indicator_completion (unchanged logic) ────
CREATE VIEW public.v_eval_indicator_completion
  WITH (security_invoker = true)
AS
SELECT
  i.id                                                          AS indicator_id,
  i.nbsap_target_id,
  i.name,
  i.tier,
  i.periodicity,
  i.km_gbf,
  i.baseline                                                    AS baseline_text,
  i.target_2030                                                 AS target_2030_text,
  public.extract_first_numeric(i.baseline)                      AS baseline_numeric,
  public.extract_first_numeric(i.target_2030)                   AS target_numeric,
  lv.submitted_value,
  lv.numeric_value                                              AS latest_numeric,
  lv.period                                                     AS latest_period,
  lv.submitted_at                                               AS latest_submitted_at,
  lv.institution                                                AS latest_institution,
  CASE
    WHEN lv.numeric_value IS NOT NULL
      AND public.extract_first_numeric(i.target_2030) IS NOT NULL
      AND public.extract_first_numeric(i.baseline)    IS NOT NULL
      AND public.extract_first_numeric(i.target_2030)
          <> public.extract_first_numeric(i.baseline)
    THEN LEAST(100, GREATEST(0,
      ROUND((
        (lv.numeric_value - public.extract_first_numeric(i.baseline))
        / (public.extract_first_numeric(i.target_2030)
           - public.extract_first_numeric(i.baseline))
        * 100
      ))::INTEGER
    ))
    ELSE i.progress
  END                                                           AS completion_pct,
  CASE
    WHEN lv.numeric_value IS NOT NULL
      AND public.extract_first_numeric(i.target_2030) IS NOT NULL
      AND public.extract_first_numeric(i.baseline)    IS NOT NULL
      AND public.extract_first_numeric(i.target_2030)
          <> public.extract_first_numeric(i.baseline)
    THEN 'computed'
    ELSE 'seeded'
  END                                                           AS completion_source
FROM public.indicators i
LEFT JOIN (
  SELECT DISTINCT ON (indicator_id)
    indicator_id, submitted_value, numeric_value,
    period, submitted_at, institution
  FROM public.v_eval_latest_value
  ORDER BY indicator_id, submitted_at DESC
) lv ON lv.indicator_id = i.id;

GRANT SELECT ON public.v_eval_indicator_completion TO authenticated;


-- ── View 3: v_eval_indicator_trend (unchanged logic) ─────────
CREATE VIEW public.v_eval_indicator_trend
  WITH (security_invoker = true)
AS
WITH ranked AS (
  SELECT
    indicator_id,
    period,
    numeric_value,
    submitted_at,
    ROW_NUMBER() OVER (
      PARTITION BY indicator_id
      ORDER BY submitted_at DESC
    ) AS rn
  FROM public.v_eval_latest_value
)
SELECT
  curr.indicator_id,
  curr.period                                         AS latest_period,
  curr.numeric_value                                  AS latest_value,
  prev.period                                         AS previous_period,
  prev.numeric_value                                  AS previous_value,
  CASE
    WHEN curr.numeric_value IS NULL
      OR prev.numeric_value IS NULL   THEN 'insufficient_data'
    WHEN curr.numeric_value
       > prev.numeric_value           THEN 'improving'
    WHEN curr.numeric_value
       < prev.numeric_value           THEN 'declining'
    ELSE                                   'stable'
  END                                                 AS trend_direction,
  CASE
    WHEN curr.numeric_value IS NOT NULL
      AND prev.numeric_value IS NOT NULL
      AND prev.numeric_value <> 0
    THEN ROUND(
      (curr.numeric_value - prev.numeric_value)
      / ABS(prev.numeric_value) * 100, 1
    )
    ELSE NULL
  END                                                 AS change_pct
FROM ranked curr
LEFT JOIN ranked prev
  ON prev.indicator_id = curr.indicator_id AND prev.rn = 2
WHERE curr.rn = 1;

GRANT SELECT ON public.v_eval_indicator_trend TO authenticated;


-- ── View 4: v_eval_performance_status (unchanged logic) ──────
CREATE VIEW public.v_eval_performance_status
  WITH (security_invoker = true)
AS
SELECT
  c.indicator_id,
  c.nbsap_target_id,
  c.name                                              AS indicator_name,
  c.tier,
  c.completion_pct,
  c.completion_source,
  c.baseline_text,
  c.target_2030_text,
  c.latest_period,
  c.latest_numeric,
  c.submitted_value,
  c.latest_submitted_at,
  c.latest_institution,
  COALESCE(t.trend_direction, 'insufficient_data')    AS trend_direction,
  t.change_pct,
  t.latest_value,
  t.previous_value,
  t.previous_period,
  CASE
    WHEN c.completion_pct >= 70  THEN 'on-track'
    WHEN c.completion_pct >= 40  THEN 'at-risk'
    ELSE                              'behind'
  END                                                 AS base_status,
  CASE
    WHEN c.completion_pct >= 70
      AND COALESCE(t.trend_direction, '') = 'declining'  THEN 'at-risk'
    WHEN c.completion_pct >= 40
      AND COALESCE(t.trend_direction, '') = 'declining'  THEN 'behind'
    WHEN c.completion_pct >= 70                          THEN 'on-track'
    WHEN c.completion_pct >= 40                          THEN 'at-risk'
    ELSE                                                      'behind'
  END                                                 AS performance_status
FROM public.v_eval_indicator_completion c
LEFT JOIN public.v_eval_indicator_trend t
  ON t.indicator_id = c.indicator_id;

GRANT SELECT ON public.v_eval_performance_status TO authenticated;


-- ── View 5: v_eval_target_rollup (unchanged logic) ───────────
CREATE VIEW public.v_eval_target_rollup
  WITH (security_invoker = true)
AS
SELECT
  t.id                                                          AS target_id,
  t.goal,
  t.title,
  t.description,
  t.responsible_stakeholders,
  COUNT(ps.indicator_id)                                        AS indicator_count,
  COUNT(ps.indicator_id) FILTER (
    WHERE ps.completion_source = 'computed'
  )                                                             AS indicators_with_submissions,
  ROUND(AVG(ps.completion_pct))                                 AS avg_completion_pct,
  MIN(ps.completion_pct)                                        AS min_completion_pct,
  MAX(ps.completion_pct)                                        AS max_completion_pct,
  COUNT(*) FILTER (WHERE ps.performance_status = 'on-track')   AS indicators_on_track,
  COUNT(*) FILTER (WHERE ps.performance_status = 'at-risk')    AS indicators_at_risk,
  COUNT(*) FILTER (WHERE ps.performance_status = 'behind')     AS indicators_behind,
  COUNT(*) FILTER (WHERE ps.trend_direction = 'improving')     AS indicators_improving,
  COUNT(*) FILTER (WHERE ps.trend_direction = 'declining')     AS indicators_declining,
  COUNT(*) FILTER (WHERE ps.trend_direction = 'stable')        AS indicators_stable,
  (SELECT COUNT(*) FROM public.toolkit_reports tr
   WHERE tr.nbsap_target_id = t.id
     AND tr.status = 'approved')                               AS approved_reports,
  (SELECT COUNT(*) FROM public.toolkit_reports tr
   WHERE tr.nbsap_target_id = t.id
     AND tr.status = 'pending')                               AS pending_reports,
  CASE
    WHEN COUNT(ps.indicator_id) = 0
      THEN 'no-data'
    WHEN COUNT(*) FILTER (WHERE ps.performance_status = 'on-track')
         > COUNT(ps.indicator_id) / 2
      THEN 'on-track'
    WHEN COUNT(*) FILTER (WHERE ps.performance_status = 'behind')
         > COUNT(ps.indicator_id) / 2
      THEN 'behind'
    ELSE 'at-risk'
  END                                                           AS rollup_status
FROM public.nbsap_targets t
LEFT JOIN public.v_eval_performance_status ps
  ON ps.nbsap_target_id = t.id
GROUP BY t.id, t.goal, t.title, t.description, t.responsible_stakeholders
ORDER BY t.id;

GRANT SELECT ON public.v_eval_target_rollup TO authenticated;


DO $$
BEGIN
  RAISE NOTICE 'Migration 031 complete.';
  RAISE NOTICE '  toolkit_reports.indicator_id column added and backfilled.';
  RAISE NOTICE '  v_eval_latest_value fixed: uses indicator_id column, reads';
  RAISE NOTICE '  COALESCE(reported_value, current_status) for submitted value.';
  RAISE NOTICE '  All 5 evaluation views recreated.';
  RAISE NOTICE '';
  RAISE NOTICE '  Validate:';
  RAISE NOTICE '    SELECT COUNT(*) FROM toolkit_reports WHERE indicator_id IS NOT NULL;';
  RAISE NOTICE '    SELECT * FROM v_eval_latest_value LIMIT 10;';
END $$;
