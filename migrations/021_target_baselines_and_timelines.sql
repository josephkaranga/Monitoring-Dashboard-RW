-- ============================================================
-- Migration 021: Add timeline_milestones column and update all
-- 22 Rwanda NBSAP 2025–2030 targets with official baseline and
-- timeline/milestone data.
-- ============================================================

ALTER TABLE public.nbsap_targets
  ADD COLUMN IF NOT EXISTS timeline_milestones TEXT;

-- ── Target 1 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$No consolidated information on the status of biodiversity-inclusive spatial planning and management.$$,
  timeline_milestones = $$2025-2030: Baseline assessment (2025); integration into sectoral land-use masterplans (2026-2028); full operationalization and monitoring (2029-2030).$$
WHERE id = 1;

-- ── Target 2 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$The Climate, Environment and Natural Resources Sector Strategic Plan (2024-2029) has a baseline value of 332,861 ha and targets to increase this to 600,000 ha by 2029.$$,
  timeline_milestones = $$2024-2029: Interim restoration target of 600,000 ha; 2030: Final NBSAP target of ≥10% additional restoration beyond baseline. Annual progress reviews aligned with CENR SSP.$$
WHERE id = 2;

-- ── Target 3 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Protected areas cover 9.1% of the country's land area (Rwanda Wildlife Conservation Masterplan 2025-2050). Targets based on estimates from planned and ongoing flagship projects, including VCRP, Ibanda Makera, Kibirizi-Muyira, Nyandungu, Congo Nile Divide, RUDPII, and LDCF 4, among others.$$,
  timeline_milestones = $$2025-2030: Phased expansion via flagship projects; mid-term review (2027); final assessment (2030) against 11% target. Long-term vision extends to 2050 per Wildlife Conservation Masterplan.$$
WHERE id = 3;

-- ── Target 4 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$There is no comprehensive study/data on Human Wildlife Conflict (HWC) in the country. However, a recent scientific study indicated 208 cases in Gishwati, 185 in Mukura and 108 in Mutara (Eastern Savanna-Akagera) in a one-year period (Sun, Bariyanga and Wronski, 2025).$$,
  timeline_milestones = $$2025-2026: Comprehensive HWC baseline study and national IUCN Red List update; 2027-2030: Implementation of species-specific action plans and HWC mitigation measures; annual monitoring of threatened species status.$$
WHERE id = 4;

-- ── Target 5 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Data from RAB shows that fish production in Rwanda's frontiers of the Kivu Lake has dropped from 24,199 tonnes in 2017 to 16,194 tonnes in 2020, and this is attributed to illegal fishing operations (AUDA-NEPAD). Similar illegal activities also occur in the forest sector.$$,
  timeline_milestones = $$2025-2027: Strengthen enforcement protocols and monitoring systems for fisheries and forestry; 2028-2030: Scale-up community-based surveillance and sustainable harvesting guidelines; biannual compliance audits.$$
WHERE id = 5;

-- ── Target 6 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$There are 47 invasive species (plants, fish, and insects) identified in Rwanda (2016 REMA Report). All with various degrees of spread and impacts. Need to focus on invasives in protected areas, given the high priority/importance of these landscapes. There is a need for a comprehensive assessment of the current rate of establishment of invasive species in Rwanda.$$,
  timeline_milestones = $$2025: Update invasive species inventory and risk assessment; 2026-2028: Implement control/eradication programmes in priority protected areas; 2029-2030: Evaluate reduction in establishment rates against 50% target.$$
WHERE id = 6;

-- ── Target 7 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$No specific metrics are available for Rwanda. 103,722 metric tons of inorganic fertiliser (NPK) were used in Rwanda in 2023 (Africa Fertiliser NEPAD report, 2023). Significant rates of leaching and pollution. No comprehensive report with statistics on pollution from mining actions. Specific studies, including sediment fingerprinting in some catchments, e.g., Secoko (IUCN, 2022), show high levels of pollutants originating from small-scale mining operations in the catchment.$$,
  timeline_milestones = $$2025-2026: Establish national pollutant monitoring framework and baseline metrics; 2027-2029: Implement nutrient management plans and mining effluent controls; 2030: Assess reduction against harm thresholds for biodiversity.$$
WHERE id = 7;

-- ── Target 8 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Rwanda has a GGCRS in place in addition to Ireme Invest, green taxonomy and National Climate and Nature Finance Strategy, currently implementing several large-scale projects that partly include NbS. These include: TREPA project (60,000 ha), COMBIO, Green Amayaga (263,000 ha), Volcanoes Community Resilience Project (37,000 ha), Congo-Nile Divide Restoration Project (10,000 ha), Forest Investment Program: Development of Agroforestry for Sustainable Agriculture in Rwanda (25,000 ha); LIVEMP, LAFREC.$$,
  timeline_milestones = $$2025-2027: Scale-up existing NbS projects and integrate climate-biodiversity metrics; 2028-2030: Expand to new vulnerable landscapes; annual resilience assessments aligned with NDC and NAP reporting cycles.$$
WHERE id = 8;

-- ── Target 9 ─────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Rwanda's tourism is anchored on its major national parks, which are key biodiversity areas. The country has a Revenue/benefit sharing mechanism in place (Tourism Revenue Sharing Programme — TRSP) to ensure communities around the parks obtain benefits for socio-economic development while also promoting sustainable management and use of wild species. 10% of the pooled tourism revenue from Volcanoes, Akagera, Nyungwe, Gishwati, and Mukura is allocated to communities located in the areas surrounding the parks.$$,
  timeline_milestones = $$2025-2030: Strengthen TRSP implementation and expand to additional wild species value chains; biennial reviews of benefit-sharing effectiveness and community livelihood outcomes.$$
WHERE id = 9;

-- ── Target 10 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$To enhance land productivity, Rwanda plans, in part, to develop an area under conservation agriculture by 22,000 ha as per PSTA 5. Conservation agriculture is directly linked to biodiversity conservation. Rwanda currently has a 30.4% forest cover. At least 4,900 t/yr fish production (aquaculture) as per the National Aquaculture Strategy for Rwanda (2023-2035).$$,
  timeline_milestones = $$2025-2027: Integrate biodiversity criteria into PSTA 5 and Aquaculture Strategy implementation; 2028-2030: Scale sustainable practices and assess ecosystem health indicators; aligned with sectoral strategic plan cycles.$$
WHERE id = 10;

-- ── Target 11 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$The country is currently implementing several large-scale projects that partly enhance ecosystem service supply. These include TREPA project (60,000 ha), COMBIO, Green Amayaga (263,000 ha), the Volcanoes Community Resilience Project (37,000 ha), the Congo-Nile Divide Restoration Project (10,000 ha), and the Forest Investment Program: Development of Agroforestry for Sustainable Agriculture in Rwanda (25,000 ha).$$,
  timeline_milestones = $$2025-2030: Coordinate NbS projects under unified ecosystem services monitoring framework; mid-term valuation of services (2027); final assessment of human well-being outcomes (2030).$$
WHERE id = 11;

-- ── Target 12 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$There is no comprehensive assessment of existing green spaces in the city and urban centres of Rwanda. The NLUDMP 2020-2050 targets that every city/urban development should provide at least 20-25% of the area for green spaces by 2050.$$,
  timeline_milestones = $$2025-2026: Baseline assessment of urban green spaces; 2027-2029: Implement biodiversity-inclusive urban planning guidelines; 2030: Interim target towards 2050 NLUDMP goal; annual City Biodiversity Index updates.$$
WHERE id = 12;

-- ── Target 13 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$There is no baseline information for this target.$$,
  timeline_milestones = $$2025: Develop baseline inventory of genetic resources and ABS mechanisms; 2026-2028: Strengthen legal frameworks and benefit-sharing protocols; 2029-2030: Operationalise and monitor equitable benefit distribution.$$
WHERE id = 13;

-- ── Target 14 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Rwanda already has a range of laws, policies, regulations and guidelines focusing, in part, on biodiversity conservation (section IV of NBSAP).$$,
  timeline_milestones = $$2025-2030: Mainstreaming roadmap with annual sectoral integration reviews; biennial biodiversity budget tagging assessments; final governance audit (2030).$$
WHERE id = 14;

-- ── Target 15 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Rwanda has established Guidelines No. 040/2024 of 25th November 2024 on the disclosure and reporting of sustainability-related financial information for financial institutions and Guidelines N° 2600/2023-00036 [616] of 29/11/2023 on Climate-Related and Environmental Financial Risks Management for Financial Institutions. The target is that the full implementation of the guidelines be in place by December 2027.$$,
  timeline_milestones = $$2025-2027: Full implementation of financial disclosure guidelines; 2028-2030: Expand requirements to large transnational businesses; annual compliance reporting and capacity building.$$
WHERE id = 15;

-- ── Target 16 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Food waste index for Rwanda is 164 for Kigali and 117 for Musanze (UNEP 2024). No baseline information on material footprint per capita. The average ecological footprint per capita for the country is 0.55 (Global Footprint Network, 2022 data).$$,
  timeline_milestones = $$2025: Establish national SCP baseline and sectoral action plans; 2026-2029: Implement waste reduction, eco-labelling, and circular economy initiatives; 2030: Assess progress against footprint and waste reduction targets.$$
WHERE id = 16;

-- ── Target 17 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Rwanda has enacted the law governing biosafety, and Ministerial orders on permits and the national biosafety committee are in place.$$,
  timeline_milestones = $$2025-2027: Operationalise biosafety guidelines and build technical capacity; 2028-2030: Scale monitoring systems and promote sustainable biotechnology applications; annual biosafety compliance reviews.$$
WHERE id = 17;

-- ── Target 18 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Rwanda has initiated a study on the identification, assessment and redesign of subsidies with negative impacts on biodiversity in Rwanda. Recommendations from this study will guide the implementation of this target.$$,
  timeline_milestones = $$2025: Complete subsidy impact study and develop reform roadmap; 2026-2028: Pilot positive incentive mechanisms (PES, eco-certification); 2029-2030: Scale successful incentives and phase out harmful subsidies.$$
WHERE id = 18;

-- ── Target 19 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$The proposed value is based on the consolidation of targets from key strategic documents, including REMA's Strategy (2022-26), Rwanda's GGCRS, and RGF targets.$$,
  timeline_milestones = $$2025-2027: Operationalise biodiversity finance window under FONERWA and secure initial commitments; 2028-2030: Scale domestic and international resource mobilisation; annual biodiversity expenditure reviews.$$
WHERE id = 19;

-- ── Target 20 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$There are no baseline or consolidated metrics on capacity-building and biodiversity-related technology transfer actions in Rwanda.$$,
  timeline_milestones = $$2025: Establish baseline capacity assessment framework; 2026-2029: Implement targeted training, research partnerships, and technology transfer programmes; 2030: Evaluate capacity gains and knowledge dissemination outcomes.$$
WHERE id = 20;

-- ── Target 21 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$Rwanda has established the Rwanda Biodiversity Information System (RBIS), an accessible web platform using open-source software to support land use planning and monitoring of biodiversity and ecosystem functioning.$$,
  timeline_milestones = $$2025-2027: Enhance RBIS functionality, data standards, and interoperability; 2028-2030: Promote widespread utilisation by decision-makers and public; annual data accessibility and utilisation audits.$$
WHERE id = 21;

-- ── Target 22 ────────────────────────────────────────────────
UPDATE public.nbsap_targets SET
  baseline = $$While there are activities related to this indicator, there is no consolidated baseline data.$$,
  timeline_milestones = $$2025: Develop inclusive participation baseline and guidelines; 2026-2029: Implement targeted engagement mechanisms for underrepresented groups; 2030: Assess participation equity and traditional knowledge integration.$$
WHERE id = 22;
