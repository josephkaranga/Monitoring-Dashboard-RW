-- ============================================================
-- AUTOMATIC REPORTING UPDATES — TOOL WEIGHTS & ORGANIZATION CONFIG
-- Schema enhancements supporting the tool-weighted Progress Calculator
-- ============================================================

-- ── 1. Tool weight configuration table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.tool_weights (
  tool_id VARCHAR(3) PRIMARY KEY,
  weight DECIMAL(4,3) NOT NULL,
  description TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.tool_weights (tool_id, weight, description, active) VALUES
  ('T01', 0.250, 'National Institutional Reporting', true),
  ('T02', 0.200, 'District Biodiversity Monitoring', true),
  ('T03', 0.150, 'Protected Area Monitoring', true),
  ('T04', 0.150, 'Community Biodiversity Monitoring', true),
  ('T05', 0.100, 'Biodiversity Finance Tracking', true),
  ('T06', 0.100, 'Private Sector Compliance', true),
  ('T07', 0.050, 'Research & Academic Contribution', true)
ON CONFLICT (tool_id) DO NOTHING;

-- ── 2. Automatic update tracking fields on nbsap_targets ────────
ALTER TABLE public.nbsap_targets ADD COLUMN IF NOT EXISTS last_auto_update TIMESTAMPTZ;
ALTER TABLE public.nbsap_targets ADD COLUMN IF NOT EXISTS auto_update_count INTEGER DEFAULT 0;

-- ── 3. Organization configuration table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_name TEXT NOT NULL UNIQUE,
  automatic_updates_enabled BOOLEAN DEFAULT true,
  require_verification BOOLEAN DEFAULT false,
  audit_level TEXT DEFAULT 'standard' CHECK (audit_level IN ('minimal', 'standard', 'comprehensive')),
  processing_timeout INTEGER DEFAULT 30,
  enable_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Indexes for performance ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tool_weights_active ON public.tool_weights(active);
CREATE INDEX IF NOT EXISTS idx_organization_configs_name ON public.organization_configs(organization_name);
CREATE INDEX IF NOT EXISTS idx_nbsap_targets_last_auto_update ON public.nbsap_targets(last_auto_update);

-- ── 5. Helper function for tool weight lookup ─────────────────────
CREATE OR REPLACE FUNCTION public.get_tool_weight(p_tool_id TEXT)
RETURNS DECIMAL AS $$
  SELECT COALESCE(
    (SELECT weight FROM public.tool_weights WHERE tool_id = p_tool_id AND active = true),
    0.05
  );
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION public.get_tool_weight(TEXT) TO authenticated;

-- ── 6. Row level security ──────────────────────────────────────────
ALTER TABLE public.tool_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tool weights"
  ON public.tool_weights FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage tool weights"
  ON public.tool_weights FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can read organization configs"
  ON public.organization_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage organization configs"
  ON public.organization_configs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── 7. Grants ─────────────────────────────────────────────────────
GRANT SELECT ON public.tool_weights TO authenticated;
GRANT SELECT ON public.organization_configs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tool_weights TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organization_configs TO authenticated;

-- ── 8. Comments ───────────────────────────────────────────────────
COMMENT ON TABLE public.tool_weights IS 'Tool-specific weight factors (T01-T07) used by the Progress Calculator for weighted target progress contributions';
COMMENT ON TABLE public.organization_configs IS 'Per-organization settings controlling automatic report processing and audit detail';
COMMENT ON COLUMN public.nbsap_targets.last_auto_update IS 'Timestamp of the most recent automatic progress update';
COMMENT ON COLUMN public.nbsap_targets.auto_update_count IS 'Number of automatic progress updates applied to this target';
COMMENT ON FUNCTION public.get_tool_weight(TEXT) IS 'Returns the active weight factor for a reporting tool, defaulting to 0.05 for unknown tools';
