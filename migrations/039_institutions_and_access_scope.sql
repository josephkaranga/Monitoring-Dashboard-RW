-- ============================================================
-- M01 — INSTITUTIONS AND ACCESS SCOPE
-- Migration: 039_institutions_and_access_scope.sql
-- Source: "NBSAP Monitoring System: status and development
--          requirements" (4 Nov 2026), module M01.
--
-- Done when (PDF): a district officer sees only their district; a
-- ministry validator acts only on their institution.
--
--   1. Reference data in the database instead of the frontend:
--        institutions (88: the 83 reporting stakeholders + 5 named in
--        the NBSAP strategic actions), sectors (structure; the official
--        416-sector list is still to be supplied by LODA/NISR),
--        nbsap_strategic_actions + strategic_action_institutions
--        (101 actions, previously hard-coded in StakeholdersPage.tsx).
--   2. profiles.institution_id / district_id replace free-text
--      organization as the user's affiliation (organization text is
--      kept in sync for existing screens and reports).
--   3. user_scopes: what a user may do, and where:
--        data_entry          submit for an institution (and district)
--        ministry_validator  review reports of an institution
--        institution_admin   approve and remove own institution's users
--      (district, NISR, RLMUA and REMA validation stages come with M02.)
--   4. toolkit_reports gets institution_id / district_id, set by the
--      database from the submitted form, and the access rules use them.
--   5. Institution admins approve members through RPCs; the profile
--      guard from 037 is extended to let them do exactly that.
--
-- ROLLOUT: after applying, every data-entry user and every ministry
-- reviewer needs a scope before they can submit or review. Run the
-- query at the bottom to list who needs one, and assign scopes in
-- User Management (or confirm the suggested ones) before announcing.
-- ============================================================

BEGIN;

-- ── Prerequisites: 037 (security hardening) must be applied first ──
DO $$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_fn TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['audit_row_change', 'guard_profile_privileged_fields',
                              'guard_report_review', 'log_audit_event', 'is_admin',
                              'can_write', 'get_user_role', 'handle_updated_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                   WHERE n.nspname = 'public' AND p.proname = v_fn) THEN
      v_missing := v_missing || v_fn;
    END IF;
  END LOOP;
  IF to_regclass('public.organization_configs') IS NULL THEN
    v_missing := v_missing || 'organization_configs (table)'::TEXT;
  END IF;

  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Migration 039 needs earlier migrations. Missing: %. Run 037_security_hardening.sql and 038_fix_system_metrics_counting.sql first, then re-run 039.',
      array_to_string(v_missing, ', ');
  END IF;
END $$;

-- ============================================================
-- 1. REFERENCE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institutions (
  id                   SERIAL PRIMARY KEY,
  code                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  category             TEXT NOT NULL CHECK (category IN (
                         'Ministries',
                         'Authorities',
                         'Boards',
                         'Agencies and other public institutions',
                         'Local government',
                         'Development partners and international organisations',
                         'NGOs and civil society',
                         'Academia and research',
                         'Private sector')),
  responsibilities     TEXT[]    NOT NULL DEFAULT '{}',
  target_ids           INTEGER[] NOT NULL DEFAULT '{}',
  tool_ids             TEXT[]    NOT NULL DEFAULT '{}',
  -- TRUE for "District Authorities": one entry that stands for all 30
  -- districts, so scopes and reports must also name the district.
  covers_all_districts BOOLEAN NOT NULL DEFAULT FALSE,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.institutions IS
'Reporting stakeholders (M01). code matches nbsap_targets.responsible_stakeholders and the toolkit form value "stakeholder". Categories group the Reporting Stakeholder dropdown and can be corrected here.';

CREATE TABLE IF NOT EXISTS public.sectors (
  id          SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (district_id, name)
);

COMMENT ON TABLE public.sectors IS
'Administrative sectors (416 nationally). Empty until the official list is supplied (LODA/NISR); scopes can already reference a sector once loaded.';

CREATE TABLE IF NOT EXISTS public.nbsap_strategic_actions (
  id           SERIAL PRIMARY KEY,
  target_id    INTEGER NOT NULL REFERENCES public.nbsap_targets(id) ON DELETE CASCADE,
  ordinal      INTEGER NOT NULL,
  action       TEXT NOT NULL,
  data_sources TEXT[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (target_id, ordinal)
);

CREATE TABLE IF NOT EXISTS public.strategic_action_institutions (
  action_id      INTEGER NOT NULL REFERENCES public.nbsap_strategic_actions(id) ON DELETE CASCADE,
  ordinal        INTEGER NOT NULL,
  -- The responsible party exactly as written in the NBSAP action. When it
  -- is a single institution it is linked; generic groups ("NGOs", "Media")
  -- stay as text until REMA decides how to represent them.
  label          TEXT NOT NULL,
  institution_id INTEGER REFERENCES public.institutions(id) ON DELETE SET NULL,
  PRIMARY KEY (action_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_sai_institution ON public.strategic_action_institutions(institution_id);

ALTER TABLE public.institutions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nbsap_strategic_actions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_action_institutions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['institutions','sectors','nbsap_strategic_actions','strategic_action_institutions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Signed-in users read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Signed-in users read %1$s" ON public.%1$I FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins manage %1$s" ON public.%1$I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS set_updated_at_institutions ON public.institutions;
CREATE TRIGGER set_updated_at_institutions
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Seed (generated from the former frontend constants) ─────
-- Generated from STAKEHOLDER_RESPONSIBILITIES (ReportingToolkitPage.tsx),
-- CATEGORY_BY_KEY (utils/stakeholderGroups.ts) and TARGETS (StakeholdersPage.tsx)
-- as they stood on branch security-hardening (98df8d4).
INSERT INTO public.institutions
  (code, name, category, responsibilities, target_ids, tool_ids, covers_all_districts) VALUES
  ('REMA', 'Rwanda Environment Management Authority', 'Authorities', ARRAY['Environmental policy enforcement', 'EIA oversight', 'Biodiversity monitoring', 'RBIS management', 'CBD reporting']::text[], ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]::integer[], ARRAY['T01', 'T02', 'T03', 'T06']::text[], FALSE),
  ('MoE', 'Ministry of Environment', 'Ministries', ARRAY['Environmental policy development', 'Climate change coordination', 'Biodiversity mainstreaming']::text[], ARRAY[1, 2, 6, 7, 8, 11, 13, 14, 16, 17, 18, 19, 20, 21]::integer[], ARRAY['T01', 'T05']::text[], FALSE),
  ('MINAGRI', 'Ministry of Agriculture and Animal Resources', 'Ministries', ARRAY['Agricultural biodiversity', 'Sustainable farming', 'Fisheries regulation']::text[], ARRAY[1, 5, 7, 8, 9, 10, 13, 14, 16, 17, 18]::integer[], ARRAY['T01', 'T02']::text[], FALSE),
  ('RFA', 'Rwanda Forestry Authority', 'Authorities', ARRAY['Forest conservation', 'Reforestation', 'Forest plantations management', 'Urban forestry guidelines']::text[], ARRAY[1, 2, 5, 6, 8, 9, 10, 11, 12, 18]::integer[], ARRAY['T01', 'T02', 'T03']::text[], FALSE),
  ('RDB', 'Rwanda Development Board', 'Boards', ARRAY['Tourism & conservation', 'Protected area management', 'Wildlife conservation', 'Revenue sharing']::text[], ARRAY[1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 18, 19, 20, 21]::integer[], ARRAY['T01', 'T03', 'T05', 'T06']::text[], FALSE),
  ('NLA', 'National Land Authority', 'Authorities', ARRAY['Land-use planning', 'Spatial plans', 'NSDI management']::text[], ARRAY[1, 10, 11]::integer[], ARRAY['T01']::text[], FALSE),
  ('RWB', 'Rwanda Water Resources Board', 'Boards', ARRAY['Water resource management', 'Catchment management', 'Wetland oversight']::text[], ARRAY[2, 5, 7, 8, 10, 11]::integer[], ARRAY['T01', 'T02']::text[], FALSE),
  ('RAB', 'Rwanda Agriculture Board', 'Boards', ARRAY['Agricultural research', 'Crop improvement', 'Aquaculture', 'Seed management']::text[], ARRAY[2, 5, 6, 7, 9, 10, 13, 17]::integer[], ARRAY['T01', 'T02', 'T07']::text[], FALSE),
  ('District Authorities', 'District Local Governments', 'Local government', ARRAY['Local biodiversity monitoring', 'Community engagement', 'Local land-use planning']::text[], ARRAY[1, 2, 3, 8, 9, 10, 11, 12, 14, 22]::integer[], ARRAY['T02', 'T04']::text[], TRUE),
  ('ARCOS', 'Albertine Rift Conservation Society', 'NGOs and civil society', ARRAY['Ecosystem restoration', 'Community conservation', 'Living lakes monitoring', 'SANCTA programme']::text[], ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 22]::integer[], ARRAY['T02', 'T03', 'T04', 'T07']::text[], FALSE),
  ('Nature Rwanda', 'Nature Rwanda', 'NGOs and civil society', ARRAY['IBA monitoring', 'Waterbird surveys', 'Flyway conservation', 'Busaga Forest conservation']::text[], ARRAY[1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 18, 22]::integer[], ARRAY['T02', 'T03', 'T04', 'T07']::text[], FALSE),
  ('CoEB', 'Centre of Excellence in Biodiversity', 'Academia and research', ARRAY['RBIS management', 'Biodiversity research', 'Ecosystem mapping', 'IAS monitoring']::text[], ARRAY[1, 2, 3, 4, 6, 7, 8, 9, 10, 13, 20, 21]::integer[], ARRAY['T03', 'T07']::text[], FALSE),
  ('RWCA', 'Rwanda Wildlife Conservation Association', 'NGOs and civil society', ARRAY['Umusambi Village', 'Species conservation', 'Community conservation education']::text[], ARRAY[2, 3, 4, 8, 9, 10, 11]::integer[], ARRAY['T03', 'T04', 'T07']::text[], FALSE),
  ('RECOR', 'Rwanda Environment Conservation Organisation', 'NGOs and civil society', ARRAY['Environmental conservation', 'Ecosystem restoration']::text[], ARRAY[2, 3, 8, 10, 11]::integer[], ARRAY['T02', 'T04', 'T07']::text[], FALSE),
  ('IUCN', 'International Union for Conservation of Nature', 'Development partners and international organisations', ARRAY['Green List', 'Red List', 'PES', 'Nature-based solutions', 'COMBIO project']::text[], ARRAY[2, 3, 4, 6, 8, 9, 10, 11, 12, 18, 19]::integer[], ARRAY['T03', 'T05', 'T07']::text[], FALSE),
  ('African Parks', 'African Parks', 'Development partners and international organisations', ARRAY['Park management', 'Akagera operations', 'IAS control']::text[], ARRAY[3, 6, 8, 10]::integer[], ARRAY['T03']::text[], FALSE),
  ('Prime Biodiversity Conservation', 'Prime Biodiversity Conservation', 'NGOs and civil society', ARRAY['KBA conservation', 'Species monitoring', 'Community projects']::text[], ARRAY[1, 3, 8, 9, 10, 12]::integer[], ARRAY['T02', 'T03', 'T04', 'T07']::text[], FALSE),
  ('ARECO', 'ARECO Rwanda Nziza', 'NGOs and civil society', ARRAY['Buffer zone conservation', 'Community ecosystem-based adaptation']::text[], ARRAY[2, 7, 8, 9, 10, 11]::integer[], ARRAY['T02', 'T04']::text[], FALSE),
  ('Partners for Conservation', 'Partners for Conservation', 'NGOs and civil society', ARRAY['Conservation partnerships', 'Community engagement']::text[], ARRAY[7, 9, 10, 11, 12]::integer[], ARRAY['T04', 'T07']::text[], FALSE),
  ('Forest of Hope Association', 'Forest of Hope Association', 'NGOs and civil society', ARRAY['Forest conservation', 'Community forestry']::text[], ARRAY[3, 8]::integer[], ARRAY['T02', 'T04']::text[], FALSE),
  ('IGCP', 'International Gorilla Conservation Programme', 'Development partners and international organisations', ARRAY['Gorilla conservation', 'IAS management in parks']::text[], ARRAY[4, 6]::integer[], ARRAY['T03', 'T07']::text[], FALSE),
  ('Karisoke', 'Dian Fossey Gorilla Fund (Karisoke)', 'Development partners and international organisations', ARRAY['Gorilla research', 'Conservation science']::text[], ARRAY[4, 6]::integer[], ARRAY['T03', 'T07']::text[], FALSE),
  ('AWF', 'African Wildlife Foundation', 'Development partners and international organisations', ARRAY['Wildlife conservation', 'Landscape conservation']::text[], ARRAY[3, 4, 8]::integer[], ARRAY['T03', 'T05']::text[], FALSE),
  ('WCS', 'Wildlife Conservation Society', 'Development partners and international organisations', ARRAY['Wildlife monitoring', 'Conservation research']::text[], ARRAY[8]::integer[], ARRAY['T03', 'T07']::text[], FALSE),
  ('One Tree Planted', 'One Tree Planted', 'Development partners and international organisations', ARRAY['Reforestation', 'Tree planting partnerships']::text[], ARRAY[8, 9]::integer[], ARRAY['T02']::text[], FALSE),
  ('One Acre Fund', 'One Acre Fund', 'Development partners and international organisations', ARRAY['Smallholder support', 'Agroforestry', 'Seedling production']::text[], ARRAY[6, 7, 9]::integer[], ARRAY['T02', 'T04']::text[], FALSE),
  ('ICRAF', 'World Agroforestry (ICRAF)', 'Development partners and international organisations', ARRAY['Agroforestry research', 'Native species integration']::text[], ARRAY[2, 4, 9, 10]::integer[], ARRAY['T02', 'T07']::text[], FALSE),
  ('Bridge to Rwanda', 'Bridge to Rwanda', 'Development partners and international organisations', ARRAY['Organic farming', 'Soil health improvement']::text[], ARRAY[7, 10]::integer[], ARRAY['T02', 'T04']::text[], FALSE),
  ('ROAM', 'Rwanda Organic Agriculture Movement', 'NGOs and civil society', ARRAY['Organic agriculture promotion', 'Fertiliser reduction']::text[], ARRAY[7]::integer[], ARRAY['T02']::text[], FALSE),
  ('GIZ', 'GIZ Rwanda', 'Development partners and international organisations', ARRAY['Technical cooperation', 'Capacity building', 'Green growth']::text[], ARRAY[7, 8, 9, 11, 12, 20]::integer[], ARRAY['T05', 'T07']::text[], FALSE),
  ('SNV', 'SNV Netherlands Development Organisation', 'Development partners and international organisations', ARRAY['Sustainable agriculture', 'Clean energy']::text[], ARRAY[10, 11]::integer[], ARRAY['T05']::text[], FALSE),
  ('GGGI', 'Global Green Growth Institute', 'Development partners and international organisations', ARRAY['Green growth', 'PES', 'Climate finance']::text[], ARRAY[9, 10, 11, 12, 16, 18]::integer[], ARRAY['T05', 'T07']::text[], FALSE),
  ('WRI', 'World Resources Institute', 'Development partners and international organisations', ARRAY['Data analytics', 'Forest monitoring', 'NBS']::text[], ARRAY[9, 11]::integer[], ARRAY['T05', 'T07']::text[], FALSE),
  ('FAO', 'Food and Agriculture Organization', 'Development partners and international organisations', ARRAY['Agricultural standards', 'IPM', 'Hazardous waste']::text[], ARRAY[7, 9]::integer[], ARRAY['T01', 'T05']::text[], FALSE),
  ('UNDP', 'United Nations Development Programme', 'Development partners and international organisations', ARRAY['BIOFIN', 'Capacity building', 'Resource mobilisation']::text[], ARRAY[18, 19, 20]::integer[], ARRAY['T05']::text[], FALSE),
  ('RGF', 'Rwanda Green Fund (FONERWA)', 'Agencies and other public institutions', ARRAY['Green finance', 'Biodiversity window', 'Investment plans']::text[], ARRAY[2, 8, 9, 10, 14, 18, 19]::integer[], ARRAY['T05']::text[], FALSE),
  ('MINECOFIN', 'Ministry of Finance and Economic Planning', 'Ministries', ARRAY['Budget tagging', 'Biodiversity expenditure review', 'SEEA']::text[], ARRAY[8, 9, 14, 15, 18, 19]::integer[], ARRAY['T01', 'T05']::text[], FALSE),
  ('NISR', 'National Institute of Statistics Rwanda', 'Agencies and other public institutions', ARRAY['Statistical surveys', 'SEEA', 'Census data']::text[], ARRAY[1, 14, 21]::integer[], ARRAY['T01']::text[], FALSE),
  ('BNR', 'National Bank of Rwanda', 'Agencies and other public institutions', ARRAY['Financial sector biodiversity risks', 'Green finance standards']::text[], ARRAY[8, 14, 15]::integer[], ARRAY['T01']::text[], FALSE),
  ('MININFRA', 'Ministry of Infrastructure', 'Ministries', ARRAY['Infrastructure planning', 'Sustainable urban development']::text[], ARRAY[1, 11, 14, 16]::integer[], ARRAY['T01', 'T06']::text[], FALSE),
  ('MINICOM', 'Ministry of Trade and Industry', 'Ministries', ARRAY['Industrial compliance', 'Sustainable trade', 'Special economic zones']::text[], ARRAY[1, 6, 14, 16, 18]::integer[], ARRAY['T01', 'T06']::text[], FALSE),
  ('MINALOC', 'Ministry of Local Government', 'Ministries', ARRAY['Community coordination', 'HWC management', 'Local governance']::text[], ARRAY[4, 9, 14, 22]::integer[], ARRAY['T01', 'T04']::text[], FALSE),
  ('MINEDUC', 'Ministry of Education', 'Ministries', ARRAY['Environmental education', 'Greening schools']::text[], ARRAY[11, 14, 20, 21]::integer[], ARRAY['T01']::text[], FALSE),
  ('MINEMA', 'Ministry of Emergency Management', 'Ministries', ARRAY['DRR strategies', 'Flood protection']::text[], ARRAY[8]::integer[], ARRAY['T01']::text[], FALSE),
  ('RMB', 'Rwanda Mines, Petroleum and Gas Board', 'Boards', ARRAY['Mine drainage', 'Mining environmental compliance']::text[], ARRAY[2, 7]::integer[], ARRAY['T01', 'T06']::text[], FALSE),
  ('CPCIC', 'Cleaner Production & Climate Innovation Centre', 'Academia and research', ARRAY['Circular economy', 'Pollution control', 'Fertiliser regulation']::text[], ARRAY[2, 7, 11, 16]::integer[], ARRAY['T01', 'T06']::text[], FALSE),
  ('NIRDA', 'National Industrial Research and Development Agency', 'Agencies and other public institutions', ARRAY['Industrial R&D', 'Sustainable production']::text[], ARRAY[7, 9, 11, 16]::integer[], ARRAY['T01', 'T07']::text[], FALSE),
  ('RICA', 'Rwanda Inspectorate, Competition and Consumer Protection Authority', 'Authorities', ARRAY['Biosecurity', 'Quality inspections', 'IAS border controls']::text[], ARRAY[5, 6, 7, 10, 13]::integer[], ARRAY['T01', 'T06']::text[], FALSE),
  ('RSB', 'Rwanda Standards Board', 'Boards', ARRAY['Environmental standards', 'Biosafety standards', 'Eco-labelling']::text[], ARRAY[6, 7, 10, 16, 17]::integer[], ARRAY['T01']::text[], FALSE),
  ('RRA', 'Rwanda Revenue Authority', 'Authorities', ARRAY['Tax incentives', 'Environmental fees']::text[], ARRAY[6, 9]::integer[], ARRAY['T01']::text[], FALSE),
  ('FDA', 'Rwanda Food and Drugs Authority', 'Authorities', ARRAY['Food safety', 'GMO detection', 'Biosafety']::text[], ARRAY[6, 9, 17]::integer[], ARRAY['T01', 'T06']::text[], FALSE),
  ('NCST', 'National Council for Science and Technology', 'Agencies and other public institutions', ARRAY['Research coordination', 'Innovation policy']::text[], ARRAY[6, 7, 8, 13, 20, 21]::integer[], ARRAY['T01', 'T07']::text[], FALSE),
  ('Rwanda Space Agency', 'Rwanda Space Agency', 'Agencies and other public institutions', ARRAY['Remote sensing', 'Land monitoring', 'IAS detection']::text[], ARRAY[6, 8, 10, 20, 21]::integer[], ARRAY['T07']::text[], FALSE),
  ('NAEB', 'National Agricultural Export Development Board', 'Boards', ARRAY['Export crops', 'Organic certification']::text[], ARRAY[7, 10]::integer[], ARRAY['T01', 'T06']::text[], FALSE),
  ('RURA', 'Rwanda Utilities Regulatory Authority', 'Authorities', ARRAY['Utilities regulation', 'Waste management']::text[], ARRAY[7, 16]::integer[], ARRAY['T01']::text[], FALSE),
  ('WASAC', 'Water and Sanitation Corporation', 'Agencies and other public institutions', ARRAY['Water supply', 'Aquatic ecosystem protection']::text[], ARRAY[7]::integer[], ARRAY['T01']::text[], FALSE),
  ('Meteo Rwanda', 'Rwanda Meteorology Agency', 'Agencies and other public institutions', ARRAY['Climate monitoring', 'Weather data for biodiversity']::text[], ARRAY[8]::integer[], ARRAY['T01', 'T07']::text[], FALSE),
  ('LODA', 'Local Administrative Entities Development Agency', 'Agencies and other public institutions', ARRAY['Community development', 'VUP programme']::text[], ARRAY[8, 9, 22]::integer[], ARRAY['T04', 'T05']::text[], FALSE),
  ('National Police (Marine)', 'Rwanda National Police (Marine)', 'Agencies and other public institutions', ARRAY['Fisheries enforcement', 'Lake patrols']::text[], ARRAY[5]::integer[], ARRAY['T01']::text[], FALSE),
  ('SGF', 'Special Guaranty Fund', 'Agencies and other public institutions', ARRAY['HWC compensation', 'Wildlife damage funds']::text[], ARRAY[4]::integer[], ARRAY['T01', 'T04']::text[], FALSE),
  ('RHA', 'Rwanda Housing Authority', 'Authorities', ARRAY['Urban planning', 'Green building', 'City master plans']::text[], ARRAY[11, 12]::integer[], ARRAY['T01']::text[], FALSE),
  ('Kigali City', 'City of Kigali', 'Local government', ARRAY['Urban green spaces', 'City environmental management', 'Car-free zones']::text[], ARRAY[7, 11, 12]::integer[], ARRAY['T01', 'T02']::text[], FALSE),
  ('PSF', 'Private Sector Federation', 'Private sector', ARRAY['Business coordination', 'Private sector standards']::text[], ARRAY[6, 7, 10, 15, 16, 19]::integer[], ARRAY['T06']::text[], FALSE),
  ('REG', 'Rwanda Energy Group', 'Agencies and other public institutions', ARRAY['Clean energy', 'Low-emission infrastructure']::text[], ARRAY[11]::integer[], ARRAY['T06']::text[], FALSE),
  ('RPPA', 'Rwanda Public Procurement Authority', 'Authorities', ARRAY['Green procurement', 'Sustainable purchasing']::text[], ARRAY[16]::integer[], ARRAY['T01']::text[], FALSE),
  ('RCHA', 'Rwanda Cultural Heritage Academy', 'Agencies and other public institutions', ARRAY['Traditional knowledge', 'Medicinal plants heritage']::text[], ARRAY[4, 9, 13, 22]::integer[], ARRAY['T07']::text[], FALSE),
  ('ILO', 'International Labour Organization', 'Development partners and international organisations', ARRAY['Green jobs', 'Sustainable livelihoods']::text[], ARRAY[16]::integer[], ARRAY['T05']::text[], FALSE),
  ('Q&A Venue Solution', 'Q&A Venue Solution', 'Private sector', ARRAY['Conservation support']::text[], ARRAY[3]::integer[], ARRAY['T04']::text[], FALSE),
  ('Eco-planet Bamboo', 'Eco-planet Bamboo', 'Private sector', ARRAY['Bamboo restoration', 'Sustainable materials']::text[], ARRAY[9]::integer[], ARRAY['T02', 'T06']::text[], FALSE),
  ('Urugaga Imbaraga', 'Urugaga Imbaraga (Farmers Federation)', 'NGOs and civil society', ARRAY['Farmer mobilization', 'Organic farming promotion']::text[], ARRAY[7]::integer[], ARRAY['T04']::text[], FALSE),
  ('ACORD Rwanda', 'ACORD Rwanda', 'NGOs and civil society', ARRAY['Community development', 'Conservation agriculture']::text[], ARRAY[10, 18, 22]::integer[], ARRAY['T04', 'T05']::text[], FALSE),
  ('WCSS', 'Wildlife Conservation Student Society', 'NGOs and civil society', ARRAY['Student conservation', 'Awareness campaigns']::text[], ARRAY[1]::integer[], ARRAY['T04', 'T07']::text[], FALSE),
  ('PFC', 'People for Conservation', 'NGOs and civil society', ARRAY['Community conservation', 'KBA monitoring']::text[], ARRAY[1]::integer[], ARRAY['T04']::text[], FALSE),
  ('Ultimate Forest', 'Ultimate Forest Company', 'Private sector', ARRAY['Forest certification', 'Sustainable forestry']::text[], ARRAY[8, 10]::integer[], ARRAY['T02', 'T06']::text[], FALSE),
  ('Nyungwe Management Company', 'Nyungwe Management Company', 'Private sector', ARRAY['Nyungwe NP management', 'Tourism operations']::text[], ARRAY[10]::integer[], ARRAY['T03']::text[], FALSE),
  ('ARDI', 'Agriculture and Rural Development Initiative', 'NGOs and civil society', ARRAY['Apiculture', 'Rural livelihoods']::text[], ARRAY[10]::integer[], ARRAY['T02', 'T04']::text[], FALSE),
  ('Rwanda Mountain Tea', 'Rwanda Mountain Tea', 'Private sector', ARRAY['Tea plantation biodiversity', 'Bee reserves']::text[], ARRAY[10]::integer[], ARRAY['T06']::text[], FALSE),
  ('RYBN', 'Rwanda Youth in Biodiversity Network', 'NGOs and civil society', ARRAY['Youth environmental engagement', 'Greening schools']::text[], ARRAY[7, 11]::integer[], ARRAY['T04']::text[], FALSE),
  ('ADRRES', 'ADRRES', 'NGOs and civil society', ARRAY['School environmental programmes', 'Youth mobilization']::text[], ARRAY[11]::integer[], ARRAY['T04']::text[], FALSE),
  ('LWD', 'Life and Water Development', 'NGOs and civil society', ARRAY['Community water projects', 'Ecosystem services']::text[], ARRAY[11]::integer[], ARRAY['T04', 'T05']::text[], FALSE),
  ('ESS OIL', 'ESS OIL Rwanda', 'Private sector', ARRAY['Essential oils', 'Sustainable sourcing']::text[], ARRAY[9]::integer[], ARRAY['T06']::text[], FALSE),
  ('IKIREZI', 'Ikirezi Natural Products', 'Private sector', ARRAY['Natural products', 'Sustainable value chains']::text[], ARRAY[9]::integer[], ARRAY['T06']::text[], FALSE),
  ('Rwanda Civil Aviation', 'Rwanda Civil Aviation Authority', 'Authorities', ARRAY['Airport biosecurity', 'IAS border interception at entry points']::text[], ARRAY[6]::integer[], ARRAY['T06']::text[], FALSE),
  ('MoH', 'Ministry of Health', 'Ministries', '{}'::text[], '{}'::integer[], '{}'::text[], FALSE),
  ('UR', 'University of Rwanda', 'Academia and research', '{}'::text[], '{}'::integer[], '{}'::text[], FALSE),
  ('RP', 'Rwanda Polytechnic', 'Academia and research', '{}'::text[], '{}'::integer[], '{}'::text[], FALSE),
  ('FSC', 'Forest Stewardship Council', 'Development partners and international organisations', '{}'::text[], '{}'::integer[], '{}'::text[], FALSE),
  ('NSAR', 'National Seed Association of Rwanda', 'Private sector', '{}'::text[], '{}'::integer[], '{}'::text[], FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.nbsap_strategic_actions (target_id, ordinal, action, data_sources) VALUES
  (1, 1, 'Mainstream biodiversity into the Agriculture Land-use Masterplan (LUMP)', ARRAY['NSDI', 'Agriculture Land-use Masterplan', 'PSTA 5', 'Annual Reports']::text[]),
  (1, 2, 'Establish baseline information on biodiversity-inclusive spatial planning under the 7th National Report to the CBD', ARRAY['National land use master plan', 'RBIS (Ecosystem mapping)']::text[]),
  (1, 3, 'Ensure biodiversity consideration within regulations for land lease and EIA process', ARRAY['Land lease', 'EIA', 'Biodiversity inclusive ESIA']::text[]),
  (1, 4, 'Develop spatial plans integrating conservation of Key Biodiversity and Bird Areas (KBAs)', ARRAY['National IBA report', 'Wildlife conservation master plan', 'Congo Nile Divide', 'NSDI']::text[]),
  (1, 5, 'Integrate migratory flyway conservation into national land-use planning', ARRAY['Global flyway datazone', 'CMS focal point', 'RBIS', 'Movebank']::text[]),
  (1, 6, 'Assess integration of biodiversity in SEAs and ESIAs', ARRAY['Environmental Audits & Inspections']::text[]),
  (1, 7, 'Integrate biodiversity considerations into land-use planning', ARRAY['Infrastructure development policies & guidelines', 'Special economic zones']::text[]),
  (1, 8, 'Establish a land use monitoring framework for protecting high-biodiversity areas', ARRAY['NBSAP Monitoring dashboard']::text[]),
  (2, 1, 'Develop and implement a single long-term management strategy for wetlands, remnant forests and other ecosystems', ARRAY['Kigali Wetlands master plan', 'Irrigation master plan', 'COMBIO Project', 'Wildlife conservation master plan']::text[]),
  (2, 2, 'Identify and restore degraded land using native species', ARRAY['Right trees in right place', 'ARCOS annual reports', 'Restoration reports']::text[]),
  (2, 3, 'Foster ecosystem rehabilitation through community-based approaches', ARRAY['LDCF reports', 'VCRP', 'CND', 'NBFA', 'TREPA']::text[]),
  (2, 4, 'Establish partnership programmes for private sector in biodiversity conservation', ARRAY['Conservation bonds', 'PPPs', 'Concessions']::text[]),
  (2, 5, 'Strengthen wetland management through sustainable eco-parks', ARRAY['Nyandungu Ecopark reports', 'Umusambi Village Annual reports']::text[]),
  (2, 6, 'Restore degraded landscapes through erosion control, agroforestry, afforestation', ARRAY['Green Amayaga', 'GEF8', 'LDCF reports', 'VCRP', 'CND', 'TREPA', 'COMBIO']::text[]),
  (3, 1, 'Sustain existing protected areas with a focus on biodiversity hotspots', ARRAY['Park reports', 'Annual reports', 'Scientific publications']::text[]),
  (3, 2, 'Promote sustainable practices within and around protected areas with community participation', ARRAY['Revenue sharing reports', 'Park Management Plans']::text[]),
  (3, 3, 'Maintain restored ecosystems under protection', ARRAY['ARCOS annual reports', 'Nature Rwanda reports', 'IUCN Green List']::text[]),
  (3, 4, 'Empower local communities to sustainably manage land and water ecosystems', ARRAY['Revenue sharing reports', 'NGO Reports']::text[]),
  (4, 1, 'Adopt best restoration practices for native threatened species', ARRAY['ARCOS annual reports', 'Nature Rwanda reports', 'PBC Project Reports']::text[]),
  (4, 2, 'Undertake National IUCN Red Listing under 7th Report to CBD', ARRAY['Scientific Reports']::text[]),
  (4, 3, 'Assess conservation status of all wetlands', ARRAY['Assessment Reports', 'IBA Status Report', 'Waterbirds monitoring report']::text[]),
  (4, 4, 'Develop strategies to reduce and manage human-wildlife conflict', ARRAY['Districts Reports', 'SGF Reports', 'Project Reports']::text[]),
  (4, 5, 'Promote biodiversity monitoring of threatened species and habitats', ARRAY['Annual Reports', 'Scientific Publications', 'Legacy Tree Project']::text[]),
  (4, 6, 'Develop national guidelines for genetic resources conservation (Ex Situ and In Situ)', ARRAY['Scientific publications', 'Guidelines/protocols']::text[]),
  (5, 1, 'Develop guidelines for sustainable management of biodiversity in agriculture and aquaculture', ARRAY['Guidelines for trees and forest plantations']::text[]),
  (5, 2, 'Promote technology for aquaculture to maintain native species', ARRAY['National Aquaculture Strategy 2023-2035', 'Fishing ministerial order']::text[]),
  (5, 3, 'Support establishment of aquaparks', ARRAY['Established Aquaparks']::text[]),
  (5, 4, 'Enhance knowledge and skills of fishers in sustainable fishing practices', ARRAY['Training Materials', 'Living lakes Biodiversity reports']::text[]),
  (5, 5, 'Enhance compliance and enforcement through monitoring and inspections', ARRAY['Inspection Reports', 'Awareness Campaign reports']::text[]),
  (6, 1, 'Develop national strategies and regulations on IAS prevention, control and management', ARRAY['Guidelines and annual reports', 'VCRP reports', 'COMBIO', 'CND']::text[]),
  (6, 2, 'Update the IAS assessment report for Rwanda', ARRAY['To be conducted']::text[]),
  (6, 3, 'Strengthen surveillance, monitoring and management strategies on IAS', ARRAY['RBIS & Monitoring reports', 'COMBIO', 'CND', 'SUNCASA']::text[]),
  (6, 4, 'Strengthen biosecurity measures at entry points', ARRAY['Annual reports', 'Guidelines']::text[]),
  (6, 5, 'Implement IAS control and eradication programmes in protected areas', ARRAY['Annual reports', 'Project reports']::text[]),
  (7, 1, 'Promote the use of organic fertilisers to enhance soil health', ARRAY['Annual reports', 'Studies', 'Licensing data']::text[]),
  (7, 2, 'Develop mine drainage and leaching of contaminant plan', ARRAY['RMB Guidelines', 'Water permits']::text[]),
  (7, 3, 'Establish mechanism for data gathering on major pollutants', ARRAY['Reports and project reports']::text[]),
  (7, 4, 'Reduce chemical runoff and promote biodiversity conservation in agricultural lands', ARRAY['Inspection reports']::text[]),
  (7, 5, 'Promote integrated pest management (IPM)', ARRAY['Reports']::text[]),
  (7, 6, 'Empower communities in management of chemical and hazardous waste', ARRAY['Inventory Report (HHPs)', 'Reports']::text[]),
  (8, 1, 'Maintain and expand forest cover to more than 30.4% of territory', ARRAY['ARCOS annual reports', 'Nature Rwanda reports', 'REMA restoration program', 'RFA Annual Reports']::text[]),
  (8, 2, 'Implement mitigation measures to reduce GHG emissions', ARRAY['NDC Reports']::text[]),
  (8, 3, 'Enhance nature-based solutions such as ecosystem-based adaptation (EbA)', ARRAY['ARCOS annual reports', 'Nature Rwanda reports', 'PBC Project Reports']::text[]),
  (8, 4, 'Improve monitoring and reporting systems to track climate change impacts on biodiversity', ARRAY['Studies on climate change & biodiversity', 'Monitoring reports', 'Restoration barometer']::text[]),
  (8, 5, 'Enhance conservation efforts in buffer zones', ARRAY['Reports', 'FMES']::text[]),
  (9, 1, 'Strengthen collaboration for sustainable use of medicinal plants', ARRAY['Revenue sharing reports', 'NGO Reports', 'Research reports']::text[]),
  (9, 2, 'Integrate new genetic varieties to strengthen biodiversity and ecosystem resilience', ARRAY['Reports']::text[]),
  (9, 3, 'Establish frameworks for equitable benefit sharing from national park licences and PES', ARRAY['Revenue sharing reports', 'PES Reports', 'Umusave Fund', 'COMBIO Project Reports']::text[]),
  (9, 4, 'Promote alternative livelihoods (ecotourism, agroforestry)', ARRAY['Project reports', 'System Imibereho Database', 'RDB Business Registry']::text[]),
  (10, 1, 'Implement circular economy models for aquaponics', ARRAY['Reports']::text[]),
  (10, 2, 'Promote apiculture in appropriate bee reserves', ARRAY['Reports']::text[]),
  (10, 3, 'Expand area under agro-ecology, conservation agriculture and regenerative agriculture', ARRAY['CA Reports', 'RICA Strategic plans', 'GGI Reports', 'PBC Project reports']::text[]),
  (10, 4, 'Enhance law enforcement for forest protection and urban forest management plan', ARRAY['Reports', 'Guidelines for urban forests', 'SUNCASA', 'Management Plans']::text[]),
  (10, 5, 'Assessment and Gap Analysis for Forest Management Certification', ARRAY['Inspection Reports']::text[]),
  (10, 6, 'Assess degraded agricultural and forest land and propose restoration measures', ARRAY['CROM-DSS', 'SLM-MRV', 'FMES data', 'LDN Reports', 'State of environment Report']::text[]),
  (11, 1, 'Strengthen and expand air pollution monitoring stations', ARRAY['Reports']::text[]),
  (11, 2, 'Promote behavioral shifts towards low-emission practices', ARRAY['Reports', 'Car free zones/days']::text[]),
  (11, 3, 'Enforce measures for reducing emissions from industry and motorised vehicles', ARRAY['Reports']::text[]),
  (11, 4, 'Improve ecosystem services in urban areas through sustainable urban planning with NBS', ARRAY['Reports & Land use plan', 'Global NBS Standards', 'Storm Water management master plan']::text[]),
  (11, 5, 'Promote WASH through greening school initiatives', ARRAY['Greening Schools Project Report', 'Nkuranenigiti program report']::text[]),
  (12, 1, 'Conduct baseline assessment of urban green spaces', ARRAY['Reports', 'Publications', 'Strategic plans']::text[]),
  (12, 2, 'Develop and implement NBS plans for cities and towns', ARRAY['Reports', 'Strategic plans']::text[]),
  (12, 3, 'Promote biodiversity conservation within urban green spaces using native species', ARRAY['Reports', 'Strategic plans', 'Guidelines']::text[]),
  (13, 1, 'Develop baseline of benefits arising from utilisation of genetic resources', ARRAY['Baseline reports', 'ABS Guidelines and Toolkit']::text[]),
  (13, 2, 'Facilitate access and transfer of crop genetic materials', ARRAY['Reports & regulations', 'Law governing crop production']::text[]),
  (13, 3, 'Develop guidelines and permit systems for fair and equitable ABS', ARRAY['Guidelines and reports']::text[]),
  (13, 4, 'Protect and promote traditional knowledge associated with genetic resources', ARRAY['Annual reports & publications']::text[]),
  (14, 1, 'Strengthen budget tagging and budget statement for CENR with biodiversity section', ARRAY['Budget tagging reports', 'Biodiversity expenditure review']::text[]),
  (14, 2, 'Integrate biodiversity values into national development plans and national accounting', ARRAY['Sectoral policies', 'NST2&3', 'Vision 2050']::text[]),
  (14, 3, 'Integrate biodiversity considerations in district annual plans and performance contracts', ARRAY['Annual planning process']::text[]),
  (14, 4, 'Mainstream biodiversity into ESIA guidelines', ARRAY['Biodiversity inclusive ESIA Guidelines']::text[]),
  (14, 5, 'Develop Environmental-Economic Accounting (SEEA)', ARRAY['SEEA Standards National Accounts']::text[]),
  (15, 1, 'Develop baseline through nature-related financial disclosure readiness study', ARRAY['BIOFIN Report']::text[]),
  (15, 2, 'Update legal frameworks requiring businesses to disclose nature-related risks', ARRAY['Reports']::text[]),
  (15, 3, 'Build institutional capacity for nature-related financial disclosures', ARRAY['Reports']::text[]),
  (16, 1, 'Identify strategies and guidelines for sustainable consumption and production', ARRAY['Reports & studies']::text[]),
  (16, 2, 'Increase public awareness on sustainable consumption', ARRAY['Reports']::text[]),
  (16, 3, 'Promote eco-labelling and certification for sustainable products', ARRAY['Reports']::text[]),
  (16, 4, 'Promote circular economy across all sectors', ARRAY['National Circular Economy Action Plan', 'Reports']::text[]),
  (17, 1, 'Develop guidelines for effective implementation of biosafety law', ARRAY['National Biosafety Framework', 'Rwanda biosafety law']::text[]),
  (17, 2, 'Enhance capacity of institutions to manage risks associated with GMOs', ARRAY['Training reports', 'Biosafety guidelines']::text[]),
  (17, 3, 'Put in place mechanisms for detection and identification of GMOs', ARRAY['Lab Test reports']::text[]),
  (18, 1, 'Conduct study for review of subsidies that harm biodiversity', ARRAY['BIOFIN Reports']::text[]),
  (18, 2, 'Promote positive incentives through financial incentives, PES and eco-labelling', ARRAY['Umusave Fund reports', 'PES reports', 'COMBIO Project reports']::text[]),
  (18, 3, 'Integrate biodiversity into national and sectoral budgeting', ARRAY['Budget tagging reports', 'Biodiversity financial need assessment']::text[]),
  (19, 1, 'Conduct biodiversity expenditure review and needs assessment', ARRAY['Biodiversity Financial Need assessment']::text[]),
  (19, 2, 'Develop and operationalise a dedicated biodiversity window under Rwanda Green Fund', ARRAY['To be operationalised']::text[]),
  (19, 3, 'Identify and secure funding sources including government, international grants and partnerships', ARRAY['Reports']::text[]),
  (19, 4, 'Support environmental inspection and enhance collection of fines through digital finance', ARRAY['Reports']::text[]),
  (20, 1, 'Develop Rwanda''s 7th National Report to the CBD', ARRAY['National Report']::text[]),
  (20, 2, 'Develop a national biodiversity baseline for effective monitoring', ARRAY['Baseline reports']::text[]),
  (20, 3, 'Strengthen biodiversity information systems to support decision-making', ARRAY['RBIS']::text[]),
  (20, 4, 'Promote collaboration among academic researchers, institutions and local NGOs', ARRAY['Reports']::text[]),
  (21, 1, 'Create awareness and utility of Rwanda Biodiversity Information System (RBIS)', ARRAY['RBIS']::text[]),
  (21, 2, 'Establish a national IUCN Red List', ARRAY['Scientific reports']::text[]),
  (21, 3, 'Ensure biodiversity data is clearly communicated and accessible', ARRAY['Reports']::text[]),
  (21, 4, 'Regularly update the CHM Rwanda with stakeholder engagement', ARRAY['CHM Rwanda']::text[]),
  (22, 1, 'Establish baseline on gender inclusion in biodiversity conservation', ARRAY['Reports']::text[]),
  (22, 2, 'Engage women, youth and persons with disabilities in biodiversity conservation', ARRAY['Reports']::text[]),
  (22, 3, 'Train women, youth and persons with disabilities in biodiversity monitoring', ARRAY['Training reports']::text[]),
  (22, 4, 'Enhance private sector initiatives to incentivise inclusive conservation', ARRAY['Reports']::text[])
ON CONFLICT (target_id, ordinal) DO NOTHING;

INSERT INTO public.strategic_action_institutions (action_id, ordinal, label, institution_id)
SELECT a.id, v.ordinal, v.label, i.id
FROM (VALUES
  (1, 1, 1, 'NLA', 'NLA'),
  (1, 1, 2, 'MINAGRI', 'MINAGRI'),
  (1, 1, 3, 'NISR', 'NISR'),
  (1, 1, 4, 'ARCOS', 'ARCOS'),
  (1, 1, 5, 'RFA', 'RFA'),
  (1, 1, 6, 'RWB', 'RWB'),
  (1, 2, 1, 'NLA', 'NLA'),
  (1, 2, 2, 'CoEB', 'CoEB'),
  (1, 3, 1, 'MoE', 'MoE'),
  (1, 3, 2, 'REMA', 'REMA'),
  (1, 3, 3, 'RDB', 'RDB'),
  (1, 3, 4, 'NLA', 'NLA'),
  (1, 4, 1, 'Prime Biodiversity Conservation', 'Prime Biodiversity Conservation'),
  (1, 4, 2, 'Nature Rwanda', 'Nature Rwanda'),
  (1, 4, 3, 'RDB', 'RDB'),
  (1, 4, 4, 'RFA', 'RFA'),
  (1, 4, 5, 'WCSS', 'WCSS'),
  (1, 4, 6, 'RWCA', 'RWCA'),
  (1, 4, 7, 'ARCOS', 'ARCOS'),
  (1, 4, 8, 'PFC', 'PFC'),
  (1, 4, 9, 'NLA', 'NLA'),
  (1, 5, 1, 'Nature Rwanda', 'Nature Rwanda'),
  (1, 5, 2, 'REMA', 'REMA'),
  (1, 5, 3, 'CoEB', 'CoEB'),
  (1, 5, 4, 'RWCA', 'RWCA'),
  (1, 6, 1, 'REMA', 'REMA'),
  (1, 6, 2, 'RDB', 'RDB'),
  (1, 7, 1, 'MININFRA', 'MININFRA'),
  (1, 7, 2, 'MINICOM', 'MINICOM'),
  (1, 7, 3, 'MINAGRI', 'MINAGRI'),
  (1, 7, 4, 'RFA', 'RFA'),
  (1, 7, 5, 'RWB', 'RWB'),
  (1, 7, 6, 'RMB', 'RMB'),
  (1, 8, 1, 'MoE', 'MoE'),
  (1, 8, 2, 'RDB', 'RDB'),
  (1, 8, 3, 'NLA', 'NLA'),
  (1, 8, 4, 'REMA', 'REMA'),
  (2, 1, 1, 'REMA', 'REMA'),
  (2, 1, 2, 'MoE', 'MoE'),
  (2, 1, 3, 'MINAGRI', 'MINAGRI'),
  (2, 1, 4, 'RFA', 'RFA'),
  (2, 1, 5, 'ARCOS', 'ARCOS'),
  (2, 1, 6, 'IUCN', 'IUCN'),
  (2, 1, 7, 'CoEB', 'CoEB'),
  (2, 1, 8, 'RDB', 'RDB'),
  (2, 2, 1, 'CoEB', 'CoEB'),
  (2, 2, 2, 'ARCOS', 'ARCOS'),
  (2, 2, 3, 'Nature Rwanda', 'Nature Rwanda'),
  (2, 2, 4, 'RMB', 'RMB'),
  (2, 2, 5, 'RWCA', 'RWCA'),
  (2, 2, 6, 'RECOR', 'RECOR'),
  (2, 2, 7, 'RFA', 'RFA'),
  (2, 2, 8, 'CPCIC', 'CPCIC'),
  (2, 3, 1, 'Nature Rwanda', 'Nature Rwanda'),
  (2, 3, 2, 'ARECO', 'ARECO'),
  (2, 3, 3, 'REMA', 'REMA'),
  (2, 3, 4, 'RWB', 'RWB'),
  (2, 3, 5, 'ARCOS', 'ARCOS'),
  (2, 3, 6, 'IUCN', 'IUCN'),
  (2, 3, 7, 'MoE', 'MoE'),
  (2, 3, 8, 'RFA', 'RFA'),
  (2, 4, 1, 'RDB', 'RDB'),
  (2, 4, 2, 'RGF', 'RGF'),
  (2, 5, 1, 'RDB', 'RDB'),
  (2, 5, 2, 'REMA', 'REMA'),
  (2, 5, 3, 'RWCA', 'RWCA'),
  (2, 6, 1, 'Nature Rwanda', 'Nature Rwanda'),
  (2, 6, 2, 'ARECO', 'ARECO'),
  (2, 6, 3, 'REMA', 'REMA'),
  (2, 6, 4, 'RWB', 'RWB'),
  (2, 6, 5, 'ARCOS', 'ARCOS'),
  (2, 6, 6, 'IUCN', 'IUCN'),
  (2, 6, 7, 'MoE', 'MoE'),
  (2, 6, 8, 'RFA', 'RFA'),
  (2, 6, 9, 'RECOR', 'RECOR'),
  (2, 6, 10, 'RGF', 'RGF'),
  (2, 6, 11, 'RAB', 'RAB'),
  (2, 6, 12, 'RWCA', 'RWCA'),
  (3, 1, 1, 'RDB', 'RDB'),
  (3, 1, 2, 'AWF', 'AWF'),
  (3, 1, 3, 'CoEB', 'CoEB'),
  (3, 1, 4, 'RWCA', 'RWCA'),
  (3, 2, 1, 'RDB', 'RDB'),
  (3, 2, 2, 'NGOs working with RDB', NULL),
  (3, 3, 1, 'RDB', 'RDB'),
  (3, 3, 2, 'ARCOS', 'ARCOS'),
  (3, 3, 3, 'Nature Rwanda', 'Nature Rwanda'),
  (3, 3, 4, 'CoEB', 'CoEB'),
  (3, 3, 5, 'RWCA', 'RWCA'),
  (3, 3, 6, 'RECOR', 'RECOR'),
  (3, 3, 7, 'RFA', 'RFA'),
  (3, 3, 8, 'IUCN', 'IUCN'),
  (3, 3, 9, 'Prime Biodiversity Conservation', 'Prime Biodiversity Conservation'),
  (3, 3, 10, 'African Parks', 'African Parks'),
  (3, 3, 11, 'Forest of Hope Association', 'Forest of Hope Association'),
  (3, 4, 1, 'RDB', 'RDB'),
  (3, 4, 2, 'NGOs working with RDB', NULL),
  (4, 1, 1, 'RDB', 'RDB'),
  (4, 1, 2, 'REMA', 'REMA'),
  (4, 1, 3, 'ARCOS', 'ARCOS'),
  (4, 1, 4, 'Nature Rwanda', 'Nature Rwanda'),
  (4, 1, 5, 'CoEB', 'CoEB'),
  (4, 1, 6, 'RWCA', 'RWCA'),
  (4, 1, 7, 'RECOR', 'RECOR'),
  (4, 1, 8, 'RFA', 'RFA'),
  (4, 1, 9, 'IUCN', 'IUCN'),
  (4, 1, 10, 'Prime Biodiversity Conservation', 'Prime Biodiversity Conservation'),
  (4, 1, 11, 'African Parks', 'African Parks'),
  (4, 2, 1, 'IUCN', 'IUCN'),
  (4, 2, 2, 'REMA', 'REMA'),
  (4, 2, 3, 'CoEB', 'CoEB'),
  (4, 3, 1, 'REMA', 'REMA'),
  (4, 3, 2, 'ARCOS', 'ARCOS'),
  (4, 3, 3, 'CoEB', 'CoEB'),
  (4, 3, 4, 'Nature Rwanda', 'Nature Rwanda'),
  (4, 3, 5, 'RWCA', 'RWCA'),
  (4, 4, 1, 'RDB', 'RDB'),
  (4, 4, 2, 'MINALOC', 'MINALOC'),
  (4, 4, 3, 'Special Guaranty Fund (SGF)', 'SGF'),
  (4, 4, 4, 'RWCA', 'RWCA'),
  (4, 5, 1, 'REMA', 'REMA'),
  (4, 5, 2, 'CoEB', 'CoEB'),
  (4, 5, 3, 'RDB', 'RDB'),
  (4, 5, 4, 'Nature Rwanda', 'Nature Rwanda'),
  (4, 5, 5, 'RWCA', 'RWCA'),
  (4, 6, 1, 'REMA', 'REMA'),
  (4, 6, 2, 'RDB', 'RDB'),
  (4, 6, 3, 'RAB', 'RAB'),
  (4, 6, 4, 'RFA', 'RFA'),
  (4, 6, 5, 'ICRAF', 'ICRAF'),
  (4, 6, 6, 'Rwanda Cultural Heritage Academy', 'RCHA'),
  (5, 1, 1, 'RFA', 'RFA'),
  (5, 1, 2, 'RAB', 'RAB'),
  (5, 1, 3, 'REMA', 'REMA'),
  (5, 2, 1, 'MINAGRI', 'MINAGRI'),
  (5, 2, 2, 'RAB', 'RAB'),
  (5, 2, 3, 'RWB', 'RWB'),
  (5, 3, 1, 'MINAGRI', 'MINAGRI'),
  (5, 3, 2, 'RAB', 'RAB'),
  (5, 3, 3, 'RWB', 'RWB'),
  (5, 3, 4, 'REMA', 'REMA'),
  (5, 3, 5, 'RDB', 'RDB'),
  (5, 4, 1, 'MINAGRI', 'MINAGRI'),
  (5, 4, 2, 'RAB', 'RAB'),
  (5, 4, 3, 'RWB', 'RWB'),
  (5, 4, 4, 'UR Nyagatare', 'UR'),
  (5, 4, 5, 'RP Karongi', 'RP'),
  (5, 4, 6, 'ARCOS', 'ARCOS'),
  (5, 5, 1, 'REMA', 'REMA'),
  (5, 5, 2, 'RAB', 'RAB'),
  (5, 5, 3, 'National Police (Marine)', 'National Police (Marine)'),
  (6, 1, 1, 'REMA', 'REMA'),
  (6, 1, 2, 'MoE', 'MoE'),
  (6, 1, 3, 'RFA', 'RFA'),
  (6, 1, 4, 'ARCOS', 'ARCOS'),
  (6, 1, 5, 'African Parks', 'African Parks'),
  (6, 1, 6, 'IGCP', 'IGCP'),
  (6, 1, 7, 'Karisoke', 'Karisoke'),
  (6, 1, 8, 'RDB', 'RDB'),
  (6, 2, 1, 'MoE', 'MoE'),
  (6, 2, 2, 'REMA', 'REMA'),
  (6, 3, 1, 'CoEB', 'CoEB'),
  (6, 3, 2, 'MoE', 'MoE'),
  (6, 3, 3, 'REMA', 'REMA'),
  (6, 3, 4, 'RFA', 'RFA'),
  (6, 3, 5, 'ARCOS', 'ARCOS'),
  (6, 3, 6, 'African Parks', 'African Parks'),
  (6, 3, 7, 'IGCP', 'IGCP'),
  (6, 3, 8, 'Karisoke', 'Karisoke'),
  (6, 3, 9, 'RDB', 'RDB'),
  (6, 3, 10, 'RICA', 'RICA'),
  (6, 3, 11, 'RAB', 'RAB'),
  (6, 4, 1, 'RICA', 'RICA'),
  (6, 4, 2, 'RAB', 'RAB'),
  (6, 4, 3, 'REMA', 'REMA'),
  (6, 4, 4, 'RSB', 'RSB'),
  (6, 4, 5, 'RRA', 'RRA'),
  (6, 4, 6, 'MINICOM', 'MINICOM'),
  (6, 4, 7, 'Rwanda Civil Aviation', 'Rwanda Civil Aviation'),
  (6, 4, 8, 'FDA', 'FDA'),
  (6, 4, 9, 'PSF', 'PSF'),
  (6, 5, 1, 'REMA', 'REMA'),
  (6, 5, 2, 'MoE', 'MoE'),
  (6, 5, 3, 'RFA', 'RFA'),
  (6, 5, 4, 'ARCOS', 'ARCOS'),
  (6, 5, 5, 'African Parks', 'African Parks'),
  (6, 5, 6, 'IGCP', 'IGCP'),
  (6, 5, 7, 'Karisoke', 'Karisoke'),
  (6, 5, 8, 'RDB', 'RDB'),
  (6, 5, 9, 'RAB', 'RAB'),
  (6, 5, 10, 'RWB', 'RWB'),
  (6, 5, 11, 'Prime Biodiversity', 'Prime Biodiversity Conservation'),
  (7, 1, 1, 'ROAM', 'ROAM'),
  (7, 1, 2, 'RAB', 'RAB'),
  (7, 1, 3, 'Bridge to Rwanda', 'Bridge to Rwanda'),
  (7, 1, 4, 'REMA', 'REMA'),
  (7, 1, 5, 'RSB', 'RSB'),
  (7, 1, 6, 'RICA', 'RICA'),
  (7, 1, 7, 'CPCIC', 'CPCIC'),
  (7, 1, 8, 'NAEB', 'NAEB'),
  (7, 1, 9, 'ARCOS', 'ARCOS'),
  (7, 1, 10, 'Nature Rwanda', 'Nature Rwanda'),
  (7, 1, 11, 'FAO', 'FAO'),
  (7, 1, 12, 'GIZ', 'GIZ'),
  (7, 1, 13, 'RWB', 'RWB'),
  (7, 1, 14, 'RURA', 'RURA'),
  (7, 1, 15, 'WASAC', 'WASAC'),
  (7, 2, 1, 'RMB', 'RMB'),
  (7, 2, 2, 'RWB', 'RWB'),
  (7, 3, 1, 'REMA', 'REMA'),
  (7, 4, 1, 'REMA', 'REMA'),
  (7, 4, 2, 'RWB', 'RWB'),
  (7, 4, 3, 'PSF', 'PSF'),
  (7, 4, 4, 'CPCIC', 'CPCIC'),
  (7, 4, 5, 'NIRDA', 'NIRDA'),
  (7, 4, 6, 'CoEB', 'CoEB'),
  (7, 4, 7, 'UR/CST', 'UR'),
  (7, 4, 8, 'RAB', 'RAB'),
  (7, 4, 9, 'RICA', 'RICA'),
  (7, 4, 10, 'NAEB', 'NAEB'),
  (7, 4, 11, 'ROAM', 'ROAM'),
  (7, 5, 1, 'RICA', 'RICA'),
  (7, 5, 2, 'RAB', 'RAB'),
  (7, 5, 3, 'MINAGRI', 'MINAGRI'),
  (7, 5, 4, 'FAO', 'FAO'),
  (7, 5, 5, 'One Acre Fund', 'One Acre Fund'),
  (7, 5, 6, 'Bridge to Rwanda', 'Bridge to Rwanda'),
  (7, 6, 1, 'ARECO', 'ARECO'),
  (7, 6, 2, 'FAO', 'FAO'),
  (7, 6, 3, 'CPCIC', 'CPCIC'),
  (7, 6, 4, 'REMA', 'REMA'),
  (7, 6, 5, 'MoE', 'MoE'),
  (8, 1, 1, 'RDB', 'RDB'),
  (8, 1, 2, 'REMA', 'REMA'),
  (8, 1, 3, 'ARCOS', 'ARCOS'),
  (8, 1, 4, 'Nature Rwanda', 'Nature Rwanda'),
  (8, 1, 5, 'CoEB', 'CoEB'),
  (8, 1, 6, 'RWCA', 'RWCA'),
  (8, 1, 7, 'RECOR', 'RECOR'),
  (8, 1, 8, 'RFA', 'RFA'),
  (8, 1, 9, 'RWB', 'RWB'),
  (8, 1, 10, 'IUCN', 'IUCN'),
  (8, 1, 11, 'Prime Biodiversity Conservation', 'Prime Biodiversity Conservation'),
  (8, 1, 12, 'African Parks', 'African Parks'),
  (8, 1, 13, 'Forest of Hope Association', 'Forest of Hope Association'),
  (8, 1, 14, 'One Tree Planted', 'One Tree Planted'),
  (8, 2, 1, 'REMA', 'REMA'),
  (8, 3, 1, 'RDB', 'RDB'),
  (8, 3, 2, 'REMA', 'REMA'),
  (8, 3, 3, 'ARCOS', 'ARCOS'),
  (8, 3, 4, 'Nature Rwanda', 'Nature Rwanda'),
  (8, 3, 5, 'CoEB', 'CoEB'),
  (8, 3, 6, 'RWCA', 'RWCA'),
  (8, 3, 7, 'RECOR', 'RECOR'),
  (8, 3, 8, 'RFA', 'RFA'),
  (8, 3, 9, 'RWB', 'RWB'),
  (8, 3, 10, 'IUCN', 'IUCN'),
  (8, 3, 11, 'ARECO', 'ARECO'),
  (8, 4, 1, 'REMA', 'REMA'),
  (8, 4, 2, 'METEO Rwanda', 'Meteo Rwanda'),
  (8, 4, 3, 'NCST', 'NCST'),
  (8, 4, 4, 'CoEB', 'CoEB'),
  (8, 4, 5, 'Rwanda Space Agency', 'Rwanda Space Agency'),
  (8, 4, 6, 'IUCN', 'IUCN'),
  (8, 4, 7, 'MINECOFIN', 'MINECOFIN'),
  (8, 4, 8, 'BNR', 'BNR'),
  (8, 5, 1, 'RDB', 'RDB'),
  (8, 5, 2, 'RFA', 'RFA'),
  (8, 5, 3, 'REMA', 'REMA'),
  (8, 5, 4, 'Ultimate Forest', 'Ultimate Forest'),
  (8, 5, 5, 'Rwanda Space Agency', 'Rwanda Space Agency'),
  (8, 5, 6, 'African Parks', 'African Parks'),
  (8, 5, 7, 'WCS', 'WCS'),
  (8, 5, 8, 'AWF', 'AWF'),
  (9, 1, 1, 'RDB', 'RDB'),
  (9, 1, 2, 'RCHA', 'RCHA'),
  (9, 1, 3, 'NIRDA', 'NIRDA'),
  (9, 1, 4, 'CoEB', 'CoEB'),
  (9, 1, 5, 'MoH', 'MoH'),
  (9, 1, 6, 'FDA', 'FDA'),
  (9, 2, 1, 'RDB', 'RDB'),
  (9, 2, 2, 'REMA', 'REMA'),
  (9, 2, 3, 'RFA', 'RFA'),
  (9, 2, 4, 'Higher learning institutions', NULL),
  (9, 2, 5, 'ICRAF', 'ICRAF'),
  (9, 2, 6, 'IUCN', 'IUCN'),
  (9, 3, 1, 'RDB', 'RDB'),
  (9, 3, 2, 'RWB', 'RWB'),
  (9, 3, 3, 'REMA', 'REMA'),
  (9, 3, 4, 'MoE', 'MoE'),
  (9, 3, 5, 'WRI', 'WRI'),
  (9, 3, 6, 'GGGI', 'GGGI'),
  (9, 3, 7, 'IUCN', 'IUCN'),
  (9, 3, 8, 'RFA', 'RFA'),
  (9, 3, 9, 'ARCOS', 'ARCOS'),
  (9, 3, 10, 'RGF', 'RGF'),
  (9, 3, 11, 'MINALOC', 'MINALOC'),
  (9, 3, 12, 'LODA', 'LODA'),
  (9, 4, 1, 'REMA', 'REMA'),
  (9, 4, 2, 'MINALOC', 'MINALOC'),
  (9, 4, 3, 'MINECOFIN', 'MINECOFIN'),
  (9, 4, 4, 'RDB', 'RDB'),
  (9, 4, 5, 'RGF', 'RGF'),
  (9, 4, 6, 'Prime Biodiversity Conservation', 'Prime Biodiversity Conservation'),
  (9, 4, 7, 'Nature Rwanda', 'Nature Rwanda'),
  (9, 4, 8, 'ARECO', 'ARECO'),
  (9, 4, 9, 'ARCOS', 'ARCOS'),
  (9, 4, 10, 'Partners for Conservation', 'Partners for Conservation'),
  (9, 4, 11, 'RFA', 'RFA'),
  (9, 4, 12, 'IUCN', 'IUCN'),
  (9, 4, 13, 'ICRAF', 'ICRAF'),
  (9, 4, 14, 'One Acre Fund', 'One Acre Fund'),
  (9, 4, 15, 'GIZ', 'GIZ'),
  (9, 4, 16, 'NIRDA', 'NIRDA'),
  (9, 4, 17, 'RWCA', 'RWCA'),
  (10, 1, 1, 'RAB', 'RAB'),
  (10, 1, 2, 'NAEB', 'NAEB'),
  (10, 1, 3, 'Private sector', NULL),
  (10, 2, 1, 'RAB', 'RAB'),
  (10, 2, 2, 'ARDI', 'ARDI'),
  (10, 2, 3, 'African Parks', 'African Parks'),
  (10, 2, 4, 'RFA', 'RFA'),
  (10, 2, 5, 'Nature Rwanda', 'Nature Rwanda'),
  (10, 2, 6, 'Rwanda Mountain Tea', 'Rwanda Mountain Tea'),
  (10, 2, 7, 'PSF', 'PSF'),
  (10, 2, 8, 'ICRAF', 'ICRAF'),
  (10, 3, 1, 'MINAGRI', 'MINAGRI'),
  (10, 3, 2, 'RAB', 'RAB'),
  (10, 3, 3, 'RICA University', NULL),
  (10, 3, 4, 'GGGI', 'GGGI'),
  (10, 3, 5, 'CPCIC', 'CPCIC'),
  (10, 3, 6, 'Prime Biodiversity Conservation', 'Prime Biodiversity Conservation'),
  (10, 3, 7, 'REMA', 'REMA'),
  (10, 3, 8, 'ARECO', 'ARECO'),
  (10, 3, 9, 'Bridge to Rwanda', 'Bridge to Rwanda'),
  (10, 3, 10, 'ROAM', 'ROAM'),
  (10, 3, 11, 'RECOR', 'RECOR'),
  (10, 3, 12, 'SNV', 'SNV'),
  (10, 3, 13, 'ACORD Rwanda', 'ACORD Rwanda'),
  (10, 4, 1, 'RDB', 'RDB'),
  (10, 4, 2, 'African Parks', 'African Parks'),
  (10, 4, 3, 'RFA', 'RFA'),
  (10, 4, 4, 'Nyungwe Management Company', 'Nyungwe Management Company'),
  (10, 4, 5, 'ARCOS', 'ARCOS'),
  (10, 4, 6, 'Partners for Conservation', 'Partners for Conservation'),
  (10, 4, 7, 'IUCN', 'IUCN'),
  (10, 4, 8, 'Districts', 'District Authorities'),
  (10, 4, 9, 'NLA', 'NLA'),
  (10, 4, 10, 'REMA', 'REMA'),
  (10, 5, 1, 'RFA', 'RFA'),
  (10, 5, 2, 'MoE', 'MoE'),
  (10, 5, 3, 'Forest Stewardship Council', 'FSC'),
  (10, 5, 4, 'RSB', 'RSB'),
  (10, 5, 5, 'Ultimate Forest Company', 'Ultimate Forest'),
  (10, 6, 1, 'RWB', 'RWB'),
  (10, 6, 2, 'IUCN', 'IUCN'),
  (10, 6, 3, 'RAB', 'RAB'),
  (10, 6, 4, 'CoEB', 'CoEB'),
  (10, 6, 5, 'RFA', 'RFA'),
  (10, 6, 6, 'NLA', 'NLA'),
  (10, 6, 7, 'REMA', 'REMA'),
  (10, 6, 8, 'Rwanda Space Agency', 'Rwanda Space Agency'),
  (11, 1, 1, 'REMA', 'REMA'),
  (11, 2, 1, 'MININFRA', 'MININFRA'),
  (11, 2, 2, 'Kigali City', 'Kigali City'),
  (11, 2, 3, 'RWCA', 'RWCA'),
  (11, 2, 4, 'ARCOS', 'ARCOS'),
  (11, 2, 5, 'RGF', 'RGF'),
  (11, 2, 6, 'REG', 'REG'),
  (11, 2, 7, 'IUCN', 'IUCN'),
  (11, 2, 8, 'SNV', 'SNV'),
  (11, 2, 9, 'GIZ', 'GIZ'),
  (11, 2, 10, 'ARECO', 'ARECO'),
  (11, 2, 11, 'Partners for Conservation', 'Partners for Conservation'),
  (11, 2, 12, 'RECOR', 'RECOR'),
  (11, 3, 1, 'CPCIC', 'CPCIC'),
  (11, 3, 2, 'NIRDA', 'NIRDA'),
  (11, 3, 3, 'REMA', 'REMA'),
  (11, 3, 4, 'MININFRA', 'MININFRA'),
  (11, 3, 5, 'Kigali City', 'Kigali City'),
  (11, 3, 6, 'Police', NULL),
  (11, 3, 7, 'RURA', 'RURA'),
  (11, 4, 1, 'NLA', 'NLA'),
  (11, 4, 2, 'Nature Rwanda', 'Nature Rwanda'),
  (11, 4, 3, 'IUCN', 'IUCN'),
  (11, 4, 4, 'WRI', 'WRI'),
  (11, 4, 5, 'GIZ', 'GIZ'),
  (11, 4, 6, 'RHA', 'RHA'),
  (11, 4, 7, 'Kigali City', 'Kigali City'),
  (11, 4, 8, 'ARCOS', 'ARCOS'),
  (11, 4, 9, 'RWB', 'RWB'),
  (11, 4, 10, 'GGGI', 'GGGI'),
  (11, 4, 11, 'REMA', 'REMA'),
  (11, 5, 1, 'RYBN', 'RYBN'),
  (11, 5, 2, 'ADRRES', 'ADRRES'),
  (11, 5, 3, 'ARCOS', 'ARCOS'),
  (11, 5, 4, 'MINEDUC', 'MINEDUC'),
  (11, 5, 5, 'REMA', 'REMA'),
  (11, 5, 6, 'RDB', 'RDB'),
  (12, 1, 1, 'REMA', 'REMA'),
  (12, 1, 2, 'UR', 'UR'),
  (12, 1, 3, 'RHA', 'RHA'),
  (12, 1, 4, 'Kigali City', 'Kigali City'),
  (12, 2, 1, 'REMA', 'REMA'),
  (12, 2, 2, 'RHA', 'RHA'),
  (12, 2, 3, 'Kigali City', 'Kigali City'),
  (12, 3, 1, 'REMA', 'REMA'),
  (12, 3, 2, 'RHA', 'RHA'),
  (12, 3, 3, 'Kigali City', 'Kigali City'),
  (12, 3, 4, 'Partners for Conservation', 'Partners for Conservation'),
  (12, 3, 5, 'Nature Rwanda', 'Nature Rwanda'),
  (12, 3, 6, 'Prime Biodiversity Conservation', 'Prime Biodiversity Conservation'),
  (12, 3, 7, 'RFA', 'RFA'),
  (12, 3, 8, 'ARCOS', 'ARCOS'),
  (13, 1, 1, 'RDB', 'RDB'),
  (13, 1, 2, 'REMA', 'REMA'),
  (13, 1, 3, 'NCST', 'NCST'),
  (13, 1, 4, 'Private sector', NULL),
  (13, 2, 1, 'MINAGRI', 'MINAGRI'),
  (13, 2, 2, 'RICA', 'RICA'),
  (13, 2, 3, 'RAB', 'RAB'),
  (13, 2, 4, 'National Seed Association of Rwanda', 'NSAR'),
  (13, 3, 1, 'REMA', 'REMA'),
  (13, 3, 2, 'MoE', 'MoE'),
  (13, 3, 3, 'RDB', 'RDB'),
  (13, 4, 1, 'REMA', 'REMA'),
  (13, 4, 2, 'Rwanda Cultural Heritage Academy', 'RCHA'),
  (14, 1, 1, 'MoE', 'MoE'),
  (14, 1, 2, 'RGF', 'RGF'),
  (14, 1, 3, 'MINECOFIN', 'MINECOFIN'),
  (14, 1, 4, 'REMA', 'REMA'),
  (14, 2, 1, 'REMA', 'REMA'),
  (14, 2, 2, 'MoE', 'MoE'),
  (14, 2, 3, 'MINECOFIN', 'MINECOFIN'),
  (14, 2, 4, 'RGF', 'RGF'),
  (14, 2, 5, 'BNR', 'BNR'),
  (14, 3, 1, 'REMA', 'REMA'),
  (14, 3, 2, 'MoE', 'MoE'),
  (14, 4, 1, 'REMA', 'REMA'),
  (14, 5, 1, 'REMA', 'REMA'),
  (14, 5, 2, 'MINECOFIN', 'MINECOFIN'),
  (14, 5, 3, 'NISR', 'NISR'),
  (15, 1, 1, 'REMA', 'REMA'),
  (15, 2, 1, 'MoE', 'MoE'),
  (15, 2, 2, 'RDB', 'RDB'),
  (15, 2, 3, 'REMA', 'REMA'),
  (15, 2, 4, 'MINECOFIN', 'MINECOFIN'),
  (15, 3, 1, 'MoE', 'MoE'),
  (15, 3, 2, 'RDB', 'RDB'),
  (15, 3, 3, 'REMA', 'REMA'),
  (15, 3, 4, 'MINECOFIN', 'MINECOFIN'),
  (16, 1, 1, 'CPCIC', 'CPCIC'),
  (16, 1, 2, 'NIRDA', 'NIRDA'),
  (16, 1, 3, 'MINICOM', 'MINICOM'),
  (16, 1, 4, 'REMA', 'REMA'),
  (16, 1, 5, 'MININFRA', 'MININFRA'),
  (16, 2, 1, 'CPCIC', 'CPCIC'),
  (16, 2, 2, 'NIRDA', 'NIRDA'),
  (16, 2, 3, 'MINICOM', 'MINICOM'),
  (16, 2, 4, 'REMA', 'REMA'),
  (16, 2, 5, 'CSOs', NULL),
  (16, 2, 6, 'Higher learning institutions', NULL),
  (16, 2, 7, 'Media', NULL),
  (16, 2, 8, 'ILO', 'ILO'),
  (16, 2, 9, 'MINAGRI', 'MINAGRI'),
  (16, 3, 1, 'RSB', 'RSB'),
  (16, 3, 2, 'Private sector', NULL),
  (16, 3, 3, 'FDA Rwanda', 'FDA'),
  (16, 3, 4, 'Forest Stewardship Council', 'FSC'),
  (16, 4, 1, 'REMA', 'REMA'),
  (16, 4, 2, 'CPCIC', 'CPCIC'),
  (16, 4, 3, 'MoE', 'MoE'),
  (16, 4, 4, 'ARCOS', 'ARCOS'),
  (16, 4, 5, 'RURA', 'RURA'),
  (16, 4, 6, 'GGGI', 'GGGI'),
  (17, 1, 1, 'REMA', 'REMA'),
  (17, 1, 2, 'MoE', 'MoE'),
  (17, 1, 3, 'FDA', 'FDA'),
  (17, 1, 4, 'MINAGRI', 'MINAGRI'),
  (17, 1, 5, 'RAB', 'RAB'),
  (17, 2, 1, 'REMA', 'REMA'),
  (17, 2, 2, 'MoE', 'MoE'),
  (17, 2, 3, 'FDA', 'FDA'),
  (17, 2, 4, 'MINAGRI', 'MINAGRI'),
  (17, 2, 5, 'RAB', 'RAB'),
  (17, 2, 6, 'RSB', 'RSB'),
  (17, 2, 7, 'Higher learning institutions', NULL),
  (17, 3, 1, 'FDA', 'FDA'),
  (17, 3, 2, 'REMA', 'REMA'),
  (17, 3, 3, 'RSB', 'RSB'),
  (18, 1, 1, 'REMA', 'REMA'),
  (18, 1, 2, 'UNDP', 'UNDP'),
  (18, 2, 1, 'REMA', 'REMA'),
  (18, 2, 2, 'MINICOM', 'MINICOM'),
  (18, 2, 3, 'MoE', 'MoE'),
  (18, 2, 4, 'ARCOS', 'ARCOS'),
  (18, 2, 5, 'Nature Rwanda', 'Nature Rwanda'),
  (18, 2, 6, 'IUCN', 'IUCN'),
  (18, 2, 7, 'GGGI', 'GGGI'),
  (18, 2, 8, 'RFA', 'RFA'),
  (18, 2, 9, 'RDB', 'RDB'),
  (18, 3, 1, 'MoE', 'MoE'),
  (18, 3, 2, 'RGF', 'RGF'),
  (18, 3, 3, 'MINECOFIN', 'MINECOFIN'),
  (18, 3, 4, 'REMA', 'REMA'),
  (19, 1, 1, 'REMA', 'REMA'),
  (19, 2, 1, 'RGF', 'RGF'),
  (19, 2, 2, 'REMA', 'REMA'),
  (19, 2, 3, 'MINECOFIN', 'MINECOFIN'),
  (19, 3, 1, 'RGF', 'RGF'),
  (19, 3, 2, 'REMA', 'REMA'),
  (19, 3, 3, 'Private sector', NULL),
  (19, 3, 4, 'NGOs', NULL),
  (19, 3, 5, 'UNDP', 'UNDP'),
  (19, 3, 6, 'IUCN', 'IUCN'),
  (19, 3, 7, 'Development partners', NULL),
  (19, 4, 1, 'REMA', 'REMA'),
  (19, 4, 2, 'RGF', 'RGF'),
  (20, 1, 1, 'REMA', 'REMA'),
  (20, 2, 1, 'REMA', 'REMA'),
  (20, 3, 1, 'REMA', 'REMA'),
  (20, 4, 1, 'REMA', 'REMA'),
  (21, 1, 1, 'REMA', 'REMA'),
  (21, 2, 1, 'REMA', 'REMA'),
  (21, 3, 1, 'REMA', 'REMA'),
  (21, 4, 1, 'REMA', 'REMA'),
  (22, 1, 1, 'MoE', 'MoE'),
  (22, 1, 2, 'REMA', 'REMA'),
  (22, 2, 1, 'REMA', 'REMA'),
  (22, 3, 1, 'REMA', 'REMA'),
  (22, 4, 1, 'REMA', 'REMA'),
  (22, 4, 2, 'Private sector', NULL)
) AS v(target_id, action_ordinal, ordinal, label, code)
JOIN public.nbsap_strategic_actions a ON a.target_id = v.target_id AND a.ordinal = v.action_ordinal
LEFT JOIN public.institutions i ON i.code = v.code
ON CONFLICT (action_id, ordinal) DO NOTHING;

-- ============================================================
-- 2. USER AFFILIATION
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES public.institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id    INTEGER REFERENCES public.districts(id)    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles(institution_id);

COMMENT ON COLUMN public.profiles.institution_id IS
'Affiliation (requested at sign-up, confirmed by an administrator). Grants nothing by itself: permissions come from user_scopes.';
COMMENT ON COLUMN public.profiles.organization IS
'Display name of the affiliation. Kept equal to institutions.name whenever institution_id is set (trigger sync_profile_organization).';

CREATE OR REPLACE FUNCTION public.sync_profile_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.institution_id IS NOT NULL THEN
    SELECT name INTO NEW.organization FROM public.institutions WHERE id = NEW.institution_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_organization ON public.profiles;
CREATE TRIGGER sync_profile_organization
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_organization();

-- Sign-up records the requested institution and district (never a role).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_institution INTEGER;
  v_district    INTEGER;
BEGIN
  SELECT id INTO v_institution FROM public.institutions
   WHERE code = NEW.raw_user_meta_data->>'institution_code' AND is_active;

  IF (NEW.raw_user_meta_data->>'district_id') ~ '^[0-9]+$' THEN
    SELECT id INTO v_district FROM public.districts
     WHERE id = (NEW.raw_user_meta_data->>'district_id')::INTEGER;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, organization, department, is_active,
                               institution_id, district_id)
  VALUES (
    NEW.id,
    NEW.email,
    LEFT(COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), NEW.email), 200),
    'public_viewer',
    LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'organization'), ''), 200),
    LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 200),
    FALSE,
    v_institution,
    v_district
  );

  INSERT INTO public.user_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3. USER SCOPES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_scopes (
  id             SERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope_role     TEXT NOT NULL CHECK (scope_role IN ('data_entry', 'ministry_validator', 'institution_admin')),
  institution_id INTEGER NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  district_id    INTEGER REFERENCES public.districts(id) ON DELETE CASCADE,
  sector_id      INTEGER REFERENCES public.sectors(id) ON DELETE CASCADE,
  granted_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (user_id, scope_role, institution_id, district_id, sector_id)
);

CREATE INDEX IF NOT EXISTS idx_user_scopes_user        ON public.user_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scopes_institution ON public.user_scopes(institution_id, scope_role);

COMMENT ON TABLE public.user_scopes IS
'M01 access scope. A user may hold several (e.g. focal point for two institutions). Grant = insert, revoke = delete; rows are never edited.';

CREATE OR REPLACE FUNCTION public.validate_user_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_covers BOOLEAN;
  v_role   TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Scopes cannot be edited; revoke and grant instead' USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NOT NULL AND NEW.user_id = v_uid THEN
    RAISE EXCEPTION 'Nobody can grant a scope to themselves' USING ERRCODE = '42501';
  END IF;

  SELECT covers_all_districts INTO v_covers FROM public.institutions WHERE id = NEW.institution_id;
  IF v_covers AND NEW.district_id IS NULL THEN
    RAISE EXCEPTION 'This institution covers all districts: choose the district' USING ERRCODE = '23514';
  END IF;

  IF NEW.sector_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.sectors s WHERE s.id = NEW.sector_id AND s.district_id = NEW.district_id) THEN
    RAISE EXCEPTION 'The sector must belong to the chosen district' USING ERRCODE = '23514';
  END IF;

  SELECT role::text INTO v_role FROM public.profiles WHERE id = NEW.user_id;
  IF NEW.scope_role = 'data_entry'
     AND v_role NOT IN ('local_reporting', 'lead_government_ministry_reporting', 'dashboard_management') THEN
    RAISE EXCEPTION 'Data entry needs a reporting account (current role: %)', v_role USING ERRCODE = '23514';
  END IF;
  IF NEW.scope_role = 'ministry_validator' AND v_role <> 'lead_government_ministry_reporting' THEN
    RAISE EXCEPTION 'Ministry validation needs a Lead Government Ministry account (current role: %)', v_role
      USING ERRCODE = '23514';
  END IF;
  IF NEW.scope_role = 'institution_admin' AND v_role = 'public_viewer' THEN
    RAISE EXCEPTION 'An institution administrator needs an active staff account' USING ERRCODE = '23514';
  END IF;

  NEW.granted_by := COALESCE(v_uid, NEW.granted_by);
  NEW.granted_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_user_scope ON public.user_scopes;
CREATE TRIGGER validate_user_scope
  BEFORE INSERT OR UPDATE ON public.user_scopes
  FOR EACH ROW EXECUTE FUNCTION public.validate_user_scope();

-- ── Scope helpers (SECURITY DEFINER: read scopes without RLS recursion) ──

-- Caller holds `p_role` for this institution, and for this district when
-- the scope is district-specific.
CREATE OR REPLACE FUNCTION public.has_scope(p_role TEXT, p_institution INTEGER, p_district INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_scopes s
    WHERE s.user_id = auth.uid()
      AND s.scope_role = p_role
      AND s.institution_id = p_institution
      AND (s.district_id IS NULL OR s.district_id IS NOT DISTINCT FROM p_district)
  );
$$;

-- Data entry may submit for its institution (and district).
CREATE OR REPLACE FUNCTION public.can_submit_report(p_institution INTEGER, p_district INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.has_scope('data_entry', p_institution, p_district);
$$;

-- What a data-entry (local_reporting) user may read beyond their own
-- submissions: their institution's reports, and anything about their district.
CREATE OR REPLACE FUNCTION public.can_read_report_in_scope(p_institution INTEGER, p_district INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_scopes s
    WHERE s.user_id = auth.uid()
      AND s.scope_role = 'data_entry'
      AND (
        (s.institution_id = p_institution AND (s.district_id IS NULL OR s.district_id IS NOT DISTINCT FROM p_district))
        OR (s.district_id IS NOT NULL AND s.district_id = p_district)
      )
  );
$$;

-- Caller is an institution administrator for the target user's affiliation.
CREATE OR REPLACE FUNCTION public.is_institution_admin_of(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user IS DISTINCT FROM auth.uid() AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_scopes s
      ON s.institution_id = p.institution_id
     AND s.scope_role = 'institution_admin'
     AND s.user_id = auth.uid()
     AND (s.district_id IS NULL OR s.district_id IS NOT DISTINCT FROM p.district_id)
    WHERE p.id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_institution_admin_for(p_institution INTEGER, p_district INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_scope('institution_admin', p_institution, p_district);
$$;

REVOKE ALL ON FUNCTION public.has_scope(TEXT, INTEGER, INTEGER)                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_submit_report(INTEGER, INTEGER)               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_report_in_scope(INTEGER, INTEGER)        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_institution_admin_of(UUID)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_institution_admin_for(INTEGER, INTEGER)        FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_scope(TEXT, INTEGER, INTEGER)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_submit_report(INTEGER, INTEGER)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_report_in_scope(INTEGER, INTEGER)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_admin_of(UUID)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution_admin_for(INTEGER, INTEGER)     TO authenticated;
REVOKE ALL ON FUNCTION public.validate_user_scope()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_organization() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.user_scopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own scopes" ON public.user_scopes;
CREATE POLICY "Users read own scopes" ON public.user_scopes
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all scopes" ON public.user_scopes;
CREATE POLICY "Admins read all scopes" ON public.user_scopes
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Institution admins read their institution's scopes" ON public.user_scopes;
CREATE POLICY "Institution admins read their institution's scopes" ON public.user_scopes
  FOR SELECT USING (public.is_institution_admin_for(institution_id, district_id));

DROP POLICY IF EXISTS "Admins grant scopes" ON public.user_scopes;
CREATE POLICY "Admins grant scopes" ON public.user_scopes
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins revoke scopes" ON public.user_scopes;
CREATE POLICY "Admins revoke scopes" ON public.user_scopes
  FOR DELETE USING (public.is_admin() AND user_id <> auth.uid());

-- Institution admins see the people affiliated with their institution.
DROP POLICY IF EXISTS "Institution admins view members" ON public.profiles;
CREATE POLICY "Institution admins view members" ON public.profiles
  FOR SELECT USING (public.is_institution_admin_of(id));

-- ── Profile guard (037) extended ─────────────────────────────
-- Affiliation is privileged too. Institution admins may activate,
-- deactivate and switch members between public_viewer, data entry
-- (local_reporting) and viewer (policy_monitoring) -- nothing higher,
-- never themselves, never someone outside their institution.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_privileged_changed BOOLEAN;
  v_suspension_changed BOOLEAN;
  v_member_roles TEXT[] := ARRAY['public_viewer', 'local_reporting', 'policy_monitoring'];
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile id cannot be changed' USING ERRCODE = '42501';
  END IF;

  v_privileged_changed :=
       NEW.role           IS DISTINCT FROM OLD.role
    OR NEW.is_active      IS DISTINCT FROM OLD.is_active
    OR NEW.institution_id IS DISTINCT FROM OLD.institution_id
    OR NEW.district_id    IS DISTINCT FROM OLD.district_id;

  v_suspension_changed :=
       NEW.suspended_at        IS DISTINCT FROM OLD.suspended_at
    OR NEW.suspended_by        IS DISTINCT FROM OLD.suspended_by
    OR NEW.suspension_reason   IS DISTINCT FROM OLD.suspension_reason
    OR NEW.suspension_end_date IS DISTINCT FROM OLD.suspension_end_date;

  IF NOT v_privileged_changed AND NOT v_suspension_changed THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() AND NEW.id <> v_uid THEN
    RETURN NEW;
  END IF;

  IF NOT v_suspension_changed
     AND NEW.id <> v_uid
     AND public.is_institution_admin_of(NEW.id)
     AND NEW.institution_id IS NOT DISTINCT FROM OLD.institution_id
     AND NEW.district_id    IS NOT DISTINCT FROM OLD.district_id
     AND OLD.role::text = ANY (v_member_roles)
     AND NEW.role::text = ANY (v_member_roles)
  THEN
    RETURN NEW;
  END IF;

  IF NOT v_privileged_changed
     AND NEW.id = v_uid
     AND OLD.suspended_at IS NOT NULL
     AND OLD.suspension_end_date IS NOT NULL
     AND OLD.suspension_end_date < NOW()
     AND NEW.suspended_at IS NULL
     AND NEW.suspended_by IS NULL
     AND NEW.suspension_reason IS NULL
     AND NEW.suspension_end_date IS NULL
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Role, affiliation and account status can only be changed by an administrator'
    USING ERRCODE = '42501';
END;
$$;

-- ============================================================
-- 4. REPORTS CARRY INSTITUTION AND DISTRICT
-- ============================================================

ALTER TABLE public.toolkit_reports
  ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES public.institutions(id),
  ADD COLUMN IF NOT EXISTS district_id    INTEGER REFERENCES public.districts(id);

CREATE INDEX IF NOT EXISTS idx_reports_institution ON public.toolkit_reports(institution_id);
CREATE INDEX IF NOT EXISTS idx_reports_district    ON public.toolkit_reports(district_id);

-- Set by the database from the submitted form; whatever the browser sends
-- in these two columns is ignored.
CREATE OR REPLACE FUNCTION public.resolve_report_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_covers   BOOLEAN := FALSE;
  v_district TEXT;
BEGIN
  SELECT id, covers_all_districts INTO NEW.institution_id, v_covers
  FROM public.institutions
  WHERE code = NEW.form_data->>'stakeholder';

  v_district := COALESCE(
    NULLIF(TRIM(NEW.district), ''),
    NULLIF(TRIM(NEW.form_data->>'district'), ''),
    CASE WHEN v_covers THEN NULLIF(TRIM(NEW.institution), '') END
  );
  SELECT id INTO NEW.district_id FROM public.districts WHERE lower(name) = lower(v_district);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_report_scope() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS aa_resolve_report_scope ON public.toolkit_reports;
CREATE TRIGGER aa_resolve_report_scope
  BEFORE INSERT ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.resolve_report_scope();

-- Backfill existing reports without side effects (no audit noise, no
-- metric or progress recalculation per row).
ALTER TABLE public.toolkit_reports DISABLE TRIGGER USER;
UPDATE public.toolkit_reports r
SET institution_id = i.id
FROM public.institutions i
WHERE r.institution_id IS NULL AND i.code = r.form_data->>'stakeholder';

UPDATE public.toolkit_reports r
SET district_id = d.id
FROM public.districts d
WHERE r.district_id IS NULL
  AND lower(d.name) = lower(COALESCE(
        NULLIF(TRIM(r.district), ''),
        NULLIF(TRIM(r.form_data->>'district'), ''),
        CASE WHEN EXISTS (SELECT 1 FROM public.institutions i
                          WHERE i.id = r.institution_id AND i.covers_all_districts)
             THEN NULLIF(TRIM(r.institution), '') END));
ALTER TABLE public.toolkit_reports ENABLE TRIGGER USER;

-- ── Report access rules with scope ───────────────────────────

DROP POLICY IF EXISTS "Writers submit reports" ON public.toolkit_reports;
CREATE POLICY "Writers submit reports"
  ON public.toolkit_reports FOR INSERT
  WITH CHECK (
    public.can_write()
    AND submitted_by = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND public.can_submit_report(institution_id, district_id)
  );

DROP POLICY IF EXISTS "Local reporters read own submissions" ON public.toolkit_reports;
DROP POLICY IF EXISTS "Data entry reads own scope" ON public.toolkit_reports;
CREATE POLICY "Data entry reads own scope"
  ON public.toolkit_reports FOR SELECT
  USING (
    public.get_user_role()::text = 'local_reporting'
    AND (submitted_by = auth.uid() OR public.can_read_report_in_scope(institution_id, district_id))
  );

DROP POLICY IF EXISTS "Reviewers update report status" ON public.toolkit_reports;
CREATE POLICY "Reviewers update report status"
  ON public.toolkit_reports FOR UPDATE
  USING (
    submitted_by IS DISTINCT FROM auth.uid()
    AND (
      public.is_admin()
      OR (public.get_user_role()::text = 'lead_government_ministry_reporting'
          AND public.has_scope('ministry_validator', institution_id, district_id))
    )
  )
  WITH CHECK (
    submitted_by IS DISTINCT FROM auth.uid()
    AND (
      public.is_admin()
      OR (public.get_user_role()::text = 'lead_government_ministry_reporting'
          AND public.has_scope('ministry_validator', institution_id, district_id))
    )
  );

-- ============================================================
-- 5. INSTITUTION ADMINISTRATION (RPCs)
-- ============================================================

-- Approve a person who asked to join the caller's institution:
-- as 'data_entry' (submits reports) or 'viewer' (reads dashboards).
CREATE OR REPLACE FUNCTION public.approve_institution_member(
  p_user UUID,
  p_as   TEXT,
  p_district INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target   public.profiles%ROWTYPE;
  v_covers   BOOLEAN;
  v_district INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_as NOT IN ('data_entry', 'viewer') THEN
    RAISE EXCEPTION 'Members can be approved as data_entry or viewer only' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target FROM public.profiles WHERE id = p_user;
  IF NOT FOUND OR v_target.institution_id IS NULL THEN
    RAISE EXCEPTION 'This person has not asked to join an institution' USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_institution_admin_of(p_user) THEN
    RAISE EXCEPTION 'You are not an administrator of this person''s institution' USING ERRCODE = '42501';
  END IF;
  IF v_target.role::text NOT IN ('public_viewer', 'local_reporting', 'policy_monitoring') THEN
    RAISE EXCEPTION 'This account has a higher role; ask a REMA administrator' USING ERRCODE = '42501';
  END IF;

  SELECT covers_all_districts INTO v_covers FROM public.institutions WHERE id = v_target.institution_id;
  v_district := CASE WHEN v_covers THEN COALESCE(p_district, v_target.district_id) END;
  IF v_covers AND v_district IS NULL THEN
    RAISE EXCEPTION 'Choose the district this person reports for' USING ERRCODE = '22023';
  END IF;
  IF v_covers AND NOT public.is_institution_admin_for(v_target.institution_id, v_district) THEN
    RAISE EXCEPTION 'You can approve members for your own district only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = CASE p_as WHEN 'data_entry' THEN 'local_reporting'::user_role
                       ELSE 'policy_monitoring'::user_role END,
      is_active = TRUE
  WHERE id = p_user;

  IF p_as = 'data_entry' THEN
    INSERT INTO public.user_scopes (user_id, scope_role, institution_id, district_id)
    VALUES (p_user, 'data_entry', v_target.institution_id, v_district)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_scopes
    WHERE user_id = p_user AND scope_role = 'data_entry' AND institution_id = v_target.institution_id;
  END IF;
END;
$$;

-- Remove a member: their scopes for this institution go, the account is
-- deactivated and returned to public_viewer.
CREATE OR REPLACE FUNCTION public.remove_institution_member(p_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.profiles WHERE id = p_user;
  IF NOT FOUND OR NOT public.is_institution_admin_of(p_user) THEN
    RAISE EXCEPTION 'You are not an administrator of this person''s institution' USING ERRCODE = '42501';
  END IF;
  IF v_target.role::text NOT IN ('public_viewer', 'local_reporting', 'policy_monitoring')
     OR EXISTS (SELECT 1 FROM public.user_scopes
                WHERE user_id = p_user AND scope_role IN ('ministry_validator', 'institution_admin')) THEN
    RAISE EXCEPTION 'Validators and administrators are removed by a REMA administrator' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_scopes WHERE user_id = p_user AND institution_id = v_target.institution_id;
  UPDATE public.profiles SET is_active = FALSE, role = 'public_viewer' WHERE id = p_user;
END;
$$;

-- Lists for the sign-up form (callable before signing in): names only.
CREATE OR REPLACE FUNCTION public.signup_options()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'institutions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'code', code, 'name', name, 'category', category,
               'covers_all_districts', covers_all_districts) ORDER BY category, name)
      FROM public.institutions WHERE is_active), '[]'::jsonb),
    'districts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name)
      FROM public.districts), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.approve_institution_member(UUID, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_institution_member(UUID)                 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_institution_member(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_institution_member(UUID)                 TO authenticated;
REVOKE ALL ON FUNCTION public.signup_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_options() TO anon, authenticated;

-- ── Audit (037 row-change trigger) ───────────────────────────
DROP TRIGGER IF EXISTS audit_user_scopes ON public.user_scopes;
CREATE TRIGGER audit_user_scopes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_scopes
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_institutions ON public.institutions;
CREATE TRIGGER audit_institutions
  AFTER INSERT OR UPDATE OR DELETE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ============================================================
-- 6. BACKFILL AFFILIATION FROM FREE-TEXT ORGANIZATION
-- ============================================================
-- Affiliation only; no scopes are granted automatically, because the
-- organization text was typed by the users themselves.

UPDATE public.profiles p
SET institution_id = i.id
FROM public.institutions i
WHERE p.institution_id IS NULL
  AND p.organization IS NOT NULL
  AND (lower(trim(p.organization)) = lower(i.code) OR lower(trim(p.organization)) = lower(i.name));

UPDATE public.profiles p
SET district_id = d.id
FROM public.districts d
WHERE p.district_id IS NULL
  AND (lower(trim(p.organization)) IN (lower(d.name), lower(d.name || ' district'))
       OR lower(trim(p.department)) IN (lower(d.name), lower(d.name || ' district')));

UPDATE public.profiles p
SET institution_id = (SELECT id FROM public.institutions WHERE code = 'District Authorities')
WHERE p.institution_id IS NULL AND p.district_id IS NOT NULL;

-- Keep organisation settings (keyed by organisation text) attached.
UPDATE public.organization_configs oc
SET organization_name = i.name
FROM public.institutions i
WHERE lower(oc.organization_name) = lower(i.code)
  AND NOT EXISTS (SELECT 1 FROM public.organization_configs x WHERE x.organization_name = i.name);

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (
  NULL,
  'schema_migration',
  'Institutions and access scope (039, M01)',
  'institutions, sectors, strategic actions and user_scopes added; reports carry institution and district; data entry, review and district reading follow scope.',
  'system',
  'database'
);

COMMIT;

-- ============================================================
-- AFTER APPLYING: WHO STILL NEEDS A SCOPE (run manually)
-- ============================================================
-- SELECT p.email, p.full_name, p.role, p.organization, i.code AS suggested_institution,
--        d.name AS suggested_district
-- FROM public.profiles p
-- LEFT JOIN public.institutions i ON i.id = p.institution_id
-- LEFT JOIN public.districts d    ON d.id = p.district_id
-- WHERE p.is_active
--   AND p.role::text IN ('local_reporting', 'lead_government_ministry_reporting')
--   AND NOT EXISTS (SELECT 1 FROM public.user_scopes s WHERE s.user_id = p.id)
-- ORDER BY p.role, p.organization;
-- ============================================================
