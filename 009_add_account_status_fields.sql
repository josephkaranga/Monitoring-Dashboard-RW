-- ============================================================
-- ACCOUNT STATUS FIELDS MIGRATION
-- Migration: 009_add_account_status_fields.sql
-- Purpose: Add account suspension and status management fields
-- Requirements: 4.1, 4.2, 4.3, 4.7, 4.10
-- ============================================================

-- ── ADD ACCOUNT STATUS COLUMNS TO PROFILES TABLE ────────────
ALTER TABLE public.profiles
ADD COLUMN suspended_at TIMESTAMPTZ,
ADD COLUMN suspended_by UUID REFERENCES public.profiles(id),
ADD COLUMN suspension_reason TEXT,
ADD COLUMN suspension_end_date TIMESTAMPTZ;

-- ── ADD COLUMN COMMENTS FOR DOCUMENTATION ────────────────────
COMMENT ON COLUMN public.profiles.suspended_at IS 
'Timestamp when the account was suspended. NULL if account is not suspended.';

COMMENT ON COLUMN public.profiles.suspended_by IS 
'User ID of the administrator who suspended this account. References profiles(id).';

COMMENT ON COLUMN public.profiles.suspension_reason IS 
'Reason provided by administrator for suspending the account.';

COMMENT ON COLUMN public.profiles.suspension_end_date IS 
'Date when the suspension expires. NULL for indefinite suspension. Auto-reactivation occurs when this date is reached.';

COMMENT ON COLUMN public.profiles.is_active IS 
'Account activation status. FALSE indicates a deactivated account. Deactivated accounts cannot log in.';

-- ── CREATE INDEXES FOR PERFORMANCE ──────────────────────────
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_profiles_suspended_at ON public.profiles(suspended_at);

-- ── ADD AUDIT LOG ENTRY ──────────────────────────────────────
INSERT INTO public.audit_log (user_id, action_type, action, detail, role)
VALUES (
  NULL,
  'schema_migration',
  'Added account status fields to profiles table',
  'Migration 009: Added suspended_at, suspended_by, suspension_reason, suspension_end_date columns with indexes for account status management',
  'system'
);
