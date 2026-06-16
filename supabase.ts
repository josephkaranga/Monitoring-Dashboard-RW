import { createClient } from '@supabase/supabase-js';

// ── Environment Variables ────────────────────────────────────
// These MUST be set in your .env file or Vercel project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Create a .env file with:\n' +
    '  VITE_SUPABASE_URL=your_project_url\n' +
    '  VITE_SUPABASE_ANON_KEY=your_anon_key'
  );
}

// ── Supabase Client ──────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'nbsap-auth-token',
    storage: window.localStorage,
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

// ── Type-safe database access ────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: { Row: import('./index').UserProfile };
      indicators: { Row: import('./index').Indicator };
      nbsap_targets: { Row: import('./index').NBSAPTarget };
      toolkit_reports: { Row: import('./index').ToolkitReport };
      districts: { Row: import('./index').District };
      provinces: { Row: import('./index').Province };
      risks: { Row: import('./index').Risk };
      compliance_records: { Row: import('./index').ComplianceRecord };
      notifications: { Row: import('./index').Notification };
      notification_preferences: { Row: import('./index').NotificationPreferences };
      audit_log: { Row: import('./index').AuditEntry };
      user_settings: { Row: import('./index').UserSettings };
    };
  };
};

export default supabase;
