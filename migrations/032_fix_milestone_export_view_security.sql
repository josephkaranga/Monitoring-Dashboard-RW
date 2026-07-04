-- Migration 032: fix security_invoker on milestone_export_view
--
-- The Supabase security advisor flags views that run with the
-- owner's permissions (SECURITY DEFINER) rather than the
-- querying user's permissions (SECURITY INVOKER).
--
-- ALTER VIEW ... SET (security_invoker = on) switches the view
-- to SECURITY INVOKER without requiring a DROP + recreate, so
-- the view definition does not need to be repeated here.

ALTER VIEW public.milestone_export_view SET (security_invoker = on);
