// ============================================================
// The four reporting modules' forms (T01–T04). Shared by the toolkit form
// and the bulk upload (M06): template columns and row checks come from
// these definitions.
// ============================================================

export type ToolFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'stakeholder_select'
  | 'institution_auto'
  | 'district_select'
  | 'target_select'
  | 'indicator_select';

export interface ToolField {
  key: string;
  label: string;
  type: ToolFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
}

export interface ToolkitTool {
  id: string;
  name: string;
  icon: string;
  color: string;
  accent: string;
  frequency?: string;
  output?: string;
  desc?: string;
  fields: ToolField[];
}

// ── Tool Definitions ─────────────────────────────────────────
// The four modules REMA uses (utils/reportingTools.ts).
export const TOOLKIT_TOOLS: ToolkitTool[] = [
  {
    id: 'T01',
    name: 'National Institutional Reporting',
    icon: '🏛️',
    color: '#1B6CA8',
    accent: '#4CA3DD',
    frequency: 'Quarterly',
    output: 'Institutional Compliance Scorecard',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'institution',
        label: 'Lead Institution',
        type: 'institution_auto',
        required: true,
      },
      {
        key: 'period',
        label: 'Reporting Period',
        type: 'select',
        options: [
          'Q1 2025',
          'Q2 2025',
          'Q3 2025',
          'Q4 2025',
          'Q1 2026',
          'Q2 2026',
          'Q3 2026',
          'Q4 2026',
          'Q1 2027',
          'Q2 2027',
          'Q3 2027',
          'Q4 2027',
          'Q1 2028',
          'Q2 2028',
          'Q3 2028',
          'Q4 2028',
          'Q1 2029',
          'Q2 2029',
          'Q3 2029',
          'Q4 2029',
          'Q1 2030',
          'Q2 2030',
          'Q3 2030',
          'Q4 2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'reported_value',
        label: 'Reported Value',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'budget_utilized',
        label: 'Budget Utilized (RWF)',
        type: 'number',
        placeholder: 'e.g. 5000000 for 5M RWF',
        hint: 'Enter the exact amount in Rwandan Francs (RWF)',
        required: true,
      },
      {
        key: 'activities',
        label: 'Implementation Activities',
        type: 'textarea',
        placeholder: 'Describe completed activities...',
        required: true,
      },
      {
        key: 'challenges',
        label: 'Challenges Encountered',
        type: 'textarea',
        placeholder: 'Describe constraints...',
        required: false,
      },
    ],
  },
  {
    id: 'T02',
    name: 'District Biodiversity Monitoring',
    icon: '🌿',
    color: '#1E7D4B',
    accent: '#4CBB7F',
    frequency: 'Quarterly',
    output: 'District Biodiversity Performance Index',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      { key: 'district', label: 'District Name', type: 'district_select', required: true },
      {
        key: 'officer',
        label: 'Reporting Officer',
        type: 'text',
        placeholder: 'Officer name',
        required: true,
      },
      {
        key: 'period',
        label: 'Reporting Period',
        type: 'select',
        options: [
          'Q1 2025',
          'Q2 2025',
          'Q3 2025',
          'Q4 2025',
          'Q1 2026',
          'Q2 2026',
          'Q3 2026',
          'Q4 2026',
          'Q1 2027',
          'Q2 2027',
          'Q3 2027',
          'Q4 2027',
          'Q1 2028',
          'Q2 2028',
          'Q3 2028',
          'Q4 2028',
          'Q1 2029',
          'Q2 2029',
          'Q3 2029',
          'Q4 2029',
          'Q1 2030',
          'Q2 2030',
          'Q3 2030',
          'Q4 2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'forest_ha',
        label: 'Forest Restoration (ha)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'wetland_ha',
        label: 'Wetland Rehabilitation (ha)',
        type: 'number',
        placeholder: '0',
        required: true,
      },
      {
        key: 'agroforestry_hh',
        label: 'Agroforestry Households',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'soil_structures',
        label: 'Soil Conservation Structures',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'conservation_groups',
        label: 'Conservation Groups',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'illegal_cases',
        label: 'Illegal Activities Reported',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'notes',
        label: 'Additional Notes',
        type: 'textarea',
        placeholder: 'Any observations...',
        required: false,
      },
    ],
  },
  {
    id: 'T03',
    name: 'Private Sector Compliance',
    icon: '🏗️',
    color: '#922B21',
    accent: '#E74C3C',
    frequency: 'Annual',
    output: 'Private-Sector Compliance Index',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'company',
        label: 'Company Name',
        type: 'text',
        placeholder: 'Company name',
        required: true,
      },
      {
        key: 'sector',
        label: 'Sector',
        type: 'select',
        options: [
          'Infrastructure',
          'Agribusiness',
          'Mining',
          'Tourism',
          'Finance / Investment',
          'Other',
        ],
        required: true,
      },
      {
        key: 'year',
        label: 'Reporting Year',
        type: 'select',
        options: [
          '2020',
          '2021',
          '2022',
          '2023',
          '2024',
          '2025',
          '2026',
          '2027',
          '2028',
          '2029',
          '2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'eia_compliance',
        label: 'EIA Compliance',
        type: 'select',
        options: ['Full compliance', 'Partial compliance', 'Non-compliant', 'Not applicable'],
        required: true,
      },
      {
        key: 'restoration_ha',
        label: 'Restoration Commitments (ha)',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'esg_score',
        label: 'ESG Biodiversity Score (1–100)',
        type: 'number',
        placeholder: '0',
        required: false,
      },
      {
        key: 'waste_management',
        label: 'Waste Management Rating',
        type: 'select',
        options: ['Excellent', 'Good', 'Fair', 'Poor'],
        required: false,
      },
    ],
  },
  {
    id: 'T04',
    name: 'Research & Academic Contribution',
    icon: '🔬',
    color: '#1A5276',
    accent: '#2E86C1',
    frequency: 'Annual',
    output: 'Biodiversity Evidence Repository',
    fields: [
      {
        key: 'stakeholder',
        label: 'Reporting Stakeholder',
        type: 'stakeholder_select',
        required: true,
      },
      {
        key: 'institution',
        label: 'Lead Institution',
        type: 'text',
        placeholder: 'University or institute',
        required: true,
      },
      {
        key: 'study_title',
        label: 'Study Title',
        type: 'text',
        placeholder: 'Full title',
        required: true,
      },
      {
        key: 'year',
        label: 'Year Completed',
        type: 'select',
        options: [
          '2020',
          '2021',
          '2022',
          '2023',
          '2024',
          '2025',
          '2026',
          '2027',
          '2028',
          '2029',
          '2030',
        ],
        required: true,
      },
      { key: 'nbsap_target', label: 'NBSAP Target', type: 'target_select', required: true },
      { key: 'indicator', label: 'Related Indicator', type: 'indicator_select', required: true },
      {
        key: 'ecosystem_assessed',
        label: 'Ecosystem Assessed',
        type: 'select',
        options: ['Forest', 'Wetland', 'Savanna', 'Aquatic', 'Agricultural', 'Urban', 'Multiple'],
        required: true,
      },
      {
        key: 'key_findings',
        label: 'Key Findings Summary',
        type: 'textarea',
        placeholder: 'Summarize main findings...',
        required: true,
      },
      {
        key: 'policy_relevance',
        label: 'Policy Relevance & NBSAP Linkage',
        type: 'textarea',
        placeholder: 'How does this support NBSAP?',
        required: false,
      },
    ],
  },
];
