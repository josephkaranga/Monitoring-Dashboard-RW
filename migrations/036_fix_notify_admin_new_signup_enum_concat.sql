-- ============================================================
-- Migration 036: fix enum concatenation bug breaking signup
-- ============================================================
-- Context: public.notify_admin_new_signup() was never captured in
-- any migration file (created directly in the Supabase SQL editor,
-- same untracked-drift pattern as the indicators seed data and the
-- milestone bulk-load functions fixed in 034/035).
--
-- Its body concatenates NEW.role directly into a TEXT string with
-- ||. NEW.role is public.user_role, an ENUM — Postgres has no ||
-- operator for enum operands, so this raises
-- `operator does not exist: text || user_role` at runtime (plpgsql
-- bodies aren't type-checked until first execution). Since this
-- fires as an AFTER INSERT trigger on public.profiles (populated
-- by handle_new_user() right after every auth.users signup), every
-- new registration hit this exception, rolled back the whole
-- signup transaction, and surfaced to users as GoTrue's generic
-- "Unexpected failure, please check server logs" error.
--
-- Fix: cast NEW.role to text before concatenating. No other logic
-- changed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_admin_new_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Call the edge function asynchronously via pg_net (if available)
  -- Otherwise just log to audit_log
  INSERT INTO public.audit_log (action_type, action, detail, role)
  VALUES (
    'system',
    'New user registration pending approval: ' || COALESCE(NEW.full_name, NEW.email),
    'Role: ' || NEW.role::text || ' | Email: ' || NEW.email || ' | Org: ' || COALESCE(NEW.organization, 'Not specified'),
    'system'
  );
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  RAISE NOTICE 'Migration 036 complete: notify_admin_new_signup no longer throws on enum concatenation.';
END $$;
