import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReports } from '../hooks/useData';
import { submitReport, processReportAutomatic, exportReportsToCSV, exportReportsToJSON, deleteReport, importReportsFromJSON } from '../services/reportService';
import { organizationConfigService } from '../services/organizationConfigService';
import { writeAuditEntry, fetchUserResponsibleTargets, fetchIndicators, fetchDistricts, updateDistrictStatus } from '../services/dataService';
import { useAuth } from '../services/AuthContext';
import { eventBus } from '../services/eventBus';
import toast from 'react-hot-toast';
import type { ReportType, ReportAttachment, NBSAPTarget, Indicator, District } from '../types/index';
import { formatFieldLabel, formatFieldValue } from '../utils/formData';
import { validateYear } from '../utils/validation';


// ── STAKEHOLDER RESPONSIBILITIES MAPPING ─────────────────────────
// Full NBSAP 2025-2030 institutional framework — all institutions with module assignments
// modules: which T01-T07 reporting tools this institution uses
const STAKEHOLDER_RESPONSIBILITIES: Record<string, { name: string; responsibilities: string[]; targets: number[]; modules: string[] }> = {
  'REMA': { name: 'Rwanda Environment Management Authority', responsibilities: ['Environmental policy enforcement', 'EIA oversight', 'Biodiversity monitoring', 'RBIS management', 'CBD reporting'], targets: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22], modules: ['T01','T02','T03','T06'] },
  'MoE': { name: 'Ministry of Environment', responsibilities: ['Environmental policy development', 'Climate change coordination', 'Biodiversity mainstreaming'], targets: [1,2,6,7,8,13,14,16,17,18,19], modules: ['T01','T05'] },
  'MINAGRI': { name: 'Ministry of Agriculture and Animal Resources', responsibilities: ['Agricultural biodiversity', 'Sustainable farming', 'Fisheries regulation'], targets: [1,5,7,10,16,17], modules: ['T01','T02'] },
  'RFA': { name: 'Rwanda Forestry Authority', responsibilities: ['Forest conservation', 'Reforestation', 'Forest plantations management', 'Urban forestry guidelines'], targets: [1,2,6,8,9,10,11,12,18], modules: ['T01','T02','T03'] },
  'RDB': { name: 'Rwanda Development Board', responsibilities: ['Tourism & conservation', 'Protected area management', 'Wildlife conservation', 'Revenue sharing'], targets: [1,3,4,5,6,8,9,10,11,12,15,16,18,19], modules: ['T01','T03','T05','T06'] },
  'NLA': { name: 'National Land Authority', responsibilities: ['Land-use planning', 'Spatial plans', 'NSDI management'], targets: [1,10,11], modules: ['T01'] },
  'RWB': { name: 'Rwanda Water Resources Board', responsibilities: ['Water resource management', 'Catchment management', 'Wetland oversight'], targets: [2,5,7,8,10], modules: ['T01','T02'] },
  'RAB': { name: 'Rwanda Agriculture Board', responsibilities: ['Agricultural research', 'Crop improvement', 'Aquaculture', 'Seed management'], targets: [2,5,6,7,10,13,17], modules: ['T01','T02','T07'] },
  'District Authorities': { name: 'District Local Governments', responsibilities: ['Local biodiversity monitoring', 'Community engagement', 'Local land-use planning'], targets: [2,3,8,10,14,22], modules: ['T02','T04'] },
  'ARCOS': { name: 'Albertine Rift Conservation Society', responsibilities: ['Ecosystem restoration', 'Community conservation', 'Living lakes monitoring', 'SANCTA programme'], targets: [1,2,3,5,6,8,9,10,11,12,18], modules: ['T02','T03','T04','T07'] },
  'Nature Rwanda': { name: 'Nature Rwanda', responsibilities: ['IBA monitoring', 'Waterbird surveys', 'Flyway conservation', 'Busaga Forest conservation'], targets: [1,2,3,4,8,9,10,11,12,18], modules: ['T02','T03','T04','T07'] },
  'CoEB': { name: 'Centre of Excellence in Biodiversity', responsibilities: ['RBIS management', 'Biodiversity research', 'Ecosystem mapping', 'IAS monitoring'], targets: [1,2,3,4,6,7,8,10], modules: ['T03','T07'] },
  'RWCA': { name: 'Rwanda Wildlife Conservation Association', responsibilities: ['Umusambi Village', 'Species conservation', 'Community conservation education'], targets: [2,3,4,8,9,10,11], modules: ['T03','T04','T07'] },
  'RECOR': { name: 'Rwanda Environment Conservation Organisation', responsibilities: ['Environmental conservation', 'Ecosystem restoration'], targets: [2,3,8,10,11], modules: ['T02','T04','T07'] },
  'IUCN': { name: 'International Union for Conservation of Nature', responsibilities: ['Green List', 'Red List', 'PES', 'Nature-based solutions', 'COMBIO project'], targets: [2,3,4,6,8,9,10,11,12,18,19], modules: ['T03','T05','T07'] },
  'African Parks': { name: 'African Parks', responsibilities: ['Park management', 'Akagera operations', 'IAS control'], targets: [3,6,8,10], modules: ['T03'] },
  'Prime Biodiversity Conservation': { name: 'Prime Biodiversity Conservation', responsibilities: ['KBA conservation', 'Species monitoring', 'Community projects'], targets: [1,3,8,9,10,12], modules: ['T02','T03','T04','T07'] },
  'ARECO': { name: 'ARECO Rwanda Nziza', responsibilities: ['Buffer zone conservation', 'Community ecosystem-based adaptation'], targets: [2,7,8,9,10,11], modules: ['T02','T04'] },
  'Partners for Conservation': { name: 'Partners for Conservation', responsibilities: ['Conservation partnerships', 'Community engagement'], targets: [9,10,11,12], modules: ['T04','T07'] },
  'Forest of Hope Association': { name: 'Forest of Hope Association', responsibilities: ['Forest conservation', 'Community forestry'], targets: [3,8], modules: ['T02','T04'] },
  'IGCP': { name: 'International Gorilla Conservation Programme', responsibilities: ['Gorilla conservation', 'IAS management in parks'], targets: [6], modules: ['T03','T07'] },
  'Karisoke': { name: 'Dian Fossey Gorilla Fund (Karisoke)', responsibilities: ['Gorilla research', 'Conservation science'], targets: [6], modules: ['T03','T07'] },
  'AWF': { name: 'African Wildlife Foundation', responsibilities: ['Wildlife conservation', 'Landscape conservation'], targets: [3,8], modules: ['T03','T05'] },
  'WCS': { name: 'Wildlife Conservation Society', responsibilities: ['Wildlife monitoring', 'Conservation research'], targets: [8], modules: ['T03','T07'] },
  'One Tree Planted': { name: 'One Tree Planted', responsibilities: ['Reforestation', 'Tree planting partnerships'], targets: [8,9], modules: ['T02'] },
  'One Acre Fund': { name: 'One Acre Fund', responsibilities: ['Smallholder support', 'Agroforestry', 'Seedling production'], targets: [6,9], modules: ['T02','T04'] },
  'ICRAF': { name: 'World Agroforestry (ICRAF)', responsibilities: ['Agroforestry research', 'Native species integration'], targets: [2,4,9,10], modules: ['T02','T07'] },
  'Bridge to Rwanda': { name: 'Bridge to Rwanda', responsibilities: ['Organic farming', 'Soil health improvement'], targets: [7,10], modules: ['T02','T04'] },
  'ROAM': { name: 'Rwanda Organic Agriculture Movement', responsibilities: ['Organic agriculture promotion', 'Fertiliser reduction'], targets: [7], modules: ['T02'] },
  'GIZ': { name: 'GIZ Rwanda', responsibilities: ['Technical cooperation', 'Capacity building', 'Green growth'], targets: [9,11,12], modules: ['T05','T07'] },
  'SNV': { name: 'SNV Netherlands Development Organisation', responsibilities: ['Sustainable agriculture', 'Clean energy'], targets: [10,11], modules: ['T05'] },
  'GGGI': { name: 'Global Green Growth Institute', responsibilities: ['Green growth', 'PES', 'Climate finance'], targets: [9,10,11,12,16,18], modules: ['T05','T07'] },
  'WRI': { name: 'World Resources Institute', responsibilities: ['Data analytics', 'Forest monitoring', 'NBS'], targets: [9,11], modules: ['T05','T07'] },
  'FAO': { name: 'Food and Agriculture Organization', responsibilities: ['Agricultural standards', 'IPM', 'Hazardous waste'], targets: [7,9], modules: ['T01','T05'] },
  'UNDP': { name: 'United Nations Development Programme', responsibilities: ['BIOFIN', 'Capacity building', 'Resource mobilisation'], targets: [18,19], modules: ['T05'] },
  'RGF': { name: 'Rwanda Green Fund (FONERWA)', responsibilities: ['Green finance', 'Biodiversity window', 'Investment plans'], targets: [2,8,9,10,14,18,19], modules: ['T05'] },
  'MINECOFIN': { name: 'Ministry of Finance and Economic Planning', responsibilities: ['Budget tagging', 'Biodiversity expenditure review', 'SEEA'], targets: [8,9,14,15,18,19], modules: ['T01','T05'] },
  'NISR': { name: 'National Institute of Statistics Rwanda', responsibilities: ['Statistical surveys', 'SEEA', 'Census data'], targets: [1,14], modules: ['T01'] },
  'BNR': { name: 'National Bank of Rwanda', responsibilities: ['Financial sector biodiversity risks', 'Green finance standards'], targets: [8,14], modules: ['T01'] },
  'MININFRA': { name: 'Ministry of Infrastructure', responsibilities: ['Infrastructure planning', 'Sustainable urban development'], targets: [1,11,16], modules: ['T01','T06'] },
  'MINICOM': { name: 'Ministry of Trade and Industry', responsibilities: ['Industrial compliance', 'Sustainable trade', 'Special economic zones'], targets: [1,6,16], modules: ['T01','T06'] },
  'MINALOC': { name: 'Ministry of Local Government', responsibilities: ['Community coordination', 'HWC management', 'Local governance'], targets: [4,9], modules: ['T01','T04'] },
  'MINEDUC': { name: 'Ministry of Education', responsibilities: ['Environmental education', 'Greening schools'], targets: [11], modules: ['T01'] },
  'MINEMA': { name: 'Ministry of Emergency Management', responsibilities: ['DRR strategies', 'Flood protection'], targets: [8], modules: ['T01'] },
  'RMB': { name: 'Rwanda Mines, Petroleum and Gas Board', responsibilities: ['Mine drainage', 'Mining environmental compliance'], targets: [2,7], modules: ['T01','T06'] },
  'CPCIC': { name: 'Cleaner Production & Climate Innovation Centre', responsibilities: ['Circular economy', 'Pollution control', 'Fertiliser regulation'], targets: [2,7,11,16], modules: ['T01','T06'] },
  'NIRDA': { name: 'National Industrial Research and Development Agency', responsibilities: ['Industrial R&D', 'Sustainable production'], targets: [9,11,16], modules: ['T01','T07'] },
  'RICA': { name: 'Rwanda Inspectorate, Competition and Consumer Protection Authority', responsibilities: ['Biosecurity', 'Quality inspections', 'IAS border controls'], targets: [5,6,7,10], modules: ['T01','T06'] },
  'RSB': { name: 'Rwanda Standards Board', responsibilities: ['Environmental standards', 'Biosafety standards', 'Eco-labelling'], targets: [6,10,16,17], modules: ['T01'] },
  'RRA': { name: 'Rwanda Revenue Authority', responsibilities: ['Tax incentives', 'Environmental fees'], targets: [6,9], modules: ['T01'] },
  'FDA': { name: 'Rwanda Food and Drugs Authority', responsibilities: ['Food safety', 'GMO detection', 'Biosafety'], targets: [6,9,17], modules: ['T01','T06'] },
  'NCST': { name: 'National Council for Science and Technology', responsibilities: ['Research coordination', 'Innovation policy'], targets: [6,7,8], modules: ['T01','T07'] },
  'Rwanda Space Agency': { name: 'Rwanda Space Agency', responsibilities: ['Remote sensing', 'Land monitoring', 'IAS detection'], targets: [6,8,10], modules: ['T07'] },
  'NAEB': { name: 'National Agricultural Export Development Board', responsibilities: ['Export crops', 'Organic certification'], targets: [7,10], modules: ['T01','T06'] },
  'RURA': { name: 'Rwanda Utilities Regulatory Authority', responsibilities: ['Utilities regulation', 'Waste management'], targets: [7,16], modules: ['T01'] },
  'WASAC': { name: 'Water and Sanitation Corporation', responsibilities: ['Water supply', 'Aquatic ecosystem protection'], targets: [7], modules: ['T01'] },
  'Meteo Rwanda': { name: 'Rwanda Meteorology Agency', responsibilities: ['Climate monitoring', 'Weather data for biodiversity'], targets: [8], modules: ['T01','T07'] },
  'LODA': { name: 'Local Administrative Entities Development Agency', responsibilities: ['Community development', 'VUP programme'], targets: [8,9], modules: ['T04','T05'] },
  'National Police (Marine)': { name: 'Rwanda National Police (Marine)', responsibilities: ['Fisheries enforcement', 'Lake patrols'], targets: [5], modules: ['T01'] },
  'SGF': { name: 'Special Guaranty Fund', responsibilities: ['HWC compensation', 'Wildlife damage funds'], targets: [4], modules: ['T01','T04'] },
  'RHA': { name: 'Rwanda Housing Authority', responsibilities: ['Urban planning', 'Green building', 'City master plans'], targets: [11,12], modules: ['T01'] },
  'Kigali City': { name: 'City of Kigali', responsibilities: ['Urban green spaces', 'City environmental management', 'Car-free zones'], targets: [7,11,12], modules: ['T01','T02'] },
  'PSF': { name: 'Private Sector Federation', responsibilities: ['Business coordination', 'Private sector standards'], targets: [6,7,10,15,16], modules: ['T06'] },
  'REG': { name: 'Rwanda Energy Group', responsibilities: ['Clean energy', 'Low-emission infrastructure'], targets: [11], modules: ['T06'] },
  'RPPA': { name: 'Rwanda Public Procurement Authority', responsibilities: ['Green procurement', 'Sustainable purchasing'], targets: [16], modules: ['T01'] },
  'RCHA': { name: 'Rwanda Cultural Heritage Academy', responsibilities: ['Traditional knowledge', 'Medicinal plants heritage'], targets: [4,9,13], modules: ['T07'] },
  'ILO': { name: 'International Labour Organization', responsibilities: ['Green jobs', 'Sustainable livelihoods'], targets: [16], modules: ['T05'] },
  'Q&A Venue Solution': { name: 'Q&A Venue Solution', responsibilities: ['Conservation support'], targets: [3], modules: ['T04'] },
  'Eco-planet Bamboo': { name: 'Eco-planet Bamboo', responsibilities: ['Bamboo restoration', 'Sustainable materials'], targets: [9], modules: ['T02','T06'] },
  'Urugaga Imbaraga': { name: 'Urugaga Imbaraga (Farmers Federation)', responsibilities: ['Farmer mobilization', 'Organic farming promotion'], targets: [7], modules: ['T04'] },
  'ACORD Rwanda': { name: 'ACORD Rwanda', responsibilities: ['Community development', 'Conservation agriculture'], targets: [10,18], modules: ['T04','T05'] },
  'WCSS': { name: 'Wildlife Conservation Student Society', responsibilities: ['Student conservation', 'Awareness campaigns'], targets: [1], modules: ['T04','T07'] },
  'PFC': { name: 'People for Conservation', responsibilities: ['Community conservation', 'KBA monitoring'], targets: [1], modules: ['T04'] },
  'Ultimate Forest': { name: 'Ultimate Forest Company', responsibilities: ['Forest certification', 'Sustainable forestry'], targets: [8,10], modules: ['T02','T06'] },
  'Nyungwe Management Company': { name: 'Nyungwe Management Company', responsibilities: ['Nyungwe NP management', 'Tourism operations'], targets: [10], modules: ['T03'] },
  'ARDI': { name: 'Agriculture and Rural Development Initiative', responsibilities: ['Apiculture', 'Rural livelihoods'], targets: [10], modules: ['T02','T04'] },
  'Rwanda Mountain Tea': { name: 'Rwanda Mountain Tea', responsibilities: ['Tea plantation biodiversity', 'Bee reserves'], targets: [10], modules: ['T06'] },
  'RYBN': { name: 'Rwanda Youth in Biodiversity Network', responsibilities: ['Youth environmental engagement', 'Greening schools'], targets: [11], modules: ['T04'] },
  'ADRRES': { name: 'ADRRES', responsibilities: ['School environmental programmes', 'Youth mobilization'], targets: [11], modules: ['T04'] },
  'LWD': { name: 'Life and Water Development', responsibilities: ['Community water projects', 'Ecosystem services'], targets: [11], modules: ['T04','T05'] },
  'ESS OIL': { name: 'ESS OIL Rwanda', responsibilities: ['Essential oils', 'Sustainable sourcing'], targets: [9], modules: ['T06'] },
  'IKIREZI': { name: 'Ikirezi Natural Products', responsibilities: ['Natural products', 'Sustainable value chains'], targets: [9], modules: ['T06'] },
};

// ── Tool Definitions ─────────────────────────────────────────
const TOOLKIT_TOOLS = [
  { id: 'T01', name: 'National Institutional Reporting', icon: '🏛️', color: '#1B6CA8', accent: '#4CA3DD', frequency: 'Quarterly', output: 'Institutional Compliance Scorecard',
    fields: [
      { key: 'stakeholder', label: 'Reporting Stakeholder', type: 'stakeholder_select', required: true },
      { key: 'institution', label: 'Reporting Institution', type: 'select', options: ['Ministry of Environment (MoE)','Ministry of Agriculture and Animal Resources (MINAGRI)','Infrastructure Ministry','Rwanda Forestry Authority (RFA)','Rwanda Development Board (RDB)','National Institute of Statistics Rwanda (NISR)','Rwanda Water Resources Board (RWB)'], required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Q2 2026','Q3 2026','Q4 2026','Q1 2027','Q2 2027','Q3 2027','Q4 2027','Q1 2028','Q2 2028','Q3 2028','Q4 2028','Q1 2029','Q2 2029','Q3 2029','Q4 2029','Q1 2030','Q2 2030','Q3 2030','Q4 2030'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      { key: 'current_status', label: 'Current Status / Value', type: 'number', placeholder: '0', required: true },
      { key: 'budget_utilized', label: 'Budget Utilized (RWF)', type: 'number', placeholder: '0', required: false },
      { key: 'activities', label: 'Implementation Activities', type: 'textarea', placeholder: 'Describe completed activities...', required: false },
      { key: 'challenges', label: 'Challenges Encountered', type: 'textarea', placeholder: 'Describe constraints...', required: false },
    ]
  },
  { id: 'T02', name: 'District Biodiversity Monitoring', icon: '🌿', color: '#1E7D4B', accent: '#4CBB7F', frequency: 'Quarterly', output: 'District Biodiversity Performance Index',
    fields: [
      { key: 'stakeholder', label: 'Reporting Stakeholder', type: 'stakeholder_select', required: true },
      { key: 'district', label: 'District Name', type: 'district_select', required: true },
      { key: 'officer', label: 'Reporting Officer', type: 'text', placeholder: 'Officer name', required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Q2 2026','Q3 2026','Q4 2026','Q1 2027','Q2 2027','Q3 2027','Q4 2027','Q1 2028','Q2 2028','Q3 2028','Q4 2028','Q1 2029','Q2 2029','Q3 2029','Q4 2029','Q1 2030','Q2 2030','Q3 2030','Q4 2030'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      { key: 'forest_ha', label: 'Forest Restoration (ha)', type: 'number', placeholder: '0', required: true },
      { key: 'wetland_ha', label: 'Wetland Rehabilitation (ha)', type: 'number', placeholder: '0', required: true },
      { key: 'agroforestry_hh', label: 'Agroforestry Households', type: 'number', placeholder: '0', required: false },
      { key: 'soil_structures', label: 'Soil Conservation Structures', type: 'number', placeholder: '0', required: false },
      { key: 'conservation_groups', label: 'Conservation Groups', type: 'number', placeholder: '0', required: false },
      { key: 'illegal_cases', label: 'Illegal Activities Reported', type: 'number', placeholder: '0', required: false },
      { key: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any observations...', required: false },
    ]
  },
  { id: 'T03', name: 'Protected Area Monitoring', icon: '🛡️', color: '#5B3FA6', accent: '#9C78E0', frequency: 'Biannual', output: 'Ecosystem Integrity Report',
    fields: [
      { key: 'stakeholder', label: 'Reporting Stakeholder', type: 'stakeholder_select', required: true },
      { key: 'area_name', label: 'Protected Area Name', type: 'text', placeholder: 'e.g. Nyungwe National Park', required: true },
      { key: 'agency', label: 'Managing Agency', type: 'text', placeholder: 'Agency name', required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['H1 2024','H2 2024','H1 2025','H2 2025','H1 2026','H2 2026','H1 2027','H2 2027','H1 2028','H2 2028','H1 2029','H2 2029','H1 2030','H2 2030'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      { key: 'coverage_change_ha', label: 'Coverage Change (ha)', type: 'number', placeholder: '0', required: true },
      { key: 'species_trend', label: 'Species Population Trend', type: 'select', options: ['Increasing','Stable','Declining','Unknown'], required: true },
      { key: 'habitat_quality', label: 'Habitat Quality (1–10)', type: 'number', placeholder: '1', required: true },
      { key: 'illegal_cases', label: 'Illegal Activities Detected', type: 'number', placeholder: '0', required: false },
      { key: 'restoration_ha', label: 'Restoration Activities (ha)', type: 'number', placeholder: '0', required: false },
      { key: 'observations', label: 'Field Observations', type: 'textarea', placeholder: 'Key findings...', required: false },
    ]
  },
  { id: 'T04', name: 'Community Biodiversity Monitoring', icon: '👥', color: '#B56A00', accent: '#F0A030', frequency: 'Quarterly', output: 'Community Observation Dataset',
    fields: [
      { key: 'stakeholder', label: 'Reporting Stakeholder', type: 'stakeholder_select', required: true },
      { key: 'community', label: 'Community / Village', type: 'text', placeholder: 'Community name', required: true },
      { key: 'reporter', label: 'Reporter / Group Name', type: 'text', placeholder: 'Name or group', required: true },
      { key: 'reporter_type', label: 'Reporter Type', type: 'select', options: ['Community Conservation Committee','Youth Environmental Club','Women\'s Cooperative','Local Knowledge Holder','Other'], required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Q2 2026','Q3 2026','Q4 2026','Q1 2027','Q2 2027','Q3 2027','Q4 2027','Q1 2028','Q2 2028','Q3 2028','Q4 2028','Q1 2029','Q2 2029','Q3 2029','Q4 2029','Q1 2030','Q2 2030','Q3 2030','Q4 2030'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      { key: 'hwc_incidents', label: 'Human-Wildlife Conflict Incidents', type: 'number', placeholder: '0', required: true },
      { key: 'tree_planting_hh', label: 'Tree Planting Households', type: 'number', placeholder: '0', required: false },
      { key: 'water_source_status', label: 'Water Source Condition', type: 'select', options: ['Good','Fair','Degraded','Dry / Absent'], required: false },
      { key: 'species_sightings', label: 'Species Sightings', type: 'textarea', placeholder: 'e.g. Mountain gorilla – 3 sightings', required: false },
    ]
  },
  { id: 'T05', name: 'Biodiversity Finance Tracking', icon: '💰', color: '#0E6655', accent: '#1ABC9C', frequency: 'Annual', output: 'Finance Gap Analysis',
    fields: [
      { key: 'stakeholder', label: 'Reporting Stakeholder', type: 'stakeholder_select', required: true },
      { key: 'institution', label: 'Institution Name', type: 'text', placeholder: 'Institution or partner', required: true },
      { key: 'institution_type', label: 'Institution Type', type: 'select', options: ['Ministry of Finance','Ministry of Environment (MoE)','Development Partner','NGO','Private Sector','Other'], required: true },
      { key: 'year', label: 'Fiscal Year', type: 'select', options: ['2020','2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      { key: 'budget_allocated', label: 'Budget Allocated (RWF)', type: 'number', placeholder: '0', required: true },
      { key: 'budget_disbursed', label: 'Budget Disbursed (RWF)', type: 'number', placeholder: '0', required: true },
      { key: 'implementation_pct', label: 'Implementation Status (%)', type: 'number', placeholder: '0', required: true },
      { key: 'activity_funded', label: 'Activity / Program Funded', type: 'textarea', placeholder: 'Description...', required: false },
    ]
  },
  { id: 'T06', name: 'Private Sector Compliance', icon: '🏗️', color: '#922B21', accent: '#E74C3C', frequency: 'Annual', output: 'Private-Sector Compliance Index',
    fields: [
      { key: 'stakeholder', label: 'Reporting Stakeholder', type: 'stakeholder_select', required: true },
      { key: 'company', label: 'Company Name', type: 'text', placeholder: 'Company name', required: true },
      { key: 'sector', label: 'Sector', type: 'select', options: ['Infrastructure','Agribusiness','Mining','Tourism','Finance / Investment','Other'], required: true },
      { key: 'year', label: 'Reporting Year', type: 'select', options: ['2020','2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      { key: 'eia_compliance', label: 'EIA Compliance', type: 'select', options: ['Full compliance','Partial compliance','Non-compliant','Not applicable'], required: true },
      { key: 'restoration_ha', label: 'Restoration Commitments (ha)', type: 'number', placeholder: '0', required: false },
      { key: 'esg_score', label: 'ESG Biodiversity Score (1–100)', type: 'number', placeholder: '0', required: false },
      { key: 'waste_management', label: 'Waste Management Rating', type: 'select', options: ['Excellent','Good','Fair','Poor'], required: false },
    ]
  },
  { id: 'T07', name: 'Research & Academic Contribution', icon: '🔬', color: '#1A5276', accent: '#2E86C1', frequency: 'Annual', output: 'Biodiversity Evidence Repository',
    fields: [
      { key: 'stakeholder', label: 'Reporting Stakeholder', type: 'stakeholder_select', required: true },
      { key: 'institution', label: 'Lead Institution', type: 'text', placeholder: 'University or institute', required: true },
      { key: 'study_title', label: 'Study Title', type: 'text', placeholder: 'Full title', required: true },
      { key: 'year', label: 'Year Completed', type: 'select', options: ['2020','2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      { key: 'ecosystem_assessed', label: 'Ecosystem Assessed', type: 'select', options: ['Forest','Wetland','Savanna','Aquatic','Agricultural','Urban','Multiple'], required: true },
      { key: 'key_findings', label: 'Key Findings Summary', type: 'textarea', placeholder: 'Summarize main findings...', required: true },
      { key: 'policy_relevance', label: 'Policy Relevance & NBSAP Linkage', type: 'textarea', placeholder: 'How does this support NBSAP?', required: false },
    ]
  },
];

// ── Report Form ───────────────────────────────────────────────
const ReportForm = ({ tool, onBack, onSuccess }: { tool: typeof TOOLKIT_TOOLS[0]; onBack: () => void; onSuccess: () => void }) => {
  const { settings, user } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [responsibleTargets, setResponsibleTargets] = useState<NBSAPTarget[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState<Indicator[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableStakeholders = useMemo(() => {
    return Object.entries(STAKEHOLDER_RESPONSIBILITIES)
      .filter(([, info]) => info.modules.includes(tool.id))
      .map(([key, info]) => ({ id: key, ...info }));
  }, [tool.id]);

  // Get filtered targets based on selected stakeholder
  const filteredTargets = useMemo(() => {
    console.log('🎯 Filtering targets - stakeholder:', formData.stakeholder, 'responsibleTargets count:', responsibleTargets.length);
    
    if (!formData.stakeholder) {
      console.log('📍 No stakeholder selected, returning all responsible targets:', responsibleTargets.length);
      return responsibleTargets;
    }
    
    const stakeholderInfo = STAKEHOLDER_RESPONSIBILITIES[formData.stakeholder as keyof typeof STAKEHOLDER_RESPONSIBILITIES];
    if (!stakeholderInfo) {
      console.log('❌ No stakeholder info found for:', formData.stakeholder);
      console.log('🔍 Available stakeholders:', Object.keys(STAKEHOLDER_RESPONSIBILITIES));
      return responsibleTargets;
    }
    
    const filtered = responsibleTargets.filter(target => 
      stakeholderInfo.targets.includes(target.id)
    );
    
    console.log('📊 FILTERING RESULTS:');
    console.log('  - Selected stakeholder:', formData.stakeholder, '(' + stakeholderInfo.name + ')');
    console.log('  - Stakeholder should have targets:', stakeholderInfo.targets);
    console.log('  - Available responsible targets from database:', responsibleTargets.map(t => ({ 
      id: t.id, 
      title: t.title, 
      stakeholders: t.responsible_stakeholders || [] 
    })));
    console.log('  - Targets that match stakeholder:', filtered.map(t => ({ id: t.id, title: t.title })));
    
    if (filtered.length === 0) {
      console.log('⚠️  WARNING: No targets found for stakeholder "' + formData.stakeholder + '"');
      console.log('🔧 This might mean:');
      console.log('   1. Database targets dont include this stakeholder in responsible_stakeholders');
      console.log('   2. The stakeholder name doesnt match exactly');
      console.log('   3. The target mapping needs updating');
    }
    
    return filtered;
  }, [responsibleTargets, formData.stakeholder]);

  // Load NBSAP targets based on user's organization
  useEffect(() => {
    const loadTargets = async () => {
      setLoadingTargets(true);
      try {
        const userOrg = user?.organization || '';
        console.log('🏢 Loading targets for user organization:', userOrg);
        const targets = await fetchUserResponsibleTargets(userOrg);
        console.log('✅ Loaded targets:', targets.length, 'targets total');
        console.log('📋 Target details:', targets.map(t => ({ 
          id: t.id, 
          title: t.title, 
          stakeholders: t.responsible_stakeholders || [] 
        })));
        console.log('🔍 User org for database query:', userOrg);
        setResponsibleTargets(targets);
      } catch (error) {
        console.error('❌ Error loading NBSAP targets:', error);
        toast.error('Failed to load NBSAP targets');
      }
      setLoadingTargets(false);
    };

    loadTargets();
  }, [user?.organization]);

  // Load all districts for the district dropdown (T02)
  useEffect(() => {
    if (!tool.fields.some(f => f.type === 'district_select')) return;
    const loadDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const districts = await fetchDistricts();
        setAllDistricts(districts);
      } catch (error) {
        console.error('Error loading districts:', error);
      }
      setLoadingDistricts(false);
    };
    loadDistricts();
  }, [tool.id]);

  // Load indicators when target is selected
  useEffect(() => {
    const loadIndicators = async () => {
      if (!formData.nbsap_target) {
        console.log('📊 No NBSAP target selected, clearing indicators');
        setAvailableIndicators([]);
        return;
      }

      const targetId = parseInt(formData.nbsap_target, 10);
      console.log('🎯 Loading indicators for target ID:', targetId);
      
      setLoadingIndicators(true);
      try {
        // Use the existing fetchIndicators function from dataService
        const allIndicators = await fetchIndicators({
          targetId: targetId
        });
        
        console.log('📊 Raw indicators loaded for target', targetId, ':', allIndicators.length);
        
        let filteredIndicators = allIndicators;
        
        // Filter indicators by stakeholder if one is selected
        if (formData.stakeholder) {
          // Try both exact match and partial match for stakeholder names
          filteredIndicators = allIndicators.filter(indicator => {
            if (!indicator.responsible) return false;
            
            // Check exact match first
            if (indicator.responsible.includes(formData.stakeholder)) {
              return true;
            }
            
            // Also check for alternative stakeholder names
            const stakeholderAliases: Record<string, string[]> = {
              'Districts': ['District Authorities'],
              'District Authorities': ['Districts'],
              'NGOs': ['Conservation NGOs'],
              'Conservation NGOs': ['NGOs'],
              'Research Institutions': ['Universities'],
              'Universities': ['Research Institutions']
            };
            
            const aliases = stakeholderAliases[formData.stakeholder] || [];
            return aliases.some(alias => indicator.responsible?.includes(alias));
          });
          
          console.log('🔍 Filtered indicators by stakeholder "' + formData.stakeholder + '":', filteredIndicators.length, 'of', allIndicators.length);
          console.log('📋 Available indicators:', filteredIndicators.map(i => ({ 
            id: i.id, 
            name: i.name, 
            responsible: i.responsible 
          })));
        } else {
          console.log('📊 No stakeholder filter - showing all', allIndicators.length, 'indicators for target');
        }
        
        setAvailableIndicators(filteredIndicators);
      } catch (error) {
        console.error('❌ Error loading indicators:', error);
        toast.error('Failed to load indicators');
      }
      setLoadingIndicators(false);
    };

    loadIndicators();
  }, [formData.nbsap_target, formData.stakeholder]); // Also depend on stakeholder selection

  // Reset dependent fields when stakeholder changes
  useEffect(() => {
    if (formData.stakeholder) {
      setFormData(prev => ({ 
        ...prev, 
        nbsap_target: '', 
        indicator: '' 
      }));
    }
  }, [formData.stakeholder]);

  // Reset indicator when target changes
  useEffect(() => {
    if (formData.nbsap_target) {
      setFormData(prev => ({ 
        ...prev, 
        indicator: '' 
      }));
    }
  }, [formData.nbsap_target]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    const newErrors: Record<string, boolean> = {};
    tool.fields.forEach(f => { if (f.required && !formData[f.key]?.trim()) newErrors[f.key] = true; });
    if (Object.keys(newErrors).length) { setErrors(newErrors); toast.error('Please fill in all required fields'); return; }

    // Validate year fields
    const yearField = tool.fields.find(f => f.key === 'year');
    if (yearField && formData.year) {
      const yearValue = parseInt(formData.year, 10);
      const yearValidation = validateYear(yearValue);
      if (!yearValidation.valid) {
        setErrors({ ...newErrors, year: true });
        toast.error(yearValidation.error || 'Invalid year');
        return;
      }
    }

    setSubmitting(true);

    // Determine whether this report should bypass manual verification based on
    // the submitting organization's automatic-update configuration. Falls back
    // to the existing per-user setting if no organization config is available.
    let orgConfig = null;
    if (user?.organization) {
      try {
        orgConfig = await organizationConfigService.getOrCreateConfig(user.organization);
      } catch (err) {
        console.warn('Failed to load organization config, falling back to user settings:', err);
      }
    }
    const requireVerification = true;

    // Include NBSAP target ID, stakeholder, and indicator in the submission
    const nbsapTargetId = formData.nbsap_target ? parseInt(formData.nbsap_target, 10) : null;
    const indicatorId = formData.indicator ? parseInt(formData.indicator, 10) : null;
    const stakeholderId = formData.stakeholder || null;

    // Enhanced form data with pipeline information
    const enhancedFormData = {
      ...formData,
      stakeholder_info: stakeholderId ? STAKEHOLDER_RESPONSIBILITIES[stakeholderId as keyof typeof STAKEHOLDER_RESPONSIBILITIES] : null,
      target_info: nbsapTargetId ? filteredTargets.find(t => t.id === nbsapTargetId) : null,
      indicator_info: indicatorId ? availableIndicators.find(i => i.id === indicatorId) : null,
      submission_timestamp: new Date().toISOString(),
      submitted_by: user?.id,
      submitted_by_organization: user?.organization
    };
    
    // Debug logging for data pipeline
    console.log('Report submission pipeline data:', {
      tool: tool.id,
      stakeholderId,
      nbsapTargetId,
      indicatorId,
      hasStakeholderInfo: !!enhancedFormData.stakeholder_info,
      hasTargetInfo: !!enhancedFormData.target_info,
      hasIndicatorInfo: !!enhancedFormData.indicator_info
    });
    
    const result = await submitReport(
      tool.id as ReportType, 
      tool.name, 
      enhancedFormData, 
      requireVerification, 
      attachments,
      nbsapTargetId
    );
    
    if (result.error) {
      toast.error(result.error);
    } else {
      const selectedTarget = filteredTargets.find(t => t.id === nbsapTargetId);
      const selectedIndicator = availableIndicators.find(i => i.id === indicatorId);
      const selectedStakeholder = stakeholderId ? STAKEHOLDER_RESPONSIBILITIES[stakeholderId as keyof typeof STAKEHOLDER_RESPONSIBILITIES] : null;
      
      const targetInfo = selectedTarget ? ` → Target ${selectedTarget.id}: ${selectedTarget.title}` : '';
      const indicatorInfo = selectedIndicator ? ` → Indicator: ${selectedIndicator.name}` : '';
      const stakeholderInfo = selectedStakeholder ? ` → Stakeholder: ${selectedStakeholder.name}` : '';
      
      await writeAuditEntry('submit', `${tool.name} submitted${stakeholderInfo}${targetInfo}${indicatorInfo}`,
        `Tool: ${tool.id} · Status: ${result.data?.status} · Stakeholder: ${stakeholderId || 'None'} · NBSAP Target: ${nbsapTargetId || 'None'} · Indicator: ${indicatorId || 'None'}`);

      // Log the automatic-processing outcome for audit purposes. When the
      // report was auto-approved, the progress update was already applied by
      // the database trigger as part of the submission above.
      if (orgConfig && result.data) {
        await processReportAutomatic(result.data, orgConfig);
      }

      // Update district reporting status on the map when a T02 report is submitted
      if (tool.id === 'T02' && formData.district) {
        const matchedDistrict = allDistricts.find(d => d.name === formData.district);
        if (matchedDistrict) {
          const newDistrictStatus = requireVerification ? 'pending' : 'submitted';
          await updateDistrictStatus(matchedDistrict.id, newDistrictStatus);
          eventBus.emit('district-status-updated', {
            districtId: matchedDistrict.id,
            districtName: matchedDistrict.name,
          });
        }
      }

      // Enhanced success message
      const successMsg = requireVerification ?
        'Submission queued for verification ⏳' + (selectedTarget ? ` Data will update Target ${selectedTarget.id} upon approval.` : '') :
        'Report submitted successfully ✓' + (selectedTarget ? ` Target ${selectedTarget.id} updated automatically.` : '') + (selectedIndicator ? ` Indicator "${selectedIndicator.name}" updated.` : '');

      toast.success(successMsg);
      onSuccess();
    }
    setSubmitting(false);
  }, [formData, tool, settings, attachments, onSuccess, responsibleTargets, allDistricts]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!['pdf','xlsx','xls','doc','docx'].includes(ext)) return;
      const reader = new FileReader();
      reader.onload = e => {
        setAttachments(prev => [...prev, { name: file.name, ext, size: file.size, data_url: e.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#0ea5e9', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 18, fontFamily: "'DM Sans', sans-serif" }}>
        ← Back to Tools
      </button>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '2rem' }}>{tool.icon}</span>
          <div>
            <div style={{ fontSize: '0.65rem', color: tool.accent, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', marginBottom: 2 }}>{tool.id} · {tool.frequency}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{tool.name}</div>
            <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Output: {tool.output}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            {tool.fields.map(f => (
              <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? 'span 2' : 'span 1' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 5 }}>
                  {f.label}
                  {f.required && <span style={{ color: '#f43f5e', marginLeft: 2 }}>*</span>}
                  {!f.required && <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (optional)</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    placeholder={f.placeholder}
                    rows={3}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', boxShadow: errors[f.key] ? '0 0 0 3px rgba(244,63,94,0.1)' : 'none' }}
                  />
                ) : f.type === 'stakeholder_select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => { 
                      setFormData(d => ({ ...d, [f.key]: e.target.value })); 
                      setErrors(err => ({ ...err, [f.key]: false })); 
                    }}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="">— Select Stakeholder —</option>
                    {availableStakeholders.map(stakeholder => (
                      <option key={stakeholder.id} value={stakeholder.id}>
                        {stakeholder.name}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'target_select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    disabled={loadingTargets || !formData.stakeholder}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="">
                      {!formData.stakeholder ? 'Select stakeholder first' : 
                       loadingTargets ? 'Loading targets...' : 
                       '— Select NBSAP Target —'}
                    </option>
                    {filteredTargets.map(target => (
                      <option key={target.id} value={target.id}>
                        Target {target.id}: {target.title} ({target.progress}% complete)
                      </option>
                    ))}
                  </select>
                ) : f.type === 'indicator_select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    disabled={loadingIndicators || !formData.nbsap_target}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="">
                      {!formData.nbsap_target ? 'Select target first' :
                       loadingIndicators ? 'Loading indicators...' :
                       '— Select Indicator —'}
                    </option>
                    {availableIndicators.map(indicator => (
                      <option key={indicator.id} value={indicator.id}>
                        {indicator.name} ({indicator.status})
                      </option>
                    ))}
                  </select>
                ) : f.type === 'district_select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    disabled={loadingDistricts}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="">{loadingDistricts ? 'Loading districts…' : '— Select District —'}</option>
                    {['Kigali', 'North', 'South', 'East', 'West'].map(province => {
                      const provDistricts = allDistricts.filter(d => d.province?.name === province);
                      if (provDistricts.length === 0) return null;
                      return (
                        <optgroup key={province} label={`${province} Province`}>
                          {provDistricts.map(d => (
                            <option key={d.id} value={d.name}>{d.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                ) : f.type === 'select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="">— Select —</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    placeholder={f.placeholder}
                    min={f.type === 'number' ? 0 : undefined}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxShadow: errors[f.key] ? '0 0 0 3px rgba(244,63,94,0.1)' : 'none' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Selected Stakeholder Information */}
          {formData.stakeholder && (
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>👥</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Selected Stakeholder</div>
              </div>
              {(() => {
                const stakeholderInfo = STAKEHOLDER_RESPONSIBILITIES[formData.stakeholder as keyof typeof STAKEHOLDER_RESPONSIBILITIES];
                if (!stakeholderInfo) return null;
                
                return (
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                      {stakeholderInfo.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
                      <strong>Key Responsibilities:</strong>
                    </div>
                    <ul style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, paddingLeft: 20 }}>
                      {stakeholderInfo.responsibilities.map((responsibility, idx) => (
                        <li key={idx}>{responsibility}</li>
                      ))}
                    </ul>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 8 }}>
                      Responsible for {stakeholderInfo.targets.length} NBSAP targets
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Selected NBSAP Target Information */}
          {formData.nbsap_target && (
            <div style={{ background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: 10, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0ea5e9' }}>Selected NBSAP Target</div>
              </div>
              {(() => {
                const selectedTarget = filteredTargets.find(t => t.id === parseInt(formData.nbsap_target));
                if (!selectedTarget) return null;
                
                return (
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                      Target {selectedTarget.id}: {selectedTarget.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8, lineHeight: 1.4 }}>
                      {selectedTarget.description}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Progress: <span style={{ fontWeight: 700, color: '#10b981' }}>{selectedTarget.progress}%</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Goal: <span style={{ fontWeight: 600 }}>{selectedTarget.goal}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Selected Indicator Information */}
          {formData.indicator && (
            <div style={{ background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 10, padding: 16, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>📊</span>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a' }}>Selected Indicator</div>
              </div>
              {(() => {
                const selectedIndicator = availableIndicators.find(i => i.id === parseInt(formData.indicator));
                if (!selectedIndicator) return null;
                
                return (
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                      {selectedIndicator.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
                      {selectedIndicator.definition}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Status: <span style={{ 
                          fontWeight: 700,
                          color: selectedIndicator.status === 'on-track' ? '#16a34a' :
                                 selectedIndicator.status === 'at-risk' ? '#ea580c' : '#dc2626'
                        }}>{selectedIndicator.status}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Progress: <span style={{ fontWeight: 700, color: '#16a34a' }}>{selectedIndicator.progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            style={{ border: '2px dashed #e2e8f0', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 14, transition: '0.2s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0')}
          >
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: 6 }}>📎</span>
            <div style={{ fontSize: '0.82rem', color: '#475569' }}>Drop files or <span style={{ color: tool.accent, textDecoration: 'underline' }}>browse</span></div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>PDF · Excel (.xlsx) · Word (.docx)</div>
          </div>

          {/* Attached files */}
          {attachments.map((att, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '0.82rem' }}>📄</span>
              <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{(att.size / 1024).toFixed(1)} KB</span>
              <button type="button" onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" disabled={submitting} style={{ padding: '10px 28px', background: `linear-gradient(135deg, ${tool.color}, ${tool.accent})`, color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.88rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {submitting && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
              {submitting ? 'Submitting…' : 'Submit Report →'}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
};

// ── Success screen ────────────────────────────────────────────
const SuccessScreen = ({ tool, onAnother, onBack }: { tool: typeof TOOLKIT_TOOLS[0]; onAnother: () => void; onBack: () => void }) => (
  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center' }}>
    <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Report Submitted Successfully</h3>
    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 20 }}>{tool.name} · {new Date().toLocaleDateString()}</p>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button onClick={onAnother} style={{ padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${tool.accent}`, color: tool.accent, background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Submit Another</button>
      <button onClick={onBack} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: tool.accent, color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back to Tools</button>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────
export default function ReportingToolkitPage() {
  const [searchParams] = useSearchParams();
  const initTool = searchParams.get('tool');
  const [activeTool, setActiveTool] = useState<typeof TOOLKIT_TOOLS[0] | null>(initTool ? TOOLKIT_TOOLS.find(t => t.id === initTool) || null : null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'submissions' | 'analytics'>('submissions');
  const [toolFilter, setToolFilter] = useState('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { reports, loading, refetch } = useReports({ toolId: toolFilter !== 'ALL' ? toolFilter as ReportType : undefined, pageSize: 50 });

  const handleDelete = useCallback(async (reportId: string, toolName: string) => {
    if (!window.confirm(`Delete "${toolName}" submission? This cannot be undone.`)) return;
    const result = await deleteReport(reportId);
    if (result.error) toast.error(result.error);
    else { toast.success('Submission deleted'); refetch(); }
  }, [refetch]);

  const handleExportCSV = useCallback(() => {
    const csv = exportReportsToCSV(reports);
    if (!csv) { toast.error('No data to export'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nbsap_toolkit_${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  }, [reports]);

  const handleExportJSON = useCallback(() => {
    const json = exportReportsToJSON(reports);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `nbsap_toolkit_backup_${Date.now()}.json`;
    a.click();
    toast.success('JSON backup exported');
  }, [reports]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = await importReportsFromJSON(text);
    if (result.error) toast.error(result.error);
    else { toast.success(`Imported ${result.data?.imported} records`); refetch(); }
  }, [refetch]);

  const toolCounts: Record<string, number> = {};
  reports.forEach(r => { toolCounts[r.tool_id] = (toolCounts[r.tool_id] || 0) + 1; });

  if (activeTool && !showSuccess) {
    return <ReportForm tool={activeTool} onBack={() => { setActiveTool(null); setShowSuccess(false); }} onSuccess={() => { setShowSuccess(true); refetch(); }} />;
  }
  if (activeTool && showSuccess) {
    return <SuccessScreen tool={activeTool} onAnother={() => setShowSuccess(false)} onBack={() => { setActiveTool(null); setShowSuccess(false); }} />;
  }

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #0ea5e9' }}>
        <span style={{ fontSize: '1.5rem' }}>📝</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Integrated Reporting Modules (T01–T07)</div>
          <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: 2 }}>Structured templates linked to NBSAP targets and the 5-tier data pipeline. Each submission automatically updates target progress and indicators.</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <span style={{ fontSize: '0.65rem', padding: '3px 9px', borderRadius: 10, background: '#dcfce7', color: '#166534', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>Auto-Update</span>
          {['Quarterly','Biannual','Annual'].map(f => (
            <span key={f} style={{ fontSize: '0.65rem', padding: '3px 9px', borderRadius: 10, background: f === 'Quarterly' ? '#dcfce7' : f === 'Biannual' ? '#dbeafe' : '#fef9c3', color: f === 'Quarterly' ? '#166534' : f === 'Biannual' ? '#1e40af' : '#854d0e', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Tool cards grid — responsive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        {TOOLKIT_TOOLS.map(t => {
          const cnt = toolCounts[t.id] || 0;
          return (
            <div
              key={t.id}
              onClick={() => { setActiveTool(t); setShowSuccess(false); }}
              style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', borderTop: `3px solid ${t.accent}`, padding: 18, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
            >
              <span style={{ fontSize: '1.6rem', marginBottom: 10, display: 'block' }}>{t.icon}</span>
              <div style={{ fontSize: '0.62rem', color: t.accent, fontFamily: "'DM Mono', monospace", marginBottom: 4, letterSpacing: '0.08em' }}>{t.id} · {t.frequency}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 10 }}>→ {t.output}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 8, background: `${t.accent}22`, color: t.accent, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{t.frequency}</span>
                {cnt > 0 && <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>✓ {cnt} submitted</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submissions section */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0', padding: '0 16px' }}>
          {[['submissions', '🗂 Submissions'], ['analytics', '📊 Analytics']].map(([k, l]) => (
            <button key={k} onClick={() => setActiveSubTab(k as 'submissions' | 'analytics')} style={{ padding: '9px 16px', border: 'none', borderBottom: activeSubTab === k ? '2px solid #0ea5e9' : '2px solid transparent', marginBottom: -1, background: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: activeSubTab === k ? '#0ea5e9' : '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>
              {l}
            </button>
          ))}
        </div>

        {activeSubTab === 'submissions' && (
          <div style={{ padding: 16 }}>
            {/* Filter row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <select value={toolFilter} onChange={e => setToolFilter(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff' }}>
                <option value="ALL">All Tools</option>
                {TOOLKIT_TOOLS.map(t => <option key={t.id} value={t.id}>{t.id} – {t.name}</option>)}
              </select>
              <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid #0ea5e9', borderRadius: 8, color: '#0ea5e9', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>📥 Export CSV</button>
              <button onClick={handleExportJSON} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid #8b5cf6', borderRadius: 8, color: '#8b5cf6', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>📦 Export JSON</button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid #10b981', borderRadius: 8, color: '#10b981', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                📂 Import JSON
                <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
            ) : reports.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📥</div>
                <p style={{ fontSize: '0.85rem' }}>No submissions yet. Use a reporting tool above.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Tool', 'NBSAP Target', 'Date', 'Status', 'Key Fields', 'Submitted By', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => {
                      const tool = TOOLKIT_TOOLS.find(t => t.id === r.tool_id);
                      const statusConf = { pending: { bg: '#fef9c3', color: '#854d0e', label: '⏳ Pending' }, approved: { bg: '#dcfce7', color: '#166534', label: '✓ Approved' }, rejected: { bg: '#fee2e2', color: '#991b1b', label: '✕ Rejected' } }[r.status] || { bg: '#f1f5f9', color: '#475569', label: r.status };
                      const keyField = Object.entries(r.form_data || {}).find(([k]) => ['district','institution','company','area_name','community','study_title'].includes(k));
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.1rem' }}>{tool?.icon}</span>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.78rem' }}>{r.tool_id}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{tool?.frequency}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            {r.nbsap_target_id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.9rem' }}>🎯</span>
                                <div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>Target {r.nbsap_target_id}</div>
                                  <div style={{ fontSize: '0.65rem', color: '#10b981' }}>Linked</div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>—</div>
                            )}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#94a3b8', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }}>
                            {new Date(r.submitted_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ background: statusConf.bg, color: statusConf.color, fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{statusConf.label}</span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569', fontSize: '0.78rem' }}>
                            {keyField ? `${formatFieldLabel(keyField[0])}: ${formatFieldValue(keyField[1])}` : `${Object.keys(r.form_data || {}).length} fields`}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569', fontSize: '0.75rem' }}>
                            {r.submitted_by_profile?.full_name || r.submitted_by_profile?.email || '—'}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <button onClick={() => handleDelete(r.id, r.tool_name)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.78rem', padding: '3px 6px', borderRadius: 5 }}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'analytics' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Submissions', val: reports.length, color: '#0ea5e9' },
                { label: 'Approved', val: reports.filter(r => r.status === 'approved').length, color: '#10b981' },
                { label: 'Pending Review', val: reports.filter(r => r.status === 'pending').length, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {TOOLKIT_TOOLS.map(t => {
              const cnt = reports.filter(r => r.tool_id === t.id).length;
              const max = Math.max(...TOOLKIT_TOOLS.map(tt => reports.filter(r => r.tool_id === tt.id).length), 1);
              return (
                <div key={t.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                    <span>{t.icon} {t.id} · {t.name.split(' ').slice(0, 2).join(' ')}</span>
                    <span style={{ color: t.accent, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{cnt}</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 7 }}>
                    <div style={{ background: t.accent, width: `${(cnt / max) * 100}%`, height: 7, borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
