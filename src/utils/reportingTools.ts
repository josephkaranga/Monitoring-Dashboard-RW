// The four reporting modules REMA uses (confirmed 17 Nov 2026). The
// database matches: report_type T01-T04 and tool_weights (0.40, 0.35,
// 0.15, 0.10). Earlier modules (protected areas, community monitoring,
// finance tracking) are retired; their old reports carry *_LEGACY codes.
// Every screen takes module names, colours and icons from here.

export interface ReportingModule {
  id: 'T01' | 'T02' | 'T03' | 'T04';
  /** Full name, as in the database (tool_weights.description). */
  name: string;
  /** Short label for menus and charts. */
  short: string;
  color: string;
  emoji: string;
  /** Font Awesome icon name (without the fa- prefix). */
  faIcon: string;
}

export const REPORTING_MODULES: readonly ReportingModule[] = [
  {
    id: 'T01',
    name: 'National Institutional Reporting',
    short: 'Institutional',
    color: '#1B6CA8',
    emoji: '\u{1F3DB}️',
    faIcon: 'landmark',
  },
  {
    id: 'T02',
    name: 'District Biodiversity Monitoring',
    short: 'District',
    color: '#1E7D4B',
    emoji: '\u{1F33F}',
    faIcon: 'tree',
  },
  {
    id: 'T03',
    name: 'Private Sector Compliance',
    short: 'Private Sector',
    color: '#922B21',
    emoji: '\u{1F3D7}️',
    faIcon: 'building',
  },
  {
    id: 'T04',
    name: 'Research & Academic Contribution',
    short: 'Research',
    color: '#1A5276',
    emoji: '\u{1F52C}',
    faIcon: 'flask',
  },
];

export const ENABLED_TOOL_IDS = REPORTING_MODULES.map(m => m.id);

export function isToolEnabled(toolId: string | null | undefined): boolean {
  return REPORTING_MODULES.some(m => m.id === toolId);
}

export function reportingModule(toolId: string | null | undefined): ReportingModule | undefined {
  return REPORTING_MODULES.find(m => m.id === toolId);
}

/** { T01: value, ... } for the four modules. */
export function moduleMap<T>(pick: (m: ReportingModule) => T): Record<string, T> {
  return Object.fromEntries(REPORTING_MODULES.map(m => [m.id, pick(m)]));
}
