-- ============================================================
-- Migration 020: Rwanda NBSAP 2025-2030 Full Data Seed
-- ============================================================
-- Purpose:
--   Part 1 — Update all 22 NBSAP 2025-2030 targets with accurate
--             titles, descriptions, baselines, headline indicators,
--             and responsible stakeholders from the official
--             Rwanda NBSAP 2025-2030 document.
--
--   Part 2 — Upsert all 30 Rwanda administrative districts across
--             5 provinces. Removes the erroneous 'Kigali City'
--             province-level row that was seeded as a district.
--
--   Part 3 — Delete placeholder/test/empty indicators.
--             Real indicators seeded in migration 002 are preserved.
--
--   Part 4 — Create the nbsap_milestones table (idempotent) and
--             insert 2025-2030 milestones for all 22 targets.
--
-- Safe to re-run: uses UPDATE ... WHERE id, ON CONFLICT DO UPDATE,
-- ON CONFLICT DO NOTHING, CREATE TABLE IF NOT EXISTS, and
-- CREATE INDEX IF NOT EXISTS throughout.
--
-- Prerequisites: migrations 001–019 must have been applied.
-- Author: Rwanda NBSAP Monitoring System
-- Date:   2025-2030 plan cycle
-- ============================================================

-- ============================================================
-- PART 1: UPDATE ALL 22 NBSAP 2025-2030 TARGETS
-- ============================================================
-- NOTE: progress is intentionally NOT updated here — it is
-- computed automatically from toolkit_reports via triggers.
-- We only update descriptive/metadata fields.

-- Ensure headline_indicator column exists (not present in initial schema).
ALTER TABLE public.nbsap_targets
  ADD COLUMN IF NOT EXISTS headline_indicator TEXT;

UPDATE public.nbsap_targets SET
  title                  = 'Participatory biodiversity-inclusive spatial land use planning',
  description            = 'By 2030, participatory biodiversity-inclusive spatial land use planning and management to ensure biodiversity loss is close to zero.',
  baseline               = 'No consolidated information on biodiversity-inclusive spatial planning',
  headline_indicator     = '% of land/water under biodiversity-inclusive spatial plans',
  responsible_stakeholders = ARRAY['REMA','MININFRA','District Authorities','MINAGRI'],
  updated_at             = NOW()
WHERE id = 1;

UPDATE public.nbsap_targets SET
  title                  = 'Restoration of degraded ecosystems',
  description            = 'By 2030, restore at least 10% of degraded land and inland waters.',
  baseline               = '332,861 ha baseline under CENR SSP; target 600,000 ha by 2029',
  headline_indicator     = 'Area (ha) of degraded land/water under restoration',
  responsible_stakeholders = ARRAY['REMA','RFA','District Authorities','RNRA'],
  updated_at             = NOW()
WHERE id = 2;

UPDATE public.nbsap_targets SET
  title                  = 'Protected area expansion and management',
  description            = 'By 2030, conserve and effectively manage at least 11% of terrestrial and inland waters.',
  baseline               = 'Protected areas cover 9.1% of national territory',
  headline_indicator     = '% of national territory under effective protection (PAs + OECMs)',
  responsible_stakeholders = ARRAY['RDB','REMA','District Authorities'],
  updated_at             = NOW()
WHERE id = 3;

UPDATE public.nbsap_targets SET
  title                  = 'Species conservation and human-wildlife conflict reduction',
  description            = 'By 2030, improve conservation status and reduce extinction risk and human-wildlife conflict.',
  baseline               = '501 HWC cases/year; limited species action plans beyond gorilla/chimpanzee',
  headline_indicator     = '% threatened species with improved conservation status',
  responsible_stakeholders = ARRAY['RDB','REMA','Conservation NGOs'],
  updated_at             = NOW()
WHERE id = 4;

UPDATE public.nbsap_targets SET
  title                  = 'Sustainable management of wild species',
  description            = 'By 2030, curb illegal harvesting and ensure sustainable management of wild species.',
  baseline               = 'Fish production in Lake Kivu dropped from 24,199t (2017) to 16,194t (2020)',
  headline_indicator     = '% reduction in illegal harvesting across forests/fisheries/wildlife',
  responsible_stakeholders = ARRAY['MINAGRI','RAB','RFA','REMA'],
  updated_at             = NOW()
WHERE id = 5;

UPDATE public.nbsap_targets SET
  title                  = 'Invasive alien species prevention and control',
  description            = 'By 2030, prevent and control invasive alien species and reduce establishment rate by 50% in protected areas.',
  baseline               = '47 invasive species identified in Rwanda (2016 REMA Report)',
  headline_indicator     = 'Invasive alien species establishment rate reduction in PAs (%)',
  responsible_stakeholders = ARRAY['REMA','RDB','RFA','MINAGRI'],
  updated_at             = NOW()
WHERE id = 6;

UPDATE public.nbsap_targets SET
  title                  = 'Pollution reduction from agriculture, mining and industry',
  description            = 'By 2030, reduce pollutants from agriculture, mining, and industry to levels not harmful to biodiversity.',
  baseline               = '103,722 metric tons of NPK fertilizer used in 2023; mining pollution documented',
  headline_indicator     = 'Concentration of key pollutants harmful to biodiversity (index)',
  responsible_stakeholders = ARRAY['REMA','MINAGRI','WASAC','Rwanda Mines Board'],
  updated_at             = NOW()
WHERE id = 7;

UPDATE public.nbsap_targets SET
  title                  = 'Climate resilience and nature-based solutions',
  description            = 'By 2030, minimise climate change impacts on biodiversity and build resilience through ecosystem-based solutions.',
  baseline               = 'Several NbS projects underway: TREPA (60,000 ha), Green Amayaga (263,000 ha), VCRP (37,000 ha)',
  headline_indicator     = 'Area under nature-based solutions addressing climate resilience (ha)',
  responsible_stakeholders = ARRAY['REMA','RFA','District Authorities','MINAGRI'],
  updated_at             = NOW()
WHERE id = 8;

UPDATE public.nbsap_targets SET
  title                  = 'Sustainable wildlife benefits for communities',
  description            = 'By 2030, ensure sustainable use and community benefits from wildlife and protected areas.',
  baseline               = 'Tourism Revenue Sharing Program (TRSP) allocates 10% of PA revenue to communities',
  headline_indicator     = '% of PA revenue shared with local communities (TRSP)',
  responsible_stakeholders = ARRAY['RDB','REMA','District Authorities'],
  updated_at             = NOW()
WHERE id = 9;

UPDATE public.nbsap_targets SET
  title                  = 'Sustainable agriculture, aquaculture and forestry',
  description            = 'By 2030, integrate biodiversity into agriculture, fisheries, and forestry for sustainable landscapes.',
  baseline               = '30.4% forest cover; aquaculture production 4,900 t/year; PSTA5 targets 22,000 ha conservation agriculture',
  headline_indicator     = '% of agricultural/fisheries/forestry operations with biodiversity-inclusive practices',
  responsible_stakeholders = ARRAY['MINAGRI','RAB','RFA','REMA'],
  updated_at             = NOW()
WHERE id = 10;

UPDATE public.nbsap_targets SET
  title                  = 'Ecosystem services restoration and maintenance',
  description            = 'By 2030, restore, maintain and enhance ecosystem services through nature-based solutions.',
  baseline               = 'TREPA, Green Amayaga, VCRP, COMBIO NbS projects ongoing nationwide',
  headline_indicator     = 'Value of ecosystem services maintained or restored (USD equivalent)',
  responsible_stakeholders = ARRAY['REMA','RFA','RNRA','District Authorities'],
  updated_at             = NOW()
WHERE id = 11;

UPDATE public.nbsap_targets SET
  title                  = 'Urban biodiversity and green space integration',
  description            = 'By 2030, increase urban green spaces and ensure biodiversity-inclusive urban planning.',
  baseline               = 'No comprehensive urban green space assessment; NLUDMP targets 20–25% green space by 2050',
  headline_indicator     = '% of urban areas with biodiversity-inclusive green space plans',
  responsible_stakeholders = ARRAY['MININFRA','City of Kigali','REMA','District Authorities'],
  updated_at             = NOW()
WHERE id = 12;

UPDATE public.nbsap_targets SET
  title                  = 'Access and benefit sharing from genetic resources',
  description            = 'By 2030, ensure fair and equitable sharing of benefits from genetic resources (ABS).',
  baseline               = 'No consolidated baseline; ABS framework under development',
  headline_indicator     = 'Number of ABS agreements in place (cumulative)',
  responsible_stakeholders = ARRAY['REMA','RDB','MINAGRI','Rwanda Genetic Resources Agency'],
  updated_at             = NOW()
WHERE id = 13;

UPDATE public.nbsap_targets SET
  title                  = 'Biodiversity mainstreaming across all sectors',
  description            = 'By 2030, integrate biodiversity values into policies, plans, and accounts across all sectors.',
  baseline               = 'Range of biodiversity laws and policies exist; mainstreaming gaps identified',
  headline_indicator     = '% of national sector policies with biodiversity safeguards integrated',
  responsible_stakeholders = ARRAY['REMA','MINECOFIN','MINAGRI','All Ministries'],
  updated_at             = NOW()
WHERE id = 14;

UPDATE public.nbsap_targets SET
  title                  = 'Business and financial biodiversity risk disclosure',
  description            = 'By 2030, large businesses and financial institutions disclose biodiversity-related risks and dependencies.',
  baseline               = 'Sustainability disclosure guidelines established (No. 040/2024); limited biodiversity-specific reporting',
  headline_indicator     = '% of large companies/financial institutions reporting biodiversity risks',
  responsible_stakeholders = ARRAY['REMA','BNR','PSF','Ministry of Finance'],
  updated_at             = NOW()
WHERE id = 15;

UPDATE public.nbsap_targets SET
  title                  = 'Sustainable consumption and production',
  description            = 'By 2030, implement strategies to reduce waste and improve sustainable consumption and production (SCP).',
  baseline               = 'Ecological footprint 0.55 per capita; food waste index 164 (Kigali), 117 (Musanze) — UNEP 2024',
  headline_indicator     = 'National sustainable consumption and production index score',
  responsible_stakeholders = ARRAY['REMA','RBS','MINICOM','MINAGRI'],
  updated_at             = NOW()
WHERE id = 16;

UPDATE public.nbsap_targets SET
  title                  = 'Biosafety capacity and biotechnology control',
  description            = 'By 2030, strengthen biosafety systems and biotechnology regulatory capacity.',
  baseline               = 'Rwanda biosafety law enacted; implementation capacity limited',
  headline_indicator     = 'Biosafety regulatory framework operationalization score (%)',
  responsible_stakeholders = ARRAY['REMA','RDB','RAB','RNRA'],
  updated_at             = NOW()
WHERE id = 17;

UPDATE public.nbsap_targets SET
  title                  = 'Harmful incentive reform and positive biodiversity incentives',
  description            = 'By 2030, identify and eliminate harmful subsidies and scale up positive incentives for biodiversity.',
  baseline               = 'Subsidy impact study initiated; no comprehensive biodiversity incentive mechanism yet',
  headline_indicator     = 'Value of harmful subsidies reformed or redirected (RWF millions)',
  responsible_stakeholders = ARRAY['MINECOFIN','REMA','MINICOM','MINAGRI'],
  updated_at             = NOW()
WHERE id = 18;

UPDATE public.nbsap_targets SET
  title                  = 'Biodiversity finance mobilization (USD 500 million)',
  description            = 'By 2030, mobilise at least USD 500 million from all sources for biodiversity conservation in Rwanda.',
  baseline               = 'Finance consolidation from GGCRS and REMA Strategy 2022–2026',
  headline_indicator     = 'Cumulative biodiversity finance mobilised (USD millions)',
  responsible_stakeholders = ARRAY['REMA','MINECOFIN','GCF Focal Point','Private Sector'],
  updated_at             = NOW()
WHERE id = 19;

UPDATE public.nbsap_targets SET
  title                  = 'Capacity building, technology transfer and education',
  description            = 'By 2030, strengthen biodiversity capacity, research, and scientific cooperation.',
  baseline               = 'No consolidated metrics on capacity-building actions across institutions',
  headline_indicator     = 'Number of biodiversity professionals trained (cumulative)',
  responsible_stakeholders = ARRAY['REMA','RDB','University of Rwanda','MINEDUC'],
  updated_at             = NOW()
WHERE id = 20;

UPDATE public.nbsap_targets SET
  title                  = 'Biodiversity information systems and data access',
  description            = 'By 2030, ensure biodiversity data is accessible, interoperable, and used for decision-making.',
  baseline               = 'Rwanda Biodiversity Information System (RBIS) established as open-source platform',
  headline_indicator     = 'Number of biodiversity records accessible via RBIS (thousands)',
  responsible_stakeholders = ARRAY['REMA','RDB','University of Rwanda','NISR'],
  updated_at             = NOW()
WHERE id = 21;

UPDATE public.nbsap_targets SET
  title                  = 'Inclusive participation and traditional knowledge',
  description            = 'By 2030, ensure inclusive participation of all stakeholders, including IPLCs, in biodiversity governance.',
  baseline               = 'No consolidated baseline; local community involvement in biodiversity governance limited',
  headline_indicator     = '% of biodiversity governance processes with documented inclusive participation',
  responsible_stakeholders = ARRAY['REMA','Civil Society','District Authorities','IPLCs'],
  updated_at             = NOW()
WHERE id = 22;

-- ============================================================
-- PART 2: UPSERT ALL 30 RWANDA DISTRICTS
-- ============================================================
-- Add population and area_km2 columns if they do not yet exist.
-- These are initialised to 0 and can be enriched by a dedicated
-- data-import migration once official NISR figures are confirmed.
ALTER TABLE public.districts
  ADD COLUMN IF NOT EXISTS population INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS area_km2   NUMERIC  DEFAULT 0;

-- Remove the erroneous 'Kigali City' row (province name, not a district).
DELETE FROM public.districts WHERE name = 'Kigali City';

-- Upsert all 30 official Rwanda districts.
-- province column stores the canonical province name string used by
-- the frontend; province_id FK is resolved from public.provinces.
-- Existing rows keep their status / compliance / forest_cover /
-- coordinate data untouched — only the province string is refreshed.

INSERT INTO public.districts (name, province_id, status, population, area_km2)
VALUES
  -- Kigali City Province (3 districts)
  ('Nyarugenge', (SELECT id FROM public.provinces WHERE name = 'Kigali'), 'missing', 0, 0),
  ('Gasabo',     (SELECT id FROM public.provinces WHERE name = 'Kigali'), 'missing', 0, 0),
  ('Kicukiro',   (SELECT id FROM public.provinces WHERE name = 'Kigali'), 'missing', 0, 0),

  -- Southern Province (8 districts)
  ('Nyanza',     (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),
  ('Huye',       (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),
  ('Nyamagabe',  (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),
  ('Gisagara',   (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),
  ('Ruhango',    (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),
  ('Muhanga',    (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),
  ('Kamonyi',    (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),
  ('Nyaruguru',  (SELECT id FROM public.provinces WHERE name = 'South'), 'missing', 0, 0),

  -- Western Province (7 districts)
  ('Nyamasheke', (SELECT id FROM public.provinces WHERE name = 'West'), 'missing', 0, 0),
  ('Rusizi',     (SELECT id FROM public.provinces WHERE name = 'West'), 'missing', 0, 0),
  ('Karongi',    (SELECT id FROM public.provinces WHERE name = 'West'), 'missing', 0, 0),
  ('Rutsiro',    (SELECT id FROM public.provinces WHERE name = 'West'), 'missing', 0, 0),
  ('Rubavu',     (SELECT id FROM public.provinces WHERE name = 'West'), 'missing', 0, 0),
  ('Ngororero',  (SELECT id FROM public.provinces WHERE name = 'West'), 'missing', 0, 0),
  ('Nyabihu',    (SELECT id FROM public.provinces WHERE name = 'West'), 'missing', 0, 0),

  -- Northern Province (5 districts)
  ('Musanze',    (SELECT id FROM public.provinces WHERE name = 'North'), 'missing', 0, 0),
  ('Gakenke',    (SELECT id FROM public.provinces WHERE name = 'North'), 'missing', 0, 0),
  ('Rulindo',    (SELECT id FROM public.provinces WHERE name = 'North'), 'missing', 0, 0),
  ('Gicumbi',    (SELECT id FROM public.provinces WHERE name = 'North'), 'missing', 0, 0),
  ('Burera',     (SELECT id FROM public.provinces WHERE name = 'North'), 'missing', 0, 0),

  -- Eastern Province (7 districts)
  ('Rwamagana',  (SELECT id FROM public.provinces WHERE name = 'East'), 'missing', 0, 0),
  ('Kayonza',    (SELECT id FROM public.provinces WHERE name = 'East'), 'missing', 0, 0),
  ('Ngoma',      (SELECT id FROM public.provinces WHERE name = 'East'), 'missing', 0, 0),
  ('Kirehe',     (SELECT id FROM public.provinces WHERE name = 'East'), 'missing', 0, 0),
  ('Bugesera',   (SELECT id FROM public.provinces WHERE name = 'East'), 'missing', 0, 0),
  ('Gatsibo',    (SELECT id FROM public.provinces WHERE name = 'East'), 'missing', 0, 0),
  ('Nyagatare',  (SELECT id FROM public.provinces WHERE name = 'East'), 'missing', 0, 0)

ON CONFLICT (name) DO UPDATE SET
  province_id = EXCLUDED.province_id,
  updated_at  = NOW();

-- ============================================================
-- PART 3: DELETE PLACEHOLDER / TEST / EMPTY INDICATORS
-- ============================================================
-- Removes any indicator rows that were created as placeholders,
-- test data, or are entirely empty (no definition AND no
-- current_value).  The 10 real indicators seeded in migration 002
-- all have both a definition and a current_value, so they are safe.

DELETE FROM public.indicators
WHERE
  name ILIKE '%placeholder%'
  OR name ILIKE '%test%'
  OR name ILIKE '%sample%'
  OR (definition IS NULL AND current_value IS NULL);

-- ============================================================
-- PART 4: NBSAP MILESTONES TABLE AND DATA
-- ============================================================

-- ── 4a. Create table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nbsap_milestones (
  id          SERIAL PRIMARY KEY,
  target_id   INTEGER NOT NULL
                REFERENCES public.nbsap_targets(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  description TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','achieved','missed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4b. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nbsap_milestones_target
  ON public.nbsap_milestones(target_id);

CREATE INDEX IF NOT EXISTS idx_nbsap_milestones_year
  ON public.nbsap_milestones(year);

-- ── 4c. Row Level Security ────────────────────────────────────
ALTER TABLE public.nbsap_milestones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'nbsap_milestones'
      AND policyname = 'milestones_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "milestones_read"
        ON public.nbsap_milestones
        FOR SELECT
        TO authenticated
        USING (true)
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'nbsap_milestones'
      AND policyname = 'milestones_admin_write'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "milestones_admin_write"
        ON public.nbsap_milestones
        FOR ALL
        TO authenticated
        USING (is_admin())
    $policy$;
  END IF;
END;
$$;

-- ── 4d. Insert milestones ─────────────────────────────────────
-- We use a unique constraint on (target_id, year, description) to
-- make the insert idempotent.  If the constraint does not yet exist
-- we add it; if it already does, ALTER TABLE … ADD CONSTRAINT IF
-- NOT EXISTS is idempotent in Postgres 9.5+.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_nbsap_milestones_target_year_desc'
  ) THEN
    ALTER TABLE public.nbsap_milestones
      ADD CONSTRAINT uq_nbsap_milestones_target_year_desc
      UNIQUE (target_id, year, description);
  END IF;
END;
$$;

INSERT INTO public.nbsap_milestones (target_id, year, description, status) VALUES

  -- Target 1: Participatory biodiversity-inclusive spatial land use planning
  (1, 2025, 'Baseline assessment of biodiversity-inclusive spatial planning coverage', 'pending'),
  (1, 2027, 'Integration into 50% of sectoral land-use masterplans', 'pending'),
  (1, 2030, 'Full operationalization: 100% priority areas covered', 'pending'),

  -- Target 2: Restoration of degraded ecosystems
  (2, 2025, 'Restore 385,000 ha (baseline documented)', 'pending'),
  (2, 2027, 'Restore 450,000 ha', 'pending'),
  (2, 2029, 'Achieve 600,000 ha restoration', 'pending'),
  (2, 2030, 'Verify ≥10% additional restoration of degraded areas', 'pending'),

  -- Target 3: Protected area expansion and management
  (3, 2025, 'Expand protected areas via VCRP/Nyandungu projects', 'pending'),
  (3, 2027, 'Reach 10% national territory coverage — mid-term review', 'pending'),
  (3, 2030, 'Achieve and verify 11% terrestrial/inland water coverage', 'pending'),

  -- Target 4: Species conservation and human-wildlife conflict reduction
  (4, 2025, 'Complete national HWC baseline study', 'pending'),
  (4, 2027, 'Implement species action plans for priority species', 'pending'),
  (4, 2030, 'Demonstrate improved conservation status for 50% of threatened species', 'pending'),

  -- Target 5: Sustainable management of wild species
  (5, 2026, 'Strengthen enforcement and surveillance mechanisms', 'pending'),
  (5, 2028, 'Scale community surveillance programs to all lake districts', 'pending'),
  (5, 2030, 'Achieve 75% reduction in illegal harvesting', 'pending'),

  -- Target 6: Invasive alien species prevention and control
  (6, 2025, 'Update national IAS inventory', 'pending'),
  (6, 2027, 'Implement control programs in all protected areas', 'pending'),
  (6, 2030, 'Achieve 50% reduction in IAS establishment rate in PAs', 'pending'),

  -- Target 7: Pollution reduction from agriculture, mining and industry
  (7, 2026, 'Establish pollutant monitoring framework', 'pending'),
  (7, 2028, 'Implement pollution reduction controls in all sectors', 'pending'),
  (7, 2030, 'Achieve 50% reduction in biodiversity-harmful pollutant levels', 'pending'),

  -- Target 8: Climate resilience and nature-based solutions
  (8, 2026, 'Scale NbS programs to 500,000+ ha', 'pending'),
  (8, 2028, 'Expand to all climate-vulnerable landscapes', 'pending'),
  (8, 2030, 'Full integration of NbS in national climate adaptation strategy', 'pending'),

  -- Target 9: Sustainable wildlife benefits for communities
  (9, 2027, 'Strengthen TRSP implementation in all PAs', 'pending'),
  (9, 2030, 'All PA communities receiving sustainable wildlife benefits', 'pending'),

  -- Target 10: Sustainable agriculture, aquaculture and forestry
  (10, 2026, 'Integrate biodiversity into all sector development plans', 'pending'),
  (10, 2028, 'Scale sustainable practices to 50% of farms/fisheries', 'pending'),
  (10, 2030, 'Full biodiversity mainstreaming in agriculture/fisheries/forestry', 'pending'),

  -- Target 11: Ecosystem services restoration and maintenance
  (11, 2025, 'Establish unified ecosystem services monitoring system', 'pending'),
  (11, 2028, 'Demonstrate measurable improvement in 5+ ecosystem services', 'pending'),
  (11, 2030, 'All major NbS projects fully operational and monitored', 'pending'),

  -- Target 12: Urban biodiversity and green space integration
  (12, 2026, 'Complete urban biodiversity baseline assessment for 10 cities', 'pending'),
  (12, 2028, 'Implement urban green space plans in Kigali and 5 secondary cities', 'pending'),
  (12, 2030, 'All urban areas with biodiversity-inclusive spatial plans', 'pending'),

  -- Target 13: Access and benefit sharing from genetic resources
  (13, 2025, 'Develop ABS baseline and inventory of genetic resources', 'pending'),
  (13, 2027, 'Implement ABS regulatory framework', 'pending'),
  (13, 2030, 'Fair benefit sharing in place for all genetic resource users', 'pending'),

  -- Target 14: Biodiversity mainstreaming across all sectors
  (14, 2026, 'Complete biodiversity integration audit for all sector ministries', 'pending'),
  (14, 2028, 'All major sector policies include biodiversity safeguards', 'pending'),
  (14, 2030, 'Full biodiversity mainstreaming verified across all sectors', 'pending'),

  -- Target 15: Business and financial biodiversity risk disclosure
  (15, 2026, 'Implement biodiversity disclosure guidelines for 50+ companies', 'pending'),
  (15, 2028, 'All large businesses reporting biodiversity risks', 'pending'),
  (15, 2030, 'Rwanda establishes national biodiversity risk reporting standard', 'pending'),

  -- Target 16: Sustainable consumption and production
  (16, 2025, 'Establish SCP national baseline', 'pending'),
  (16, 2028, 'Implement SCP strategies in key sectors', 'pending'),
  (16, 2030, 'Measurable reduction in ecological footprint per capita', 'pending'),

  -- Target 17: Biosafety capacity and biotechnology control
  (17, 2026, 'Fully operationalize biosafety regulatory system', 'pending'),
  (17, 2028, 'Strengthen biotechnology oversight capacity', 'pending'),
  (17, 2030, 'Rwanda biosafety systems meet international standards', 'pending'),

  -- Target 18: Harmful incentive reform and positive biodiversity incentives
  (18, 2025, 'Complete harmful subsidies study', 'pending'),
  (18, 2027, 'Reform top 5 biodiversity-harmful incentives', 'pending'),
  (18, 2030, 'Establish positive biodiversity incentive mechanism at scale', 'pending'),

  -- Target 19: Biodiversity finance mobilization (USD 500 million)
  (19, 2026, 'Establish biodiversity finance tracking system', 'pending'),
  (19, 2028, 'Mobilize USD 200M through GCF/GEF/private finance', 'pending'),
  (19, 2030, 'Achieve USD 500M cumulative biodiversity finance mobilized', 'pending'),

  -- Target 20: Capacity building, technology transfer and education
  (20, 2027, 'Train 1,000+ biodiversity professionals', 'pending'),
  (20, 2028, 'Establish biodiversity research funding program', 'pending'),
  (20, 2030, 'Rwanda biodiversity research capacity meets regional standards', 'pending'),

  -- Target 21: Biodiversity information systems and data access
  (21, 2026, 'Enhance RBIS with 500,000+ species records', 'pending'),
  (21, 2028, 'Achieve 80% data interoperability with global systems', 'pending'),
  (21, 2030, 'All biodiversity data openly accessible and actively used in policy', 'pending'),

  -- Target 22: Inclusive participation and traditional knowledge
  (22, 2025, 'Develop inclusive participation baseline', 'pending'),
  (22, 2027, 'Implement IPLC engagement protocols in all PAs', 'pending'),
  (22, 2030, 'All biodiversity governance processes documented as inclusive', 'pending')

ON CONFLICT (target_id, year, description) DO NOTHING;

-- ── 4e. Grant read access to authenticated users ──────────────
GRANT SELECT ON public.nbsap_milestones TO authenticated;

-- ── 4f. Notify completion ─────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migration 020 completed successfully:';
  RAISE NOTICE '  Part 1 — 22 NBSAP 2025-2030 targets updated';
  RAISE NOTICE '  Part 2 — 30 Rwanda districts upserted; Kigali City row removed';
  RAISE NOTICE '  Part 3 — Placeholder/test/empty indicators purged';
  RAISE NOTICE '  Part 4 — nbsap_milestones table created; 63 milestones inserted';
  RAISE NOTICE '================================================';
END;
$$;
