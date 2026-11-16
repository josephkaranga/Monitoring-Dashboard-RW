import { describe, it, expect, vi } from 'vitest';

vi.mock('../utils/supabase', () => ({ supabase: {} }));

import { allowedDistrictIds, districtName, friendlyDbError } from './institutionService';
import type { UserScope } from '../types/index';

const scope = (over: Partial<UserScope>): UserScope => ({
  id: 1,
  user_id: 'u',
  scope_role: 'data_entry',
  institution_id: 10,
  district_id: null,
  sector_id: null,
  granted_by: null,
  granted_at: '2026-11-16T00:00:00Z',
  ...over,
});

describe('allowedDistrictIds', () => {
  it('returns null (any district) for an institution-wide scope', () => {
    expect(allowedDistrictIds([scope({})], 10)).toBeNull();
  });

  it('returns the scoped districts for a district-specific scope', () => {
    const scopes = [scope({ district_id: 12 }), scope({ id: 2, district_id: 7 })];
    expect(allowedDistrictIds(scopes, 10)).toEqual([12, 7]);
  });

  it('ignores other institutions and other scope roles', () => {
    const scopes = [
      scope({ institution_id: 99 }),
      scope({ id: 2, scope_role: 'institution_admin', district_id: 3 }),
    ];
    expect(allowedDistrictIds(scopes, 10)).toEqual([]);
  });
});

describe('friendlyDbError', () => {
  it('explains permission and duplicate refusals', () => {
    expect(friendlyDbError('new row violates row-level security policy')).toMatch(/permission/);
    expect(friendlyDbError('duplicate key value violates unique constraint')).toMatch(/already/);
    expect(friendlyDbError('Choose the district')).toBe('Choose the district');
  });
});

describe('districtName', () => {
  it('names a district, or says which id is unknown', () => {
    const ds = [{ id: 1, name: 'Musanze' }];
    expect(districtName(ds, 1)).toBe('Musanze');
    expect(districtName(ds, 2)).toBe('District 2');
    expect(districtName(ds, null)).toBe('');
  });
});
