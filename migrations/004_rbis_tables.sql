-- ============================================================
-- RBIS COMPREHENSIVE DASHBOARD — DATABASE MIGRATION
-- Rwanda Biodiversity Information System Integration
-- ============================================================

-- ── RBIS DATA STREAMS TABLE ──────────────────────────────────
-- Stores predefined RBIS data stream definitions mapped to targets
CREATE TABLE IF NOT EXISTS public.rbis_data_streams (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_numbers INTEGER[] NOT NULL,
  occurrence_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'error')),
  error_message TEXT,
  last_update TIMESTAMPTZ,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RBIS LINKAGES TABLE ──────────────────────────────────────
-- Maps indicators to RBIS data streams with linkage status
CREATE TABLE IF NOT EXISTS public.rbis_linkages (
  id SERIAL PRIMARY KEY,
  indicator_id INTEGER NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  data_stream_id VARCHAR(100) NOT NULL REFERENCES public.rbis_data_streams(id) ON DELETE CASCADE,
  linkage_status VARCHAR(20) NOT NULL CHECK (linkage_status IN ('linked', 'not-linked', 'partial')),
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(indicator_id, data_stream_id)
);

-- ── RBIS CONNECTION LOG TABLE ────────────────────────────────
-- Tracks RBIS connection events for monitoring and debugging
CREATE TABLE IF NOT EXISTS public.rbis_connection_log (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  server_url VARCHAR(255) NOT NULL,
  error_message TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================

-- Index for querying linkages by indicator
CREATE INDEX IF NOT EXISTS idx_rbis_linkages_indicator 
  ON public.rbis_linkages(indicator_id);

-- Index for querying linkages by data stream
CREATE INDEX IF NOT EXISTS idx_rbis_linkages_stream 
  ON public.rbis_linkages(data_stream_id);

-- Index for querying linkages by status
CREATE INDEX IF NOT EXISTS idx_rbis_linkages_status 
  ON public.rbis_linkages(linkage_status);

-- Index for querying data streams by status
CREATE INDEX IF NOT EXISTS idx_rbis_streams_status 
  ON public.rbis_data_streams(status);

-- Index for querying connection log by timestamp (most recent first)
CREATE INDEX IF NOT EXISTS idx_rbis_connection_log_created 
  ON public.rbis_connection_log(created_at DESC);

-- Index for querying connection log by user
CREATE INDEX IF NOT EXISTS idx_rbis_connection_log_user 
  ON public.rbis_connection_log(user_id);

-- Index for querying connection log by status
CREATE INDEX IF NOT EXISTS idx_rbis_connection_log_status 
  ON public.rbis_connection_log(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all RBIS tables
ALTER TABLE public.rbis_data_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbis_linkages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbis_connection_log ENABLE ROW LEVEL SECURITY;

-- ── RBIS DATA STREAMS POLICIES ───────────────────────────────
-- All authenticated users can read data streams
CREATE POLICY "Authenticated users read data streams"
  ON public.rbis_data_streams FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete data streams
CREATE POLICY "Admins manage data streams"
  ON public.rbis_data_streams FOR ALL
  USING (is_admin());

-- ── RBIS LINKAGES POLICIES ───────────────────────────────────
-- All authenticated users can read linkages
CREATE POLICY "Authenticated users read linkages"
  ON public.rbis_linkages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Writers (sector_reporting, local_reporting, dashboard_management) can update linkages
CREATE POLICY "Writers update linkages"
  ON public.rbis_linkages FOR UPDATE
  USING (can_write());

-- Only admins can insert/delete linkages
CREATE POLICY "Admins manage linkages"
  ON public.rbis_linkages FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins delete linkages"
  ON public.rbis_linkages FOR DELETE
  USING (is_admin());

-- ── RBIS CONNECTION LOG POLICIES ─────────────────────────────
-- All authenticated users can read connection logs
CREATE POLICY "Authenticated users read connection logs"
  ON public.rbis_connection_log FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can insert connection logs (for tracking their own connections)
CREATE POLICY "Authenticated users log connections"
  ON public.rbis_connection_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete connection logs
CREATE POLICY "Admins delete connection logs"
  ON public.rbis_connection_log FOR DELETE
  USING (is_admin());

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================

-- Auto-update updated_at for rbis_data_streams
CREATE TRIGGER set_updated_at_rbis_data_streams
  BEFORE UPDATE ON public.rbis_data_streams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update updated_at for rbis_linkages
CREATE TRIGGER set_updated_at_rbis_linkages
  BEFORE UPDATE ON public.rbis_linkages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE public.rbis_data_streams IS 
  'RBIS data stream definitions mapped to NBSAP targets with live occurrence counts';

COMMENT ON TABLE public.rbis_linkages IS 
  'Maps indicators to RBIS data streams with linkage status tracking';

COMMENT ON TABLE public.rbis_connection_log IS 
  'Audit log for RBIS connection events and errors';

COMMENT ON COLUMN public.rbis_data_streams.target_numbers IS 
  'Array of NBSAP target IDs that this data stream supports';

COMMENT ON COLUMN public.rbis_data_streams.occurrence_count IS 
  'Live count of biodiversity occurrence records from GBIF API';

COMMENT ON COLUMN public.rbis_linkages.linkage_status IS 
  'Status: linked (fully connected), partial (incomplete), not-linked (no connection)';

COMMENT ON COLUMN public.rbis_connection_log.status IS 
  'Connection status: connected, disconnected, connecting, error';
