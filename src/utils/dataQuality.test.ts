import { describe, expect, it } from 'vitest';
import type { DqaChecklistItem, QualityFlag } from '../types/index';
import {
  declarationPayload,
  isChecklistComplete,
  qualityErrors,
  validatorAttention,
} from './dataQuality';

const item = (id: number, is_active = true): DqaChecklistItem => ({
  id,
  ordinal: id,
  text: `Item ${id}`,
  source: null,
  is_active,
});

describe('isChecklistComplete (mirrors dqa_checklist_complete)', () => {
  const items = [item(1), item(2), item(3, false)];

  it('needs every active item and the declaration', () => {
    expect(isChecklistComplete(items, { declared: true, items: [1, 2] })).toBe(true);
    expect(isChecklistComplete(items, { declared: true, items: [1] })).toBe(false);
    expect(isChecklistComplete(items, { declared: false, items: [1, 2] })).toBe(false);
  });

  it('ignores inactive items', () => {
    expect(isChecklistComplete(items, { declared: true, items: [1, 2, 3] })).toBe(true);
  });
});

describe('declarationPayload', () => {
  it('sends only the declaration and sorted item ids (author and time are set by the database)', () => {
    expect(
      declarationPayload({
        declared: true,
        items: [3, 1],
        declared_by: 'forged',
        declared_at: '2020-01-01',
      })
    ).toEqual({ declared: true, items: [1, 3] });
  });
});

describe('flags', () => {
  const flags: QualityFlag[] = [
    { code: 'no_target', severity: 'warning', message: 'No target' },
    { code: 'below_min', severity: 'error', message: 'Negative' },
    { code: 'jump', severity: 'warning', message: 'Jump' },
  ];

  it('separates errors from warnings', () => {
    expect(qualityErrors(flags).map(f => f.code)).toEqual(['below_min']);
    expect(qualityErrors(undefined)).toEqual([]);
  });

  it('puts jumps first for validators', () => {
    expect(validatorAttention(flags).map(f => f.code)).toEqual(['jump', 'no_target']);
  });
});
