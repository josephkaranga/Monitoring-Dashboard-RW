// ============================================================
// Stakeholder groups for the "Reporting Stakeholder" dropdown.
// Requested 15 Nov 2026: group stakeholders by institution type
// (all ministries together, all boards together, all authorities
// together, ...). Categories are explicit per stakeholder key so REMA can
// correct any assignment here; nothing is inferred from names.
// M01 moves stakeholders and their type into the database.
// ============================================================

export const STAKEHOLDER_CATEGORIES = [
  'Ministries',
  'Authorities',
  'Boards',
  'Agencies and other public institutions',
  'Local government',
  'Development partners and international organisations',
  'NGOs and civil society',
  'Academia and research',
  'Private sector',
] as const;

export type StakeholderCategory = (typeof STAKEHOLDER_CATEGORIES)[number] | 'Other';

const CATEGORY_BY_KEY: Record<string, StakeholderCategory> = {
  // Ministries
  MoE: 'Ministries',
  MINAGRI: 'Ministries',
  MINECOFIN: 'Ministries',
  MININFRA: 'Ministries',
  MINICOM: 'Ministries',
  MINALOC: 'Ministries',
  MINEDUC: 'Ministries',
  MINEMA: 'Ministries',
  // Authorities
  REMA: 'Authorities',
  RFA: 'Authorities',
  NLA: 'Authorities',
  RICA: 'Authorities',
  RRA: 'Authorities',
  FDA: 'Authorities',
  RURA: 'Authorities',
  RHA: 'Authorities',
  RPPA: 'Authorities',
  'Rwanda Civil Aviation': 'Authorities',
  // Boards
  RDB: 'Boards',
  RWB: 'Boards',
  RAB: 'Boards',
  RMB: 'Boards',
  RSB: 'Boards',
  NAEB: 'Boards',
  // Agencies and other public institutions
  NISR: 'Agencies and other public institutions',
  BNR: 'Agencies and other public institutions',
  RGF: 'Agencies and other public institutions',
  NIRDA: 'Agencies and other public institutions',
  NCST: 'Agencies and other public institutions',
  'Rwanda Space Agency': 'Agencies and other public institutions',
  'Meteo Rwanda': 'Agencies and other public institutions',
  LODA: 'Agencies and other public institutions',
  WASAC: 'Agencies and other public institutions',
  SGF: 'Agencies and other public institutions',
  REG: 'Agencies and other public institutions',
  RCHA: 'Agencies and other public institutions',
  'National Police (Marine)': 'Agencies and other public institutions',
  // Local government
  'District Authorities': 'Local government',
  'Kigali City': 'Local government',
  // Development partners and international organisations
  IUCN: 'Development partners and international organisations',
  'African Parks': 'Development partners and international organisations',
  IGCP: 'Development partners and international organisations',
  Karisoke: 'Development partners and international organisations',
  AWF: 'Development partners and international organisations',
  WCS: 'Development partners and international organisations',
  ICRAF: 'Development partners and international organisations',
  GIZ: 'Development partners and international organisations',
  SNV: 'Development partners and international organisations',
  GGGI: 'Development partners and international organisations',
  WRI: 'Development partners and international organisations',
  FAO: 'Development partners and international organisations',
  UNDP: 'Development partners and international organisations',
  ILO: 'Development partners and international organisations',
  'One Tree Planted': 'Development partners and international organisations',
  'One Acre Fund': 'Development partners and international organisations',
  'Bridge to Rwanda': 'Development partners and international organisations',
  // NGOs and civil society
  ARCOS: 'NGOs and civil society',
  'Nature Rwanda': 'NGOs and civil society',
  RWCA: 'NGOs and civil society',
  RECOR: 'NGOs and civil society',
  'Prime Biodiversity Conservation': 'NGOs and civil society',
  ARECO: 'NGOs and civil society',
  'Partners for Conservation': 'NGOs and civil society',
  'Forest of Hope Association': 'NGOs and civil society',
  ROAM: 'NGOs and civil society',
  'Urugaga Imbaraga': 'NGOs and civil society',
  'ACORD Rwanda': 'NGOs and civil society',
  WCSS: 'NGOs and civil society',
  PFC: 'NGOs and civil society',
  ARDI: 'NGOs and civil society',
  RYBN: 'NGOs and civil society',
  ADRRES: 'NGOs and civil society',
  LWD: 'NGOs and civil society',
  // Academia and research
  CoEB: 'Academia and research',
  CPCIC: 'Academia and research',
  // Private sector
  PSF: 'Private sector',
  'Q&A Venue Solution': 'Private sector',
  'Eco-planet Bamboo': 'Private sector',
  'Ultimate Forest': 'Private sector',
  'Nyungwe Management Company': 'Private sector',
  'Rwanda Mountain Tea': 'Private sector',
  'ESS OIL': 'Private sector',
  IKIREZI: 'Private sector',
};

export function stakeholderCategory(key: string): StakeholderCategory {
  return CATEGORY_BY_KEY[key] ?? 'Other';
}

export interface StakeholderGroup<T> {
  label: StakeholderCategory;
  items: T[];
}

/**
 * Group stakeholders for an <optgroup> dropdown: categories in a fixed
 * order, names alphabetical inside each, unknown keys last under "Other",
 * empty categories omitted.
 */
export function groupStakeholders<T extends { id: string; name: string }>(
  stakeholders: T[]
): StakeholderGroup<T>[] {
  const order: StakeholderCategory[] = [...STAKEHOLDER_CATEGORIES, 'Other'];
  const byCat = new Map<StakeholderCategory, T[]>();
  for (const s of stakeholders) {
    const cat = stakeholderCategory(s.id);
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(s);
  }
  return order
    .filter(cat => byCat.has(cat))
    .map(cat => ({
      label: cat,
      items: byCat.get(cat)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
