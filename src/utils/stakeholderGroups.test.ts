import { describe, it, expect } from 'vitest';
import { groupStakeholders, STAKEHOLDER_CATEGORIES } from './stakeholderGroups';

// The per-institution category now lives in the database (migration 039);
// supabase/tests/db/m01-access-scope.test.ts checks every institution has a
// valid one. This file checks grouping and ordering.

describe('groupStakeholders', () => {
  it('orders groups by category and names alphabetically inside each', () => {
    const groups = groupStakeholders([
      { code: 'RSB', name: 'Rwanda Standards Board', category: 'Boards' },
      { code: 'MoE', name: 'Ministry of Environment', category: 'Ministries' },
      {
        code: 'MINAGRI',
        name: 'Ministry of Agriculture and Animal Resources',
        category: 'Ministries',
      },
      { code: 'REMA', name: 'Rwanda Environment Management Authority', category: 'Authorities' },
    ]);
    expect(groups.map(g => g.label)).toEqual(['Ministries', 'Authorities', 'Boards']);
    expect(groups[0].items.map(i => i.code)).toEqual(['MINAGRI', 'MoE']);
  });

  it('puts unknown or missing categories last under "Other"', () => {
    const groups = groupStakeholders([
      { name: 'Unclassified body', category: 'Something new' },
      { name: 'No category' },
      { name: 'Ministry of Education', category: 'Ministries' },
    ]);
    expect(groups.map(g => g.label)).toEqual(['Ministries', 'Other']);
    expect(groups[1].items).toHaveLength(2);
  });

  it('knows the nine institution types used in the database', () => {
    expect(STAKEHOLDER_CATEGORIES).toHaveLength(9);
  });
});
