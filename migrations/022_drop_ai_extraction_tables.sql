-- ============================================================
-- Migration 022: Remove AI Extraction Layer
-- Drops ai_extraction_proposals and ai_extractions tables
-- ============================================================

DROP TABLE IF EXISTS public.ai_extraction_proposals CASCADE;
DROP TABLE IF EXISTS public.ai_extractions CASCADE;
