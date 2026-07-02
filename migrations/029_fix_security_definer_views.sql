-- ============================================================
-- Migration 029: Fix Security Definer Views
-- ============================================================
-- Supabase security advisor flags views in the public schema
-- that do not explicitly declare security_invoker = true.
-- Without this option, views run with the owner's privileges
-- rather than the calling user's, which can silently bypass
-- Row Level Security policies.
--
-- Fix: recreate all 5 public views WITH (security_invoker = true)
-- so they execute with the caller's permissions and respect RLS.
--
-- Requires PostgreSQL 15+ (Supabase default since late 2023).
-- ============================================================

-- ── 1. target_progress_with_reports (migration 013) ──────────
CREATE OR REPLACE VIEW public.target_progress_with_reports
  WITH (security_invoker = true)
AS
SELECT
  nt.*,
  COALESCE(rs.total_reports, 0)   AS total_reports,
  COALESCE(rs.approved_reports, 0) AS approved_reports,
  COALESCE(rs.pending_reports, 0)  AS pending_reports,
  CASE
    WHEN COALESCE(rs.total_reports, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(rs.approved_reports, 0)::FLOAT / rs.total_reports) * 100)
  END AS report_completion_rate
FROM public.nbsap_targets nt
LEFT JOIN (
  SELECT
    nbsap_target_id,
    COUNT(*)                                          AS total_reports,
    COUNT(*) FILTER (WHERE status = 'approved')       AS approved_reports,
    COUNT(*) FILTER (WHERE status = 'pending')        AS pending_reports
  FROM public.toolkit_reports
  WHERE nbsap_target_id IS NOT NULL
  GROUP BY nbsap_target_id
) rs ON nt.id = rs.nbsap_target_id
ORDER BY nt.id;

-- ── 2. dashboard_metrics_live (migration 015) ────────────────
CREATE OR REPLACE VIEW public.dashboard_metrics_live
  WITH (security_invoker = true)
AS
SELECT
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'forest_ha_total')             AS total_forest_ha,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'restoration_commitments_ha')  AS restoration_commitments_ha,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'wetland_ha_total')            AS total_wetland_ha,
  ROUND((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_allocated') / 1000000, 2) AS finance_allocated_million_rwf,
  ROUND((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_disbursed') / 1000000, 2) AS finance_disbursed_million_rwf,
  ROUND((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_utilized')  / 1000000, 2) AS finance_utilized_million_rwf,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'hwc_incidents_total')         AS total_hwc_incidents,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full')         AS eia_full_compliance,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_partial')      AS eia_partial_compliance,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_non')          AS eia_non_compliance,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'districts_reporting')         AS districts_active,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'companies_reporting')         AS companies_reporting,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'protected_areas_monitored')   AS protected_areas_monitored,
  CASE
    WHEN (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full') +
         (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_partial') +
         (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_non') > 0
    THEN ROUND(
      (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full') * 100.0 /
      NULLIF(
        (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full') +
        (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_partial') +
        (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_non'), 0),
      1)
    ELSE 0
  END AS eia_compliance_percentage,
  (SELECT MAX(updated_at) FROM public.system_metrics) AS last_updated;

-- ── 3. v_target_progress (migration 023) ─────────────────────
CREATE OR REPLACE VIEW public.v_target_progress
  WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.goal,
  t.title,
  t.description,
  t.responsible_stakeholders,
  public.compute_target_progress(t.id) AS progress,
  (SELECT COUNT(*) FROM public.toolkit_reports tr
   WHERE tr.nbsap_target_id = t.id AND tr.status = 'approved') AS approved_report_count,
  (SELECT COUNT(*) FROM public.toolkit_reports tr
   WHERE tr.nbsap_target_id = t.id AND tr.status = 'pending')  AS pending_report_count
FROM public.nbsap_targets t;

-- ── 4. v_indicator_progress (migration 023) ──────────────────
CREATE OR REPLACE VIEW public.v_indicator_progress
  WITH (security_invoker = true)
AS
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
  public.compute_indicator_progress(i.id)                     AS progress,
  public.compute_indicator_status(
    public.compute_indicator_progress(i.id)
  )                                                            AS status
FROM public.indicators i;

-- ── 5. v_system_metrics (migration 023) ──────────────────────
CREATE OR REPLACE VIEW public.v_system_metrics
  WITH (security_invoker = true)
AS
SELECT * FROM public.compute_system_metrics();

-- Re-grant SELECT so authenticated users can still read the views
GRANT SELECT ON public.target_progress_with_reports TO authenticated;
GRANT SELECT ON public.dashboard_metrics_live        TO authenticated;
GRANT SELECT ON public.v_target_progress             TO authenticated;
GRANT SELECT ON public.v_indicator_progress          TO authenticated;
GRANT SELECT ON public.v_system_metrics              TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'Migration 029 complete: all 5 public views recreated with security_invoker = true.';
  RAISE NOTICE 'Views now execute with the calling user''s permissions and respect RLS policies.';
END $$;
