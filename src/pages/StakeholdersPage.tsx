import React, { useState, useMemo } from 'react';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

interface StrategicAction {
  action: string;
  institutions: string[];
  dataSources: string[];
}

interface TargetMapping {
  id: number;
  goal: string;
  title: string;
  actions: StrategicAction[];
}

// Institution → reporting module mapping (mirrors ReportingToolkitPage)
const INSTITUTION_MODULES: Record<string, string[]> = {
  'REMA': ['T01','T02','T03','T06'], 'MoE': ['T01','T05'], 'MINAGRI': ['T01','T02'], 'RFA': ['T01','T02','T03'],
  'RDB': ['T01','T03','T05','T06'], 'NLA': ['T01'], 'RWB': ['T01','T02'], 'RAB': ['T01','T02','T07'],
  'District Authorities': ['T02','T04'], 'ARCOS': ['T02','T03','T04','T07'], 'Nature Rwanda': ['T02','T03','T04','T07'],
  'CoEB': ['T03','T07'], 'RWCA': ['T03','T04','T07'], 'RECOR': ['T02','T04','T07'], 'IUCN': ['T03','T05','T07'],
  'African Parks': ['T03'], 'Prime Biodiversity Conservation': ['T02','T03','T04','T07'], 'ARECO': ['T02','T04'],
  'Partners for Conservation': ['T04','T07'], 'Forest of Hope Association': ['T02','T04'], 'IGCP': ['T03','T07'],
  'Karisoke': ['T03','T07'], 'AWF': ['T03','T05'], 'WCS': ['T03','T07'], 'One Tree Planted': ['T02'],
  'One Acre Fund': ['T02','T04'], 'ICRAF': ['T02','T07'], 'Bridge to Rwanda': ['T02','T04'], 'ROAM': ['T02'],
  'GIZ': ['T05','T07'], 'SNV': ['T05'], 'GGGI': ['T05','T07'], 'WRI': ['T05','T07'], 'FAO': ['T01','T05'],
  'UNDP': ['T05'], 'RGF': ['T05'], 'MINECOFIN': ['T01','T05'], 'NISR': ['T01'], 'BNR': ['T01'],
  'MININFRA': ['T01','T06'], 'MINICOM': ['T01','T06'], 'MINALOC': ['T01','T04'], 'MINEDUC': ['T01'],
  'MINEMA': ['T01'], 'RMB': ['T01','T06'], 'CPCIC': ['T01','T06'], 'NIRDA': ['T01','T07'],
  'RICA': ['T01','T06'], 'RSB': ['T01'], 'RRA': ['T01'], 'FDA': ['T01','T06'], 'NCST': ['T01','T07'],
  'Rwanda Space Agency': ['T07'], 'NAEB': ['T01','T06'], 'RURA': ['T01'], 'WASAC': ['T01'],
  'Meteo Rwanda': ['T01','T07'], 'LODA': ['T04','T05'], 'National Police (Marine)': ['T01'], 'SGF': ['T01','T04'],
  'RHA': ['T01'], 'Kigali City': ['T01','T02'], 'PSF': ['T06'], 'REG': ['T06'], 'RPPA': ['T01'],
  'RCHA': ['T07'], 'Eco-planet Bamboo': ['T02','T06'], 'ACORD Rwanda': ['T04','T05'], 'WCSS': ['T04','T07'],
  'PFC': ['T04'], 'Ultimate Forest': ['T02','T06'], 'Nyungwe Management Company': ['T03'],
  'ARDI': ['T02','T04'], 'Rwanda Mountain Tea': ['T06'], 'RYBN': ['T04'], 'ADRRES': ['T04'],
  'LWD': ['T04','T05'], 'ESS OIL': ['T06'], 'IKIREZI': ['T06'],
};

const MODULE_NAMES: Record<string, { name: string; color: string }> = {
  'T01': { name: 'Institutional Reporting', color: '#1B6CA8' },
  'T02': { name: 'District Monitoring', color: '#1E7D4B' },
  'T03': { name: 'Protected Areas', color: '#5B3FA6' },
  'T04': { name: 'Community Monitoring', color: '#B56A00' },
  'T05': { name: 'Finance Tracking', color: '#0E6655' },
  'T06': { name: 'Private Sector Compliance', color: '#922B21' },
  'T07': { name: 'Research & Academic', color: '#1A5276' },
};

const goalColors: Record<string, { bg: string; color: string; accent: string }> = {
  A: { bg: '#f0fdf4', color: '#166534', accent: '#16a34a' },
  B: { bg: '#eff6ff', color: '#1e40af', accent: '#2563eb' },
  C: { bg: '#fffbeb', color: '#92400e', accent: '#d97706' },
  D: { bg: '#fdf2f8', color: '#be185d', accent: '#db2777' },
};

const TARGETS: TargetMapping[] = [
  {
    id: 1, goal: 'A',
    title: 'Biodiversity-inclusive spatial land use planning and management',
    actions: [
      { action: 'Mainstream biodiversity into the Agriculture Land-use Masterplan (LUMP)', institutions: ['NLA', 'MINAGRI', 'NISR', 'ARCOS', 'RFA', 'RWB'], dataSources: ['NSDI', 'Agriculture Land-use Masterplan', 'PSTA 5', 'Annual Reports'] },
      { action: 'Establish baseline information on biodiversity-inclusive spatial planning under the 7th National Report to the CBD', institutions: ['NLA', 'CoEB'], dataSources: ['National land use master plan', 'RBIS (Ecosystem mapping)'] },
      { action: 'Ensure biodiversity consideration within regulations for land lease and EIA process', institutions: ['MoE', 'REMA', 'RDB', 'NLA'], dataSources: ['Land lease', 'EIA', 'Biodiversity inclusive ESIA'] },
      { action: 'Develop spatial plans integrating conservation of Key Biodiversity and Bird Areas (KBAs)', institutions: ['Prime Biodiversity Conservation', 'Nature Rwanda', 'RDB', 'RFA', 'WCSS', 'RWCA', 'ARCOS', 'PFC', 'NLA'], dataSources: ['National IBA report', 'Wildlife conservation master plan', 'Congo Nile Divide', 'NSDI'] },
      { action: 'Integrate migratory flyway conservation into national land-use planning', institutions: ['Nature Rwanda', 'REMA', 'CoEB', 'RWCA'], dataSources: ['Global flyway datazone', 'CMS focal point', 'RBIS', 'Movebank'] },
      { action: 'Assess integration of biodiversity in SEAs and ESIAs', institutions: ['REMA', 'RDB'], dataSources: ['Environmental Audits & Inspections'] },
      { action: 'Integrate biodiversity considerations into land-use planning', institutions: ['MININFRA', 'MINICOM', 'MINAGRI', 'RFA', 'RWB', 'RMB'], dataSources: ['Infrastructure development policies & guidelines', 'Special economic zones'] },
      { action: 'Establish a land use monitoring framework for protecting high-biodiversity areas', institutions: ['MoE', 'RDB', 'NLA', 'REMA'], dataSources: ['NBSAP Monitoring dashboard'] },
    ],
  },
  {
    id: 2, goal: 'A',
    title: 'Increase area of degraded lands and inland water under restoration by at least 10%',
    actions: [
      { action: 'Develop and implement a single long-term management strategy for wetlands, remnant forests and other ecosystems', institutions: ['REMA', 'MoE', 'MINAGRI', 'RFA', 'ARCOS', 'IUCN', 'CoEB', 'RDB'], dataSources: ['Kigali Wetlands master plan', 'Irrigation master plan', 'COMBIO Project', 'Wildlife conservation master plan'] },
      { action: 'Identify and restore degraded land using native species', institutions: ['CoEB', 'ARCOS', 'Nature Rwanda', 'RMB', 'RWCA', 'RECOR', 'RFA', 'CPCIC'], dataSources: ['Right trees in right place', 'ARCOS annual reports', 'Restoration reports'] },
      { action: 'Foster ecosystem rehabilitation through community-based approaches', institutions: ['Nature Rwanda', 'ARECO', 'REMA', 'RWB', 'ARCOS', 'IUCN', 'MoE', 'RFA'], dataSources: ['LDCF reports', 'VCRP', 'CND', 'NBFA', 'TREPA'] },
      { action: 'Establish partnership programmes for private sector in biodiversity conservation', institutions: ['RDB', 'RGF'], dataSources: ['Conservation bonds', 'PPPs', 'Concessions'] },
      { action: 'Strengthen wetland management through sustainable eco-parks', institutions: ['RDB', 'REMA', 'RWCA'], dataSources: ['Nyandungu Ecopark reports', 'Umusambi Village Annual reports'] },
      { action: 'Restore degraded landscapes through erosion control, agroforestry, afforestation', institutions: ['Nature Rwanda', 'ARECO', 'REMA', 'RWB', 'ARCOS', 'IUCN', 'MoE', 'RFA', 'RECOR', 'RGF', 'RAB', 'RWCA'], dataSources: ['Green Amayaga', 'GEF8', 'LDCF reports', 'VCRP', 'CND', 'TREPA', 'COMBIO'] },
    ],
  },
  {
    id: 3, goal: 'A',
    title: 'Conserve and effectively manage at least 11% of terrestrial and inland water areas',
    actions: [
      { action: 'Sustain existing protected areas with a focus on biodiversity hotspots', institutions: ['RDB', 'AWF', 'CoEB', 'RWCA'], dataSources: ['Park reports', 'Annual reports', 'Scientific publications'] },
      { action: 'Promote sustainable practices within and around protected areas with community participation', institutions: ['RDB', 'NGOs working with RDB'], dataSources: ['Revenue sharing reports', 'Park Management Plans'] },
      { action: 'Maintain restored ecosystems under protection', institutions: ['RDB', 'ARCOS', 'Nature Rwanda', 'CoEB', 'RWCA', 'RECOR', 'RFA', 'IUCN', 'Prime Biodiversity Conservation', 'African Parks', 'Forest of Hope Association'], dataSources: ['ARCOS annual reports', 'Nature Rwanda reports', 'IUCN Green List'] },
      { action: 'Empower local communities to sustainably manage land and water ecosystems', institutions: ['RDB', 'NGOs working with RDB'], dataSources: ['Revenue sharing reports', 'NGO Reports'] },
    ],
  },
  {
    id: 4, goal: 'A',
    title: 'Enhance conservation measures, halt extinction of threatened species, manage human-wildlife conflict',
    actions: [
      { action: 'Adopt best restoration practices for native threatened species', institutions: ['RDB', 'REMA', 'ARCOS', 'Nature Rwanda', 'CoEB', 'RWCA', 'RECOR', 'RFA', 'IUCN', 'Prime Biodiversity Conservation', 'African Parks'], dataSources: ['ARCOS annual reports', 'Nature Rwanda reports', 'PBC Project Reports'] },
      { action: 'Undertake National IUCN Red Listing under 7th Report to CBD', institutions: ['IUCN', 'REMA', 'CoEB'], dataSources: ['Scientific Reports'] },
      { action: 'Assess conservation status of all wetlands', institutions: ['REMA', 'ARCOS', 'CoEB', 'Nature Rwanda', 'RWCA'], dataSources: ['Assessment Reports', 'IBA Status Report', 'Waterbirds monitoring report'] },
      { action: 'Develop strategies to reduce and manage human-wildlife conflict', institutions: ['RDB', 'MINALOC', 'Special Guaranty Fund (SGF)', 'RWCA'], dataSources: ['Districts Reports', 'SGF Reports', 'Project Reports'] },
      { action: 'Promote biodiversity monitoring of threatened species and habitats', institutions: ['REMA', 'CoEB', 'RDB', 'Nature Rwanda', 'RWCA'], dataSources: ['Annual Reports', 'Scientific Publications', 'Legacy Tree Project'] },
      { action: 'Develop national guidelines for genetic resources conservation (Ex Situ and In Situ)', institutions: ['REMA', 'RDB', 'RAB', 'RFA', 'ICRAF', 'Rwanda Cultural Heritage Academy'], dataSources: ['Scientific publications', 'Guidelines/protocols'] },
    ],
  },
  {
    id: 5, goal: 'A',
    title: 'Ensure sustainable management of wild species and curb illegal harvesting',
    actions: [
      { action: 'Develop guidelines for sustainable management of biodiversity in agriculture and aquaculture', institutions: ['RFA', 'RAB', 'REMA'], dataSources: ['Guidelines for trees and forest plantations'] },
      { action: 'Promote technology for aquaculture to maintain native species', institutions: ['MINAGRI', 'RAB', 'RWB'], dataSources: ['National Aquaculture Strategy 2023-2035', 'Fishing ministerial order'] },
      { action: 'Support establishment of aquaparks', institutions: ['MINAGRI', 'RAB', 'RWB', 'REMA', 'RDB'], dataSources: ['Established Aquaparks'] },
      { action: 'Enhance knowledge and skills of fishers in sustainable fishing practices', institutions: ['MINAGRI', 'RAB', 'RWB', 'UR Nyagatare', 'RP Karongi', 'ARCOS'], dataSources: ['Training Materials', 'Living lakes Biodiversity reports'] },
      { action: 'Enhance compliance and enforcement through monitoring and inspections', institutions: ['REMA', 'RAB', 'National Police (Marine)'], dataSources: ['Inspection Reports', 'Awareness Campaign reports'] },
    ],
  },
  {
    id: 6, goal: 'A',
    title: 'Prevent and control invasive alien species, reduce establishment rate in protected areas',
    actions: [
      { action: 'Develop national strategies and regulations on IAS prevention, control and management', institutions: ['REMA', 'MoE', 'RFA', 'ARCOS', 'African Parks', 'IGCP', 'Karisoke', 'RDB'], dataSources: ['Guidelines and annual reports', 'VCRP reports', 'COMBIO', 'CND'] },
      { action: 'Update the IAS assessment report for Rwanda', institutions: ['MoE', 'REMA'], dataSources: ['To be conducted'] },
      { action: 'Strengthen surveillance, monitoring and management strategies on IAS', institutions: ['CoEB', 'MoE', 'REMA', 'RFA', 'ARCOS', 'African Parks', 'IGCP', 'Karisoke', 'RDB', 'RICA', 'RAB'], dataSources: ['RBIS & Monitoring reports', 'COMBIO', 'CND', 'SUNCASA'] },
      { action: 'Strengthen biosecurity measures at entry points', institutions: ['RICA', 'RAB', 'REMA', 'RSB', 'RRA', 'MINICOM', 'Rwanda Civil Aviation', 'FDA', 'PSF'], dataSources: ['Annual reports', 'Guidelines'] },
      { action: 'Implement IAS control and eradication programmes in protected areas', institutions: ['REMA', 'MoE', 'RFA', 'ARCOS', 'African Parks', 'IGCP', 'Karisoke', 'RDB', 'RAB', 'RWB', 'Prime Biodiversity'], dataSources: ['Annual reports', 'Project reports'] },
    ],
  },
  {
    id: 7, goal: 'A',
    title: 'Reduce major pollutants from agriculture, industry and mining to safe levels',
    actions: [
      { action: 'Promote the use of organic fertilisers to enhance soil health', institutions: ['ROAM', 'RAB', 'Bridge to Rwanda', 'REMA', 'RSB', 'RICA', 'CPCIC', 'NAEB', 'ARCOS', 'Nature Rwanda', 'FAO', 'GIZ', 'RWB', 'RURA', 'WASAC'], dataSources: ['Annual reports', 'Studies', 'Licensing data'] },
      { action: 'Develop mine drainage and leaching of contaminant plan', institutions: ['RMB', 'RWB'], dataSources: ['RMB Guidelines', 'Water permits'] },
      { action: 'Establish mechanism for data gathering on major pollutants', institutions: ['REMA'], dataSources: ['Reports and project reports'] },
      { action: 'Reduce chemical runoff and promote biodiversity conservation in agricultural lands', institutions: ['REMA', 'RWB', 'PSF', 'CPCIC', 'NIRDA', 'CoEB', 'UR/CST', 'RAB', 'RICA', 'NAEB', 'ROAM'], dataSources: ['Inspection reports'] },
      { action: 'Promote integrated pest management (IPM)', institutions: ['RICA', 'RAB', 'MINAGRI', 'FAO', 'One Acre Fund', 'Bridge to Rwanda'], dataSources: ['Reports'] },
      { action: 'Empower communities in management of chemical and hazardous waste', institutions: ['ARECO', 'FAO', 'CPCIC', 'REMA', 'MoE'], dataSources: ['Inventory Report (HHPs)', 'Reports'] },
    ],
  },
  {
    id: 8, goal: 'A',
    title: 'Minimise climate change impacts on biodiversity through nature-based solutions',
    actions: [
      { action: 'Maintain and expand forest cover to more than 30.4% of territory', institutions: ['RDB', 'REMA', 'ARCOS', 'Nature Rwanda', 'CoEB', 'RWCA', 'RECOR', 'RFA', 'RWB', 'IUCN', 'Prime Biodiversity Conservation', 'African Parks', 'Forest of Hope Association', 'One Tree Planted'], dataSources: ['ARCOS annual reports', 'Nature Rwanda reports', 'REMA restoration program', 'RFA Annual Reports'] },
      { action: 'Implement mitigation measures to reduce GHG emissions', institutions: ['REMA'], dataSources: ['NDC Reports'] },
      { action: 'Enhance nature-based solutions such as ecosystem-based adaptation (EbA)', institutions: ['RDB', 'REMA', 'ARCOS', 'Nature Rwanda', 'CoEB', 'RWCA', 'RECOR', 'RFA', 'RWB', 'IUCN', 'ARECO'], dataSources: ['ARCOS annual reports', 'Nature Rwanda reports', 'PBC Project Reports'] },
      { action: 'Improve monitoring and reporting systems to track climate change impacts on biodiversity', institutions: ['REMA', 'METEO Rwanda', 'NCST', 'CoEB', 'Rwanda Space Agency', 'IUCN', 'MINECOFIN', 'BNR'], dataSources: ['Studies on climate change & biodiversity', 'Monitoring reports', 'Restoration barometer'] },
      { action: 'Enhance conservation efforts in buffer zones', institutions: ['RDB', 'RFA', 'REMA', 'Ultimate Forest', 'Rwanda Space Agency', 'African Parks', 'WCS', 'AWF'], dataSources: ['Reports', 'FMES'] },
    ],
  },
  {
    id: 9, goal: 'B',
    title: 'Ensure sustainable management and use of wild species for socio-economic benefits',
    actions: [
      { action: 'Strengthen collaboration for sustainable use of medicinal plants', institutions: ['RDB', 'RCHA', 'NIRDA', 'CoEB', 'MoH', 'FDA'], dataSources: ['Revenue sharing reports', 'NGO Reports', 'Research reports'] },
      { action: 'Integrate new genetic varieties to strengthen biodiversity and ecosystem resilience', institutions: ['RDB', 'REMA', 'RFA', 'Higher learning institutions', 'ICRAF', 'IUCN'], dataSources: ['Reports'] },
      { action: 'Establish frameworks for equitable benefit sharing from national park licences and PES', institutions: ['RDB', 'RWB', 'REMA', 'MoE', 'WRI', 'GGGI', 'IUCN', 'RFA', 'ARCOS', 'RGF', 'MINALOC', 'LODA'], dataSources: ['Revenue sharing reports', 'PES Reports', 'Umusave Fund', 'COMBIO Project Reports'] },
      { action: 'Promote alternative livelihoods (ecotourism, agroforestry)', institutions: ['REMA', 'MINALOC', 'MINECOFIN', 'RDB', 'RGF', 'Prime Biodiversity Conservation', 'Nature Rwanda', 'ARECO', 'ARCOS', 'Partners for Conservation', 'RFA', 'IUCN', 'ICRAF', 'One Acre Fund', 'GIZ', 'NIRDA', 'RWCA'], dataSources: ['Project reports', 'System Imibereho Database', 'RDB Business Registry'] },
    ],
  },
  {
    id: 10, goal: 'B',
    title: 'Improve sustainable management of agriculture, aquaculture, fisheries and forestry areas',
    actions: [
      { action: 'Implement circular economy models for aquaponics', institutions: ['RAB', 'NAEB', 'Private sector'], dataSources: ['Reports'] },
      { action: 'Promote apiculture in appropriate bee reserves', institutions: ['RAB', 'ARDI', 'African Parks', 'RFA', 'Nature Rwanda', 'Rwanda Mountain Tea', 'PSF', 'ICRAF'], dataSources: ['Reports'] },
      { action: 'Expand area under agro-ecology, conservation agriculture and regenerative agriculture', institutions: ['MINAGRI', 'RAB', 'RICA University', 'GGGI', 'CPCIC', 'Prime Biodiversity Conservation', 'REMA', 'ARECO', 'Bridge to Rwanda', 'ROAM', 'RECOR', 'SNV', 'ACORD Rwanda'], dataSources: ['CA Reports', 'RICA Strategic plans', 'GGI Reports', 'PBC Project reports'] },
      { action: 'Enhance law enforcement for forest protection and urban forest management plan', institutions: ['RDB', 'African Parks', 'RFA', 'Nyungwe Management Company', 'ARCOS', 'Partners for Conservation', 'IUCN', 'Districts', 'NLA', 'REMA'], dataSources: ['Reports', 'Guidelines for urban forests', 'SUNCASA', 'Management Plans'] },
      { action: 'Assessment and Gap Analysis for Forest Management Certification', institutions: ['RFA', 'MoE', 'Forest Stewardship Council', 'RSB', 'Ultimate Forest Company'], dataSources: ['Inspection Reports'] },
      { action: 'Assess degraded agricultural and forest land and propose restoration measures', institutions: ['RWB', 'IUCN', 'RAB', 'CoEB', 'RFA', 'NLA', 'REMA', 'Rwanda Space Agency'], dataSources: ['CROM-DSS', 'SLM-MRV', 'FMES data', 'LDN Reports', 'State of environment Report'] },
    ],
  },
  {
    id: 11, goal: 'B',
    title: 'Restore, maintain and enhance ecosystem services through nature-based solutions',
    actions: [
      { action: 'Strengthen and expand air pollution monitoring stations', institutions: ['REMA'], dataSources: ['Reports'] },
      { action: 'Promote behavioral shifts towards low-emission practices', institutions: ['MININFRA', 'Kigali City', 'RWCA', 'ARCOS', 'RGF', 'REG', 'IUCN', 'SNV', 'GIZ', 'ARECO', 'Partners for Conservation', 'RECOR'], dataSources: ['Reports', 'Car free zones/days'] },
      { action: 'Enforce measures for reducing emissions from industry and motorised vehicles', institutions: ['CPCIC', 'NIRDA', 'REMA', 'MININFRA', 'Kigali City', 'Police', 'RURA'], dataSources: ['Reports'] },
      { action: 'Improve ecosystem services in urban areas through sustainable urban planning with NBS', institutions: ['NLA', 'Nature Rwanda', 'IUCN', 'WRI', 'GIZ', 'RHA', 'Kigali City', 'ARCOS', 'RWB', 'GGGI', 'REMA'], dataSources: ['Reports & Land use plan', 'Global NBS Standards', 'Storm Water management master plan'] },
      { action: 'Promote WASH through greening school initiatives', institutions: ['RYBN', 'ADRRES', 'ARCOS', 'MINEDUC', 'REMA', 'RDB'], dataSources: ['Greening Schools Project Report', 'Nkuranenigiti program report'] },
    ],
  },
  {
    id: 12, goal: 'B',
    title: 'Increase and improve urban green spaces with biodiversity-inclusive urban planning',
    actions: [
      { action: 'Conduct baseline assessment of urban green spaces', institutions: ['REMA', 'UR', 'RHA', 'Kigali City'], dataSources: ['Reports', 'Publications', 'Strategic plans'] },
      { action: 'Develop and implement NBS plans for cities and towns', institutions: ['REMA', 'RHA', 'Kigali City'], dataSources: ['Reports', 'Strategic plans'] },
      { action: 'Promote biodiversity conservation within urban green spaces using native species', institutions: ['REMA', 'RHA', 'Kigali City', 'Partners for Conservation', 'Nature Rwanda', 'Prime Biodiversity Conservation', 'RFA', 'ARCOS'], dataSources: ['Reports', 'Strategic plans', 'Guidelines'] },
    ],
  },
  {
    id: 13, goal: 'C',
    title: 'Strengthen legal measures for fair and equitable sharing of genetic resources benefits',
    actions: [
      { action: 'Develop baseline of benefits arising from utilisation of genetic resources', institutions: ['RDB', 'REMA', 'NCST', 'Private sector'], dataSources: ['Baseline reports', 'ABS Guidelines and Toolkit'] },
      { action: 'Facilitate access and transfer of crop genetic materials', institutions: ['MINAGRI', 'RICA', 'RAB', 'National Seed Association of Rwanda'], dataSources: ['Reports & regulations', 'Law governing crop production'] },
      { action: 'Develop guidelines and permit systems for fair and equitable ABS', institutions: ['REMA', 'MoE', 'RDB'], dataSources: ['Guidelines and reports'] },
      { action: 'Protect and promote traditional knowledge associated with genetic resources', institutions: ['REMA', 'Rwanda Cultural Heritage Academy'], dataSources: ['Annual reports & publications'] },
    ],
  },
  {
    id: 14, goal: 'D',
    title: 'Integrate biodiversity values into policies, laws, regulations and decision-making',
    actions: [
      { action: 'Strengthen budget tagging and budget statement for CENR with biodiversity section', institutions: ['MoE', 'RGF', 'MINECOFIN', 'REMA'], dataSources: ['Budget tagging reports', 'Biodiversity expenditure review'] },
      { action: 'Integrate biodiversity values into national development plans and national accounting', institutions: ['REMA', 'MoE', 'MINECOFIN', 'RGF', 'BNR'], dataSources: ['Sectoral policies', 'NST2&3', 'Vision 2050'] },
      { action: 'Integrate biodiversity considerations in district annual plans and performance contracts', institutions: ['REMA', 'MoE'], dataSources: ['Annual planning process'] },
      { action: 'Mainstream biodiversity into ESIA guidelines', institutions: ['REMA'], dataSources: ['Biodiversity inclusive ESIA Guidelines'] },
      { action: 'Develop Environmental-Economic Accounting (SEEA)', institutions: ['REMA', 'MINECOFIN', 'NISR'], dataSources: ['SEEA Standards National Accounts'] },
    ],
  },
  {
    id: 15, goal: 'D',
    title: 'Large businesses and financial institutions to assess, disclose and reduce biodiversity risks',
    actions: [
      { action: 'Develop baseline through nature-related financial disclosure readiness study', institutions: ['REMA'], dataSources: ['BIOFIN Report'] },
      { action: 'Update legal frameworks requiring businesses to disclose nature-related risks', institutions: ['MoE', 'RDB', 'REMA', 'MINECOFIN'], dataSources: ['Reports'] },
      { action: 'Build institutional capacity for nature-related financial disclosures', institutions: ['MoE', 'RDB', 'REMA', 'MINECOFIN'], dataSources: ['Reports'] },
    ],
  },
  {
    id: 16, goal: 'D',
    title: 'Promote sustainable consumption and production across all sectors',
    actions: [
      { action: 'Identify strategies and guidelines for sustainable consumption and production', institutions: ['CPCIC', 'NIRDA', 'MINICOM', 'REMA', 'MININFRA'], dataSources: ['Reports & studies'] },
      { action: 'Increase public awareness on sustainable consumption', institutions: ['CPCIC', 'NIRDA', 'MINICOM', 'REMA', 'CSOs', 'Higher learning institutions', 'Media', 'ILO', 'MINAGRI'], dataSources: ['Reports'] },
      { action: 'Promote eco-labelling and certification for sustainable products', institutions: ['RSB', 'Private sector', 'FDA Rwanda', 'Forest Stewardship Council'], dataSources: ['Reports'] },
      { action: 'Promote circular economy across all sectors', institutions: ['REMA', 'CPCIC', 'MoE', 'ARCOS', 'RURA', 'GGGI'], dataSources: ['National Circular Economy Action Plan', 'Reports'] },
    ],
  },
  {
    id: 17, goal: 'D',
    title: 'Strengthen capacity for biosafety measures and sustainable use of biotechnology',
    actions: [
      { action: 'Develop guidelines for effective implementation of biosafety law', institutions: ['REMA', 'MoE', 'FDA', 'MINAGRI', 'RAB'], dataSources: ['National Biosafety Framework', 'Rwanda biosafety law'] },
      { action: 'Enhance capacity of institutions to manage risks associated with GMOs', institutions: ['REMA', 'MoE', 'FDA', 'MINAGRI', 'RAB', 'RSB', 'Higher learning institutions'], dataSources: ['Training reports', 'Biosafety guidelines'] },
      { action: 'Put in place mechanisms for detection and identification of GMOs', institutions: ['FDA', 'REMA', 'RSB'], dataSources: ['Lab Test reports'] },
    ],
  },
  {
    id: 18, goal: 'D',
    title: 'Identify harmful incentives and scale up positive incentives for biodiversity',
    actions: [
      { action: 'Conduct study for review of subsidies that harm biodiversity', institutions: ['REMA', 'UNDP'], dataSources: ['BIOFIN Reports'] },
      { action: 'Promote positive incentives through financial incentives, PES and eco-labelling', institutions: ['REMA', 'MINICOM', 'MoE', 'ARCOS', 'Nature Rwanda', 'IUCN', 'GGGI', 'RFA', 'RDB'], dataSources: ['Umusave Fund reports', 'PES reports', 'COMBIO Project reports'] },
      { action: 'Integrate biodiversity into national and sectoral budgeting', institutions: ['MoE', 'RGF', 'MINECOFIN', 'REMA'], dataSources: ['Budget tagging reports', 'Biodiversity financial need assessment'] },
    ],
  },
  {
    id: 19, goal: 'D',
    title: 'Mobilise $500M from all sources and align financial flows with biodiversity conservation',
    actions: [
      { action: 'Conduct biodiversity expenditure review and needs assessment', institutions: ['REMA'], dataSources: ['Biodiversity Financial Need assessment'] },
      { action: 'Develop and operationalise a dedicated biodiversity window under Rwanda Green Fund', institutions: ['RGF', 'REMA', 'MINECOFIN'], dataSources: ['To be operationalised'] },
      { action: 'Identify and secure funding sources including government, international grants and partnerships', institutions: ['RGF', 'REMA', 'Private sector', 'NGOs', 'UNDP', 'IUCN', 'Development partners'], dataSources: ['Reports'] },
      { action: 'Support environmental inspection and enhance collection of fines through digital finance', institutions: ['REMA', 'RGF'], dataSources: ['Reports'] },
    ],
  },
  {
    id: 20, goal: 'D',
    title: 'Strengthen capacity-building, technology transfer and scientific research',
    actions: [
      { action: 'Develop Rwanda\'s 7th National Report to the CBD', institutions: ['REMA'], dataSources: ['National Report'] },
      { action: 'Develop a national biodiversity baseline for effective monitoring', institutions: ['REMA'], dataSources: ['Baseline reports'] },
      { action: 'Strengthen biodiversity information systems to support decision-making', institutions: ['REMA'], dataSources: ['RBIS'] },
      { action: 'Promote collaboration among academic researchers, institutions and local NGOs', institutions: ['REMA'], dataSources: ['Reports'] },
    ],
  },
  {
    id: 21, goal: 'D',
    title: 'Ensure biodiversity data is readily available, accessible and utilised',
    actions: [
      { action: 'Create awareness and utility of Rwanda Biodiversity Information System (RBIS)', institutions: ['REMA'], dataSources: ['RBIS'] },
      { action: 'Establish a national IUCN Red List', institutions: ['REMA'], dataSources: ['Scientific reports'] },
      { action: 'Ensure biodiversity data is clearly communicated and accessible', institutions: ['REMA'], dataSources: ['Reports'] },
      { action: 'Regularly update the CHM Rwanda with stakeholder engagement', institutions: ['REMA'], dataSources: ['CHM Rwanda'] },
    ],
  },
  {
    id: 22, goal: 'D',
    title: 'Ensure all stakeholders including women, youth and persons with disabilities participate in biodiversity decision-making',
    actions: [
      { action: 'Establish baseline on gender inclusion in biodiversity conservation', institutions: ['MoE', 'REMA'], dataSources: ['Reports'] },
      { action: 'Engage women, youth and persons with disabilities in biodiversity conservation', institutions: ['REMA'], dataSources: ['Reports'] },
      { action: 'Train women, youth and persons with disabilities in biodiversity monitoring', institutions: ['REMA'], dataSources: ['Training reports'] },
      { action: 'Enhance private sector initiatives to incentivise inclusive conservation', institutions: ['REMA', 'Private sector'], dataSources: ['Reports'] },
    ],
  },
];

function getAllInstitutions(): { name: string; targetCount: number; targets: number[]; modules: string[] }[] {
  const map = new Map<string, Set<number>>();
  TARGETS.forEach(t => {
    t.actions.forEach(a => {
      a.institutions.forEach(inst => {
        if (!map.has(inst)) map.set(inst, new Set());
        map.get(inst)!.add(t.id);
      });
    });
  });
  return Array.from(map.entries())
    .map(([name, tgts]) => ({
      name,
      targetCount: tgts.size,
      targets: Array.from(tgts).sort((a, b) => a - b),
      modules: INSTITUTION_MODULES[name] || [],
    }))
    .sort((a, b) => b.targetCount - a.targetCount);
}

export default function StakeholdersPage() {
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [expandedTargets, setExpandedTargets] = useState<Set<number>>(new Set([1]));
  const [view, setView] = useState<'targets' | 'institutions'>('targets');

  const allInstitutions = useMemo(() => getAllInstitutions(), []);

  const filtered = useMemo(() => {
    return TARGETS.filter(t => {
      if (goalFilter !== 'all' && t.goal !== goalFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      if (t.title.toLowerCase().includes(q)) return true;
      if (t.actions.some(a => a.action.toLowerCase().includes(q))) return true;
      if (t.actions.some(a => a.institutions.some(i => i.toLowerCase().includes(q)))) return true;
      return false;
    });
  }, [search, goalFilter]);

  const filteredInstitutions = useMemo(() => {
    if (!search) return allInstitutions;
    const q = search.toLowerCase();
    return allInstitutions.filter(i => i.name.toLowerCase().includes(q));
  }, [search, allInstitutions]);

  const toggleTarget = (id: number) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ ...card, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-1)' }}>
              NBSAP Stakeholder & Institutional Framework
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
              {allInstitutions.length} institutions across {TARGETS.length} national targets · Linked to reporting modules and data sources
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['targets', 'institutions'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                border: view === v ? '1px solid var(--sky-dim)' : '1px solid var(--border)',
                background: view === v ? 'rgba(14,165,233,0.1)' : 'transparent',
                color: view === v ? 'var(--sky-dim)' : 'var(--text-3)',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
                {v === 'targets' ? 'By Target' : 'By Institution'}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Goal filter */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search institutions, targets, or actions..."
            style={{
              flex: 1, padding: '8px 14px', borderRadius: 8,
              border: '1px solid var(--border)', fontSize: '0.78rem',
              fontFamily: "'DM Sans', sans-serif", outline: 'none',
              background: 'var(--surface-2)',
            }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ key: 'all', label: 'All' }, { key: 'A', label: 'Goal A' }, { key: 'B', label: 'Goal B' }, { key: 'C', label: 'Goal C' }, { key: 'D', label: 'Goal D' }].map(g => (
              <button key={g.key} onClick={() => setGoalFilter(g.key)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                border: goalFilter === g.key ? `1px solid ${goalColors[g.key]?.accent ?? 'var(--sky-dim)'}` : '1px solid var(--border)',
                background: goalFilter === g.key ? (goalColors[g.key]?.bg ?? 'rgba(14,165,233,0.1)') : 'transparent',
                color: goalFilter === g.key ? (goalColors[g.key]?.color ?? 'var(--sky-dim)') : 'var(--text-3)',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TARGET VIEW */}
      {view === 'targets' && filtered.map(t => {
        const gc = goalColors[t.goal];
        const isOpen = expandedTargets.has(t.id);
        return (
          <div key={t.id} style={{ ...card, marginBottom: 10, overflow: 'hidden' }}>
            {/* Target header */}
            <div
              onClick={() => toggleTarget(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px',
                background: isOpen ? gc.bg : 'var(--surface)',
                cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: gc.accent, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.82rem', fontWeight: 800, flexShrink: 0,
              }}>
                {t.id}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>
                  Target {t.id}: {t.title}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {t.actions.length} strategic actions · {new Set(t.actions.flatMap(a => a.institutions)).size} institutions
                </div>
              </div>
              <span style={{
                fontSize: '0.58rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                background: gc.bg, color: gc.color, border: `1px solid ${gc.accent}30`,
              }}>
                Goal {t.goal}
              </span>
              <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
                style={{ color: 'var(--text-3)', fontSize: '0.65rem' }} />
            </div>

            {/* Expanded actions */}
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {t.actions.map((a, ai) => (
                  <div key={ai} style={{
                    padding: '14px 20px 14px 72px',
                    borderBottom: ai < t.actions.length - 1 ? '1px solid #f8fafc' : 'none',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
                      {a.action}
                    </div>
                    <div style={{ display: 'flex', gap: 20 }}>
                      {/* Institutions */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                          Responsible Institutions
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {a.institutions.map(inst => (
                            <span key={inst} style={{
                              fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
                              background: '#eff6ff', color: '#1e40af', fontWeight: 500,
                              border: '1px solid #dbeafe',
                            }}>
                              {inst}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Data Sources */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                          Data Sources
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {a.dataSources.map((ds, di) => (
                            <span key={di} style={{
                              fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4,
                              background: '#f0fdf4', color: '#166534', fontWeight: 500,
                              border: '1px solid #dcfce7',
                            }}>
                              {ds}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* INSTITUTION VIEW */}
      {view === 'institutions' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  {['Institution', 'Reporting Modules', 'Targets', 'Target Links'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: '0.62rem', fontWeight: 600,
                      letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)',
                      background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInstitutions.map(inst => (
                  <tr key={inst.name} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-1)' }}>{inst.name}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {inst.modules.length > 0 ? inst.modules.map(m => {
                          const mod = MODULE_NAMES[m];
                          return (
                            <span key={m} style={{
                              fontSize: '0.6rem', padding: '2px 7px', borderRadius: 4,
                              background: `${mod?.color ?? '#6b7280'}14`, color: mod?.color ?? '#6b7280',
                              fontWeight: 600, border: `1px solid ${mod?.color ?? '#6b7280'}30`,
                              whiteSpace: 'nowrap',
                            }}>
                              {m}
                            </span>
                          );
                        }) : (
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sky-dim)' }}>{inst.targetCount}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {inst.targets.map(tid => {
                          const t = TARGETS.find(x => x.id === tid);
                          const gc = goalColors[t?.goal ?? 'A'];
                          return (
                            <span key={tid} onClick={() => { setView('targets'); setExpandedTargets(new Set([tid])); setGoalFilter('all'); }}
                              style={{
                                fontSize: '0.62rem', padding: '2px 8px', borderRadius: 4,
                                background: gc.bg, color: gc.color, fontWeight: 600,
                                cursor: 'pointer', border: `1px solid ${gc.accent}30`,
                              }}>
                              T{tid}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && view === 'targets' && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: '0.82rem' }}>
          No targets match your search.
        </div>
      )}
    </div>
  );
}
