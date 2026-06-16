-- ============================================================
-- NBSAP MONITORING SYSTEM — DATA SEED
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ── SEED RISK REGISTER ────────────────────────────────────────
INSERT INTO public.risks (id, description, category, likelihood, impact, level, mitigation, owner) VALUES
  ('R01', 'Ministerial data sharing refusal', 'Institutional', 'Medium', 'High', 'High', 'Engage Cabinet-level data sharing MOU; designate REMA as lead coordinator; escalate to Environment Ministry if refusal persists', 'REMA'),
  ('R02', 'RBIS technical integration failure', 'Technical', 'Low', 'High', 'High', 'Maintain parallel offline data collection templates (Excel); run RBIS on staging environment before live; assign dedicated ICT lead', 'ICT Unit'),
  ('R03', 'Sensitive species data exposed publicly', 'Data Governance', 'Medium', 'High', 'High', 'Apply role-based access control; implement species location fuzzing for threatened taxa; define data classification tiers before RBIS integration', 'REMA / RDB'),
  ('R04', 'District capacity gaps in data collection', 'Capacity', 'High', 'Medium', 'Medium', 'Pre-deploy T02 training in lowest-performing districts; embed REMA field officers in 5 priority districts; mobile-friendly forms for offline entry', 'Districts / REMA'),
  ('R05', 'Biodiversity financing gap widens', 'Financial', 'High', 'Medium', 'Medium', 'Activate T05 finance tracking quarterly; trigger early alert if disbursement falls below 60% of allocation; engage GCF and GEF pipeline', 'MINECOFIN'),
  ('R06', 'Private sector non-compliance with EIA', 'Compliance', 'Medium', 'Medium', 'Medium', 'Enforce T06 annual reporting; link EIA compliance to business licensing renewals; publish sector-level compliance index publicly', 'REMA / RDB'),
  ('R07', 'Community data quality inconsistencies', 'Data Governance', 'High', 'Low', 'Medium', 'Apply sector-level validation before aggregation; cross-check T04 community data against T02 district data; train community monitors via T04 guide', 'District Officers'),
  ('R08', 'Staff turnover in key M&E roles', 'Capacity', 'Medium', 'Medium', 'Medium', 'Embed capacity in institutions not individuals; document all protocols in RBIS; cross-train 2 officers per ministry; maintain knowledge repository', 'REMA HR'),
  ('R09', 'CBD reporting deadline missed', 'Compliance', 'Low', 'High', 'Medium', 'Build 6-month buffer into CBD reporting timeline; assign dedicated CBD focal point; align annual NBSAP reports with CBD submission schedule', 'REMA'),
  ('R10', 'Gender & Local Community data underreported', 'Capacity', 'Medium', 'Medium', 'Low', 'Mandate disaggregated gender data in T02 and T04 forms; include Local Community liaison in community monitoring training; use Indicator 22 as early warning', 'REMA / NGOs'),
  ('R11', 'Invasive species spread unchecked', 'Ecological', 'Medium', 'High', 'High', 'Trigger immediate response protocol if Indicator 17 shows any new invasive; activate community monitoring network (T04) for early detection reporting', 'RDB / Districts'),
  ('R12', 'Research data not integrated into RBIS', 'Data Governance', 'Low', 'Low', 'Low', 'Mandate T07 submissions for all Rwanda-based biodiversity research; create university MOU framework; appoint Research Liaison Officer at REMA', 'REMA / Universities')
ON CONFLICT (id) DO NOTHING;

-- ── SEED NBSAP TARGETS ────────────────────────────────────────
INSERT INTO public.nbsap_targets (id, goal, title, description, baseline, progress) VALUES
  (1,  'A', 'Biodiversity-Inclusive Spatial Planning', 'By 2030, participatory biodiversity-inclusive spatial land use planning and management to ensure biodiversity loss is close to zero.', 'No consolidated information on biodiversity-inclusive spatial planning.', 18),
  (2,  'A', 'Degraded Land Restoration', 'By 2030, increase the area of degraded lands and inland water under restoration by at least 10%.', 'Baseline: 332,861 ha; target 600,000 ha by 2029.', 32),
  (3,  'A', 'Protected Areas Coverage (≥11%)', 'By 2030, conserve and effectively manage at least 11% of terrestrial and inland water areas.', 'Protected areas currently cover 9.1% of Rwanda.', 45),
  (4,  'A', 'Threatened Species & Human-Wildlife Conflict', 'By 2030, enhance conservation measures to improve the conservation status of biodiversity.', 'Limited planning beyond gorilla, chimpanzee, and lion. 501 HWC cases/yr.', 22),
  (5,  'B', 'Sustainable Management of Wild Species', 'By 2030, ensure the sustainable management of wild species and curb illegal harvesting.', 'Fish production in Lake Kivu dropped from 24,199 t (2017) to 16,194 t (2020).', 28),
  (6,  'B', 'Invasive Alien Species Control', 'By 2030, prevent and control invasive alien species and reduce their rate by 50% in PAs.', '47 invasive species identified in Rwanda (2016 REMA Report).', 20),
  (7,  'B', 'Pollution Reduction', 'By 2030, reduce major pollutants to levels not harmful to biodiversity and ecosystem functions.', '103,722 metric tons of NPK fertilizer used in 2023.', 25),
  (8,  'B', 'Climate Change & Nature-Based Solutions', 'By 2030, minimise climate change impacts on biodiversity and build resilience through NbS.', 'Several large-scale NbS projects underway: TREPA, COMBIO, Green Amayaga, VCRP.', 38),
  (9,  'C', 'Sustainable Use of Wild Species & Community Benefits', 'By 2030, ensure sustainable management of wild species to provide socio-economic benefits to communities.', 'Tourism revenue sharing mechanism (TRSP) in place — 10% allocated to communities.', 41),
  (10, 'C', 'Sustainable Agriculture, Aquaculture & Forestry', 'By 2030, improve sustainable management of agriculture, aquaculture, fisheries, and forestry.', 'Plans to develop 22,000 ha under conservation agriculture per PSTA 5.', 44),
  (11, 'C', 'Ecosystem Services & Nature-Based Solutions', 'By 2030, restore, maintain, and enhance ecosystem services and nature contributions to people.', 'TREPA (60,000 ha), Green Amayaga (263,000 ha), VCRP (37,000 ha) underway.', 37),
  (12, 'C', 'Urban Green Spaces', 'By 2030, increase and improve urban green spaces and ensure biodiversity-inclusive urban planning.', 'No comprehensive assessment. NLUDMP targets 20-25% green space by 2050.', 15),
  (13, 'D', 'Access & Benefit Sharing from Genetic Resources', 'By 2030, strengthen legal measures for fair and equitable sharing of genetic resource benefits.', 'No baseline information available for this target.', 12),
  (14, 'D', 'Biodiversity Mainstreaming Across All Sectors', 'By 2030, ensure biodiversity values are integrated into policies across all sectors.', 'Range of biodiversity laws/policies already exist in Rwanda.', 52),
  (15, 'D', 'Business & Financial Biodiversity Disclosure', 'By 2030, large businesses and financial institutions will disclose biodiversity-related risks.', 'Guidelines on sustainability-related disclosure established (No. 040/2024).', 30),
  (16, 'D', 'Sustainable Consumption & Production', 'By 2030, implement strategies to promote sustainable consumption and production.', 'Food waste index: 164 (Kigali), 117 (Musanze) — UNEP 2024.', 20),
  (17, 'D', 'Biosafety & Biotechnology', 'By 2030, strengthen capacity for implementing biosafety measures and sustainable biotechnology.', 'Rwanda has enacted the law governing biosafety.', 42),
  (18, 'D', 'Harmful Incentives Reform & Positive Incentives', 'By 2030, identify harmful incentives and scale up positive incentives for biodiversity.', 'Rwanda initiated a study on subsidies with negative impacts on biodiversity.', 22),
  (19, 'D', 'Biodiversity Finance (USD 500 Million)', 'By 2030, mobilise USD 500 million from all sources for biodiversity in Rwanda.', 'Target based on REMA Strategy (2022–26), GGCRS, and RGF targets.', 18),
  (20, 'D', 'Capacity Building, Technology Transfer & Education', 'By 2030, strengthen capacity-building and scientific cooperation for biodiversity.', 'No baseline or consolidated metrics on capacity-building actions.', 35),
  (21, 'D', 'Biodiversity Information Systems & Data Access', 'By 2030, ensure biodiversity data is readily available, accessible, and utilised.', 'RBIS established as an accessible open-source web platform.', 48),
  (22, 'D', 'Inclusive Participation & Traditional Knowledge', 'By 2030, ensure all stakeholders can participate in biodiversity-related decision-making.', 'Activities related to this indicator exist but no consolidated baseline data.', 10)
ON CONFLICT (id) DO UPDATE SET
  progress = EXCLUDED.progress,
  updated_at = NOW();

-- ── SEED SAMPLE INDICATORS (first 10 of 79) ──────────────────
INSERT INTO public.indicators (name, definition, tier, nbsap_target_id, target_2030, baseline, midterm, final_target, current_value, progress, status, km_gbf, periodicity, data_source, responsible) VALUES
  ('Spatial Plan Biodiversity Coverage (%)', '% of land and water bodies covered by biodiversity-inclusive spatial plans', 'headline', 1, '100% of priority areas covered', 'No consolidated baseline', '50% (2027)', '100% (2030)', '18%', 18, 'behind', 'GBF Target 1', 'Annual', 'District land-use plans, RBIS, NISR', ARRAY['REMA','Ministry of Environment','MINAGRI']),
  ('Spatial Plans Utilising KBA Information (%)', 'Percentage of spatial plans utilising Key Biodiversity Areas information', 'component', 1, '100% of spatial plans', 'No baseline', '50%', '100%', '20%', 20, 'behind', 'GBF Target 1', 'Annual', 'RBIS, District planning offices', ARRAY['REMA','MININFRA']),
  ('Degraded Land & Water Under Restoration (ha)', 'Total area (ha) of degraded lands, wetlands, lakes and rivers under restoration', 'headline', 2, '600,000 ha by 2029', '332,861 ha', '450,000 ha (2027)', '600,000 ha (2029)', '385,000 ha', 32, 'at-risk', 'GBF Target 2', 'Annual', 'Field surveys, Remote sensing, RBIS', ARRAY['REMA','RFA','District Authorities']),
  ('Degraded Wetlands Restored (ha)', 'Areas of degraded wetland ecosystems with high biodiversity importance restored', 'component', 2, 'Significant wetland area restored', 'Minimal', 'Target to be set', 'Target to be set', '12%', 12, 'behind', 'GBF Target 2', 'Annual', 'Field surveys, REMA wetland database', ARRAY['REMA','District Authorities']),
  ('Protected Area Coverage (% of national territory)', 'Area (ha) of land and inland water conserved; coverage of PAs and OECMs', 'headline', 3, '11% of national territory by 2030', '9.1%', '10% (2027)', '11% (2030)', '9.7%', 45, 'on-track', 'GBF Target 3', 'Annual', 'RDB protected area records, REMA databases', ARRAY['RDB','REMA','District Authorities']),
  ('Key Biodiversity Areas Effectively Conserved (ha)', 'Area (ha) of Key Biodiversity Areas effectively conserved', 'component', 3, 'All KBAs under effective conservation', 'Partial', '50% of KBAs', '100% of KBAs', '55%', 55, 'on-track', 'GBF Target 3', 'Annual', 'RDB, REMA KBA records', ARRAY['RDB','REMA']),
  ('Threatened Species Conservation Status (%)', 'Proportion of threatened species effectively conserved to halt or reverse decline', 'headline', 4, '50% improvement in species status', 'Limited planning beyond key species', '20% improvement (2027)', '50% improvement (2030)', '22%', 22, 'behind', 'GBF Target 4', 'Biannual', 'Wildlife census, Ranger patrols, HWC incident reports', ARRAY['RDB','REMA','Conservation NGOs']),
  ('Illegal Harvesting Reduction (%)', 'Proportion of illegal harvesting curbed across agriculture, forests and waters', 'headline', 5, '75% reduction in illegal activities', 'Illegal fishing declining; fish production 16,194 t (2020)', '50% reduction (2027)', '75% reduction (2030)', '28%', 28, 'at-risk', 'GBF Target 5', 'Annual', 'RAB fisheries, RFA forest records, Enforcement reports', ARRAY['MINAGRI','RAB','RFA','REMA']),
  ('Invasive Alien Species Establishment Rate Reduction', 'Number of invasive alien species reduced; rate of establishment reduced by 50% in PAs', 'headline', 6, '50% reduction in IAS establishment rate in PAs by 2030', '47 invasive species identified (2016 REMA Report)', '25% reduction (2027)', '50% reduction in PAs (2030)', '20%', 20, 'behind', 'GBF Target 6', 'Quarterly', 'Field surveys, RBIS, REMA IAS reports', ARRAY['REMA','RDB','RFA','MINAGRI']),
  ('Pollutant Concentration in Environment', 'Concentration of major pollutants from agriculture, industry and mining harmful to biodiversity', 'headline', 7, '50% reduction in pollutant levels', '103,722 MT NPK fertilizer (2023)', '30% reduction (2027)', '50% reduction (2030)', '25%', 25, 'at-risk', 'GBF Target 7', 'Biannual', 'REMA water quality, WASAC monitoring, MINAGRI input records', ARRAY['REMA','MINAGRI','WASAC'])
ON CONFLICT DO NOTHING;

-- ── SEED COMPLIANCE RECORDS ───────────────────────────────────
INSERT INTO public.compliance_records (title, description, severity, district, flagged_at, is_resolved) VALUES
  ('EIA Missing Documentation', 'Environmental Impact Assessment documentation incomplete for Northern Province infrastructure project. Required documents not submitted within regulatory timeframe.', 'High', 'Northern Province', NOW() - INTERVAL '1 day', false),
  ('Late Data Submission', '2 districts (Gakenke, Rulindo) have not submitted Q4 2025 biodiversity monitoring data within the reporting window.', 'Medium', NULL, NOW() - INTERVAL '2 days', false),
  ('Incomplete Indicator Data', 'Fisheries sector submitted partial data for aquaculture sustainability indicators. Key metrics for fish stock assessment missing.', 'Low', NULL, NOW() - INTERVAL '5 days', false),
  ('ABS Documentation Gap', '3 enterprises operating with genetic resources lack required Access & Benefit Sharing documentation.', 'Low', NULL, NOW() - INTERVAL '7 days', false)
ON CONFLICT DO NOTHING;
