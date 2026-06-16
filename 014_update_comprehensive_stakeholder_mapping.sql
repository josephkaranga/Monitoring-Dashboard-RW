-- ============================================================
-- COMPREHENSIVE STAKEHOLDER MAPPING UPDATE
-- Update NBSAP targets with complete stakeholder mappings from indicators
-- ============================================================

-- Update NBSAP targets with comprehensive stakeholder mappings based on actual indicator data
UPDATE public.nbsap_targets SET responsible_stakeholders = CASE 
  WHEN id = 1 THEN ARRAY['REMA', 'Ministry of Environment', 'MINAGRI', 'MININFRA', 'RDB']
  WHEN id = 2 THEN ARRAY['REMA', 'RFA', 'District Authorities']
  WHEN id = 3 THEN ARRAY['RDB', 'REMA', 'District Authorities']
  WHEN id = 4 THEN ARRAY['RDB', 'REMA', 'Conservation NGOs']
  WHEN id = 5 THEN ARRAY['MINAGRI', 'RAB', 'RFA', 'REMA']
  WHEN id = 6 THEN ARRAY['REMA', 'RDB', 'MINAGRI', 'RFA', 'Research Institutions']
  WHEN id = 7 THEN ARRAY['REMA', 'MINAGRI', 'WASAC', 'City of Kigali', 'MINICOM']
  WHEN id = 8 THEN ARRAY['REMA', 'Ministry of Environment', 'District Authorities', 'MINAGRI', 'RFA', 'MINEMA']
  WHEN id = 9 THEN ARRAY['RDB', 'MINAGRI', 'RAB', 'District Authorities', 'REMA', 'Research Institutions']
  WHEN id = 10 THEN ARRAY['MINAGRI', 'RAB', 'RFA', 'REMA', 'District Authorities']
  WHEN id = 11 THEN ARRAY['REMA', 'MINAGRI', 'RFA', 'WASAC', 'Meteo Rwanda', 'Ministry of Health']
  WHEN id = 12 THEN ARRAY['City of Kigali', 'MININFRA', 'RFA', 'REMA']
  WHEN id = 13 THEN ARRAY['REMA', 'Research Institutions', 'Ministry of Justice']
  WHEN id = 14 THEN ARRAY['REMA', 'All Sector Ministries', 'Ministry of Environment', 'District Authorities', 'NGOs']
  WHEN id = 15 THEN ARRAY['Private Sector', 'REMA', 'Ministry of Finance', 'Private Sector Federation']
  WHEN id = 16 THEN ARRAY['REMA', 'City of Kigali', 'MINICOM', 'NISR']
  WHEN id = 17 THEN ARRAY['REMA', 'Research Institutions', 'Ministry of Health', 'FDA', 'RBS']
  WHEN id = 18 THEN ARRAY['MINECOFIN', 'REMA', 'All Sector Ministries', 'MINAGRI']
  WHEN id = 19 THEN ARRAY['MINECOFIN', 'REMA', 'FONERWA', 'Private Sector']
  WHEN id = 20 THEN ARRAY['REMA', 'Universities', 'Research Institutions', 'Ministry of Education', 'NGOs', 'Sector Ministries']
  WHEN id = 21 THEN ARRAY['REMA', 'NISR', 'Research Institutions', 'Ministry of Education', 'Sector Ministries']
  WHEN id = 22 THEN ARRAY['REMA', 'District Authorities', 'MIGEPROF']
  ELSE ARRAY['REMA']
END
WHERE id BETWEEN 1 AND 22;

-- Log the update operation
DO $$
BEGIN
    RAISE NOTICE 'Updated NBSAP targets with comprehensive stakeholder mappings based on indicator responsibilities';
    RAISE NOTICE 'Total stakeholders now mapped: 31 unique stakeholders across 22 targets';
    RAISE NOTICE 'Updated targets: 1-22 with complete stakeholder assignments from indicators database';
END $$;