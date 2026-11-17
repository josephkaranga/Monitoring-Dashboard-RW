import { describe, expect, it } from 'vitest';
import type { IndicatorReference } from '../types/index';
import { referenceSummary } from './referenceSummary';

const r = (over: Partial<IndicatorReference>) => over as IndicatorReference;

describe('referenceSummary', () => {
  it('counts indicators in use only and lists missing fields, most common first', () => {
    const s = referenceSummary([
      r({ in_use: true, complete: false, gaps: ['RBIS code'], reference_status: 'draft' }),
      r({
        in_use: true,
        complete: false,
        gaps: ['RBIS code', 'formula'],
        reference_status: 'draft',
      }),
      r({ in_use: true, complete: true, gaps: [], reference_status: 'approved' }),
      r({ in_use: false, complete: false, gaps: ['unit'], reference_status: 'draft' }),
    ]);
    expect(s).toEqual({
      inUse: 3,
      complete: 1,
      approved: 1,
      missing: [
        ['RBIS code', 2],
        ['formula', 1],
      ],
    });
  });
});
