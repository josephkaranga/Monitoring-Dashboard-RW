-- ============================================================
-- Migration 027: Prevent Duplicate Report Submissions
-- ============================================================
-- Business rule:
--   • The SAME USER may not submit the same report twice
--     (same tool + period + target, regardless of status).
--   • DIFFERENT USERS from the same institution CAN both submit
--     for the same combo — the reviewer picks which to approve.
--   • A rejected report does NOT block re-submission by the same
--     user (the WHERE clause excludes 'rejected').
--
-- Enforcement is at the DB level (this index) so it cannot be
-- bypassed even via direct API calls. The frontend adds a
-- friendlier pre-check on top for UX.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS unique_report_per_user_period
  ON public.toolkit_reports (submitted_by, tool_id, period, nbsap_target_id)
  WHERE status <> 'rejected';

DO $$
BEGIN
  RAISE NOTICE 'Migration 027 complete: unique index on (submitted_by, tool_id, period, nbsap_target_id) created.';
  RAISE NOTICE 'Same user cannot submit the same report twice; different users from same org can.';
END $$;
