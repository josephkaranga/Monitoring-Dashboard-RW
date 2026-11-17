-- ============================================================
-- M05 — INDICATOR REFERENCE DATA AND DISAGGREGATION
-- Migration: 045_indicator_reference_data.sql
-- Source: "NBSAP Monitoring System: status and development
--          requirements" (4 Nov 2026), module M05.
--
-- PDF: add definition, formula, data source, frequency, lead
-- institution, validation route and RBIS code to each indicator. Add
-- sex, age and youth fields where required. Add a national tier field
-- beside indicator_tier. Generate the one-page reference sheet from
-- this data.
-- Done when: all indicators in use have complete reference data. A PDF
-- sheet can be generated for each.
--
--   1. national_tiers: the four tiers of the Monitoring Framework (May
--      2026, section 3) beside the KM-GBF type (Decision 4: "keep KM-GBF
--      type; add one national tier").
--   2. disaggregation_dimensions: sex, age, youth, disability, with the
--      form fields a report must fill for an indicator that requires
--      them (Framework 5.10 and the Compliance Plan: by sex, age,
--      disability and geography; GBF Targets 22 and 23).
--   3. target_reference_sheets: the 22 Indicator Reference Sheets of
--      the Framework (May 2026, section 5.10), verbatim.
--   4. New indicator columns; indicator_validation_route();
--      indicator_reference_gaps(); v_indicator_reference.
--   5. Reports on an indicator that requires a breakdown must give it:
--      assess_report_quality() (043) gains a disaggregation check.
--   6. Seed: per-indicator unit, formula, national tier and required
--      breakdowns DRAFTED from each indicator's definition and the
--      Framework sheets, status 'draft' until the TWG approves them.
--      Lead institution: the first responsible institution of the
--      indicator, else the sheet's lead. RBIS codes are not in any
--      document: they stay empty (a reported gap) until RBIS supplies
--      them.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.dqa_field_rules') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assess_report_quality') THEN
    RAISE EXCEPTION 'Migration 045 needs 043 (data quality) and 044. Apply 037-044 first.';
  END IF;
END $$;

-- ============================================================
-- 1. NATIONAL TIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.national_tiers (
  tier        SMALLINT PRIMARY KEY CHECK (tier BETWEEN 1 AND 9),
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  source      TEXT
);

INSERT INTO public.national_tiers (tier, name, description, source) VALUES
  (1, 'Headline (mandatory)',
      'National indicators mapped directly to KM-GBF headline indicators; calculated nationally with validated methods.',
      'Monitoring Framework (May 2026), section 3 - Tier 1'),
  (2, 'Component and complementary (contextual)',
      'Indicators for national priorities and socio-economic dimensions: process and outcome indicators that guide policy and resources.',
      'Monitoring Framework (May 2026), section 3 - Tier 2'),
  (3, 'National-specific (optional)',
      'Custom indicators for Rwanda''s own biodiversity assets and priorities (e.g. mountain gorilla viability, Wetland Health Index).',
      'Monitoring Framework (May 2026), section 3 - Tier 3'),
  (4, 'Diagnostic (supplementary)',
      'Analytical indicators on drivers, pressures and enabling conditions (e.g. investment, public awareness, invasive species).',
      'Monitoring Framework (May 2026), section 3 - Tier 4')
ON CONFLICT (tier) DO NOTHING;

-- ============================================================
-- 2. DISAGGREGATION DIMENSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.disaggregation_dimensions (
  code        TEXT PRIMARY KEY CHECK (code ~ '^[a-z_]+$'),
  label       TEXT NOT NULL,
  description TEXT,
  -- form fields a report fills: [{"key": "dis_female", "label": "Women"}]
  fields      JSONB NOT NULL CHECK (jsonb_typeof(fields) = 'array' AND jsonb_array_length(fields) > 0),
  ordinal     INTEGER NOT NULL DEFAULT 0,
  source      TEXT
);

INSERT INTO public.disaggregation_dimensions (code, label, description, fields, ordinal, source) VALUES
  ('sex', 'Sex', 'Number of women and men counted in the reported value.',
     '[{"key": "dis_female", "label": "Women / female"}, {"key": "dis_male", "label": "Men / male"}]', 1,
     'Compliance Plan, Data Quality Standards: disaggregation by sex (GBF Target 23)'),
  ('age', 'Age group', 'Number of people in each age group.',
     '[{"key": "dis_age_under_16", "label": "Under 16"}, {"key": "dis_age_16_30", "label": "16-30"},
       {"key": "dis_age_31_64", "label": "31-64"}, {"key": "dis_age_65_plus", "label": "65 and over"}]', 2,
     'Compliance Plan, Data Quality Standards: disaggregation by age'),
  ('youth', 'Youth', 'Number of young people (16-30, National Youth Policy) counted in the reported value.',
     '[{"key": "dis_youth", "label": "Youth (16-30)"}]', 3,
     'NBSAP Target 22; Framework 5.10 (stakeholder type: youth)'),
  ('disability', 'Disability', 'Number of persons with disabilities counted in the reported value.',
     '[{"key": "dis_disability", "label": "Persons with disabilities"}]', 4,
     'Compliance Plan, Data Quality Standards: disaggregation by disability status (GBF Target 22)')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 3. TARGET REFERENCE SHEETS (Framework 5.10, verbatim)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.target_reference_sheets (
  nbsap_target_id      INTEGER PRIMARY KEY REFERENCES public.nbsap_targets(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  indicators_text      TEXT,
  unit                 TEXT,
  definition           TEXT,
  disaggregation       TEXT,
  methodology          TEXT,
  data_sources         TEXT,
  baseline_and_targets TEXT,
  frequency            TEXT,
  lead                 TEXT,
  collaborators        TEXT,
  source               TEXT NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.target_reference_sheets
  (nbsap_target_id, title, indicators_text, unit, definition, disaggregation, methodology, data_sources,
   baseline_and_targets, frequency, lead, collaborators, source)
SELECT v.* FROM (VALUES
  (1, 'Biodiversity-Inclusive Spatial Planning', 'Headline: % of land and water bodies covered by biodiversity-inclusive spatial plans
Component:
% of spatial plans utilizing Key Biodiversity Areas (KBA) information
Number of KBAs included in spatial planning
Areas of degraded ecosystems with high biodiversity importance identified and prioritized', 'Percentage of land and water bodies area covered by biodiversity-inclusive spatial plans', 'Measures the extent to which spatial land use planning and management incorporates biodiversity considerations to ensure biodiversity loss is close to zero. Tracks integration of Key Biodiversity Areas (KBAs) into spatial planning processes.',
   '• By geographic location (districts/sectors) • By type of spatial plan • By Key Biodiversity Areas included', '1. Assess existing spatial plans for biodiversity integration 2. Map Key Biodiversity Areas against land-use plans 3. Calculate percentage of area covered by biodiversity-inclusive plans 4. Validate through REMA and NISR coordination', '• District land-use plans • Rwanda Biodiversity Information System (RBIS) • National Institute of Statistics of Rwanda (NISR) • Ministry of Lands and Forestry records',
   'Baseline: No consolidated information on status of biodiversity-inclusive spatial planning Target 2027 (Mid-term): 50% of priority areas covered Target 2030 (End-term): 100% of priority areas covered', 'Annual reporting; Mid-term (2027); End-term (2030)', 'Ministry of Environment, REMA', 'MINAGRI, MININFRA, RDB, District Environment Offices, NISR', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (2, 'Restoration of Degraded Lands & Inland Water', 'Headline: Area (ha) of degraded land and inland water under restoration
Component:
Areas of degraded wetland ecosystems with high biodiversity importance restored
Areas of degraded natural forest/reserves with high biodiversity importance restored
Areas of degraded lakes and rivers with high biodiversity importance restored', 'Hectares (ha)', 'Measures the area of degraded lands, wetlands, lakes, rivers, and areas critical for ecosystem services under restoration. Tracks progress toward increasing restoration area by at least 10% by 2030.',
   '• By ecosystem type (wetlands, forests, lakes, rivers) • By restoration approach (natural regeneration, active restoration) • By district/province', '1. Conduct field surveys of restoration sites 2. Use remote sensing and GIS for area measurement 3. Community reports on restoration activities 4. Validate through REMA and RFA coordination', '• Field surveys • Community monitoring reports • Remote sensing data • RBIS • Rwanda Forestry Authority (RFA) records',
   'Baseline: 332,861 ha (Climate, Environment and Natural Resources Sector Strategic Plan 2024-2029) Target 2027: 450,000 ha Target 2029: 600,000 ha Target 2030: At least 10% increase from baseline', 'Annual; Mid-term (2027); End-term (2030)', 'REMA, RFA', 'MINAGRI, RDB, District Environment Offices, Community-Based Organizations', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (3, 'Protected Areas Expansion', 'Headline: Area (ha) of land/inland water with high biodiversity importance conserved and effectively managed; Coverage of protected areas and OECMs
Component:
Area (ha) of Key Biodiversity Areas effectively conserved
Area (ha) of wetlands of international importance conserved and effectively managed', 'Hectares (ha) and Percentage (%)', 'Measures the area of terrestrial and inland water areas conserved through ecologically representative and well-connected systems of protected areas that respect local communities. Target is at least 11% by 2030.',
   '• By protected area type (national parks, reserves, OECMs) • By management effectiveness score • By community involvement level', '1. Map all protected areas and OECMs 2. Assess management effectiveness using standardized tools 3. Calculate percentage of national territory under protection 4. Verify community consultation records', '• Rwanda Development Board (RDB) protected area records • REMA conservation databases • District land records • Community consultation reports',
   'Baseline: 9.1% of country''s land area (Rwanda Wildlife Conservation Masterplan 2025-2050) Target 2027: 10% Target 2030: 11%', 'Annual; Mid-term (2027); End-term (2030)', 'RDB, REMA', 'Ministry of Environment, District Authorities, Community Conservation Groups', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (4, 'Conservation Status & Human-Wildlife Conflict', 'Headline:
Proportion of threatened species effectively conserved to halt/reverse human-induced decline
Number of guidelines developed to protect genetic diversity and manage HWC
Component:
% of threatened species improving in status
Conservation status of CITES-listed species stabilized or improved', 'Number of species; Number of HWC incidents', 'Measures improvement in conservation status of threatened species and effectiveness of human-wildlife conflict management. Tracks actions to halt extinction of threatened species.',
   '• By species category (mammals, birds, plants, etc.) • By threat status (critically endangered, endangered, vulnerable) • By HWC type (crop raiding, livestock predation, etc.)', '1. Conduct species population surveys 2. IUCN Red List assessments 3. Track HWC incidents through reporting systems 4. Monitor conservation intervention effectiveness', '• Wildlife census data • Ranger patrol reports • Citizen science data • HWC incident reports • RDB conservation records',
   'Baseline: Limited planning for species beyond mountain gorilla, chimpanzee, lion; 501 HWC cases annually (Gishwati 208, Mukura 185, Mutara 108) Target 2027: 20% improvement in species status; 40% reduction in HWC Target 2030: 50% improvement in species status; 60% reduction in HWC', 'Biannual for species; Quarterly for HWC; Annual reporting', 'RDB, REMA', 'Conservation NGOs, District Authorities, Community Groups', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (5, 'Sustainable Management of Wild Species', 'Headline: Proportion of illegal harvesting curbed
Component: Proportion of fish stocks within biologically sustainable levels
Complementary: Number of inspections to enforce regulations for wild species and fisheries', 'Percentage; Number of inspections', 'Measures sustainable management of wild species on all managed lands (agriculture, forests, waters) and effectiveness of curbing illegal harvesting activities.',
   '• By sector (agriculture, forestry, fisheries) • By type of illegal activity (poaching, illegal fishing, illegal logging) • By enforcement action type', '1. Monitor fish stocks and forest resources 2. Track illegal activity incidents 3. Count enforcement inspections 4. Assess sustainability certifications', '• RAB fisheries data • RFA forest records • Enforcement agency reports • RBIS • Community monitoring reports',
   'Baseline: Illegal fishing operations continue; fish production dropped from 24,199 tonnes (2017) to 16,194 tonnes (2020) in Lake Kivu Target 2027: 50% reduction in illegal activities Target 2030: 75% reduction in illegal activities; 100% sustainable management guidelines implemented', 'Annual; Quarterly for enforcement data', 'MINAGRI, RAB, RFA', 'REMA, RWB, District Authorities, Enforcement Agencies', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (6, 'Invasive Alien Species Control', 'Headline: Number of invasive alien species reduced
Component: Number of invasive alien species introduction events
Complementary: Number of invasive species on national lists per GRIIS', 'Number of invasive species; Percentage reduction in establishment rate', 'Measures prevention and control of invasive alien species with target to reduce rate of establishment by 50% in protected areas by 2030.',
   '• By species type (plants, fish, insects) • By ecosystem (protected areas, wetlands, agricultural lands) • By control method', '1. Survey and map invasive species distribution 2. Track new introduction events 3. Monitor control program effectiveness 4. Update national invasive species list', '• Field surveys • RBIS • REMA invasive species reports (2016 baseline: 47 species) • Protected area monitoring reports',
   'Baseline: 47 invasive species identified (2016 REMA Report) Target 2027: 25% reduction in establishment rate Target 2030: 50% reduction in establishment rate in protected areas', 'Quarterly for incident reporting; Annual for comprehensive assessment', 'REMA', 'RDB, RFA, MINAGRI, Research Institutions, District Authorities', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (7, 'Pollution Reduction', 'Headline: Concentration of pollutants in the environment
Component:
Proportion of fertilizers used efficiently
Proportion of domestic/industrial wastewater safely treated
Floating plastic debris density
Annual number of pesticides used
Complementary:
Amount of nitrogen loss in environment
Proportion of solid waste collected/managed
Amount/types of hazardous waste generated
Organic fertilizer use per cropland area', 'Concentration levels; Percentage reduction', 'Measures reduction of major pollutants to levels not harmful to biodiversity and ecosystem functions through efficient use and nutrient cycling, reducing risks from pesticides and hazardous chemicals.',
   '• By pollutant type (fertilizers, pesticides, industrial waste, mining effluents) • By sector (agriculture, industry, mining) • By water body/area affected', '1. Monitor pollutant concentrations in water and soil 2. Track fertilizer and pesticide usage 3. Assess wastewater treatment rates 4. Monitor plastic debris density', '• REMA water quality reports • WASAC monitoring data • MINAGRI input usage records • Industry compliance reports • Field surveys',
   'Baseline: 103,722 metric tons of inorganic fertilizer (NPK) used in 2023; Significant leaching and pollution; Mining pollution in catchments (e.g., Secoko) Target 2027: 30% reduction in pollutant levels Target 2030: 50% reduction in pollutant levels; 90% of water bodies meeting quality standards', 'Biannual for water quality; Annual for comprehensive assessment', 'REMA, MINAGRI', 'Ministry of Industry, RWB, District Authorities, Private Sector', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (8, 'Climate Change Resilience', 'Component:
National greenhouse gas inventories from land use/land use change
Complementary:
Above-ground biomass stock in forests (tonnes/ha)
Proportion of local governments with DRR strategies aligned to national framework', 'Hectares; Number of households; Percentage', 'Measures minimization of climate change impacts on biodiversity and building of resilience through nature-based solutions and ecosystem-based approaches in highly vulnerable landscapes.',
   '• By ecosystem type • By vulnerability level • By NbS/EbA approach type • By households protected', '1. Map climate-vulnerable landscapes 2. Track NbS/EbA implementation 3. Monitor forest cover and biomass 4. Count households protected from climate impacts', '• Project reports (TREPA, COMBIO, Green Amayaga, etc.) • Remote sensing data • National greenhouse inventories • District disaster risk records',
   'Baseline: Multiple projects ongoing (TREPA 60,000 ha, COMBIO, Green Amayaga 263,000 ha, VCRP 37,000 ha, etc.); 9% households protected from floods Target 2027: 25% households protected from floods Target 2030: 40% households protected from floods; Forest cover &gt;30.4%', 'Annual; Mid-term (2027); End-term (2030)', 'Ministry of Environment, REMA', 'MINAGRI, RFA, MINEMA, District Authorities, Development Partners', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (9, 'Sustainable Use of Wild Species for Community Benefits', 'Headline: Benefits from sustainable use of wild species; Sustainability metrics
Component: Number of people benefiting from wild resources for food, medicine, crafts, culture
Complementary: Number of plant/animal genetic resources secured in conservation facilities', 'Number of people benefiting; Revenue (RWF)', 'Measures sustainable management and use of wild species to enhance biodiversity conservation and provide socio-economic benefits to communities in Rwanda.',
   '• By benefit type (food, medicinal, craft, culture) • By gender • By location (near protected areas) • By revenue source', '1. Survey communities benefiting from wild resources 2. Track revenue sharing mechanisms 3. Monitor sustainable use practices 4. Assess livelihood improvements', '• Tourism revenue sharing reports (10% of park revenues) • Community surveys • Cooperative records • RDB tourism data',
   'Baseline: 10% of pooled tourism revenue from Volcanoes, Akagera, Nyungwe, Gishwati, Mukura allocated to surrounding communities Target 2027: 50% increase in beneficiaries Target 2030: 100% increase in beneficiaries; RWF 5 billion from biodiversity-friendly livelihoods', 'Annual; Mid-term (2027); End-term (2030)', 'RDB, REMA', 'MINAGRI, District Authorities, Community Organizations, Tourism Operators', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (10, 'Sustainable Agriculture, Aquaculture, Fisheries, Forestry', 'Headline:
Proportion of agricultural area under productive/sustainable agriculture
Proportion of forest under sustainable management
Area under aquaculture/fisheries with sustainable management
Component:
Total forest management certification by responsible institution
Average income of small-scale food producers
Complementary: Proportion of degraded agriculture and forest land', 'Percentage; Hectares; Tonnes', 'Measures improvement in sustainable management of areas under agriculture, aquaculture, fisheries, and forestry with integration of biodiversity conservation practices to enhance ecosystem health, food security, and livelihoods.',
   '• By sector (agriculture, aquaculture, fisheries, forestry) • By practice type (agro-ecology, conservation agriculture, sustainable fishing) • By certification status', '1. Assess sustainable practice adoption rates 2. Monitor forest management certification 3. Track aquaculture and fisheries production 4. Evaluate ecosystem health indicators', '• MINAGRI sector reports • RFA forest records • RAB aquaculture data • Certification body records • District agricultural reports',
   'Baseline: 30.4% forest cover; 4,900 t/yr fish production (aquaculture); 22,000 ha conservation agriculture (PSTA 5) Target 2027: 50% increase in sustainable practices Target 2030: 100% of priority areas under sustainable management', 'Annual; Mid-term (2027); End-term (2030)', 'MINAGRI, RFA', 'RAB, RWB, REMA, District Authorities, Private Sector', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (11, 'Ecosystem Services Enhancement', 'Headline: Levels of ecosystem services provided by restored ecosystems/landscapes
Component:
Mortality rate from unsafe water/sanitation/hygiene
Annual mean levels of fine particulate matter (PM2.5, PM10)
Proportion of water bodies with good ambient water quality
Annual soil loss by erosion
Complementary:
Proportion of local units with policies for community participation in WASH
Proportion using safely managed drinking water
Respiratory disease rate from air pollution (SDG 3.9.1)', 'Levels of ecosystem services; Monetary value (RWF)', 'Measures restoration, maintenance, and enhancement of ecosystem services and nature''s contributions to people through nature-based solutions and ecosystem-based approaches to improve human well-being, resilience, and sustainable development.',
   '• By service type (water, air, soil, climate regulation) • By beneficiary group • By geographic area • By monetary value', '1. Assess ecosystem service provision levels 2. Monitor water and air quality 3. Track soil erosion rates 4. Evaluate health impacts from ecosystem services', '• WASAC water quality reports • Meteo Rwanda air quality data • REMA ecosystem assessments • Health facility records • District reports',
   'Baseline: Multiple projects enhancing ecosystem services (TREPA 60,000 ha, COMBIO, Green Amayaga 263,000 ha, VCRP 37,000 ha, etc.); RWF 10 billion ecosystem service value Target 2027: RWF 12.5 billion Target 2030: RWF 15 billion', 'Annual; Mid-term (2027); End-term (2030)', 'REMA', 'Ministry of Health, WASAC, MINAGRI, District Authorities, Research Institutions', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (12, 'Urban Green Spaces', 'Headline: Average share of built-up city area that is green/blue space for public use
Component:
Area providing recreation and cultural services (hectares)
Area under urban forestry (hectares)
Complementary: City Biodiversity Index (CBI) for Kigali, satellite and secondary cities', 'Hectares; Percentage of built-up area', 'Measures increase and improvement of urban green spaces with biodiversity-inclusive and nature-friendly urban planning emphasizing native species to enhance human well-being, promote biodiversity, and support sustainable urban development.',
   '• By city/town • By green space type (parks, gardens, urban forestry) • By native species proportion • By public access level', '1. Map urban green spaces using GIS 2. Assess biodiversity content of green spaces 3. Calculate percentage of built-up area as green/blue space 4. Monitor accessibility and usage', '• City of Kigali master plan records • District urban planning documents • Satellite imagery • Community surveys • RBIS',
   'Baseline: No comprehensive assessment; NLUDMP 2020-2050 targets 20-25% green space by 2050 Target 2027: 15% of urban area as green space Target 2030: 20% of urban area as green space; City Biodiversity Index established for Kigali and secondary cities', 'Annual; Mid-term (2027); End-term (2030)', 'MININFRA, City of Kigali', 'Ministry of Environment, REMA, District Authorities, Urban Planning Agencies', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (13, 'Access and Benefit-Sharing (Genetic Resources)', 'Headline:
Monetary benefits received
Non-monetary benefits received
Component:
Number of regulations for fair/equitable benefit-sharing
Number of authorizations granted for genetic resources (including traditional knowledge)
Complementary:
Transfers of crop material from ITPGRFA Multilateral System
Number of permits for access to genetic resources
Internationally recognized certificates of compliance in ABS Clearing-House
Estimated % of monetary/non-monetary benefits directed to communities', 'Number of agreements; Monetary and non-monetary benefits', 'Measures strengthening of effective legal measures and strategies to ensure benefits arising from utilization of genetic resources and traditional knowledge are shared fairly and equitably.',
   '• By benefit type (monetary, non-monetary) • By resource type (genetic resources, traditional knowledge) • By beneficiary group (communities, institutions)', '1. Track ABS agreements signed 2. Monitor benefit distribution 3. Assess legal framework implementation 4. Survey community satisfaction with benefit sharing', '• REMA ABS records • Nagoya Protocol compliance reports • Research institution records • Community benefit-sharing agreements',
   'Baseline: No baseline information; ABS frameworks in place Target 2027: 50% of access agreements with benefit-sharing Target 2030: 100% of access agreements with fair and equitable benefit-sharing', 'Annual; Mid-term (2027); End-term (2030)', 'REMA', 'Ministry of Justice, Research Institutions, Community Representatives, NISR', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (14, 'Mainstreaming Biodiversity in Policies', 'Component: Number of policies, regulations, and plans that include biodiversity consideration
Complementary:
Number of policies incorporating biodiversity considerations
Increase in cross-sectoral collaborations/joint initiatives
Enhancement in public awareness and participation', 'Number of policies/plans; Percentage', 'Measures integration of biodiversity and its multiple values into policies, laws, regulations, plans, and decision-making processes across all sectors and levels of governance.',
   '• By sector (agriculture, infrastructure, tourism, etc.) • By governance level (national, district, sector) • By policy type', '1. Review sectoral policies for biodiversity integration 2. Count policies with biodiversity considerations 3. Assess budget tagging for biodiversity 4. Monitor cross-sectoral collaborations', '• Ministry policy documents • District development plans • Budget statements • REMA mainstreaming reports • NISR integration data',
   'Baseline: Range of laws, policies, regulations focusing on biodiversity conservation exist Target 2027: 50% of sector plans incorporating biodiversity Target 2030: 100% of sector plans incorporating biodiversity; 15 plans total', 'Annual; Mid-term (2027); End-term (2030)', 'Ministry of Environment, REMA', 'All Sector Ministries, MINECOFIN, MINALOC, NISR', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (15, 'Business & Financial Institution Biodiversity Disclosure', 'Headline: Number of organizations taking action on nature-related risk, dependencies, and impacts
Component: Action plans designed following reports on nature-related risk
Complementary: Number of companies publishing sustainability reports', 'Number of organizations; Percentage', 'Measures large, transnational businesses and financial institutions operating in Rwanda assessing, disclosing, and reducing their biodiversity-related risks and negative impacts.',
   '• By company type (financial, industrial, agricultural, tourism) • By disclosure type (risk assessment, impact report, action plan) • By company size', '1. Survey businesses on biodiversity risk assessment 2. Track sustainability report publication 3. Monitor compliance with disclosure guidelines 4. Assess action plan implementation', '• Company sustainability reports • REMA compliance records • Financial sector guidelines (Guidelines N° 040/2024, N° 2600/2023-00036) • Private sector association records',
   'Baseline: Guidelines established; Full implementation target by December 2027 Target 2027: 50% of large businesses disclosing Target 2030: 100% of large businesses disclosing; 30 enterprises implementing biodiversity practices', 'Annual; Mid-term (2027); End-term (2030)', 'REMA, Ministry of Finance', 'Private Sector Federation, Financial Institutions, RDB, Industry Associations', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (16, 'Sustainable Consumption and Production', 'Component:
Food waste index (updated)
Material footprint per capita
Ecological footprint
Complementary:
Extent to which responsible consumption/waste disposal is mainstreamed in: (a) national education policies, (b) curricula, (c) teacher education, (d) student assessments
Recycling rate
Life Cycle Impact Assessment (LCIA) metrics (e.g., LIME)
Promotion of circular economy across sectors', 'Number of sectors; Percentage; Indices', 'Measures all sectors equipped and implementing strategies to promote sustainable consumption and production among individuals, businesses, and government entities to reduce waste, minimize overconsumption, and support biodiversity conservation.',
   '• By sector (individual, business, government) • By strategy type (waste reduction, recycling, eco-labelling) • By implementation level', '1. Assess sectoral SCP strategies 2. Monitor food waste index 3. Track material footprint per capita 4. Evaluate ecological footprint 5. Count recycling rates', '• UNEP food waste data (Kigali 164, Musanze 117) • NISR consumption surveys • REMA waste management reports • Private sector sustainability reports',
   'Baseline: Food waste index 164 (Kigali), 117 (Musanze); Ecological footprint 0.55 per capita Target 2027: 30% reduction in waste Target 2030: 50% reduction in waste; Circular economy promoted across all sectors', 'Annual; Mid-term (2027); End-term (2030)', 'REMA, MINICOM', 'Private Sector, City Authorities, MINAGRI, Civil Society Organizations', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (17, 'Biosafety Capacity', 'Headline:
Number of biosafety regulations/guidelines developed and implemented
Number of authorizations granted for GMO projects
Component:
Number of people (public/private sector) trained on biosafety
Number of accredited laboratories/facilities for biosafety research/testing
Availability/accessibility of modern biosafety equipment/technologies
Complementary: Frequency of monitoring/scientific reports on risk assessment for biosafety projects', 'Number of regulations; Number of people trained; Number of facilities', 'Measures strengthening of capacity for implementing biosafety measures and sustainable use of biotechnology products and services.',
   '• By training type (public sector, private sector) • By facility type (laboratories, research centers) • By regulation type', '1. Count biosafety regulations and guidelines 2. Track GMO authorizations 3. Count trained personnel 4. Assess laboratory accreditation 5. Monitor equipment availability', '• REMA biosafety records • Biosafety law implementation reports • Training institution records • Laboratory accreditation documents',
   'Baseline: Biosafety law enacted; Ministerial orders and national biosafety committee in place Target 2027: 50% of target personnel trained Target 2030: 100% of target personnel trained; 2,000 stakeholders trained in M&E', 'Annual; Mid-term (2027); End-term (2030)', 'REMA', 'Ministry of Health, Research Institutions, FDA, RICA, Private Sector', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (18, 'Incentives Reform', 'Headline:
% of positive incentives in place to promote biodiversity conservation
Value of harmful subsidies eliminated, phased out, or reformed
Complementary:
Trends in environmentally harmful elements of government agricultural support (producer support estimate)
Trends in number/value of government fossil fuel support measures
Alternatives identified to replace biodiversity-harmful subsidies', 'Number of incentives; Value of subsidies (RWF/USD)', 'Measures identification of harmful incentives and subsidies that negatively impact biodiversity and scaling up of positive incentives to promote biodiversity conservation and sustainable use.',
   '• By incentive type (harmful, positive) • By sector (agriculture, energy, transport, etc.) • By value', '1. Conduct subsidy review study 2. Identify harmful incentives 3. Track incentive reforms 4. Monitor positive incentive implementation 5. Assess biodiversity budget allocation', '• MINECOFIN budget records • Subsidy review study results • REMA incentive reports • Sector ministry budget statements',
   'Baseline: Study on identification, assessment and redesign of subsidies-initiated Target 2027: 50% of harmful incentives reformed Target 2030: 100% of harmful incentives reformed; Positive incentives scaled up', 'Annual; Mid-term (2027); End-term (2030)', 'MINECOFIN, REMA', 'All Sector Ministries, Private Sector, Development Partners', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (19, 'Financial Resource Mobilization ($500M)', 'Headline:
International public funding (including ODA) for biodiversity
Domestic public funding for biodiversity
Private funding (domestic/international) for biodiversity
Complementary:
Amount mobilized through Global Environment Facility (GEF)
Funding from fines/fees collected for environmental degradation/pollution', 'USD; RWF', 'Measures mobilization of financial resources from all sources and alignment of financial flows with conservation and sustainable use of biodiversity in Rwanda. Target is 500 million USD by 2030.',
   '• By source (domestic public, international public, private) • By funding mechanism (grants, loans, PES, green bonds) • By recipient sector', '1. Track biodiversity expenditure 2. Monitor FONERWA biodiversity window 3. Count GEF and donor funding 4. Assess private sector contributions 5. Track fines and fees collection', '• MINECOFIN budget reports • FONERWA records • GEF project databases • Donor reports • REMA finance tracking',
   'Baseline: Based on REMA Strategy (2022-26), GGCRS, RGF targets; 56% of biodiversity spending from development budgets Target 2027: USD 250 million mobilized Target 2030: USD 500 million mobilized; RWF 10 billion biodiversity funding', 'Annual; Mid-term (2027); End-term (2030)', 'MINECOFIN, REMA, FONERWA', 'Development Partners, Private Sector, NGOs, District Authorities', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (20, 'Capacity Building, Technology Transfer, Research', 'Headline:
Number of capacity-building programs implemented
Adoption of new biodiversity monitoring/conservation technologies
Component:
Participants trained in biodiversity monitoring/conservation
Number of collaborative research projects and scientific publications
Complementary: Improved biodiversity data collection/information systems; enhanced data management', 'Number of programs; Number of participants; Number of publications', 'Measures strengthening of capacity-building, technology transfer, scientific research, and technical cooperation to enhance biodiversity conservation and sustainable use, including communication, awareness-raising, education, and monitoring.',
   '• By capacity type (training, research, technology) • By participant category (government, community, private sector) • By output type (publications, tools, policies)', '1. Count capacity-building programs 2. Track training participants 3. Monitor research projects and publications 4. Assess technology adoption 5. Evaluate knowledge products produced', '• Training records • Research institution reports • RBIS knowledge products • REMA capacity development reports • Workshop attendance logs',
   'Baseline: No consolidated metrics on capacity-building and technology transfer Target 2027: 1,200 stakeholders trained Target 2030: 2,000 stakeholders trained; 50 knowledge products produced', 'Annual; Mid-term (2027); End-term (2030)', 'REMA, Ministry of Education', 'Research Institutions, Universities, NGOs, Development Partners, NBSAP TWG', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (21, 'Biodiversity Data Accessibility', 'Headline: Biodiversity information system for data sharing/monitoring available and accessible
Component: Extent to which:
Global citizenship education is mainstreamed in: (a) national policies, (b) curricula, (c) teacher education, (d) student assessments
Education for sustainable development (including gender equality/human rights) is mainstreamed in same domains', 'Number of datasets; Accessibility score; Percentage', 'Measures availability, accessibility, and utilization of biodiversity-related data, information, and knowledge to inform and guide biodiversity conservation and sustainable use.',
   '• By data type (species, ecosystems, threats) • By accessibility level (public, restricted) • By user type (government, researchers, communities)', '1. Assess RBIS functionality 2. Track data sharing compliance 3. Monitor citizen science participation 4. Evaluate data utilization in decision-making 5. Count policy decisions informed by M&E', '• RBIS database records • NISR data warehouse • Research institution datasets • REMA reports • Decision-making records',
   'Baseline: RBIS established and accessible Target 2027: 85% of institutions reporting regularly Target 2030: 100% of institutions reporting; 50 decisions informed by M&E; 100% timely report submission', 'Annual; Mid-term (2027); End-term (2030)', 'REMA, NISR', 'Research Institutions, All Sector Ministries, District Authorities, RBIS Technical Team', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10'),
  (22, 'Inclusive Stakeholder Participation', 'Component: Proportion of stakeholders participating in biodiversity decision-making, disaggregated by sex and age groups', 'Percentage of stakeholders; Number of participants', 'Measures participation of all stakeholders, including women, youth, and persons with disabilities, in biodiversity-related decision-making processes and information respecting traditional knowledge.',
   '• By stakeholder type (women, youth, persons with disabilities, LCs) • By decision-making level (community, district, national) • By participation type (consultation, leadership, implementation)', '1. Survey stakeholder participation rates 2. Track gender-disaggregated participation 3. Monitor LC engagement 4. Assess traditional knowledge integration 5. Count leadership positions held by marginalized groups', '• Community participation records • GMS gender reports • District meeting minutes • REMA stakeholder engagement reports • CBO/LC records',
   'Baseline: Activities related to indicator exist; No consolidated baseline data Target 2027: 35% women & 20% LC participation Target 2030: 50% women & 30% LC participation; 80% of communities actively engaged', 'Annual; Mid-term (2027); End-term (2030)', 'REMA, MIGEPROF', 'District Authorities, LC Representatives, Women''s Councils, Youth Networks, NGOs, CBOs', 'NBSAP II Monitoring Framework (Final Revised Draft, 10 May 2026, IUCN inputs), section 5.10')
) AS v(nbsap_target_id, title, indicators_text, unit, definition, disaggregation, methodology, data_sources,
       baseline_and_targets, frequency, lead, collaborators, source)
WHERE EXISTS (SELECT 1 FROM public.nbsap_targets t WHERE t.id = v.nbsap_target_id)
ON CONFLICT (nbsap_target_id) DO NOTHING;

-- ============================================================
-- 4. INDICATOR REFERENCE FIELDS
-- ============================================================

ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS unit                  TEXT,
  ADD COLUMN IF NOT EXISTS formula               TEXT,
  ADD COLUMN IF NOT EXISTS methodology           TEXT,
  ADD COLUMN IF NOT EXISTS national_tier         SMALLINT REFERENCES public.national_tiers(tier),
  ADD COLUMN IF NOT EXISTS lead_institution_id   INTEGER REFERENCES public.institutions(id),
  ADD COLUMN IF NOT EXISTS rbis_code             TEXT,
  -- NULL = not decided; '{}' = no breakdown required
  ADD COLUMN IF NOT EXISTS disaggregations       TEXT[],
  ADD COLUMN IF NOT EXISTS in_use                BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS duplicate_of          INTEGER REFERENCES public.indicators(id),
  ADD COLUMN IF NOT EXISTS reference_status      TEXT NOT NULL DEFAULT 'draft'
                                                 CHECK (reference_status IN ('draft', 'approved')),
  ADD COLUMN IF NOT EXISTS reference_note        TEXT,
  ADD COLUMN IF NOT EXISTS reference_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reference_approved_at TIMESTAMPTZ;

COMMENT ON COLUMN public.indicators.national_tier IS 'M05: national tier (national_tiers) beside the KM-GBF type in tier.';
COMMENT ON COLUMN public.indicators.disaggregations IS 'M05: breakdowns a report must give (disaggregation_dimensions.code). NULL = not decided, {} = none.';
COMMENT ON COLUMN public.indicators.rbis_code IS 'M05: the indicator''s code in the Rwanda Biodiversity Information System (supplied by RBIS).';
COMMENT ON COLUMN public.indicators.reference_status IS 'M05: draft until the TWG approves the reference data; any later change returns it to draft.';

-- Every breakdown must be a known dimension.
CREATE OR REPLACE FUNCTION public.check_indicator_disaggregations()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_bad TEXT;
BEGIN
  SELECT string_agg(d, ', ') INTO v_bad
  FROM unnest(COALESCE(NEW.disaggregations, '{}')) d
  WHERE NOT EXISTS (SELECT 1 FROM public.disaggregation_dimensions x WHERE x.code = d);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown disaggregation: %', v_bad USING ERRCODE = '23503';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_indicator_disaggregations ON public.indicators;
CREATE TRIGGER check_indicator_disaggregations
  BEFORE INSERT OR UPDATE OF disaggregations ON public.indicators
  FOR EACH ROW EXECUTE FUNCTION public.check_indicator_disaggregations();

-- The stages a report on this indicator passes, with the condition.
CREATE OR REPLACE FUNCTION public.indicator_validation_route(p_indicator INTEGER)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'code', s.code, 'name', s.name,
           'condition', CASE s.applies_to
             WHEN 'all_reports'         THEN 'every report'
             WHEN 'district_reports'    THEN 'reports about a district'
             WHEN 'institution_reports' THEN 'reports of a single institution'
             WHEN 'flagged_indicators'  THEN 'every report on this indicator'
             WHEN 'spatial_reports'     THEN 'reports with map/GIS evidence'
           END) ORDER BY s.ordinal, s.id), '[]'::jsonb)
  FROM public.validation_stages s
  WHERE s.is_active
    AND (s.applies_to <> 'flagged_indicators'
         OR EXISTS (SELECT 1 FROM public.indicators x
                    WHERE x.id = p_indicator AND x.requires_statistical_validation));
$$;

-- Missing reference fields (empty array = complete).
CREATE OR REPLACE FUNCTION public.indicator_reference_gaps(i public.indicators)
RETURNS TEXT[]
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN COALESCE(TRIM(i.definition), '') = ''  THEN 'definition' END,
    CASE WHEN COALESCE(TRIM(i.unit), '') = ''        THEN 'unit' END,
    CASE WHEN COALESCE(TRIM(i.formula), '') = ''     THEN 'formula' END,
    CASE WHEN COALESCE(TRIM(i.data_source), '') = '' THEN 'data source' END,
    CASE WHEN COALESCE(TRIM(i.periodicity), '') = '' THEN 'frequency' END,
    CASE WHEN i.lead_institution_id IS NULL          THEN 'lead institution' END,
    CASE WHEN jsonb_array_length(public.indicator_validation_route(i.id)) = 0 THEN 'validation route' END,
    CASE WHEN COALESCE(TRIM(i.rbis_code), '') = ''   THEN 'RBIS code' END,
    CASE WHEN i.national_tier IS NULL                THEN 'national tier' END,
    CASE WHEN i.disaggregations IS NULL              THEN 'disaggregation' END
  ], NULL);
$$;

-- Approval: only complete reference data; any later change -> draft.
CREATE OR REPLACE FUNCTION public.guard_indicator_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_gaps TEXT[];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.reference_status = 'approved' AND NEW.reference_status = 'approved'
     AND (NEW.definition, NEW.unit, NEW.formula, NEW.methodology, NEW.data_source, NEW.periodicity,
          NEW.lead_institution_id, NEW.rbis_code, NEW.national_tier, NEW.disaggregations,
          NEW.requires_statistical_validation)
         IS DISTINCT FROM
         (OLD.definition, OLD.unit, OLD.formula, OLD.methodology, OLD.data_source, OLD.periodicity,
          OLD.lead_institution_id, OLD.rbis_code, OLD.national_tier, OLD.disaggregations,
          OLD.requires_statistical_validation) THEN
    NEW.reference_status := 'draft';
  END IF;

  IF NEW.reference_status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.reference_status IS DISTINCT FROM 'approved') THEN
    v_gaps := public.indicator_reference_gaps(NEW);
    IF cardinality(v_gaps) > 0 THEN
      RAISE EXCEPTION 'Reference data is incomplete (missing: %); it cannot be approved',
        array_to_string(v_gaps, ', ') USING ERRCODE = '23514';
    END IF;
    NEW.reference_approved_by := auth.uid();
    NEW.reference_approved_at := NOW();
  ELSIF NEW.reference_status = 'draft' THEN
    NEW.reference_approved_by := NULL;
    NEW.reference_approved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_indicator_reference ON public.indicators;
CREATE TRIGGER guard_indicator_reference
  BEFORE INSERT OR UPDATE ON public.indicators
  FOR EACH ROW EXECUTE FUNCTION public.guard_indicator_reference();

-- Everything one reference sheet needs, per indicator.
CREATE OR REPLACE VIEW public.v_indicator_reference
WITH (security_invoker = true) AS
SELECT
  i.id, i.name, i.definition, i.tier AS km_gbf_type, i.km_gbf,
  i.national_tier, nt.name AS national_tier_name,
  i.nbsap_target_id, t.title AS target_title,
  i.unit, i.formula, i.methodology, i.data_source, i.periodicity,
  i.lead_institution_id, li.code AS lead_institution_code, li.name AS lead_institution_name,
  i.responsible, i.rbis_code, i.disaggregations,
  i.baseline, i.midterm, i.target_2030, i.requires_statistical_validation,
  public.indicator_validation_route(i.id) AS validation_route,
  i.in_use, i.duplicate_of,
  i.reference_status, i.reference_note, i.reference_approved_at,
  public.indicator_reference_gaps(i) AS gaps,
  cardinality(public.indicator_reference_gaps(i)) = 0 AS complete,
  s.methodology AS sheet_methodology, s.disaggregation AS sheet_disaggregation,
  s.data_sources AS sheet_data_sources, s.baseline_and_targets AS sheet_baseline_and_targets,
  s.frequency AS sheet_frequency, s.lead AS sheet_lead, s.collaborators AS sheet_collaborators,
  s.source AS sheet_source
FROM public.indicators i
LEFT JOIN public.national_tiers nt ON nt.tier = i.national_tier
LEFT JOIN public.nbsap_targets t ON t.id = i.nbsap_target_id
LEFT JOIN public.institutions li ON li.id = i.lead_institution_id
LEFT JOIN public.target_reference_sheets s ON s.nbsap_target_id = i.nbsap_target_id;

GRANT SELECT ON public.v_indicator_reference TO authenticated;

-- ── Access: reference tables readable by signed-in users, maintained by admins ──
ALTER TABLE public.national_tiers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaggregation_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_reference_sheets   ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['national_tiers', 'disaggregation_dimensions', 'target_reference_sheets'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Signed-in users read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Signed-in users read %1$s" ON public.%1$I FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins maintain %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins maintain %1$s" ON public.%1$I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END $$;

-- ============================================================
-- 5. DISAGGREGATION ON REPORTS (extends 043)
-- ============================================================

CREATE OR REPLACE FUNCTION public.assess_disaggregation(p_indicator INTEGER, p_form JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flags JSONB := '[]'::jsonb;
  d       public.disaggregation_dimensions%ROWTYPE;
  f       JSONB;
  v_raw   TEXT;
  v_sex   NUMERIC;
  v_age   NUMERIC;
BEGIN
  IF p_indicator IS NULL THEN
    RETURN v_flags;
  END IF;
  FOR d IN
    SELECT x.* FROM public.disaggregation_dimensions x
    JOIN public.indicators i ON i.id = p_indicator AND x.code = ANY (COALESCE(i.disaggregations, '{}'))
    ORDER BY x.ordinal, x.code
  LOOP
    FOR f IN SELECT * FROM jsonb_array_elements(d.fields) LOOP
      v_raw := NULLIF(TRIM(p_form->>(f->>'key')), '');
      IF v_raw IS NULL THEN
        v_flags := v_flags || jsonb_build_object('code', 'disaggregation_missing', 'severity', 'error',
          'field', f->>'key',
          'message', format('This indicator must be broken down by %s: enter "%s" (0 if none).',
                            lower(d.label), f->>'label'));
      ELSIF v_raw !~ '^[0-9]+$' THEN
        v_flags := v_flags || jsonb_build_object('code', 'disaggregation_invalid', 'severity', 'error',
          'field', f->>'key',
          'message', format('"%s" must be a whole number (got "%s").', f->>'label', v_raw));
      END IF;
    END LOOP;
  END LOOP;

  -- Women + men and the age groups describe the same people.
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_flags))
     AND EXISTS (SELECT 1 FROM public.indicators i
                 WHERE i.id = p_indicator AND i.disaggregations @> ARRAY['sex', 'age']) THEN
    v_sex := (p_form->>'dis_female')::NUMERIC + (p_form->>'dis_male')::NUMERIC;
    v_age := (p_form->>'dis_age_under_16')::NUMERIC + (p_form->>'dis_age_16_30')::NUMERIC
           + (p_form->>'dis_age_31_64')::NUMERIC + (p_form->>'dis_age_65_plus')::NUMERIC;
    IF v_sex <> v_age THEN
      v_flags := v_flags || jsonb_build_object('code', 'disaggregation_inconsistent', 'severity', 'warning',
        'message', format('Women + men (%s) differ from the total of the age groups (%s).', v_sex, v_age));
    END IF;
  END IF;
  RETURN v_flags;
END;
$$;

-- Keep 043's checks as the core and add the breakdown check to them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assess_report_quality_core') THEN
    ALTER FUNCTION public.assess_report_quality(report_type, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB, UUID)
      RENAME TO assess_report_quality_core;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assess_report_quality(
  p_tool        report_type,
  p_institution INTEGER,
  p_district    INTEGER,
  p_target      INTEGER,
  p_indicator   INTEGER,
  p_period      TEXT,
  p_form        JSONB,
  p_exclude     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.assess_report_quality_core(p_tool, p_institution, p_district, p_target, p_indicator,
                                           p_period, p_form, p_exclude)
         || public.assess_disaggregation(p_indicator, p_form);
$$;

REVOKE ALL ON FUNCTION public.assess_report_quality_core(report_type, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assess_report_quality(report_type, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assess_disaggregation(INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.indicator_validation_route(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.indicator_validation_route(INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_indicator_reference() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_indicator_disaggregations() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 6. SEED (drafts for TWG approval)
-- ============================================================

-- Exact duplicates (same name and target, e.g. "Spatial Plans Utilising
-- KBA Information (%)" twice): the lowest id stays in use; the others are
-- kept for history, out of use. Ids differ between databases, so match
-- by name.
UPDATE public.indicators d
SET in_use = FALSE, duplicate_of = k.id
FROM public.indicators k
WHERE d.name = k.name
  AND d.nbsap_target_id IS NOT DISTINCT FROM k.nbsap_target_id
  AND k.id = (SELECT min(x.id) FROM public.indicators x
              WHERE x.name = d.name AND x.nbsap_target_id IS NOT DISTINCT FROM d.nbsap_target_id)
  AND d.id <> k.id
  AND d.duplicate_of IS NULL;

-- Drafted per indicator (unit, national tier, required breakdowns,
-- formula) from its definition and the Framework sheet; for TWG approval.
UPDATE public.indicators i
SET unit = COALESCE(i.unit, v.unit),
    national_tier = COALESCE(i.national_tier, v.national_tier),
    disaggregations = COALESCE(i.disaggregations, v.disaggregations),
    formula = COALESCE(i.formula, v.formula),
    reference_note = COALESCE(i.reference_note,
      'Unit, formula, national tier and breakdowns drafted from the indicator definition and the Monitoring Framework (May 2026) for TWG approval.')
FROM (VALUES
  ('Spatial Plan Biodiversity Coverage (%)', '%', 1, ARRAY[]::TEXT[], 'Area of land and water covered by biodiversity-inclusive spatial plans / total national land and water area x 100'),
  ('Spatial Plans Utilising KBA Information (%)', '%', 2, ARRAY[]::TEXT[], 'Spatial plans that use Key Biodiversity Area information / spatial plans adopted x 100'),
  ('Spatial Plans Utilising KBA Information (%)', '%', 2, ARRAY[]::TEXT[], 'Spatial plans that use Key Biodiversity Area information / spatial plans adopted x 100'),
  ('KBAs in Spatial Planning (Number)', 'number', 2, ARRAY[]::TEXT[], 'Count of Key Biodiversity Areas included in adopted spatial plans'),
  ('Degraded Land & Water Under Restoration (ha)', 'ha', 1, ARRAY[]::TEXT[], 'Sum of the area (ha) of degraded land, wetlands, lakes and rivers under active or assisted restoration'),
  ('Degraded Wetlands Restored (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the area (ha) of degraded wetlands of high biodiversity importance restored'),
  ('Degraded Wetlands Restored (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the area (ha) of degraded wetlands of high biodiversity importance restored'),
  ('Degraded Natural Forest Restored (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the area (ha) of degraded natural forest and reserves of high biodiversity importance restored'),
  ('Protected Area Coverage (% of national territory)', '%', 1, ARRAY[]::TEXT[], 'Area (ha) of protected areas and OECMs / national territory (2,633,800 ha) x 100'),
  ('Key Biodiversity Areas Effectively Conserved (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the Key Biodiversity Area (ha) assessed as effectively conserved'),
  ('Key Biodiversity Areas Effectively Conserved (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the Key Biodiversity Area (ha) assessed as effectively conserved'),
  ('Ramsar Wetlands Effectively Managed (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the Ramsar-site area (ha) whose management is assessed as effective'),
  ('Threatened Species Conservation Status (%)', '%', 1, ARRAY[]::TEXT[], 'Threatened species with stable or improving status / threatened species assessed x 100'),
  ('HWC Management Guidelines Developed', 'number', 3, ARRAY[]::TEXT[], 'Count of human-wildlife conflict and genetic-diversity guidelines formally adopted'),
  ('Threatened Species Improving in Status (%)', '%', 2, ARRAY[]::TEXT[], 'Threatened species whose Red List category improved since the baseline / threatened species assessed x 100'),
  ('CITES Species Conservation Status', '%', 2, ARRAY[]::TEXT[], 'CITES-listed species with stable or improved status / CITES-listed species assessed x 100'),
  ('Illegal Harvesting Reduction (%)', '%', 1, ARRAY[]::TEXT[], '(Illegal harvesting incidents in the baseline year - incidents in the reporting year) / incidents in the baseline year x 100'),
  ('Fish Stocks within Sustainable Levels (%)', '%', 2, ARRAY[]::TEXT[], 'Fish stocks within biologically sustainable levels / fish stocks assessed x 100'),
  ('Wild Species Enforcement Inspections', 'number', 2, ARRAY[]::TEXT[], 'Count of enforcement inspections on wild species and fisheries in the period'),
  ('Invasive Alien Species Establishment Rate Reduction', '%', 1, ARRAY[]::TEXT[], '(IAS establishment rate in protected areas at baseline - rate in the period) / rate at baseline x 100'),
  ('IAS Introduction Events (Number)', 'number', 2, ARRAY[]::TEXT[], 'Count of invasive alien species introduction events recorded in the period'),
  ('IAS on National Lists (GRIIS)', 'number', 2, ARRAY[]::TEXT[], 'Count of species on Rwanda''s list in the Global Register of Introduced and Invasive Species'),
  ('Pollutant Concentration in Environment', 'mg/L', 1, ARRAY[]::TEXT[], 'Mean concentration of each monitored pollutant across monitoring stations, compared with the national standard'),
  ('Fertilizer Efficiency (%)', '%', 2, ARRAY[]::TEXT[], 'Nutrient taken up by crops / nutrient applied as fertiliser x 100 (nutrient-use efficiency)'),
  ('Wastewater Safely Treated (%)', '%', 2, ARRAY[]::TEXT[], 'Volume of domestic and industrial wastewater safely treated / total wastewater generated x 100'),
  ('Nitrogen Loss in Environment (Amount)', 'tonnes N', 2, ARRAY[]::TEXT[], 'Nitrogen applied to farmland - nitrogen removed in harvested crops (national nitrogen surplus)'),
  ('Solid Waste Collected & Managed (%)', '%', 2, ARRAY[]::TEXT[], 'Solid waste collected and safely managed (t) / solid waste generated (t) x 100'),
  ('Households Protected from Climate Impacts (%)', '%', 1, ARRAY[]::TEXT[], 'Households protected by NbS/EbA measures / households exposed to floods and climate hazards x 100'),
  ('GHG Inventories from Land Use Change', 'number', 2, ARRAY[]::TEXT[], 'Count of national GHG inventories that include land use and land-use change (cumulative)'),
  ('Above-Ground Biomass Stock in Forests (t/ha)', 't/ha', 2, ARRAY[]::TEXT[], 'Above-ground biomass in sampled forest plots (t) / area sampled (ha)'),
  ('Local Govts with DRR Strategies (%)', '%', 2, ARRAY[]::TEXT[], 'Districts with DRR strategies aligned to the national framework / 30 districts x 100'),
  ('Benefits from Sustainable Use of Wild Species', 'RWF', 1, ARRAY[]::TEXT[], 'Sum of monetary benefits (revenue sharing, sales) from sustainable use of wild species received by communities'),
  ('People Benefiting from Wild Resources', 'people', 2, ARRAY['sex', 'age', 'youth']::TEXT[], 'Count of people benefiting from wild resources for food, medicine, crafts and culture'),
  ('Genetic Resources in Conservation Facilities', 'number', 2, ARRAY[]::TEXT[], 'Count of plant and animal genetic resources for food and agriculture secured in conservation facilities'),
  ('Agricultural Area under Sustainable Management (%)', '%', 1, ARRAY[]::TEXT[], 'Agricultural, forest and aquaculture area under sustainable management / total area of these land uses x 100'),
  ('Forest Management Certification', 'ha', 2, ARRAY[]::TEXT[], 'Area (ha) of forest under certified sustainable management'),
  ('Small-Scale Food Producer Income (Average)', 'RWF', 2, ARRAY['sex']::TEXT[], 'Total income of sampled small-scale food producers / number of producers sampled'),
  ('Degraded Agriculture & Forest Land (%)', '%', 2, ARRAY[]::TEXT[], 'Degraded agricultural and forest land (ha) / total agricultural and forest land (ha) x 100'),
  ('Ecosystem Services Level (RWF)', 'RWF', 1, ARRAY[]::TEXT[], 'Sum of the monetary value of ecosystem services from restored ecosystems (valuation method stated in the report)'),
  ('WASH Mortality Rate', 'deaths per 100,000', 2, ARRAY[]::TEXT[], 'Deaths attributable to unsafe water, sanitation and hygiene / population x 100,000'),
  ('PM2.5/PM10 Particulate Matter Levels', 'µg/m³', 2, ARRAY[]::TEXT[], 'Annual mean PM2.5 and PM10 concentration across district monitoring stations'),
  ('Water Bodies with Good Ambient Quality (%)', '%', 2, ARRAY[]::TEXT[], 'Water bodies with good ambient water quality / water bodies monitored x 100'),
  ('Annual Soil Loss by Erosion', 't/ha/year', 2, ARRAY[]::TEXT[], 'Estimated annual soil loss by erosion (t) / area (ha)'),
  ('Urban Green/Blue Space Share (%)', '%', 1, ARRAY[]::TEXT[], 'Green and blue space for public use (ha) / built-up city area (ha) x 100'),
  ('Recreation & Cultural Services Area (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the urban area (ha) providing recreation and cultural services'),
  ('Urban Forestry Area (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Sum of the area (ha) under urban forestry in cities and towns'),
  ('City Biodiversity Index (Kigali & Secondary Cities)', 'index score', 3, ARRAY[]::TEXT[], 'City Biodiversity Index score per city (Singapore Index method)'),
  ('ABS Monetary Benefits Received', 'RWF', 1, ARRAY[]::TEXT[], 'Sum of monetary benefits received under access and benefit-sharing agreements in the period'),
  ('ABS Non-Monetary Benefits Received', 'number', 1, ARRAY[]::TEXT[], 'Count of non-monetary benefits (technology transfer, training, joint research) delivered under ABS agreements'),
  ('ABS Regulations Developed', 'number', 2, ARRAY[]::TEXT[], 'Count of access and benefit-sharing regulations adopted'),
  ('Genetic Resource Authorizations Granted', 'number', 2, ARRAY[]::TEXT[], 'Count of authorizations granted for access to genetic resources, including traditional knowledge'),
  ('ABS Certificates in Clearing-House', 'number', 2, ARRAY[]::TEXT[], 'Count of internationally recognized certificates of compliance published in the ABS Clearing-House'),
  ('Policies/Plans with Biodiversity Integration', 'number', 2, ARRAY[]::TEXT[], 'Count of policies, regulations and plans adopted that integrate biodiversity'),
  ('Cross-Sectoral Biodiversity Collaborations', 'number', 4, ARRAY[]::TEXT[], 'Count of active cross-sectoral biodiversity collaborations and joint initiatives'),
  ('Public Awareness & Participation Enhancement', '%', 4, ARRAY['sex', 'youth']::TEXT[], 'Survey respondents aware of or taking part in biodiversity conservation / respondents x 100'),
  ('Organizations Disclosing Nature-Related Risk', 'number', 1, ARRAY[]::TEXT[], 'Count of large businesses and financial institutions disclosing and acting on nature-related risk'),
  ('Action Plans on Nature-Related Risk', 'number', 2, ARRAY[]::TEXT[], 'Count of action plans adopted following nature-related risk and impact reports'),
  ('Companies Publishing Sustainability Reports', 'number', 2, ARRAY[]::TEXT[], 'Count of companies publishing sustainability reports with biodiversity information'),
  ('Food Waste Index (Updated)', 'kg per capita per year', 2, ARRAY[]::TEXT[], 'Food waste (kg) / population (UNEP Food Waste Index method)'),
  ('Eco-labelled or Certified Sustainable Products on Market (%)', '%', 2, ARRAY[]::TEXT[], 'Products on the market with recognised sustainability or eco-label certification / products assessed x 100'),
  ('Material Footprint per Capita', 't per capita', 2, ARRAY[]::TEXT[], 'Raw material consumption (t) / population'),
  ('Ecological Footprint per Capita', 'gha per capita', 2, ARRAY[]::TEXT[], 'National ecological footprint (global hectares) / population'),
  ('Recycling Rate (%)', '%', 2, ARRAY[]::TEXT[], 'Waste recycled or reused (t) / waste generated (t) x 100'),
  ('Biosafety Regulations & GMO Authorizations', 'number', 1, ARRAY[]::TEXT[], 'Count of biosafety regulations and guidelines adopted and in force'),
  ('GMO Risk Assessments Completed (#)', 'number', 1, ARRAY[]::TEXT[], 'Count of GMO risk assessments completed in the period'),
  ('Biosafety Personnel Trained', 'people', 2, ARRAY['sex']::TEXT[], 'Count of people trained on biosafety measures and GMO management'),
  ('Accredited Biosafety Laboratories', 'number', 2, ARRAY[]::TEXT[], 'Count of laboratories and facilities accredited for biosafety research and testing'),
  ('Biosafety Risk Assessment Reports', 'number', 4, ARRAY[]::TEXT[], 'Count of biosafety monitoring and risk-assessment reports produced in the period'),
  ('Positive Incentives for Biodiversity (%)', '%', 1, ARRAY[]::TEXT[], 'Positive incentive measures in place / incentive measures identified in the national assessment x 100'),
  ('Biodiversity-Harmful Subsidies Identified and Being Reformed (RWF B)', 'RWF billion', 1, ARRAY[]::TEXT[], 'Sum of the value (RWF billion) of harmful subsidies identified that are under review or reform'),
  ('Positive Biodiversity Incentive Programmes Operational (#)', 'number', 2, ARRAY[]::TEXT[], 'Count of operational PES, certification or conservation-finance programmes giving positive incentives'),
  ('Harmful Subsidies Eliminated or Reformed (Value)', 'RWF', 1, ARRAY[]::TEXT[], 'Sum of the value of harmful subsidies eliminated, phased out or reformed'),
  ('Environmentally Harmful Agricultural Support Trend', 'RWF', 2, ARRAY[]::TEXT[], 'Value of potentially harmful agricultural support in the year, compared with the previous year'),
  ('International Public Funding for Biodiversity (USD)', 'USD', 1, ARRAY[]::TEXT[], 'Sum of international public funding (including ODA) disbursed for biodiversity in the year'),
  ('Total Biodiversity Finance Mobilised (USD M)', 'USD million', 1, ARRAY[]::TEXT[], 'Sum of biodiversity finance from all sources (government, international, private), cumulative since 2025'),
  ('Domestic Public Funding for Biodiversity (RWF)', 'RWF', 1, ARRAY[]::TEXT[], 'Sum of domestic public expenditure tagged to biodiversity in the budget year'),
  ('Private Biodiversity Finance (USD)', 'USD', 1, ARRAY[]::TEXT[], 'Sum of private funding (domestic and international) mobilized for biodiversity in the year'),
  ('GEF & International Facility Funding', 'USD', 2, ARRAY[]::TEXT[], 'Sum of GEF and other international facility funding committed to Rwanda in the year'),
  ('Capacity-Building Programs Implemented', 'number', 1, ARRAY[]::TEXT[], 'Count of biodiversity capacity-building programmes implemented'),
  ('Institutions with Enhanced Biodiversity Capacity (#)', 'number', 1, ARRAY[]::TEXT[], 'Count of institutions that completed a structured NBSAP capacity-building programme'),
  ('Biodiversity Technology Adoption', 'number', 1, ARRAY[]::TEXT[], 'Count of new biodiversity monitoring and conservation technologies adopted by institutions'),
  ('Stakeholders Trained in Biodiversity M&E', 'people', 2, ARRAY['sex', 'youth']::TEXT[], 'Count of participants trained in biodiversity monitoring and conservation techniques'),
  ('Collaborative Research Projects & Publications', 'number', 4, ARRAY[]::TEXT[], 'Count of collaborative research projects plus peer-reviewed publications on Rwanda''s biodiversity'),
  ('RBIS Availability & Accessibility', '%', 1, ARRAY[]::TEXT[], 'Months in which RBIS was available and publicly accessible / 12 x 100'),
  ('RBIS Species Records (#)', 'number', 3, ARRAY[]::TEXT[], 'Count of validated species occurrence records in RBIS (cumulative)'),
  ('CHM Rwanda Updates (per year)', 'number', 3, ARRAY[]::TEXT[], 'Count of substantive updates to the CHM Rwanda portal in the calendar year'),
  ('Biodiversity Knowledge Products (Number)', 'number', 4, ARRAY[]::TEXT[], 'Count of biodiversity knowledge products (reports, maps, policy briefs) published'),
  ('Timely CBD Report Submissions (%)', '%', 2, ARRAY[]::TEXT[], 'National reports submitted to the CBD by the deadline / reports due x 100'),
  ('Education for Sustainable Development Mainstreaming', 'score 0-3', 2, ARRAY[]::TEXT[], 'Level of mainstreaming of GCED/ESD in policies, curricula, teacher education and assessment (SDG 4.7.1 method)'),
  ('Stakeholder Participation in Biodiversity Decisions (%)', '%', 2, ARRAY['sex', 'age', 'youth', 'disability']::TEXT[], 'Stakeholders taking part in biodiversity decision processes / stakeholders invited x 100'),
  ('Women and Youth in Biodiversity Decision-Making (%)', '%', 1, ARRAY['sex', 'youth']::TEXT[], 'Women and youth among participants in biodiversity governance bodies and consultations / all participants x 100'),
  ('Traditional Knowledge Documented and Protected (#)', 'number', 3, ARRAY[]::TEXT[], 'Count of traditional knowledge entries documented and entered in the national registry'),
  ('Forest Cover (% of National Territory)', '%', 1, ARRAY[]::TEXT[], 'Forest area (ha) / national territory (2,633,800 ha) x 100'),
  ('Households Protected from Floods by NbS (%)', '%', 2, ARRAY[]::TEXT[], 'Households protected from floods by NbS / households exposed to flood risk x 100'),
  ('Revenue from Nature-Based Tourism Shared with Communities (RWF M)', 'RWF million', 1, ARRAY[]::TEXT[], 'Sum of tourism revenue (RWF million) shared with communities around protected areas in the year'),
  ('Households Benefiting from PES Schemes (#)', 'households', 2, ARRAY[]::TEXT[], 'Count of households receiving payments under payment-for-ecosystem-services schemes'),
  ('Agricultural Land under Sustainable Management Practices (%)', '%', 1, ARRAY[]::TEXT[], 'Agricultural land under sustainable practices (ha) / total agricultural land (ha) x 100'),
  ('Forest Plantation Area under Certified Management (ha)', 'ha', 2, ARRAY[]::TEXT[], 'Area (ha) of forest plantations under certified management'),
  ('Urban Green Space per Capita (m²/person)', 'm² per person', 1, ARRAY[]::TEXT[], 'Public urban green space (m²) / urban population'),
  ('Air Quality Index — PM2.5 Annual Mean (µg/m³)', 'µg/m³', 2, ARRAY[]::TEXT[], 'Annual mean PM2.5 concentration across monitoring stations'),
  ('Cities with Biodiversity-Inclusive Urban Master Plans (#)', 'number', 1, ARRAY[]::TEXT[], 'Count of cities whose adopted master plan integrates biodiversity'),
  ('ABS Agreements in Force (#)', 'number', 1, ARRAY[]::TEXT[], 'Count of access and benefit-sharing agreements in force'),
  ('Sectors with Biodiversity Integrated in Plans and Budgets (%)', '%', 1, ARRAY[]::TEXT[], 'Sectors with biodiversity integrated in plans and budgets / sectors assessed x 100'),
  ('Biodiversity Budget Tag as % of National Budget', '%', 2, ARRAY[]::TEXT[], 'Budget tagged to biodiversity (RWF) / total national budget (RWF) x 100'),
  ('Large Businesses Disclosing Biodiversity-Related Risks (#)', 'number', 1, ARRAY[]::TEXT[], 'Count of large businesses disclosing biodiversity-related risks'),
  ('Material Footprint per Capita (tonnes/person/year)', 't per capita per year', 2, ARRAY[]::TEXT[], 'Raw material consumption (t) / population')
) AS v(name, unit, national_tier, disaggregations, formula)
WHERE i.name = v.name;

-- Lead institution: the indicator's first responsible institution, else
-- the lead named on the target's reference sheet.
UPDATE public.indicators i
SET lead_institution_id = COALESCE(
      (SELECT inst.id FROM unnest(i.responsible) WITH ORDINALITY r(code, n)
       JOIN public.institutions inst ON inst.code = r.code
       ORDER BY r.n LIMIT 1),
      (SELECT inst.id FROM public.target_reference_sheets s
       JOIN public.institutions inst
         ON inst.code = CASE split_part(s.lead, ',', 1)
                          WHEN 'Ministry of Environment' THEN 'MoE'
                          WHEN 'City of Kigali' THEN 'Kigali City'
                          ELSE TRIM(split_part(s.lead, ',', 1)) END
       WHERE s.nbsap_target_id = i.nbsap_target_id))
WHERE i.lead_institution_id IS NULL;

-- Methodology: the steps on the target's reference sheet.
UPDATE public.indicators i
SET methodology = s.methodology
FROM public.target_reference_sheets s
WHERE s.nbsap_target_id = i.nbsap_target_id AND i.methodology IS NULL;

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (NULL, 'schema_migration', 'Indicator reference data and disaggregation (045, M05)',
        'National tiers, disaggregation dimensions, Framework reference sheets, indicator reference fields (drafts for TWG approval), breakdown check on reports.',
        'system', 'database');

COMMIT;
