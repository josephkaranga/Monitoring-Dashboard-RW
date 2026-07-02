-- ============================================================
-- Migration 030: Evaluation Layer
-- ============================================================
-- The existing compute_target_progress() is COUNT-based:
-- progress = how many reports have been approved × tool weight.
-- It does not read form_data->>'current_value' at all, so the
-- Dashboard shows report-coverage progress, not goal progress.
--
-- This migration adds five views that form the single source of
-- truth for actual goal progress:
--
--   toolkit_reports (approved, with current_value in form_data)
--       └─► v_eval_latest_value          latest observation per (indicator, period)
--           ├─► v_eval_indicator_completion   completion % vs baseline/target_2030
--           ├─► v_eval_indicator_trend        improving | stable | declining
--           └─► v_eval_performance_status     on-track | at-risk | behind
--               └─► v_eval_target_rollup      per-target dashboard rollup
--
-- The existing v_target_progress / v_indicator_progress views
-- remain untouched.  Switch the Dashboard to these new views
-- once they are validated against live data.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- SUPPORT INDEX
-- Speeds up the approved-reports scan done by v_eval_latest_value
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_reports_approved_indicator
  ON public.toolkit_reports ((form_data->>'related_indicator'), nbsap_target_id, submitted_at DESC)
  WHERE status = 'approved'
    AND form_data->>'related_indicator' IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- HELPER FUNCTION
-- ════════════════════════════════════════════════════════════

-- Extracts the first numeric value from free-text strings.
-- "28.7% (2023)"         → 28.7
-- "RWF 2,100 M"          → 2100   (comma removed)
-- "120,000 (2023)"       → 120000
-- "20 active agreements" → 20
-- "No baseline"          → NULL
-- "5"                    → 5
CREATE OR REPLACE FUNCTION public.extract_first_numeric(p_text TEXT)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT NULLIF(
    replace(
      COALESCE((regexp_match(COALESCE(p_text, ''), '(\d[\d,]*\.?\d*)'))[1], ''),
      ',', ''
    ),
    ''
  )::NUMERIC;
$$;

GRANT EXECUTE ON FUNCTION public.extract_first_numeric(TEXT) TO authenticated;


-- ════════════════════════════════════════════════════════════
-- VIEW 1: v_eval_latest_value
-- ════════════════════════════════════════════════════════════
-- For each (nbsap_target_id, indicator_id, period):
-- the single most-recent approved report's submitted value.
-- This is the raw observation layer — no interpretation.
DROP VIEW IF EXISTS public.v_eval_latest_value CASCADE;

CREATE VIEW public.v_eval_latest_value
  WITH (security_invoker = true)
AS
SELECT DISTINCT ON (
  r.nbsap_target_id,
  (r.form_data->>'related_indicator')::int,
  r.period
)
  r.nbsap_target_id,
  (r.form_data->>'related_indicator')::int    AS indicator_id,
  r.period,
  r.form_data->>'current_value'               AS submitted_value,
  public.extract_first_numeric(
    r.form_data->>'current_value'
  )                                           AS numeric_value,
  r.submitted_at,
  r.submitted_by,
  r.institution,
  r.id                                        AS report_id,
  r.tool_id
FROM public.toolkit_reports r
WHERE r.status = 'approved'
  AND r.form_data->>'related_indicator' IS NOT NULL
  AND r.form_data->>'related_indicator' ~ '^\d+$'
ORDER BY
  r.nbsap_target_id,
  (r.form_data->>'related_indicator')::int,
  r.period,
  r.submitted_at DESC;

GRANT SELECT ON public.v_eval_latest_value TO authenticated;


-- ════════════════════════════════════════════════════════════
-- VIEW 2: v_eval_indicator_completion
-- ════════════════════════════════════════════════════════════
-- Per indicator: completion % computed from approved submissions.
--
-- Formula when numeric extraction succeeds:
--   (latest_value − baseline_numeric) ÷ (target_2030_numeric − baseline_numeric) × 100
--   clamped to [0, 100]
--
-- Falls back to indicators.progress (the seeded value) when:
--   • no approved submissions exist for this indicator, OR
--   • baseline or target_2030 cannot be parsed as a number, OR
--   • target == baseline (would be division by zero)
--
-- completion_source = 'computed' | 'seeded' tells callers which branch fired.
DROP VIEW IF EXISTS public.v_eval_indicator_completion CASCADE;

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
  -- completion percentage ─────────────────────────────────────
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


-- ════════════════════════════════════════════════════════════
-- VIEW 3: v_eval_indicator_trend
-- ════════════════════════════════════════════════════════════
-- Per indicator: direction of change across the last two periods.
-- trend_direction: improving | stable | declining | insufficient_data
-- change_pct: percentage change from previous to latest value.
DROP VIEW IF EXISTS public.v_eval_indicator_trend CASCADE;

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


-- ════════════════════════════════════════════════════════════
-- VIEW 4: v_eval_performance_status
-- ════════════════════════════════════════════════════════════
-- Per indicator: synthesises completion_pct + trend_direction
-- into a single performance_status label.
--
-- Base thresholds (match existing compute_indicator_status):
--   completion ≥ 70  →  on-track
--   completion ≥ 40  →  at-risk
--   completion < 40  →  behind
--
-- Trend adjustment: a declining trend downgrades by one level.
--   on-track + declining  →  at-risk
--   at-risk  + declining  →  behind
DROP VIEW IF EXISTS public.v_eval_performance_status CASCADE;

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
  -- base status from completion thresholds only
  CASE
    WHEN c.completion_pct >= 70  THEN 'on-track'
    WHEN c.completion_pct >= 40  THEN 'at-risk'
    ELSE                              'behind'
  END                                                 AS base_status,
  -- final status: declining trend downgrades one level
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


-- ════════════════════════════════════════════════════════════
-- VIEW 5: v_eval_target_rollup
-- ════════════════════════════════════════════════════════════
-- Per target: aggregates indicator-level evaluation into a
-- single row per NBSAP target for the Dashboard.
--
-- rollup_status logic:
--   > 50% of indicators on-track  →  on-track
--   > 50% of indicators behind    →  behind
--   otherwise                     →  at-risk
--   no linked indicators          →  no-data
DROP VIEW IF EXISTS public.v_eval_target_rollup CASCADE;

CREATE VIEW public.v_eval_target_rollup
  WITH (security_invoker = true)
AS
SELECT
  t.id                                                          AS target_id,
  t.goal,
  t.title,
  t.description,
  t.responsible_stakeholders,
  -- indicator counts
  COUNT(ps.indicator_id)                                        AS indicator_count,
  COUNT(ps.indicator_id) FILTER (
    WHERE ps.completion_source = 'computed'
  )                                                             AS indicators_with_submissions,
  -- completion aggregation
  ROUND(AVG(ps.completion_pct))                                 AS avg_completion_pct,
  MIN(ps.completion_pct)                                        AS min_completion_pct,
  MAX(ps.completion_pct)                                        AS max_completion_pct,
  -- status breakdown
  COUNT(*) FILTER (WHERE ps.performance_status = 'on-track')   AS indicators_on_track,
  COUNT(*) FILTER (WHERE ps.performance_status = 'at-risk')    AS indicators_at_risk,
  COUNT(*) FILTER (WHERE ps.performance_status = 'behind')     AS indicators_behind,
  -- trend breakdown
  COUNT(*) FILTER (WHERE ps.trend_direction = 'improving')     AS indicators_improving,
  COUNT(*) FILTER (WHERE ps.trend_direction = 'declining')     AS indicators_declining,
  COUNT(*) FILTER (WHERE ps.trend_direction = 'stable')        AS indicators_stable,
  -- report counts
  (SELECT COUNT(*) FROM public.toolkit_reports tr
   WHERE tr.nbsap_target_id = t.id
     AND tr.status = 'approved')                               AS approved_reports,
  (SELECT COUNT(*) FROM public.toolkit_reports tr
   WHERE tr.nbsap_target_id = t.id
     AND tr.status = 'pending')                               AS pending_reports,
  -- rollup status
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
  RAISE NOTICE 'Migration 030 complete — evaluation layer ready.';
  RAISE NOTICE '  v_eval_latest_value          → latest approved value per (indicator, period)';
  RAISE NOTICE '  v_eval_indicator_completion  → completion %% from submitted values vs baseline/target_2030';
  RAISE NOTICE '  v_eval_indicator_trend       → improving | stable | declining | insufficient_data';
  RAISE NOTICE '  v_eval_performance_status    → on-track | at-risk | behind (completion + trend)';
  RAISE NOTICE '  v_eval_target_rollup         → per-target dashboard rollup';
  RAISE NOTICE '';
  RAISE NOTICE '  Validate with:';
  RAISE NOTICE '    SELECT * FROM public.v_eval_target_rollup;';
  RAISE NOTICE '    SELECT * FROM public.v_eval_performance_status WHERE nbsap_target_id = 13;';
END $$;
