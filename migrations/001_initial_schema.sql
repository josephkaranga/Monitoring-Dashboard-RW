-- ============================================================
-- NBSAP MONITORING SYSTEM — SUPABASE SCHEMA
-- Rwanda National Biodiversity Strategy & Action Plan 2025-2030
-- ============================================================

-- ── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'policy_monitoring',      -- National policymakers (read-only strategic)
  'sector_reporting',       -- Sector ministries (upload + review)
  'local_reporting',        -- District authorities (entry + validation)
  'dashboard_management',   -- REMA administrators (full access)
  'programme_alignment'     -- Development partners (analytical view)
);

CREATE TYPE indicator_status AS ENUM ('on-track', 'at-risk', 'behind');
CREATE TYPE indicator_tier AS ENUM ('headline', 'component', 'complementary', 'binary');
CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE district_status AS ENUM ('submitted', 'pending', 'missing');
CREATE TYPE report_type AS ENUM ('T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07');
CREATE TYPE risk_level AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE gbf_goal AS ENUM ('A', 'B', 'C', 'D');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ── USER PROFILES (extends Supabase auth.users) ──────────────
CREATE TABLE public.profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  full_name        TEXT,
  role             user_role NOT NULL DEFAULT 'policy_monitoring',
  organization     TEXT,
  department       TEXT,
  phone            TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  last_login       TIMESTAMPTZ,
  avatar_initials  TEXT GENERATED ALWAYS AS (
    UPPER(LEFT(COALESCE(full_name, email), 2))
  ) STORED,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROVINCES ────────────────────────────────────────────────
CREATE TABLE public.provinces (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.provinces (name) VALUES
  ('Kigali'), ('South'), ('North'), ('West'), ('East');

-- ── DISTRICTS ────────────────────────────────────────────────
CREATE TABLE public.districts (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  province_id    INTEGER REFERENCES public.provinces(id),
  status         district_status DEFAULT 'missing',
  compliance     INTEGER DEFAULT 0 CHECK (compliance BETWEEN 0 AND 100),
  forest_cover   INTEGER DEFAULT 0 CHECK (forest_cover BETWEEN 0 AND 100),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.districts (name, province_id, status, compliance, forest_cover) VALUES
  ('Kigali City',  1, 'submitted', 92, 18),
  ('Nyarugenge',   1, 'submitted', 88, 12),
  ('Gasabo',       1, 'submitted', 91, 15),
  ('Kicukiro',     1, 'submitted', 89, 14),
  ('Nyanza',       2, 'submitted', 85, 28),
  ('Gisagara',     2, 'pending',   72, 22),
  ('Nyaruguru',    2, 'submitted', 80, 35),
  ('Huye',         2, 'submitted', 87, 26),
  ('Kamonyi',      2, 'pending',   70, 20),
  ('Ruhango',      2, 'submitted', 82, 24),
  ('Muhanga',      2, 'submitted', 84, 21),
  ('Gakenke',      3, 'missing',   58, 42),
  ('Musanze',      3, 'submitted', 86, 38),
  ('Burera',       3, 'submitted', 83, 40),
  ('Rulindo',      3, 'missing',   60, 36),
  ('Gicumbi',      3, 'submitted', 81, 32),
  ('Rubavu',       4, 'submitted', 88, 30),
  ('Nyabihu',      4, 'submitted', 82, 29),
  ('Ngororero',    4, 'pending',   74, 27),
  ('Karongi',      4, 'submitted', 85, 33),
  ('Rutsiro',      4, 'submitted', 79, 31),
  ('Rusizi',       4, 'submitted', 83, 35),
  ('Nyamasheke',   4, 'submitted', 80, 37),
  ('Rwamagana',    5, 'submitted', 86, 19),
  ('Nyagatare',    5, 'submitted', 84, 16),
  ('Gatsibo',      5, 'submitted', 78, 18),
  ('Kayonza',      5, 'submitted', 80, 17),
  ('Kirehe',       5, 'submitted', 77, 20),
  ('Ngoma',        5, 'submitted', 81, 21),
  ('Bugesera',     5, 'submitted', 83, 23);

-- ── NBSAP TARGETS ────────────────────────────────────────────
CREATE TABLE public.nbsap_targets (
  id          INTEGER PRIMARY KEY,
  goal        gbf_goal NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  baseline    TEXT,
  progress    INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDICATORS ───────────────────────────────────────────────
CREATE TABLE public.indicators (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  definition      TEXT,
  tier            indicator_tier NOT NULL,
  nbsap_target_id INTEGER REFERENCES public.nbsap_targets(id),
  target_2030     TEXT,
  baseline        TEXT,
  midterm         TEXT,
  final_target    TEXT,
  current_value   TEXT,
  progress        INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status          indicator_status DEFAULT 'behind',
  km_gbf          TEXT,
  periodicity     TEXT,
  data_source     TEXT,
  responsible     TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── TOOLKIT REPORTS ──────────────────────────────────────────
CREATE TABLE public.toolkit_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id         report_type NOT NULL,
  tool_name       TEXT NOT NULL,
  submitted_by    UUID REFERENCES public.profiles(id),
  status          submission_status DEFAULT 'pending',
  reviewed_by     UUID REFERENCES public.profiles(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  period          TEXT,
  -- Dynamic form fields stored as JSONB for flexibility
  form_data       JSONB NOT NULL DEFAULT '{}',
  attachments     JSONB DEFAULT '[]',
  -- Denormalized for fast querying
  district        TEXT,
  institution     TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REPORT ATTACHMENTS ───────────────────────────────────────
CREATE TABLE public.report_attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id   UUID REFERENCES public.toolkit_reports(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_ext    TEXT,
  file_size   BIGINT,
  storage_path TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RISK REGISTER ────────────────────────────────────────────
CREATE TABLE public.risks (
  id          TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  likelihood  TEXT NOT NULL,
  impact      TEXT NOT NULL,
  level       risk_level NOT NULL,
  mitigation  TEXT,
  owner       TEXT,
  is_live     BOOLEAN DEFAULT FALSE, -- auto-generated from submissions
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMPLIANCE RECORDS ───────────────────────────────────────
CREATE TABLE public.compliance_records (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT NOT NULL,
  description    TEXT,
  severity       TEXT CHECK (severity IN ('High', 'Medium', 'Low')),
  district       TEXT,
  flagged_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ,
  resolved_by    UUID REFERENCES public.profiles(id),
  is_resolved    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info', -- info, warning, error, success
  is_read     BOOLEAN DEFAULT FALSE,
  action_tab  TEXT,
  action_label TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATION PREFERENCES ─────────────────────────────────
CREATE TABLE public.notification_preferences (
  user_id                   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  email                     TEXT,
  phone                     TEXT,
  sub_overdue               BOOLEAN DEFAULT TRUE,
  sub_compliance            BOOLEAN DEFAULT TRUE,
  compliance_threshold      INTEGER DEFAULT 60,
  sub_deadlines             BOOLEAN DEFAULT TRUE,
  deadline_days             INTEGER DEFAULT 14,
  sub_pending               BOOLEAN DEFAULT TRUE,
  sub_finance               BOOLEAN DEFAULT TRUE,
  sub_risk                  BOOLEAN DEFAULT TRUE,
  watchlist_indicators      INTEGER[],
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id),
  action_type TEXT NOT NULL, -- submit, approve, reject, export, view, login, delete
  action      TEXT NOT NULL,
  detail      TEXT,
  role        TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── DASHBOARD SETTINGS ───────────────────────────────────────
CREATE TABLE public.user_settings (
  user_id             UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_live_stats     BOOLEAN DEFAULT TRUE,
  animate_bars        BOOLEAN DEFAULT TRUE,
  compact_sidebar     BOOLEAN DEFAULT FALSE,
  auto_refresh        BOOLEAN DEFAULT TRUE,
  show_baseline       BOOLEAN DEFAULT TRUE,
  require_verification BOOLEAN DEFAULT TRUE,
  species_fuzzing     BOOLEAN DEFAULT FALSE,
  mask_species_names  BOOLEAN DEFAULT FALSE,
  restrict_raw_export BOOLEAN DEFAULT TRUE,
  log_exports         BOOLEAN DEFAULT TRUE,
  language            TEXT DEFAULT 'en',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_toolkit_reports_tool_id ON public.toolkit_reports(tool_id);
CREATE INDEX idx_toolkit_reports_submitted_by ON public.toolkit_reports(submitted_by);
CREATE INDEX idx_toolkit_reports_status ON public.toolkit_reports(status);
CREATE INDEX idx_toolkit_reports_submitted_at ON public.toolkit_reports(submitted_at DESC);
CREATE INDEX idx_indicators_target ON public.indicators(nbsap_target_id);
CREATE INDEX idx_indicators_tier ON public.indicators(tier);
CREATE INDEX idx_indicators_status ON public.indicators(status);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolkit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nbsap_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get current user role ───────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_role(check_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = check_role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN (
    'sector_reporting',
    'local_reporting',
    'dashboard_management'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'dashboard_management';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── PROFILES POLICIES ────────────────────────────────────────
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE
  USING (is_admin());

-- ── INDICATORS POLICIES ──────────────────────────────────────
-- All authenticated users can read indicators
CREATE POLICY "Authenticated users read indicators"
  ON public.indicators FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins and sector reporters can update indicators
CREATE POLICY "Writers can update indicators"
  ON public.indicators FOR UPDATE
  USING (can_write());

CREATE POLICY "Admins can insert indicators"
  ON public.indicators FOR INSERT
  WITH CHECK (is_admin());

-- ── NBSAP TARGETS POLICIES ───────────────────────────────────
CREATE POLICY "All authenticated read targets"
  ON public.nbsap_targets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage targets"
  ON public.nbsap_targets FOR ALL
  USING (is_admin());

-- ── DISTRICTS POLICIES ───────────────────────────────────────
CREATE POLICY "All authenticated read districts"
  ON public.districts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Local reporters update own district data"
  ON public.districts FOR UPDATE
  USING (
    get_user_role() IN ('local_reporting', 'dashboard_management')
  );

-- ── TOOLKIT REPORTS POLICIES ─────────────────────────────────
-- All authenticated can read reports (filtered by RLS per role)
CREATE POLICY "Policy monitors read all reports (read-only)"
  ON public.toolkit_reports FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    get_user_role() IN ('policy_monitoring', 'dashboard_management', 'programme_alignment')
  );

-- Sector reporters read all; local reporters read own district
CREATE POLICY "Sector reporters read all reports"
  ON public.toolkit_reports FOR SELECT
  USING (
    get_user_role() = 'sector_reporting'
  );

CREATE POLICY "Local reporters read own submissions"
  ON public.toolkit_reports FOR SELECT
  USING (
    get_user_role() = 'local_reporting' AND
    submitted_by = auth.uid()
  );

-- Writers can insert reports
CREATE POLICY "Writers submit reports"
  ON public.toolkit_reports FOR INSERT
  WITH CHECK (
    can_write() AND submitted_by = auth.uid()
  );

-- Admins and sector reporters can update status
CREATE POLICY "Reviewers update report status"
  ON public.toolkit_reports FOR UPDATE
  USING (
    get_user_role() IN ('sector_reporting', 'dashboard_management')
  );

-- Only admins can delete
CREATE POLICY "Admins delete reports"
  ON public.toolkit_reports FOR DELETE
  USING (is_admin());

-- ── RISKS POLICIES ───────────────────────────────────────────
CREATE POLICY "All authenticated read risks"
  ON public.risks FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage risks"
  ON public.risks FOR ALL
  USING (is_admin());

-- ── COMPLIANCE POLICIES ──────────────────────────────────────
CREATE POLICY "All authenticated read compliance"
  ON public.compliance_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Writers insert compliance records"
  ON public.compliance_records FOR INSERT
  WITH CHECK (can_write());

CREATE POLICY "Admins manage compliance"
  ON public.compliance_records FOR UPDATE
  USING (is_admin());

-- ── NOTIFICATIONS POLICIES ───────────────────────────────────
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System/admins insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR is_admin()
  );

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ── NOTIFICATION PREFERENCES POLICIES ───────────────────────
CREATE POLICY "Users manage own preferences"
  ON public.notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- ── AUDIT LOG POLICIES ───────────────────────────────────────
CREATE POLICY "Users read own audit entries"
  ON public.audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all audit entries"
  ON public.audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Authenticated users insert audit entries"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ── USER SETTINGS POLICIES ───────────────────────────────────
CREATE POLICY "Users manage own settings"
  ON public.user_settings FOR ALL
  USING (user_id = auth.uid());

-- ── REPORT ATTACHMENTS POLICIES ──────────────────────────────
CREATE POLICY "Report submitters read attachments"
  ON public.report_attachments FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      uploaded_by = auth.uid() OR
      is_admin() OR
      get_user_role() IN ('sector_reporting', 'policy_monitoring', 'programme_alignment')
    )
  );

CREATE POLICY "Writers upload attachments"
  ON public.report_attachments FOR INSERT
  WITH CHECK (can_write() AND uploaded_by = auth.uid());

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'policy_monitoring'
    )
  );
  -- Create default settings
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  -- Create default notification preferences
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_indicators
  BEFORE UPDATE ON public.indicators
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_toolkit_reports
  BEFORE UPDATE ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- STORAGE BUCKETS (Run in Supabase Storage settings or SQL)
-- ============================================================

-- Insert storage bucket config
INSERT INTO storage.buckets (id, name, public) VALUES
  ('report-attachments', 'report-attachments', FALSE),
  ('exports', 'exports', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Writers upload report attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users read own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admin delete attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'report-attachments' AND
    (SELECT is_admin())
  );
