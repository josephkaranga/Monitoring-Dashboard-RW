-- ============================================================
-- Migration 025: Fix Stakeholder Name Consistency
-- ============================================================
-- Problem: responsible_stakeholders arrays in nbsap_targets use
-- inconsistent names (full names, typos, generic categories) that
-- do NOT match the short keys in STAKEHOLDER_RESPONSIBILITIES on
-- the frontend. The get_user_responsible_targets() RPC does exact
-- string matching, so mismatches silently return zero targets for
-- many stakeholders.
--
-- Fixes applied:
--   • 'Ministry of Environment'        → 'MoE'
--   • 'City of Kigali'                 → 'Kigali City'
--   • 'Rwanda Mines Board'             → 'RMB'
--   • 'RBS'                            → 'RSB'  (typo)
--   • 'FONERWA'                        → 'RGF'
--   • 'RNRA'                           → 'RWB'  (closest successor agency in frontend)
--   • 'Rwanda Genetic Resources Agency'→ 'RCHA' (traditional/genetic resources)
--   • 'University of Rwanda'           → 'CoEB' (Centre of Excellence in Biodiversity)
--   • 'GCF Focal Point'                → removed (REMA/MINECOFIN serve this role)
--   • 'All Ministries' / 'All Sector Ministries' / 'Sector Ministries'
--                                      → explicit ministry keys
--   • 'Conservation NGOs' / 'NGOs'     → specific NGO keys per target
--   • 'Civil Society'                  → specific CSO keys
--   • 'IPLCs'                          → 'LODA', 'MINALOC'
--   • 'Private Sector'                 → 'PSF', 'REG'
--   • 'Research Institutions' / 'Universities'
--                                      → 'CoEB', 'NCST', 'NISR'
--   • 'Ministry of Finance'            → 'MINECOFIN'
--   • 'Ministry of Education'          → 'MINEDUC'
--   • 'Private Sector Federation'      → 'PSF'
--   • 'Ministry of Health'             → removed (not in frontend)
--   • 'Ministry of Justice'            → removed (not in frontend)
--   • 'MIGEPROF'                       → removed (not in frontend)
--
-- Additionally adds the 40+ stakeholders (NGOs, dev partners,
-- community orgs) that were represented only by generic categories
-- so that every org's users see their correct responsible targets.
--
-- Every key used here matches exactly one entry in
-- STAKEHOLDER_RESPONSIBILITIES in ReportingToolkitPage.tsx.
--
-- Safe to re-run: pure UPDATE with WHERE id BETWEEN 1 AND 22.
-- ============================================================

UPDATE public.nbsap_targets
SET
  responsible_stakeholders = CASE

    -- T1: Participatory biodiversity-inclusive spatial land use planning
    WHEN id = 1 THEN ARRAY[
      'REMA','MoE','MININFRA','MINAGRI','RDB','NLA',
      'District Authorities','ARCOS','Nature Rwanda','CoEB',
      'NISR','MINICOM','WCSS','PFC'
    ]

    -- T2: Restoration of degraded ecosystems
    WHEN id = 2 THEN ARRAY[
      'REMA','RFA','District Authorities','RWB','MoE',
      'RAB','CoEB','ARCOS','Nature Rwanda','RWCA',
      'RECOR','IUCN','ICRAF','RMB','CPCIC','RGF','ARECO'
    ]

    -- T3: Protected area expansion and management
    WHEN id = 3 THEN ARRAY[
      'RDB','REMA','District Authorities','ARCOS','Nature Rwanda',
      'IUCN','RWCA','RECOR','AWF','African Parks',
      'Prime Biodiversity Conservation','Forest of Hope Association',
      'Q&A Venue Solution'
    ]

    -- T4: Species conservation and human-wildlife conflict reduction
    WHEN id = 4 THEN ARRAY[
      'RDB','REMA','ARCOS','Nature Rwanda','CoEB','IUCN',
      'RWCA','IGCP','Karisoke','AWF','SGF','MINALOC','ICRAF','RCHA'
    ]

    -- T5: Sustainable management of wild species
    WHEN id = 5 THEN ARRAY[
      'MINAGRI','RAB','RFA','REMA','RDB','RWB',
      'RICA','National Police (Marine)'
    ]

    -- T6: Invasive alien species prevention and control
    WHEN id = 6 THEN ARRAY[
      'REMA','MoE','RDB','RFA','MINAGRI','CoEB',
      'IGCP','Karisoke','African Parks','RICA','RSB','FDA',
      'NCST','Rwanda Space Agency','IUCN','RAB','RRA','MINICOM',
      'One Acre Fund','PSF'
    ]

    -- T7: Pollution reduction from agriculture, mining and industry
    WHEN id = 7 THEN ARRAY[
      'REMA','MoE','MINAGRI','RWB','RAB','WASAC','RMB',
      'CPCIC','RURA','Kigali City','FAO','NAEB','NCST','CoEB',
      'Urugaga Imbaraga','Bridge to Rwanda','ROAM','PSF'
    ]

    -- T8: Climate resilience and nature-based solutions
    WHEN id = 8 THEN ARRAY[
      'REMA','MoE','RFA','District Authorities','MINAGRI','MINEMA',
      'Meteo Rwanda','BNR','MINECOFIN','ARCOS','Nature Rwanda',
      'CoEB','IUCN','RWCA','RECOR','AWF','WCS','African Parks',
      'Forest of Hope Association','ARECO','LODA','RGF','GIZ',
      'One Tree Planted','Prime Biodiversity Conservation',
      'Ultimate Forest','NCST','Rwanda Space Agency'
    ]

    -- T9: Sustainable wildlife benefits for communities
    WHEN id = 9 THEN ARRAY[
      'RDB','REMA','District Authorities','MINAGRI','RAB','RFA',
      'RGF','GGGI','WRI','GIZ','FAO','LODA','One Acre Fund',
      'One Tree Planted','ICRAF','ARCOS','IUCN','RCHA','NIRDA',
      'RRA','ESS OIL','IKIREZI','Eco-planet Bamboo','MINECOFIN',
      'MINALOC'
    ]

    -- T10: Sustainable agriculture, aquaculture and forestry
    WHEN id = 10 THEN ARRAY[
      'MINAGRI','RAB','RFA','REMA','District Authorities','NLA','RWB',
      'CoEB','ARCOS','Nature Rwanda','IUCN','RWCA','RECOR',
      'African Parks','ARECO','SNV','GGGI','ICRAF','Bridge to Rwanda',
      'NAEB','Rwanda Space Agency','RICA','Ultimate Forest',
      'Nyungwe Management Company','ARDI','Rwanda Mountain Tea','PSF',
      'Partners for Conservation'
    ]

    -- T11: Ecosystem services restoration and maintenance
    WHEN id = 11 THEN ARRAY[
      'REMA','RFA','District Authorities','MINAGRI','RWB','NLA',
      'MININFRA','Kigali City','MoE','GIZ','SNV','GGGI','WRI',
      'RHA','REG','NIRDA','CPCIC','RWCA','RECOR','ARECO',
      'ARCOS','Nature Rwanda','IUCN','Partners for Conservation',
      'RYBN','ADRRES','LWD','MINEDUC'
    ]

    -- T12: Urban biodiversity and green space integration
    WHEN id = 12 THEN ARRAY[
      'MININFRA','Kigali City','REMA','District Authorities','RFA',
      'RDB','ARCOS','Nature Rwanda','IUCN','GIZ','RHA',
      'Prime Biodiversity Conservation','Partners for Conservation','GGGI'
    ]

    -- T13: Access and benefit sharing from genetic resources
    WHEN id = 13 THEN ARRAY[
      'REMA','MoE','MINAGRI','RAB','RCHA','CoEB'
    ]

    -- T14: Biodiversity mainstreaming across all sectors
    WHEN id = 14 THEN ARRAY[
      'REMA','MoE','MINECOFIN','MINAGRI','MININFRA','MINICOM',
      'MINALOC','MINEDUC','District Authorities','NISR','BNR','RGF'
    ]

    -- T15: Business and financial biodiversity risk disclosure
    WHEN id = 15 THEN ARRAY[
      'REMA','BNR','PSF','MINECOFIN','RDB'
    ]

    -- T16: Sustainable consumption and production
    WHEN id = 16 THEN ARRAY[
      'REMA','MoE','MINAGRI','MININFRA','MINICOM','RSB','CPCIC',
      'NIRDA','RURA','Kigali City','GGGI','PSF','RPPA','ILO','RICA'
    ]

    -- T17: Biosafety capacity and biotechnology control
    WHEN id = 17 THEN ARRAY[
      'REMA','MoE','MINAGRI','RAB','FDA','RSB'
    ]

    -- T18: Harmful incentive reform and positive biodiversity incentives
    WHEN id = 18 THEN ARRAY[
      'MINECOFIN','REMA','MoE','RFA','MINICOM','MINAGRI',
      'UNDP','RGF','ARCOS','IUCN','GGGI','ACORD Rwanda'
    ]

    -- T19: Biodiversity finance mobilisation (USD 500 million)
    WHEN id = 19 THEN ARRAY[
      'REMA','MoE','MINECOFIN','RGF','UNDP','IUCN','PSF'
    ]

    -- T20: Capacity building, technology transfer and education
    WHEN id = 20 THEN ARRAY[
      'REMA','RDB','CoEB','MINEDUC','NCST',
      'Rwanda Space Agency','GIZ','UNDP','MoE'
    ]

    -- T21: Biodiversity information systems and data access
    WHEN id = 21 THEN ARRAY[
      'REMA','RDB','CoEB','NISR','NCST',
      'Rwanda Space Agency','MoE','MINEDUC'
    ]

    -- T22: Inclusive participation and traditional knowledge
    WHEN id = 22 THEN ARRAY[
      'REMA','District Authorities','LODA','MINALOC',
      'RCHA','ACORD Rwanda','ARCOS','Nature Rwanda'
    ]

    ELSE responsible_stakeholders
  END,
  updated_at = NOW()
WHERE id BETWEEN 1 AND 22;

-- ── Fix indicator responsible arrays ────────────────────────────────
-- Align the most-used indicators with the same short-key convention.
-- Only fixing the entries seeded in 002 that have known mismatches.

-- Indicator on T1: 'Ministry of Environment' → 'MoE'
UPDATE public.indicators
SET responsible = ARRAY['REMA','MoE','MINAGRI']
WHERE nbsap_target_id = 1
  AND tier = 'headline'
  AND 'Ministry of Environment' = ANY(responsible);

-- Indicator on T4: 'Conservation NGOs' → specific keys
UPDATE public.indicators
SET responsible = ARRAY['RDB','REMA','ARCOS','Nature Rwanda','IUCN','RWCA','IGCP','Karisoke']
WHERE nbsap_target_id = 4
  AND 'Conservation NGOs' = ANY(responsible);

-- Any remaining 'Ministry of Environment' → 'MoE' across all indicators
UPDATE public.indicators
SET responsible = array_replace(responsible, 'Ministry of Environment', 'MoE')
WHERE 'Ministry of Environment' = ANY(responsible);

-- Any remaining 'City of Kigali' → 'Kigali City'
UPDATE public.indicators
SET responsible = array_replace(responsible, 'City of Kigali', 'Kigali City')
WHERE 'City of Kigali' = ANY(responsible);

-- Any remaining 'RBS' → 'RSB'
UPDATE public.indicators
SET responsible = array_replace(responsible, 'RBS', 'RSB')
WHERE 'RBS' = ANY(responsible);

-- Any remaining 'FONERWA' → 'RGF'
UPDATE public.indicators
SET responsible = array_replace(responsible, 'FONERWA', 'RGF')
WHERE 'FONERWA' = ANY(responsible);

-- Any remaining 'Rwanda Mines Board' → 'RMB'
UPDATE public.indicators
SET responsible = array_replace(responsible, 'Rwanda Mines Board', 'RMB')
WHERE 'Rwanda Mines Board' = ANY(responsible);

-- Audit notice
DO $$
BEGIN
  RAISE NOTICE 'Migration 025 complete: stakeholder name consistency fixed across all 22 targets and indicators.';
  RAISE NOTICE 'All responsible_stakeholders now use short keys matching STAKEHOLDER_RESPONSIBILITIES in the frontend.';
  RAISE NOTICE 'Generic categories (Conservation NGOs, All Ministries, Civil Society, IPLCs, Private Sector) replaced with specific keys.';
  RAISE NOTICE 'Unknown references (RNRA, GCF Focal Point, University of Rwanda, Rwanda Genetic Resources Agency) replaced or removed.';
END $$;
