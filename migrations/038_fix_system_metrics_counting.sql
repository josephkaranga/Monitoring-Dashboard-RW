-- ============================================================
-- FIX SYSTEM METRICS DOUBLE COUNTING
-- Migration: 038_fix_system_metrics_counting.sql
--
-- Problem (found 16 Nov 2026):
--   trigger_update_system_metrics (migration 015) ran AFTER INSERT OR
--   UPDATE and added a report's figures (forest ha, wetland ha, finance,
--   HWC incidents, ...) whenever NEW.status = 'approved' -- on EVERY
--   update of an approved report, not only when it became approved.
--   Saving a reviewer note, or any other update, inflated the headline
--   totals again. Revoking an approval (approved -> rejected) never
--   subtracted anything, so revoked reports kept counting.
--
-- Fix:
--   The incremental triggers are replaced by a recalculation from
--   scratch (recalculate_system_metrics(), migration 015) that runs once
--   per statement, and only when the statement touched an approved
--   report. Totals are then always exactly the sum over approved reports.
--
--   recalculate_system_metrics() was revoked from authenticated users in
--   033, which broke systemMetricsService.recalculateSystemMetrics().
--   admin_recalculate_system_metrics() restores it for administrators.
-- ============================================================

BEGIN;

DROP TRIGGER IF EXISTS trigger_update_system_metrics ON public.toolkit_reports;
DROP TRIGGER IF EXISTS trigger_reverse_metrics_on_delete ON public.toolkit_reports;

CREATE OR REPLACE FUNCTION public.refresh_system_metrics_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_touched BOOLEAN := FALSE;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT EXISTS (SELECT 1 FROM new_rows WHERE status = 'approved') INTO v_touched;
  END IF;
  IF NOT v_touched AND TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT EXISTS (SELECT 1 FROM old_rows WHERE status = 'approved') INTO v_touched;
  END IF;

  IF v_touched THEN
    PERFORM public.recalculate_system_metrics();
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_system_metrics_after_change() FROM PUBLIC, anon, authenticated;

-- PostgreSQL allows transition tables only on single-event triggers.
DROP TRIGGER IF EXISTS refresh_system_metrics_on_insert ON public.toolkit_reports;
CREATE TRIGGER refresh_system_metrics_on_insert
  AFTER INSERT ON public.toolkit_reports
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_system_metrics_after_change();

DROP TRIGGER IF EXISTS refresh_system_metrics_on_update ON public.toolkit_reports;
CREATE TRIGGER refresh_system_metrics_on_update
  AFTER UPDATE ON public.toolkit_reports
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_system_metrics_after_change();

DROP TRIGGER IF EXISTS refresh_system_metrics_on_delete ON public.toolkit_reports;
CREATE TRIGGER refresh_system_metrics_on_delete
  AFTER DELETE ON public.toolkit_reports
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_system_metrics_after_change();

-- Administrators can still force a full recalculation.
CREATE OR REPLACE FUNCTION public.admin_recalculate_system_metrics()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can recalculate metrics' USING ERRCODE = '42501';
  END IF;
  RETURN public.recalculate_system_metrics();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_recalculate_system_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recalculate_system_metrics() TO authenticated;

-- Correct any inflation already in the table.
SELECT public.recalculate_system_metrics();

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (
  NULL,
  'schema_migration',
  'System metrics recalculated from approved reports (038)',
  'Incremental metrics triggers replaced by statement-level recalculation; existing totals recomputed.',
  'system',
  'database'
);

COMMIT;
