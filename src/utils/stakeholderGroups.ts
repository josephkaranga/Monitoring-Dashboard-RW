// ============================================================
// Stakeholder groups for the "Reporting Stakeholder" dropdown.
// Requested 15 Nov 2026: group stakeholders by institution type
// (all ministries together, all boards together, all authorities
// together, ...). Since M01 the category is stored per institution in
// the database (institutions.category, migration 039), where REMA can
// correct it; this module only orders and groups.
// ============================================================

import type { InstitutionCategory } from '../types/index';

export const STAKEHOLDER_CATEGORIES: InstitutionCategory[] = [
  'Ministries',
  'Authorities',
  'Boards',
  'Agencies and other public institutions',
  'Local government',
  'Development partners and international organisations',
  'NGOs and civil society',
  'Academia and research',
  'Private sector',
];

export interface StakeholderGroup<T> {
  label: InstitutionCategory | 'Other';
  items: T[];
}

/**
 * Group for an <optgroup> dropdown: categories in a fixed order, names
 * alphabetical inside each, unknown categories last under "Other",
 * empty categories omitted.
 */
export function groupStakeholders<T extends { name: string; category?: string | null }>(
  stakeholders: T[]
): StakeholderGroup<T>[] {
  const known = new Set<string>(STAKEHOLDER_CATEGORIES);
  const byCat = new Map<string, T[]>();
  for (const s of stakeholders) {
    const cat = s.category && known.has(s.category) ? s.category : 'Other';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(s);
  }
  return [...STAKEHOLDER_CATEGORIES, 'Other' as const]
    .filter(cat => byCat.has(cat))
    .map(cat => ({
      label: cat,
      items: byCat.get(cat)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
