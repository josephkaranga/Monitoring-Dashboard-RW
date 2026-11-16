-- ============================================================
-- SECURITY HARDENING
-- Migration: 037_security_hardening.sql
-- Source: "NBSAP Monitoring System: status and development
--          requirements" (4 Nov 2026), Annex: Security fixes
--
--   C1  Sign-up accepts any role        -> handle_new_user ignores metadata role;
--                                          new accounts are public_viewer and inactive
--   C2  Users can change their own role -> trigger guards privileged profile fields
--   H1  Approvers have no limits        -> no self-review; review fields only;
--                                          reviewed_by/at set by the database;
--                                          "Users can link reports" (013:217) dropped
--   H2  Public Viewer reads all reports -> approved reports only
--   H3  Audit log written from browser  -> trigger-written, append-only, previous
--                                          values kept; browser events via RPC only
--
-- Verified by supabase/tests/security.test.mjs (PGlite, all migrations applied).
--
-- NOTE FOR LATER MIGRATIONS: audit_log is append-only from here on.
-- Never UPDATE or DELETE audit_log rows (migration 011 did; that pattern
-- now raises an error).
-- ============================================================

BEGIN;

-- ============================================================
-- C1. SIGN-UP: LOWEST ROLE, INACTIVE UNTIL AN ADMIN APPROVES
-- ============================================================
-- raw_user_meta_data is supplied by whoever calls auth.signUp(), so it is
-- never trusted for authorisation. A REMA administrator activates the
-- account and assigns the role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, organization, department, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    LEFT(COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), NEW.email), 200),
    'public_viewer',
    LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'organization'), ''), 200),
    LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 200),
    FALSE
  );

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'public_viewer';
ALTER TABLE public.profiles ALTER COLUMN is_active SET DEFAULT FALSE;

-- ============================================================
-- C2. NOBODY CHANGES THEIR OWN ROLE OR ACCOUNT STATUS
-- ============================================================
-- RLS cannot restrict columns, so a BEFORE UPDATE trigger does.
-- auth.uid() IS NULL = service role, SQL editor or migration (trusted).
-- One self-service case: clearing one's own suspension after its end
-- date has passed (AuthContext auto-reactivation).

CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_privileged_changed BOOLEAN;
  v_suspension_changed BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile id cannot be changed' USING ERRCODE = '42501';
  END IF;

  v_privileged_changed :=
       NEW.role      IS DISTINCT FROM OLD.role
    OR NEW.is_active IS DISTINCT FROM OLD.is_active;

  v_suspension_changed :=
       NEW.suspended_at        IS DISTINCT FROM OLD.suspended_at
    OR NEW.suspended_by        IS DISTINCT FROM OLD.suspended_by
    OR NEW.suspension_reason   IS DISTINCT FROM OLD.suspension_reason
    OR NEW.suspension_end_date IS DISTINCT FROM OLD.suspension_end_date;

  IF NOT v_privileged_changed AND NOT v_suspension_changed THEN
    RETURN NEW;
  END IF;

  -- Administrators change other users' role and status, never their own.
  IF public.is_admin() AND NEW.id <> v_uid THEN
    RETURN NEW;
  END IF;

  -- Self-service: clear an expired suspension and nothing else.
  IF NOT v_privileged_changed
     AND NEW.id = v_uid
     AND OLD.suspended_at IS NOT NULL
     AND OLD.suspension_end_date IS NOT NULL
     AND OLD.suspension_end_date < NOW()
     AND NEW.suspended_at IS NULL
     AND NEW.suspended_by IS NULL
     AND NEW.suspension_reason IS NULL
     AND NEW.suspension_end_date IS NULL
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Role and account status can only be changed by a REMA administrator'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_fields ON public.profiles;
CREATE TRIGGER guard_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_fields();

-- ============================================================
-- H1. REVIEWERS: NO SELF-REVIEW, REVIEW FIELDS ONLY
-- ============================================================

-- 013:217 let any writer UPDATE any column of reports with no target or a
-- target they are responsible for. No client code uses it (targets are set
-- on insert), so it is removed rather than narrowed.
DROP POLICY IF EXISTS "Users can link reports to responsible targets" ON public.toolkit_reports;

DROP POLICY IF EXISTS "Reviewers update report status" ON public.toolkit_reports;
CREATE POLICY "Reviewers update report status"
  ON public.toolkit_reports FOR UPDATE
  USING (
    public.get_user_role()::text IN ('lead_government_ministry_reporting', 'dashboard_management')
    AND submitted_by IS DISTINCT FROM auth.uid()
  )
  WITH CHECK (
    public.get_user_role()::text IN ('lead_government_ministry_reporting', 'dashboard_management')
    AND submitted_by IS DISTINCT FROM auth.uid()
  );

CREATE OR REPLACE FUNCTION public.guard_report_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_review_keys TEXT[] := ARRAY['status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'];
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.submitted_by = v_uid THEN
    RAISE EXCEPTION 'You cannot review your own submission' USING ERRCODE = '42501';
  END IF;

  IF (to_jsonb(NEW) - v_review_keys) IS DISTINCT FROM (to_jsonb(OLD) - v_review_keys) THEN
    RAISE EXCEPTION 'Reviewers may only change the status and review note of a report'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.review_note IS DISTINCT FROM OLD.review_note THEN
    NEW.reviewed_by := v_uid;
    NEW.reviewed_at := NOW();
  ELSE
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_report_review ON public.toolkit_reports;
CREATE TRIGGER guard_report_review
  BEFORE UPDATE ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_review();

-- A submitter cannot pre-approve their own report on insert.
DROP POLICY IF EXISTS "Writers submit reports" ON public.toolkit_reports;
CREATE POLICY "Writers submit reports"
  ON public.toolkit_reports FOR INSERT
  WITH CHECK (
    public.can_write()
    AND submitted_by = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- ============================================================
-- H2. PUBLIC VIEWER: APPROVED REPORTS ONLY
-- ============================================================

DROP POLICY IF EXISTS "Public viewers read all reports" ON public.toolkit_reports;
DROP POLICY IF EXISTS "Public viewers read approved reports" ON public.toolkit_reports;
CREATE POLICY "Public viewers read approved reports"
  ON public.toolkit_reports FOR SELECT
  USING (
    public.get_user_role()::text = 'public_viewer'
    AND status = 'approved'
  );

-- ============================================================
-- H3. AUDIT LOG: DATABASE-WRITTEN, APPEND-ONLY, PREVIOUS VALUES KEPT
-- ============================================================

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS source      TEXT NOT NULL DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS table_name  TEXT,
  ADD COLUMN IF NOT EXISTS record_id   TEXT,
  ADD COLUMN IF NOT EXISTS old_values  JSONB,
  ADD COLUMN IF NOT EXISTS new_values  JSONB;

COMMENT ON COLUMN public.audit_log.source IS
'database = written by a trigger or SECURITY DEFINER function (authoritative). client = informational event sent by the browser through log_audit_event(); user_id and role are still set by the database.';

CREATE INDEX IF NOT EXISTS idx_audit_log_record     ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Keep audit rows when a user is deleted (user_id becomes NULL; the only
-- UPDATE the append-only guard allows).
DO $$
DECLARE
  v_con TEXT;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.audit_log'::regclass
      AND c.contype = 'f'
      AND a.attname = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE public.audit_log DROP CONSTRAINT %I', v_con);
  END LOOP;

  ALTER TABLE public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

CREATE OR REPLACE FUNCTION public.audit_log_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.user_id IS NOT NULL
     AND NEW.user_id IS NULL
     AND (to_jsonb(NEW) - 'user_id') = (to_jsonb(OLD) - 'user_id')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'audit_log is append-only (% not allowed)', TG_OP USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_append_only ON public.audit_log;
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_append_only();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON public.audit_log;
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON public.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_append_only();

DROP POLICY IF EXISTS "Authenticated users insert audit entries" ON public.audit_log;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_log FROM anon, authenticated;

-- Browser events (views, exports, logins). The database sets user and role.
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action_type TEXT,
  p_action      TEXT,
  p_detail      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_action_type IS NULL OR p_action_type !~ '^[a-z0-9_]{1,50}$' THEN
    RAISE EXCEPTION 'Invalid action_type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
  VALUES (
    v_uid,
    p_action_type,
    LEFT(COALESCE(p_action, ''), 500),
    LEFT(p_detail, 4000),
    (SELECT role::text FROM public.profiles WHERE id = v_uid),
    'client'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT) TO authenticated;

-- Row-change audit: who, when, which row, previous and new values of
-- the columns that changed.
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_old         JSONB;
  v_new         JSONB;
  v_old_diff    JSONB := '{}'::jsonb;
  v_new_diff    JSONB := '{}'::jsonb;
  v_key         TEXT;
  v_action_type TEXT;
  v_action      TEXT;
  v_record_id   TEXT;
  v_noise       TEXT[] := ARRAY['updated_at', 'last_login'];
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN v_new := to_jsonb(NEW); END IF;

  v_record_id := COALESCE(v_new->>'id', v_old->>'id');

  IF TG_OP = 'UPDATE' THEN
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key <> ALL (v_noise) AND (v_new->v_key) IS DISTINCT FROM (v_old->v_key) THEN
        v_old_diff := v_old_diff || jsonb_build_object(v_key, v_old->v_key);
        v_new_diff := v_new_diff || jsonb_build_object(v_key, v_new->v_key);
      END IF;
    END LOOP;
    IF v_new_diff = '{}'::jsonb THEN
      RETURN NULL;
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_diff := v_new;
    v_old_diff := NULL;
  ELSE
    v_old_diff := v_old;
    v_new_diff := NULL;
  END IF;

  IF TG_TABLE_NAME = 'toolkit_reports' THEN
    IF TG_OP = 'INSERT' THEN
      v_action_type := 'submit';
      v_action := 'Report submitted: ' || COALESCE(v_new->>'tool_name', v_new->>'tool_id', '');
    ELSIF TG_OP = 'DELETE' THEN
      v_action_type := 'delete';
      v_action := 'Report deleted: ' || COALESCE(v_old->>'tool_name', v_old->>'tool_id', '');
    ELSIF v_new_diff ? 'status' THEN
      v_action_type := CASE v_new->>'status'
                         WHEN 'approved' THEN 'approve'
                         WHEN 'rejected' THEN 'reject'
                         ELSE 'review' END;
      v_action := 'Report status ' || COALESCE(v_old->>'status', '') || ' -> ' || COALESCE(v_new->>'status', '');
    ELSE
      v_action_type := 'review';
      v_action := 'Report updated';
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF TG_OP = 'INSERT' THEN
      v_action_type := 'account_created';
      v_action := 'Account created';
    ELSIF TG_OP = 'DELETE' THEN
      v_action_type := 'account_deleted';
      v_action := 'Account deleted';
    ELSIF v_new_diff ? 'role' THEN
      v_action_type := 'role_updated';
      v_action := 'Role ' || COALESCE(v_old->>'role', '') || ' -> ' || COALESCE(v_new->>'role', '');
    ELSIF v_new_diff ?| ARRAY['is_active', 'suspended_at', 'suspension_end_date'] THEN
      v_action_type := 'account_status_change';
      v_action := 'Account status changed';
    ELSE
      v_action_type := 'profile_update';
      v_action := 'Profile updated';
    END IF;
  ELSE
    v_action_type := TG_TABLE_NAME || '_' || LOWER(TG_OP);
    v_action := INITCAP(LOWER(TG_OP)) || ' on ' || TG_TABLE_NAME;
  END IF;

  INSERT INTO public.audit_log
    (user_id, action_type, action, detail, role, source, table_name, record_id, old_values, new_values)
  VALUES (
    v_uid,
    v_action_type,
    v_action,
    NULL,
    CASE WHEN v_uid IS NULL THEN 'system'
         ELSE (SELECT role::text FROM public.profiles WHERE id = v_uid) END,
    'database',
    TG_TABLE_NAME,
    v_record_id,
    v_old_diff,
    v_new_diff
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_toolkit_reports ON public.toolkit_reports;
CREATE TRIGGER audit_toolkit_reports
  AFTER INSERT OR UPDATE OR DELETE ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_role_change_requests ON public.role_change_requests;
CREATE TRIGGER audit_role_change_requests
  AFTER INSERT OR UPDATE OR DELETE ON public.role_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

REVOKE ALL ON FUNCTION public.audit_row_change()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_report_review()             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_log_append_only()           FROM PUBLIC, anon, authenticated;

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (
  NULL,
  'schema_migration',
  'Security hardening (037)',
  'Sign-up role ignored; privileged profile fields guarded; no self-review; review-only report updates; public viewer limited to approved reports; audit log append-only and trigger-written.',
  'system',
  'database'
);

COMMIT;

-- ============================================================
-- AFTER APPLYING: REVIEW EXISTING ACCOUNTS (run manually)
-- ============================================================
-- Before this fix any account could self-assign a role at sign-up.
-- Confirm every non-viewer account with its institution:
--
-- SELECT p.email, p.full_name, p.organization, p.role, p.is_active,
--        p.created_at, p.last_login,
--        u.raw_user_meta_data->>'role' AS role_requested_at_signup
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.role::text <> 'public_viewer'
-- ORDER BY (p.role::text = 'dashboard_management') DESC, p.created_at;
--
-- An account whose role equals role_requested_at_signup and that has no
-- approved role_change_request was self-assigned.
-- ============================================================
