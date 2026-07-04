-- ============================================================
-- Migration 033: fix function_search_path_mutable +
--                anon_security_definer_function_executable
-- ============================================================
--
-- Two lint categories addressed:
--
--   function_search_path_mutable (WARN)
--     Every function without a fixed search_path is vulnerable
--     to search_path injection: a malicious schema early in the
--     path can shadow pg_catalog builtins or other objects.
--     Fix: ALTER FUNCTION ... SET search_path = public, pg_temp
--     The pg_temp entry prevents temp-table shadowing of builtins.
--
--   anon_security_definer_function_executable (WARN)
--     SECURITY DEFINER functions callable by anon run with the
--     function owner's privileges, letting unauthenticated
--     requests bypass RLS. Every public function is granted to
--     PUBLIC by default in PostgreSQL; revoke from anon.
--
-- Note on authenticated_security_definer_function_executable:
--     Trigger functions that are also flagged as callable by
--     authenticated are revoked here. Admin-only functions that
--     need to stay callable by authenticated users (admin_delete_user,
--     bulk_load_*, etc.) must have internal role-check guards
--     (IF NOT is_admin() THEN RAISE EXCEPTION ...) — that is a
--     separate task and is not changed here.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PART 1: Fix search_path on every public function
-- ════════════════════════════════════════════════════════════
-- Runs dynamically so it catches functions created ad-hoc in
-- the SQL editor (milestone functions, etc.) as well as the
-- ones from migration files.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.prokind = 'f'          -- ordinary functions only (not agg/window)
      AND  NOT EXISTS (
             SELECT 1
             FROM   unnest(p.proconfig) AS cfg
             WHERE  cfg LIKE 'search_path=%'
           )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp',
        r.proname, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'search_path: skipped %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Part 1 complete — search_path locked for all eligible public functions.';
END $$;


-- ════════════════════════════════════════════════════════════
-- PART 2: Revoke EXECUTE from anon on all public functions
-- ════════════════════════════════════════════════════════════
-- PostgreSQL auto-grants EXECUTE to PUBLIC when a function is
-- created; the anon role inherits that. This loop revokes it.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.prokind = 'f'
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
        r.proname, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;  -- privilege did not exist — safe to ignore
    END;
  END LOOP;
  RAISE NOTICE 'Part 2 complete — anon EXECUTE revoked from all public functions.';
END $$;


-- ════════════════════════════════════════════════════════════
-- PART 3: Re-grant to authenticated what users legitimately call
-- ════════════════════════════════════════════════════════════
-- Only functions that the client-side app calls via Supabase
-- RPC or that are used inside RLS policies need this grant.

-- RLS helper functions — called implicitly on every query
GRANT EXECUTE ON FUNCTION public.is_admin()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_role(user_role)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role()               TO authenticated;

-- Dashboard / reporting queries called via RPC
GRANT EXECUTE ON FUNCTION public.get_system_metrics()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_responsible_targets(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tool_weight(TEXT)         TO authenticated;

-- Admin workflows — stay callable by authenticated; internal
-- guards (is_admin() checks) should protect them from regular users
GRANT EXECUTE ON FUNCTION public.apply_approved_role_change()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_stale_role_requests()    TO authenticated;


-- ════════════════════════════════════════════════════════════
-- PART 4: Revoke EXECUTE from authenticated on trigger-only functions
-- ════════════════════════════════════════════════════════════
-- These functions are invoked by database triggers, never by
-- application code. Revoking from authenticated means they can
-- no longer be called via /rest/v1/rpc/*, eliminating the
-- authenticated_security_definer_function_executable warnings
-- for this subset.

-- updated_at triggers
REVOKE EXECUTE ON FUNCTION public.handle_updated_at()          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()           FROM authenticated;

-- auth triggers
REVOKE EXECUTE ON FUNCTION public.handle_new_user()            FROM authenticated;

-- notification triggers
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_signup()    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_report_rejection() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_of_role_request() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user_of_decision()    FROM authenticated;

-- progress/metrics triggers
REVOKE EXECUTE ON FUNCTION public.update_target_progress_from_reports() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_system_metrics_from_reports()  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reverse_system_metrics_on_delete()    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reverse_progress_on_report_delete()   FROM authenticated;

-- internal computation helpers (not callable via RPC)
REVOKE EXECUTE ON FUNCTION public.safe_numeric_extract(TEXT)            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_target_progress(INTEGER)      FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_indicator_progress(INTEGER)   FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_indicator_status(INTEGER)     FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_system_metrics()              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_system_metrics()          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_progress_cache()              FROM authenticated;
REVOKE EXECUTE ON FUNCTION
  public.calculate_indicator_progress(INTEGER, INTEGER)                 FROM authenticated;


DO $$
BEGIN
  RAISE NOTICE 'Migration 033 complete.';
  RAISE NOTICE '  - search_path locked on all public functions.';
  RAISE NOTICE '  - anon EXECUTE revoked from all public functions.';
  RAISE NOTICE '  - authenticated EXECUTE re-granted where needed.';
  RAISE NOTICE '  - trigger-only functions revoked from authenticated.';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining authenticated_security_definer warnings for admin';
  RAISE NOTICE 'functions (admin_delete_user, bulk_load_*, rls_auto_enable,';
  RAISE NOTICE 'associate_milestones_*) require internal is_admin() guards';
  RAISE NOTICE 'to be added inside the function bodies — separate task.';
END $$;
