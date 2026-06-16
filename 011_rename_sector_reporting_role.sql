-- ============================================================
-- ROLE RENAME MIGRATION: Sector Reporter → Lead Government Ministry Reporter
-- Migration: 011_rename_sector_reporting_role.sql
-- Purpose: Rename 'sector_reporting' role to 'lead_government_ministry_reporting'
-- Requirements: 6.1, 6.6, 6.7, 6.10
-- ============================================================
-- This migration renames the 'sector_reporting' role to 
-- 'lead_government_ministry_reporting' to accurately reflect 
-- organizational structure. PostgreSQL doesn't support direct 
-- enum value renaming, so we create a new enum and migrate data.
-- ============================================================

BEGIN;

-- ── STEP 1: CREATE NEW ENUM WITH UPDATED VALUE ──────────────
CREATE TYPE user_role_new AS ENUM (
  'policy_monitoring',
  'lead_government_ministry_reporting', -- Renamed from sector_reporting
  'local_reporting',
  'dashboard_management',
  'programme_alignment',
  'public_viewer' -- Added in migration 010
);

-- ── STEP 2: ADD TEMPORARY COLUMN WITH NEW ENUM TYPE ─────────
ALTER TABLE public.profiles
ADD COLUMN role_new user_role_new;

-- ── STEP 3: MIGRATE DATA FROM OLD TO NEW COLUMN ─────────────
UPDATE public.profiles
SET role_new = CASE
  WHEN role::text = 'sector_reporting' THEN 'lead_government_ministry_reporting'::user_role_new
  ELSE role::text::user_role_new
END;

-- Verify all rows were migrated
DO $$
DECLARE
  unmigrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM public.profiles
  WHERE role_new IS NULL;
  
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % profiles have NULL role_new', unmigrated_count;
  END IF;
  
  RAISE NOTICE 'Successfully migrated % profile records', (SELECT COUNT(*) FROM public.profiles);
END $$;

-- ── STEP 4: DROP OLD COLUMN AND RENAME NEW COLUMN ───────────
ALTER TABLE public.profiles DROP COLUMN role;
ALTER TABLE public.profiles RENAME COLUMN role_new TO role;

-- Set NOT NULL constraint on the new role column
ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

-- Set default value for new users
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'policy_monitoring'::user_role_new;

-- ── STEP 5: DROP OLD ENUM TYPE ──────────────────────────────
DROP TYPE user_role;

-- ── STEP 6: RENAME NEW ENUM TYPE ────────────────────────────
ALTER TYPE user_role_new RENAME TO user_role;

-- ── STEP 7: UPDATE AUDIT LOG ENTRIES ────────────────────────
-- Update role field in audit_log table
UPDATE public.audit_log
SET role = 'lead_government_ministry_reporting'
WHERE role = 'sector_reporting';

-- Update detail field in audit_log where it contains the old role name
UPDATE public.audit_log
SET detail = REPLACE(detail, 'sector_reporting', 'lead_government_ministry_reporting')
WHERE detail LIKE '%sector_reporting%';

UPDATE public.audit_log
SET detail = REPLACE(detail, 'Sector Reporter', 'Lead Government Ministry Reporter')
WHERE detail LIKE '%Sector Reporter%';

UPDATE public.audit_log
SET action = REPLACE(action, 'Sector Reporter', 'Lead Government Ministry Reporter')
WHERE action LIKE '%Sector Reporter%';

-- ── STEP 8: RECREATE HELPER FUNCTIONS ───────────────────────
-- These functions reference the user_role enum and need to be recreated

-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_role(user_role);
DROP FUNCTION IF EXISTS public.can_write();
DROP FUNCTION IF EXISTS public.is_admin();

-- Recreate get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate is_role function
CREATE OR REPLACE FUNCTION public.is_role(check_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = check_role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate can_write function with updated role name
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN (
    'lead_government_ministry_reporting', -- Updated from sector_reporting
    'local_reporting',
    'dashboard_management'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'dashboard_management';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── STEP 9: UPDATE ENUM COMMENT ─────────────────────────────
COMMENT ON TYPE user_role IS 
'User roles: policy_monitoring (read-only strategic), lead_government_ministry_reporting (upload + review), 
local_reporting (entry + validation), dashboard_management (full access), 
programme_alignment (analytical view), public_viewer (external read-only)';

-- ── STEP 10: ADD AUDIT LOG ENTRY ────────────────────────────
INSERT INTO public.audit_log (
  user_id,
  action_type,
  action,
  detail,
  role
) VALUES (
  NULL, -- System migration, no specific user
  'system_migration',
  'Role Rename Migration',
  'Renamed user_role enum value from "sector_reporting" to "lead_government_ministry_reporting". Updated profiles table, audit_log entries, and helper functions. Migration 011_rename_sector_reporting_role.sql applied successfully.',
  NULL
);

-- ── VERIFICATION ─────────────────────────────────────────────
DO $$
DECLARE
  lead_ministry_count INTEGER;
  old_role_count INTEGER;
  audit_old_role_count INTEGER;
BEGIN
  -- Count profiles with new role name
  SELECT COUNT(*) INTO lead_ministry_count
  FROM public.profiles
  WHERE role = 'lead_government_ministry_reporting';
  
  -- Check for any remaining old role references in audit log
  SELECT COUNT(*) INTO audit_old_role_count
  FROM public.audit_log
  WHERE role = 'sector_reporting'
     OR detail LIKE '%sector_reporting%'
     OR action LIKE '%Sector Reporter%';
  
  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '  - Profiles with lead_government_ministry_reporting role: %', lead_ministry_count;
  
  IF audit_old_role_count > 0 THEN
    RAISE WARNING '  - Found % audit_log records still containing old role references', audit_old_role_count;
  ELSE
    RAISE NOTICE '  - Successfully updated all audit_log records';
  END IF;
  
  -- Test helper functions
  RAISE NOTICE '  - Helper functions recreated successfully';
  RAISE NOTICE 'Role rename migration completed successfully';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- To rollback this migration, run:
-- 
-- BEGIN;
-- 
-- -- Create old enum
-- CREATE TYPE user_role_old AS ENUM (
--   'policy_monitoring',
--   'sector_reporting',
--   'local_reporting',
--   'dashboard_management',
--   'programme_alignment',
--   'public_viewer'
-- );
-- 
-- -- Add temporary column
-- ALTER TABLE public.profiles ADD COLUMN role_old user_role_old;
-- 
-- -- Migrate data back
-- UPDATE public.profiles
-- SET role_old = CASE
--   WHEN role::text = 'lead_government_ministry_reporting' THEN 'sector_reporting'::user_role_old
--   ELSE role::text::user_role_old
-- END;
-- 
-- -- Swap columns
-- ALTER TABLE public.profiles DROP COLUMN role;
-- ALTER TABLE public.profiles RENAME COLUMN role_old TO role;
-- ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;
-- ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'policy_monitoring'::user_role_old;
-- 
-- -- Drop new enum and rename old
-- DROP TYPE user_role;
-- ALTER TYPE user_role_old RENAME TO user_role;
-- 
-- -- Update audit log
-- UPDATE public.audit_log
-- SET role = 'sector_reporting'
-- WHERE role = 'lead_government_ministry_reporting';
-- 
-- UPDATE public.audit_log
-- SET detail = REPLACE(detail, 'lead_government_ministry_reporting', 'sector_reporting')
-- WHERE detail LIKE '%lead_government_ministry_reporting%';
-- 
-- -- Recreate helper functions
-- [Recreate functions with old role name]
-- 
-- COMMIT;
-- ============================================================
