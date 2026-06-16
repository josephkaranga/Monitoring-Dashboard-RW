-- ============================================================
-- PUBLIC VIEWER ROLE MIGRATION
-- Migration: 010_add_public_viewer_role.sql
-- Purpose: Add public_viewer role for external stakeholders with read-only access
-- Requirements: 5.1, 5.2, 5.6
-- ============================================================
-- Note: This migration is split into multiple parts because PostgreSQL
-- requires enum values to be committed before they can be used.
-- ============================================================

-- ── PART 1: ADD PUBLIC_VIEWER TO USER_ROLE ENUM ──────────────
-- PostgreSQL allows adding new values to existing enums
-- This must be done outside a transaction block
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'public_viewer';

-- ── UPDATE ROLE DESCRIPTIONS COMMENT ─────────────────────────
COMMENT ON TYPE user_role IS 
'User roles for NBSAP Monitoring Dashboard:
- policy_monitoring: National policymakers (read-only strategic view)
- sector_reporting: Sector ministries (upload + review capabilities)
- local_reporting: District authorities (data entry + validation)
- dashboard_management: REMA administrators (full system access)
- programme_alignment: Development partners (analytical view)
- public_viewer: External stakeholders (read-only access to public data)';

-- ── PART 2: CREATE RLS POLICY AND AUDIT LOG ──────────────────
-- This part can be in a transaction since the enum value is now committed

BEGIN;

-- Create RLS policy for public viewers to read toolkit reports
CREATE POLICY "Public viewers read all reports"
  ON public.toolkit_reports FOR SELECT
  USING (
    get_user_role() = 'public_viewer'
  );

-- Add audit log entry
INSERT INTO public.audit_log (
  user_id,
  action_type,
  action,
  detail,
  role
) VALUES (
  NULL, -- System migration, no specific user
  'schema_migration',
  'Added public_viewer role',
  'Migration 010: Added public_viewer role to user_role enum, updated role descriptions, and created RLS policy for public viewers to read toolkit_reports. This role provides read-only access for external stakeholders.',
  NULL
);

-- Verification
DO $$
DECLARE
  enum_values TEXT[];
  has_public_viewer BOOLEAN;
BEGIN
  -- Check if public_viewer was added to enum
  SELECT array_agg(enumlabel::text) INTO enum_values
  FROM pg_enum
  WHERE enumtypid = 'user_role'::regtype;
  
  has_public_viewer := 'public_viewer' = ANY(enum_values);
  
  IF has_public_viewer THEN
    RAISE NOTICE 'Successfully added public_viewer to user_role enum';
    RAISE NOTICE 'Current user_role values: %', array_to_string(enum_values, ', ');
  ELSE
    RAISE EXCEPTION 'Failed to add public_viewer to user_role enum';
  END IF;
  
  -- Verify RLS policy was created
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'toolkit_reports' 
    AND policyname = 'Public viewers read all reports'
  ) THEN
    RAISE NOTICE 'Successfully created RLS policy for public viewers on toolkit_reports';
  ELSE
    RAISE EXCEPTION 'Failed to create RLS policy for public viewers';
  END IF;
  
  RAISE NOTICE 'Public viewer role migration completed successfully';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- Note: PostgreSQL does not support removing enum values directly.
-- To rollback, you would need to:
-- 1. Ensure no users have the public_viewer role
-- 2. Drop and recreate the enum without public_viewer
-- 3. This requires dropping all dependent objects first
-- 
-- Simpler rollback approach - just drop the RLS policy:
-- 
-- BEGIN;
-- DROP POLICY IF EXISTS "Public viewers read all reports" ON public.toolkit_reports;
-- DELETE FROM public.audit_log
-- WHERE action_type = 'schema_migration'
--   AND action = 'Added public_viewer role';
-- COMMIT;
-- 
-- Note: The enum value will remain but won't be used if no users have it.
-- ============================================================
