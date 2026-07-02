-- ============================================================
-- Migration 026: Workshop Consistency Fixes
-- ============================================================
-- Source: REMA Training Workshop Report, 27–30 April 2026,
-- Karongi District — "Mainstreaming and Implementation of
-- Rwanda's National Biodiversity Strategy and Action Plan
-- (NBSAP) 2025–2030".
--
-- Adds institutions that participants explicitly committed to
-- during the workshop but were absent from migration 025:
--
--   T6  + Rwanda Civil Aviation (biosecurity at entry points)
--   T7  + RSB, RICA, ARCOS, Nature Rwanda, Partners for Conservation,
--          ARECO, RYBN, NIRDA, GIZ, One Acre Fund
--         (organic fertilisers, IPM, pesticide assessment, re-use/recycling)
--   T9  + FDA, CoEB (medicinal plants value chain)
--   T13 + RDB, NCST, RICA (ABS baseline, crop genetic materials)
--
-- Safe to run after 026: uses array_cat + DISTINCT subquery to
-- avoid duplicates regardless of order migrations run.
-- ============================================================

UPDATE public.nbsap_targets
SET
  responsible_stakeholders = ARRAY(
    SELECT DISTINCT unnest(
      array_cat(
        responsible_stakeholders,
        ARRAY['Rwanda Civil Aviation']
      )
    )
  ),
  updated_at = NOW()
WHERE id = 6;

UPDATE public.nbsap_targets
SET
  responsible_stakeholders = ARRAY(
    SELECT DISTINCT unnest(
      array_cat(
        responsible_stakeholders,
        ARRAY['RSB','RICA','ARCOS','Nature Rwanda',
              'Partners for Conservation','ARECO','RYBN',
              'NIRDA','GIZ','One Acre Fund']
      )
    )
  ),
  updated_at = NOW()
WHERE id = 7;

UPDATE public.nbsap_targets
SET
  responsible_stakeholders = ARRAY(
    SELECT DISTINCT unnest(
      array_cat(
        responsible_stakeholders,
        ARRAY['FDA','CoEB']
      )
    )
  ),
  updated_at = NOW()
WHERE id = 9;

UPDATE public.nbsap_targets
SET
  responsible_stakeholders = ARRAY(
    SELECT DISTINCT unnest(
      array_cat(
        responsible_stakeholders,
        ARRAY['RDB','NCST','RICA']
      )
    )
  ),
  updated_at = NOW()
WHERE id = 13;

DO $$
BEGIN
  RAISE NOTICE 'Migration 026 complete: workshop consistency fixes applied to T6, T7, T9, T13.';
END $$;
