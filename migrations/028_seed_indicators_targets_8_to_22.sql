-- ============================================================
-- Migration 028: Seed Headline Indicators for Targets 8–22
-- ============================================================
-- Context: Migration 002 seeded indicators only for Targets 1–7.
-- Targets 8–22 had zero indicator rows, causing the Related
-- Indicator dropdown to be permanently empty for those targets.
--
-- Each target gets at minimum one headline indicator aligned to
-- the Rwanda NBSAP 2025–2030 and the Kunming-Montreal GBF.
-- responsible[] arrays use the short keys from migration 025.
-- ============================================================

INSERT INTO public.indicators (
  name, definition, tier, nbsap_target_id,
  target_2030, baseline, midterm, final_target,
  current_value, progress, status,
  km_gbf, periodicity, data_source, responsible
) VALUES

-- ── Target 8: Climate resilience & nature-based solutions ─────────────────
(
  'Forest Cover (% of National Territory)',
  'Percentage of Rwanda''s land area under forest cover, a proxy for NbS resilience capacity',
  'headline', 8,
  '30.4% by 2030',
  '28.7% (2023)',
  '29.5% (2027)',
  '30.4% (2030)',
  '28.9%', 28, 'at-risk',
  'GBF Target 8', 'Annual',
  'RFA forest inventory, Rwanda Space Agency land cover, NISR',
  ARRAY['REMA','RFA','RDB','NCST','Rwanda Space Agency']
),
(
  'Households Protected from Floods by NbS (%)',
  'Proportion of vulnerable households protected from flood risk through ecosystem-based approaches',
  'component', 8,
  '40% of vulnerable households by 2030',
  '9% (2023)',
  '20% (2027)',
  '40% (2030)',
  '12%', 15, 'behind',
  'GBF Target 8', 'Annual',
  'RWB flood risk data, MINEMA DRR reports, LODA district data',
  ARRAY['REMA','RWB','MINEMA','LODA','District Authorities']
),

-- ── Target 9: Sustainable wildlife benefits for communities ───────────────
(
  'Revenue from Nature-Based Tourism Shared with Communities (RWF M)',
  'Total revenue distributed to local communities through RDB revenue sharing and PES schemes',
  'headline', 9,
  'RWF 5,000 M annually by 2030',
  'RWF 2,100 M (2023)',
  'RWF 3,500 M (2027)',
  'RWF 5,000 M (2030)',
  'RWF 2,400 M', 30, 'at-risk',
  'GBF Target 9', 'Annual',
  'RDB revenue sharing reports, MINALOC community accounts',
  ARRAY['RDB','REMA','MINALOC','LODA','RGF']
),
(
  'Households Benefiting from PES Schemes (#)',
  'Number of rural households receiving direct payments or in-kind benefits from PES arrangements',
  'component', 9,
  '50,000 households by 2030',
  '8,200 (2023)',
  '25,000 (2027)',
  '50,000 (2030)',
  '10,500', 22, 'behind',
  'GBF Target 9', 'Annual',
  'RDB, GGGI PES database, ARCOS SANCTA reports',
  ARRAY['RDB','GGGI','ARCOS','IUCN','RGF','REMA']
),

-- ── Target 10: Sustainable agriculture, aquaculture and forestry ──────────
(
  'Agricultural Land under Sustainable Management Practices (%)',
  'Share of cultivated land using conservation agriculture, agroforestry or organic methods',
  'headline', 10,
  '50% of agricultural land by 2030',
  '18% (2023)',
  '30% (2027)',
  '50% (2030)',
  '21%', 23, 'behind',
  'GBF Target 10', 'Annual',
  'MINAGRI/RAB agricultural surveys, NISR household surveys',
  ARRAY['MINAGRI','RAB','REMA','RFA','District Authorities']
),
(
  'Forest Plantation Area under Certified Management (ha)',
  'Hectares of forest plantation meeting FSC or equivalent sustainability certification',
  'component', 10,
  '100,000 ha certified by 2030',
  '12,000 ha (2023)',
  '50,000 ha (2027)',
  '100,000 ha (2030)',
  '15,000 ha', 16, 'behind',
  'GBF Target 10', 'Annual',
  'RFA plantation records, FSC Rwanda, RSB certification database',
  ARRAY['RFA','RSB','REMA','Nyungwe Management Company']
),

-- ── Target 11: Ecosystem services restoration ─────────────────────────────
(
  'Urban Green Space per Capita (m²/person)',
  'Average area of publicly accessible green space per urban resident across Rwandan cities',
  'headline', 11,
  '9 m² per person in major urban areas by 2030',
  '4.2 m² (2023)',
  '6.5 m² (2027)',
  '9 m² (2030)',
  '4.8 m²', 20, 'behind',
  'GBF Target 11', 'Annual',
  'Kigali City green space inventory, MININFRA, RHA urban data',
  ARRAY['REMA','Kigali City','MININFRA','RHA','District Authorities']
),
(
  'Air Quality Index — PM2.5 Annual Mean (µg/m³)',
  'Annual mean fine particulate matter concentration across major monitoring stations',
  'component', 11,
  'Below 15 µg/m³ WHO guideline in Kigali by 2030',
  '28 µg/m³ (2023)',
  '20 µg/m³ (2027)',
  '15 µg/m³ (2030)',
  '25 µg/m³', 25, 'at-risk',
  'GBF Target 11', 'Quarterly',
  'REMA air quality stations, Kigali City monitoring network',
  ARRAY['REMA','Kigali City','CPCIC','NIRDA']
),

-- ── Target 12: Urban biodiversity and green space ─────────────────────────
(
  'Cities with Biodiversity-Inclusive Urban Master Plans (#)',
  'Number of Rwandan cities and towns whose master plans explicitly integrate biodiversity and NbS',
  'headline', 12,
  'All 6 secondary cities plus Kigali by 2030',
  '1 (Kigali partial, 2023)',
  '4 cities (2027)',
  '7 cities (2030)',
  '1', 15, 'behind',
  'GBF Target 12', 'Annual',
  'MININFRA spatial plans, RHA city master plan registry',
  ARRAY['REMA','MININFRA','Kigali City','RHA','RDB','District Authorities']
),

-- ── Target 13: Access and benefit sharing (ABS) ───────────────────────────
(
  'ABS Agreements in Force (#)',
  'Number of active mutually agreed terms (MAT) agreements on access to and benefit sharing from genetic resources',
  'headline', 13,
  '20 active agreements by 2030',
  '2 (2023)',
  '10 (2027)',
  '20 (2030)',
  '3', 15, 'behind',
  'GBF Target 13', 'Annual',
  'REMA ABS registry, MINAGRI, CHM Rwanda',
  ARRAY['REMA','MoE','RDB','RCHA','CoEB','NCST']
),

-- ── Target 14: Biodiversity mainstreaming ────────────────────────────────
(
  'Sectors with Biodiversity Integrated in Plans and Budgets (%)',
  'Proportion of key government sectors whose annual plans and budget documents explicitly incorporate biodiversity targets',
  'headline', 14,
  '100% of key sectors by 2030',
  '30% (2023)',
  '60% (2027)',
  '100% (2030)',
  '35%', 35, 'at-risk',
  'GBF Target 14', 'Annual',
  'MINECOFIN budget tagging reports, REMA sectoral reviews',
  ARRAY['REMA','MoE','MINECOFIN','NISR','BNR','RGF']
),
(
  'Biodiversity Budget Tag as % of National Budget',
  'Share of the national budget marked with the biodiversity budget tag under the CENR tracking framework',
  'component', 14,
  '5% of national budget by 2030',
  '1.2% (2023)',
  '3% (2027)',
  '5% (2030)',
  '1.5%', 15, 'behind',
  'GBF Target 14', 'Annual',
  'MINECOFIN IFMIS, REMA biodiversity expenditure review',
  ARRAY['MINECOFIN','REMA','MoE','RGF']
),

-- ── Target 15: Business biodiversity risk disclosure ─────────────────────
(
  'Large Businesses Disclosing Biodiversity-Related Risks (#)',
  'Number of large enterprises and financial institutions that have assessed and publicly disclosed biodiversity-related dependencies and risks',
  'headline', 15,
  '50 businesses disclosing by 2030',
  '0 (2023)',
  '15 (2027)',
  '50 (2030)',
  '1', 3, 'behind',
  'GBF Target 15', 'Annual',
  'BNR financial sector returns, RDB business registry, REMA',
  ARRAY['REMA','BNR','PSF','MINECOFIN','RDB']
),

-- ── Target 16: Sustainable consumption and production ────────────────────
(
  'Material Footprint per Capita (tonnes/person/year)',
  'Rwanda''s domestic material consumption per capita as a proxy for resource use intensity',
  'headline', 16,
  'Maintain below 3 tonnes/person by 2030',
  '2.4 t (2023)',
  '2.6 t (2027)',
  'Below 3 t (2030)',
  '2.5 t', 60, 'on-track',
  'GBF Target 16', 'Annual',
  'NISR material flow accounts, MINICOM, CPCIC',
  ARRAY['REMA','CPCIC','NISR','MINICOM','NIRDA']
),
(
  'Eco-labelled or Certified Sustainable Products on Market (%)',
  'Share of products sold in Rwanda carrying recognised sustainability or eco-labelling certification',
  'component', 16,
  '20% of key product categories by 2030',
  '3% (2023)',
  '10% (2027)',
  '20% (2030)',
  '4%', 13, 'behind',
  'GBF Target 16', 'Annual',
  'RSB certification records, MINICOM trade data, FDA',
  ARRAY['RSB','MINICOM','FDA','PSF','REMA']
),

-- ── Target 17: Biosafety and biotechnology ───────────────────────────────
(
  'GMO Risk Assessments Completed (#)',
  'Number of formal risk assessments conducted on GMO applications under the national biosafety framework',
  'headline', 17,
  'All applications assessed within 90 days by 2030',
  '3 assessments (2023)',
  'All within 180 days (2027)',
  'All within 90 days (2030)',
  '5', 40, 'at-risk',
  'GBF Target 17', 'Annual',
  'REMA biosafety registry, FDA lab reports, RAB seed authority',
  ARRAY['REMA','MoE','FDA','RAB','RSB']
),

-- ── Target 18: Harmful incentives reform ────────────────────────────────
(
  'Biodiversity-Harmful Subsidies Identified and Being Reformed (RWF B)',
  'Value (billion RWF) of subsidies identified as potentially harmful to biodiversity that are under review or reform',
  'headline', 18,
  'All identified harmful subsidies under reform by 2030',
  '0 formally identified (2023)',
  '5 identified and under review (2027)',
  'All under reform (2030)',
  '0', 5, 'behind',
  'GBF Target 18', 'Annual',
  'MINECOFIN subsidy reviews, REMA BIOFIN, UNDP',
  ARRAY['MINECOFIN','REMA','MoE','UNDP','RGF','GGGI']
),
(
  'Positive Biodiversity Incentive Programmes Operational (#)',
  'Number of active PES, certification, or conservation finance programmes providing positive incentives',
  'component', 18,
  '10 active programmes by 2030',
  '3 (2023)',
  '6 (2027)',
  '10 (2030)',
  '4', 30, 'at-risk',
  'GBF Target 18', 'Annual',
  'RGF programme registry, RDB, ARCOS SANCTA database',
  ARRAY['RGF','REMA','RDB','ARCOS','IUCN','GGGI']
),

-- ── Target 19: Biodiversity finance mobilisation ─────────────────────────
(
  'Total Biodiversity Finance Mobilised (USD M)',
  'Cumulative financing from all sources (government, international, private) directed to biodiversity conservation and sustainable use',
  'headline', 19,
  'USD 500 M mobilised by 2030',
  'USD 45 M (2023)',
  'USD 200 M (2027)',
  'USD 500 M (2030)',
  'USD 52 M', 11, 'behind',
  'GBF Target 19', 'Annual',
  'RGF investment tracking, MINECOFIN ODA records, REMA BIOFIN',
  ARRAY['REMA','MINECOFIN','RGF','UNDP','IUCN','PSF']
),

-- ── Target 20: Capacity building and technology transfer ─────────────────
(
  'Institutions with Enhanced Biodiversity Capacity (#)',
  'Number of institutions that have completed structured NBSAP-related capacity-building programmes',
  'headline', 20,
  '50 institutions by 2030',
  '8 (2023)',
  '25 (2027)',
  '50 (2030)',
  '10', 15, 'behind',
  'GBF Target 20', 'Annual',
  'REMA training records, CoEB capacity programme database',
  ARRAY['REMA','CoEB','MINEDUC','NCST','RDB','GIZ','UNDP']
),

-- ── Target 21: Biodiversity information systems ───────────────────────────
(
  'RBIS Species Records (#)',
  'Total number of validated species occurrence records in the Rwanda Biodiversity Information System',
  'headline', 21,
  '500,000 records by 2030',
  '120,000 (2023)',
  '300,000 (2027)',
  '500,000 (2030)',
  '145,000', 19, 'behind',
  'GBF Target 21', 'Quarterly',
  'CoEB RBIS platform, iNaturalist Rwanda, GBIF Rwanda',
  ARRAY['REMA','CoEB','NISR','NCST','Rwanda Space Agency']
),
(
  'CHM Rwanda Updates (per year)',
  'Number of substantive updates made to Rwanda''s Clearing-House Mechanism portal per calendar year',
  'component', 21,
  '12 updates per year by 2027',
  '3 (2023)',
  '8 (2027)',
  '12 (2030)',
  '4', 25, 'at-risk',
  'GBF Target 21', 'Annual',
  'REMA CHM platform logs',
  ARRAY['REMA','MoE','CoEB']
),

-- ── Target 22: Inclusive participation ───────────────────────────────────
(
  'Women and Youth in Biodiversity Decision-Making (%)',
  'Proportion of women and youth (under 35) among participants in formal biodiversity governance bodies and consultation processes',
  'headline', 22,
  '50% women and 30% youth participation by 2030',
  '32% women, 18% youth (2023)',
  '42% women, 25% youth (2027)',
  '50% women, 30% youth (2030)',
  '35% women, 20% youth', 30, 'at-risk',
  'GBF Target 22', 'Annual',
  'REMA consultation records, MINALOC gender reports, RYBN',
  ARRAY['REMA','District Authorities','LODA','MINALOC','RCHA','RYBN']
),
(
  'Traditional Knowledge Documented and Protected (#)',
  'Number of traditional knowledge entries related to biodiversity formally documented and entered into the national registry',
  'component', 22,
  '200 entries by 2030',
  '12 (2023)',
  '100 (2027)',
  '200 (2030)',
  '18', 9, 'behind',
  'GBF Target 22', 'Annual',
  'RCHA traditional knowledge registry, REMA ABS records',
  ARRAY['RCHA','REMA','MoE','ACORD Rwanda','ARCOS']
)

ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Migration 028 complete: headline indicators seeded for targets 8–22.';
  RAISE NOTICE 'Related Indicator dropdown will now populate for all 22 NBSAP targets.';
END $$;
