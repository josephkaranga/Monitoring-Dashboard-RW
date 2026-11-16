import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { groupStakeholders, stakeholderCategory } from './stakeholderGroups';

/** Keys of STAKEHOLDER_RESPONSIBILITIES, read from the page source. */
function stakeholderKeysInToolkit(): string[] {
  const src = readFileSync(resolve(__dirname, '../pages/ReportingToolkitPage.tsx'), 'utf8').replace(
    /\r\n/g,
    '\n'
  );
  const start = src.indexOf('const STAKEHOLDER_RESPONSIBILITIES');
  const end = src.indexOf('\n};', start);
  const block = src.slice(start, end);
  const re = /^ {2}(?:'([^']+)'|([A-Za-z0-9_]+)): \{$/gm;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) keys.push(m[1] ?? m[2]);
  return keys;
}

describe('stakeholder groups', () => {
  it('assigns every toolkit stakeholder to a named category', () => {
    const keys = stakeholderKeysInToolkit();
    expect(keys.length).toBeGreaterThan(80);
    const uncategorised = keys.filter(k => stakeholderCategory(k) === 'Other');
    expect(uncategorised).toEqual([]);
  });

  it('puts ministries, authorities and boards in their own groups', () => {
    expect(stakeholderCategory('MINAGRI')).toBe('Ministries');
    expect(stakeholderCategory('REMA')).toBe('Authorities');
    expect(stakeholderCategory('RSB')).toBe('Boards');
  });

  it('orders groups by category and names alphabetically inside each', () => {
    const groups = groupStakeholders([
      { id: 'RSB', name: 'Rwanda Standards Board' },
      { id: 'MoE', name: 'Ministry of Environment' },
      { id: 'MINAGRI', name: 'Ministry of Agriculture and Animal Resources' },
      { id: 'REMA', name: 'Rwanda Environment Management Authority' },
      { id: 'NEW', name: 'Not yet categorised' },
    ]);
    expect(groups.map(g => g.label)).toEqual(['Ministries', 'Authorities', 'Boards', 'Other']);
    expect(groups[0].items.map(i => i.id)).toEqual(['MINAGRI', 'MoE']);
  });
});
