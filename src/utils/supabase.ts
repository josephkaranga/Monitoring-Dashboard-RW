import { createClient } from '@supabase/supabase-js';

// ── Environment Variables ────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Supabase configuration is missing.

Expected environment variables:
  VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  VITE_SUPABASE_ANON_KEY=<your-anon-key>

Did you forget to create a .env file, or configure your deployment
environment variables (Vercel, Docker, server .env)?`
  );
}

// ── Supabase Client ──────────────────────────────────────────
// SSR-safe: guard all window references so the client can be
// imported in Next.js, Remix, Astro, or any SSR environment
// without crashing on the server side.
export { supabaseUrl };
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'nbsap-auth-token',
    // Guard: localStorage does not exist in SSR environments
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'nbsap-monitoring',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ── Auth error handling ──────────────────────────────────────
// Invalid / expired refresh tokens are handled entirely via
// supabase.auth.onAuthStateChange in AuthContext.tsx.
// Supabase JS v2 emits SIGNED_OUT automatically when a token
// refresh fails, so no fetch interception is needed here.

// ── Type-safe database access ────────────────────────────────
// Manually maintained until `supabase gen types typescript`
// is run post-migration to the National Data Center server.
export type Database = {
  public: {
    Tables: {
      profiles:                 { Row: import('../types/index').UserProfile };
      indicators:               { Row: import('../types/index').Indicator };
      nbsap_targets:            { Row: import('../types/index').NBSAPTarget };
      toolkit_reports:          { Row: import('../types/index').ToolkitReport };
      districts:                { Row: import('../types/index').District };
      provinces:                { Row: import('../types/index').Province };
      risks:                    { Row: import('../types/index').Risk };
      compliance_records:       { Row: import('../types/index').ComplianceRecord };
      notifications:            { Row: import('../types/index').Notification };
      notification_preferences: { Row: import('../types/index').NotificationPreferences };
      audit_log:                { Row: import('../types/index').AuditEntry };
      user_settings:            { Row: import('../types/index').UserSettings };
    };
  };
};

export default supabase;
