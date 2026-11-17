// M05 — completeness of indicator reference data, for the indicators page.
import type { IndicatorReference } from '../types/index';

export interface ReferenceSummary {
  inUse: number;
  complete: number;
  approved: number;
  /** [field, number of indicators in use missing it], most common first */
  missing: [string, number][];
}

export function referenceSummary(refs: IndicatorReference[]): ReferenceSummary {
  const inUse = refs.filter(r => r.in_use);
  const counts = new Map<string, number>();
  for (const r of inUse) for (const g of r.gaps) counts.set(g, (counts.get(g) ?? 0) + 1);
  return {
    inUse: inUse.length,
    complete: inUse.filter(r => r.complete).length,
    approved: inUse.filter(r => r.reference_status === 'approved').length,
    missing: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}
