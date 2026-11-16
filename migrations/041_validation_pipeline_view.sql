-- ============================================================
-- DASHBOARD STAGE FILTERS (PDF, existing modules: "Dashboard — add
-- stage filters after M02")
-- Migration: 041_validation_pipeline_view.sql
--
-- Counts of reports per validation state and stage, computed in the
-- database (the browser no longer counts capped lists — see M13).
-- security_invoker: each user sees counts over the reports their own
-- access rules allow, nothing more.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.validation_stages') IS NULL THEN
    RAISE EXCEPTION 'Migration 041 needs 040 (multi-level validation). Apply 037-040 first.';
  END IF;
END $$;

DROP VIEW IF EXISTS public.v_validation_pipeline;
CREATE VIEW public.v_validation_pipeline
WITH (security_invoker = on) AS
SELECT
  r.workflow_status,
  r.current_stage_id,
  s.code     AS stage_code,
  s.name     AS stage_name,
  s.ordinal  AS stage_ordinal,
  count(*)::INTEGER AS reports
FROM public.toolkit_reports r
LEFT JOIN public.validation_stages s ON s.id = r.current_stage_id
GROUP BY r.workflow_status, r.current_stage_id, s.code, s.name, s.ordinal;

COMMENT ON VIEW public.v_validation_pipeline IS
'Reports per workflow state and current stage, under the caller''s own access rules (security_invoker).';

REVOKE ALL ON public.v_validation_pipeline FROM anon;
GRANT SELECT ON public.v_validation_pipeline TO authenticated;

COMMIT;
