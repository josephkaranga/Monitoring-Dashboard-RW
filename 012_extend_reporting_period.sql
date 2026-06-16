-- ============================================================
-- REPORTING PERIOD EXTENSION MIGRATION
-- Migration: 012_extend_reporting_period.sql
-- Purpose: Extend reporting period from 2025 to 2030
-- Requirements: 7.1, 7.8
-- ============================================================
-- This migration updates table comments to reflect the extended
-- reporting period (2020-2030) for the NBSAP 2025-2030 planning
-- period. No schema changes are required as the system already
-- accepts any year value; this migration documents the official
-- supported range.
-- ============================================================

BEGIN;

-- ── UPDATE TOOLKIT_REPORTS TABLE COMMENT ────────────────────
COMMENT ON TABLE public.toolkit_reports IS 
'Toolkit reports for NBSAP 2025-2030 monitoring period. 
Accepts reports from 2020 (baseline year) through 2030 (final target year).
Reports are submitted by sector ministries and local authorities for seven toolkit areas:
T01 (Mainstreaming), T02 (Capacity Building), T03 (Awareness), T04 (Finance), 
T05 (Research), T06 (Technology Transfer), T07 (Communication).';

-- ── UPDATE INDICATORS TABLE COMMENT ─────────────────────────
COMMENT ON TABLE public.indicators IS 
'Biodiversity indicators tracked for NBSAP 2025-2030 monitoring period.
Indicator data spans from 2020 (baseline year) through 2030 (final target year).
Includes national biodiversity targets, Aichi targets, and SDG indicators.';

-- ── UPDATE NBSAP_TARGETS TABLE COMMENT ──────────────────────
COMMENT ON TABLE public.nbsap_targets IS 
'National biodiversity targets for NBSAP 2025-2030 planning period.
Target years range from 2020 (baseline) through 2030 (final target).
Aligned with CBD post-2020 global biodiversity framework.';

-- ── UPDATE DISTRICTS TABLE COMMENT ──────────────────────────
-- Update to reflect reporting period for district-level data
COMMENT ON TABLE public.districts IS 
'Administrative districts of Rwanda for spatial data organization.
District-level biodiversity data is collected for the 2020-2030 reporting period.
Includes geographic coordinates and boundaries for map visualization.';

-- ── ADD AUDIT LOG ENTRY ─────────────────────────────────────
INSERT INTO public.audit_log (
  user_id,
  action_type,
  action,
  detail,
  role
) VALUES (
  NULL, -- System migration, no specific user
  'system_migration',
  'Extended reporting period to 2030',
  'Migration 012: Updated table comments for toolkit_reports, indicators, nbsap_targets, and districts to reflect extended reporting period (2020-2030) for NBSAP 2025-2030 planning period. No schema changes required as system already supports flexible year values. Frontend validation will enforce 2020-2030 range.',
  NULL
);

-- ── VERIFICATION ─────────────────────────────────────────────
DO $$
DECLARE
  toolkit_comment TEXT;
  indicators_comment TEXT;
  targets_comment TEXT;
  districts_comment TEXT;
BEGIN
  -- Retrieve table comments
  SELECT obj_description('public.toolkit_reports'::regclass) INTO toolkit_comment;
  SELECT obj_description('public.indicators'::regclass) INTO indicators_comment;
  SELECT obj_description('public.nbsap_targets'::regclass) INTO targets_comment;
  SELECT obj_description('public.districts'::regclass) INTO districts_comment;
  
  -- Verify comments contain 2030 reference
  IF toolkit_comment LIKE '%2030%' THEN
    RAISE NOTICE 'Successfully updated toolkit_reports table comment';
  ELSE
    RAISE WARNING 'toolkit_reports comment may not have been updated correctly';
  END IF;
  
  IF indicators_comment LIKE '%2030%' THEN
    RAISE NOTICE 'Successfully updated indicators table comment';
  ELSE
    RAISE WARNING 'indicators comment may not have been updated correctly';
  END IF;
  
  IF targets_comment LIKE '%2030%' THEN
    RAISE NOTICE 'Successfully updated nbsap_targets table comment';
  ELSE
    RAISE WARNING 'nbsap_targets comment may not have been updated correctly';
  END IF;
  
  IF districts_comment LIKE '%2030%' THEN
    RAISE NOTICE 'Successfully updated districts table comment';
  ELSE
    RAISE WARNING 'districts comment may not have been updated correctly';
  END IF;
  
  RAISE NOTICE 'Reporting period extension migration completed successfully';
  RAISE NOTICE 'Frontend components should now enforce 2020-2030 year validation';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- To rollback this migration, restore the original table comments:
-- 
-- BEGIN;
-- 
-- COMMENT ON TABLE public.toolkit_reports IS 
-- 'Toolkit reports for NBSAP monitoring. Reports are submitted by 
-- sector ministries and local authorities for seven toolkit areas.';
-- 
-- COMMENT ON TABLE public.indicators IS 
-- 'Biodiversity indicators tracked for NBSAP monitoring.';
-- 
-- COMMENT ON TABLE public.nbsap_targets IS 
-- 'National biodiversity targets for NBSAP planning period.';
-- 
-- COMMENT ON TABLE public.districts IS 
-- 'Administrative districts of Rwanda for spatial data organization.';
-- 
-- DELETE FROM public.audit_log
-- WHERE action_type = 'system_migration'
--   AND action = 'Extended reporting period to 2030';
-- 
-- COMMIT;
-- ============================================================
