-- ============================================================
-- LAKES TABLE MIGRATION
-- Migration: 008_add_lakes_table.sql
-- Purpose: Add major lakes GIS layer for biodiversity monitoring
-- Requirements: 3.1, 3.9
-- ============================================================

-- ── CREATE LAKES TABLE ───────────────────────────────────────
CREATE TABLE public.lakes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  area_km2 NUMERIC(10, 2),
  max_depth_m INTEGER,
  elevation_m INTEGER,
  ecological_significance TEXT,
  related_indicators INTEGER[], -- Array of indicator IDs
  geometry JSONB NOT NULL, -- GeoJSON geometry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ADD TABLE COMMENT ────────────────────────────────────────
COMMENT ON TABLE public.lakes IS 
'Major lakes in Rwanda for biodiversity monitoring and aquatic ecosystem analysis. 
Includes 11 major lakes with geographic data and ecological information.';

COMMENT ON COLUMN public.lakes.name IS 'Lake name (e.g., Lake Kivu, Lake Muhazi)';
COMMENT ON COLUMN public.lakes.area_km2 IS 'Surface area in square kilometers';
COMMENT ON COLUMN public.lakes.max_depth_m IS 'Maximum depth in meters';
COMMENT ON COLUMN public.lakes.elevation_m IS 'Elevation above sea level in meters';
COMMENT ON COLUMN public.lakes.ecological_significance IS 'Description of ecological importance and biodiversity value';
COMMENT ON COLUMN public.lakes.related_indicators IS 'Array of indicator IDs related to this lake';
COMMENT ON COLUMN public.lakes.geometry IS 'GeoJSON geometry (Polygon) for lake boundaries';

-- ── CREATE INDEXES ───────────────────────────────────────────
CREATE INDEX idx_lakes_name ON public.lakes(name);

-- ── ENABLE ROW LEVEL SECURITY ────────────────────────────────
ALTER TABLE public.lakes ENABLE ROW LEVEL SECURITY;

-- ── CREATE RLS POLICIES ──────────────────────────────────────
-- All authenticated users can read lakes
CREATE POLICY "Authenticated users read lakes"
  ON public.lakes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert lakes
CREATE POLICY "Admins insert lakes"
  ON public.lakes FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update lakes
CREATE POLICY "Admins update lakes"
  ON public.lakes FOR UPDATE
  USING (is_admin());

-- Only admins can delete lakes
CREATE POLICY "Admins delete lakes"
  ON public.lakes FOR DELETE
  USING (is_admin());

-- ── ADD UPDATED_AT TRIGGER ───────────────────────────────────
CREATE TRIGGER set_updated_at_lakes
  BEFORE UPDATE ON public.lakes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── ADD AUDIT LOG ENTRY ──────────────────────────────────────
INSERT INTO public.audit_log (user_id, action_type, action, detail, role)
VALUES (
  NULL,
  'schema_migration',
  'Created lakes table',
  'Migration 008: Added lakes table with RLS policies for major lakes GIS layer',
  'system'
);
