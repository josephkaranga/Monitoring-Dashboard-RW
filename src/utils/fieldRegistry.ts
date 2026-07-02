/**
 * UI interpretation layer for form_data fields.
 *
 * This file maps string keys to display metadata (section, label, format).
 * It does NOT import tool definitions or validation contracts — coupling
 * is via shared string keys only, so either side can evolve independently.
 */

// ── Field metadata ──────────────────────────────────────────
export interface FieldMeta {
  section: string;
  label: string;
  format?: 'number' | 'currency' | 'percent' | 'text';
}

// ── Registry: string key → display metadata ─────────────────
// Sections and labels are stable display concerns.
// If a backend key is renamed, add the new key here — the old
// one becomes an unknown that falls into "Other".
const FIELD_REGISTRY: Record<string, FieldMeta> = {
  // ── Identity & context ──────────────────────────────────
  stakeholder: { section: 'Reporting Context', label: 'Reporting Stakeholder' },
  institution: { section: 'Reporting Context', label: 'Institution' },
  institution_type: { section: 'Reporting Context', label: 'Institution Type' },
  period: { section: 'Reporting Context', label: 'Reporting Period' },
  year: { section: 'Reporting Context', label: 'Year' },
  officer: { section: 'Reporting Context', label: 'Reporting Officer' },
  reporter: { section: 'Reporting Context', label: 'Reporter / Group' },
  reporter_type: { section: 'Reporting Context', label: 'Reporter Type' },
  company: { section: 'Reporting Context', label: 'Company' },
  sector: { section: 'Reporting Context', label: 'Sector' },
  agency: { section: 'Reporting Context', label: 'Managing Agency' },

  // ── Location ────────────────────────────────────────────
  district: { section: 'Location', label: 'District' },
  community: { section: 'Location', label: 'Community / Village' },
  area_name: { section: 'Location', label: 'Protected Area' },

  // ── NBSAP linkage ───────────────────────────────────────
  nbsap_target: { section: 'NBSAP Linkage', label: 'NBSAP Target' },
  indicator: { section: 'NBSAP Linkage', label: 'Related Indicator' },
  current_status: { section: 'NBSAP Linkage', label: 'Current Status / Value', format: 'number' },

  // ── Biodiversity data ───────────────────────────────────
  forest_ha: { section: 'Biodiversity Data', label: 'Forest Restoration (ha)', format: 'number' },
  wetland_ha: {
    section: 'Biodiversity Data',
    label: 'Wetland Rehabilitation (ha)',
    format: 'number',
  },
  agroforestry_hh: {
    section: 'Biodiversity Data',
    label: 'Agroforestry Households',
    format: 'number',
  },
  soil_structures: {
    section: 'Biodiversity Data',
    label: 'Soil Conservation Structures',
    format: 'number',
  },
  conservation_groups: {
    section: 'Biodiversity Data',
    label: 'Conservation Groups',
    format: 'number',
  },
  coverage_change_ha: {
    section: 'Biodiversity Data',
    label: 'Coverage Change (ha)',
    format: 'number',
  },
  species_trend: { section: 'Biodiversity Data', label: 'Species Population Trend' },
  habitat_quality: {
    section: 'Biodiversity Data',
    label: 'Habitat Quality (1–10)',
    format: 'number',
  },
  restoration_ha: { section: 'Biodiversity Data', label: 'Restoration (ha)', format: 'number' },
  ecosystem_assessed: { section: 'Biodiversity Data', label: 'Ecosystem Assessed' },
  species_sightings: { section: 'Biodiversity Data', label: 'Species Sightings' },

  // ── Human-wildlife & enforcement ────────────────────────
  hwc_incidents: {
    section: 'Wildlife & Enforcement',
    label: 'Human-Wildlife Conflict Incidents',
    format: 'number',
  },
  illegal_cases: {
    section: 'Wildlife & Enforcement',
    label: 'Illegal Activities Reported',
    format: 'number',
  },
  tree_planting_hh: {
    section: 'Wildlife & Enforcement',
    label: 'Tree Planting Households',
    format: 'number',
  },
  water_source_status: { section: 'Wildlife & Enforcement', label: 'Water Source Condition' },

  // ── Finance ─────────────────────────────────────────────
  budget_utilized: { section: 'Finance', label: 'Budget Utilized (RWF)', format: 'currency' },
  budget_allocated: { section: 'Finance', label: 'Budget Allocated (RWF)', format: 'currency' },
  budget_disbursed: { section: 'Finance', label: 'Budget Disbursed (RWF)', format: 'currency' },
  implementation_pct: { section: 'Finance', label: 'Implementation Status', format: 'percent' },
  activity_funded: { section: 'Finance', label: 'Activity / Program Funded' },

  // ── Compliance ──────────────────────────────────────────
  eia_compliance: { section: 'Compliance', label: 'EIA Compliance' },
  esg_score: { section: 'Compliance', label: 'ESG Biodiversity Score (1–100)', format: 'number' },
  waste_management: { section: 'Compliance', label: 'Waste Management Rating' },

  // ── Research ────────────────────────────────────────────
  study_title: { section: 'Research', label: 'Study Title' },
  key_findings: { section: 'Research', label: 'Key Findings' },
  policy_relevance: { section: 'Research', label: 'Policy Relevance & NBSAP Linkage' },

  // ── Narrative ───────────────────────────────────────────
  activities: { section: 'Narrative', label: 'Implementation Activities' },
  challenges: { section: 'Narrative', label: 'Challenges Encountered' },
  observations: { section: 'Narrative', label: 'Field Observations' },
  notes: { section: 'Narrative', label: 'Additional Notes' },
};

// ── Section display order ───────────────────────────────────
const SECTION_ORDER = [
  'Reporting Context',
  'Location',
  'NBSAP Linkage',
  'Biodiversity Data',
  'Wildlife & Enforcement',
  'Finance',
  'Compliance',
  'Research',
  'Narrative',
  'Other',
];

// ── Lookup: exact match or fallback ─────────────────────────
// Priority: registry exact match → fallback.
// No normalization, no inference, no key transformation.
// If the key isn't registered, it goes to "Other" with an
// auto-generated label. Register new keys explicitly.
export function lookupField(key: string): FieldMeta {
  const match = FIELD_REGISTRY[key];
  if (match) return match;

  const label = key.replace(/[_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { section: 'Other', label };
}

// ── Section ordering helper ─────────────────────────────────
export function sectionSortIndex(sectionName: string): number {
  const idx = SECTION_ORDER.indexOf(sectionName);
  return idx >= 0 ? idx : SECTION_ORDER.length;
}
