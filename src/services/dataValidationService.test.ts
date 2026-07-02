// ============================================================
// Data Validation & Consistency Checks — Unit Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolId, type ProgressCalculation } from '../types/automaticReporting';
import {
  validateProgressValue,
  clampProgress,
  validateToolWeightValue,
  validateToolWeightsSum,
  validateTargetProgressRow,
  validateProgressCalculation,
  auditTargetProgressIntegrity,
} from './dataValidationService';

const { mockFrom, mockState } = vi.hoisted(() => {
  const mockState = {
    targets: [] as Array<{ id: number; progress: number; auto_update_count: number | null }>,
    error: null as { message: string } | null,
  };

  const mockFrom = vi.fn((table: string) => {
    if (table !== 'nbsap_targets') throw new Error(`Unexpected table in test: ${table}`);
    return {
      select: () => Promise.resolve({ data: mockState.targets, error: mockState.error }),
    };
  });

  return { mockFrom, mockState };
});

vi.mock('../utils/supabase', () => ({
  supabase: { from: mockFrom },
}));

function makeCalculation(overrides: Partial<ProgressCalculation> = {}): ProgressCalculation {
  return {
    targetId: 1,
    toolId: ToolId.T01,
    toolWeight: 0.25,
    baseContribution: 10,
    weightedContribution: 2.5,
    previousProgress: 30,
    newProgress: 32.5,
    calculatedAt: new Date(),
    reportId: 'report-1',
    ...overrides,
  };
}

describe('validateProgressValue', () => {
  it('accepts values within 0-100', () => {
    expect(validateProgressValue(0).valid).toBe(true);
    expect(validateProgressValue(50).valid).toBe(true);
    expect(validateProgressValue(100).valid).toBe(true);
  });

  it('rejects values outside 0-100', () => {
    expect(validateProgressValue(-1).valid).toBe(false);
    expect(validateProgressValue(101).valid).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(validateProgressValue(NaN).valid).toBe(false);
    expect(validateProgressValue(Infinity).valid).toBe(false);
  });
});

describe('clampProgress', () => {
  it('clamps values to the 0-100 range', () => {
    expect(clampProgress(-5)).toBe(0);
    expect(clampProgress(105)).toBe(100);
    expect(clampProgress(42)).toBe(42);
  });
});

describe('validateToolWeightValue', () => {
  it('accepts weights between 0 and 1', () => {
    expect(validateToolWeightValue(0).valid).toBe(true);
    expect(validateToolWeightValue(0.25).valid).toBe(true);
    expect(validateToolWeightValue(1).valid).toBe(true);
  });

  it('rejects weights outside 0-1', () => {
    expect(validateToolWeightValue(-0.1).valid).toBe(false);
    expect(validateToolWeightValue(1.5).valid).toBe(false);
  });
});

describe('validateToolWeightsSum', () => {
  it('accepts the predefined tool weights, which sum to 1.0', () => {
    const check = validateToolWeightsSum();
    expect(check.valid).toBe(true);
    expect(check.issues).toHaveLength(0);
  });

  it('flags a set of weights that does not sum to 1.0', () => {
    const check = validateToolWeightsSum({
      [ToolId.T01]: 0.5,
      [ToolId.T02]: 0.5,
      [ToolId.T03]: 0.5,
      [ToolId.T04]: 0,
      [ToolId.T05]: 0,
      [ToolId.T06]: 0,
      [ToolId.T07]: 0,
    });

    expect(check.valid).toBe(false);
    expect(check.issues.some(i => i.field === 'weights')).toBe(true);
  });

  it('flags individual out-of-range weights', () => {
    const check = validateToolWeightsSum({
      [ToolId.T01]: 1.5,
      [ToolId.T02]: -0.5,
      [ToolId.T03]: 0,
      [ToolId.T04]: 0,
      [ToolId.T05]: 0,
      [ToolId.T06]: 0,
      [ToolId.T07]: 0,
    });

    expect(check.valid).toBe(false);
    expect(check.issues.some(i => i.field === ToolId.T01)).toBe(true);
    expect(check.issues.some(i => i.field === ToolId.T02)).toBe(true);
  });
});

describe('validateTargetProgressRow', () => {
  it('accepts a valid target row', () => {
    expect(validateTargetProgressRow({ id: 1, progress: 50, auto_update_count: 3 }).valid).toBe(
      true
    );
  });

  it('flags a progress value outside the 0-100 range', () => {
    const check = validateTargetProgressRow({ id: 1, progress: 150, auto_update_count: 0 });
    expect(check.valid).toBe(false);
    expect(check.issues[0].field).toContain('target 1');
  });

  it('flags a negative auto_update_count', () => {
    const check = validateTargetProgressRow({ id: 2, progress: 50, auto_update_count: -1 });
    expect(check.valid).toBe(false);
    expect(check.issues.some(i => i.message.includes('cannot be negative'))).toBe(true);
  });

  it('allows a missing auto_update_count', () => {
    expect(validateTargetProgressRow({ id: 3, progress: 50, auto_update_count: null }).valid).toBe(
      true
    );
  });
});

describe('validateProgressCalculation', () => {
  it('accepts a consistent calculation', () => {
    expect(validateProgressCalculation(makeCalculation()).valid).toBe(true);
  });

  it('flags a weighted contribution that does not match base * weight', () => {
    const check = validateProgressCalculation(makeCalculation({ weightedContribution: 999 }));
    expect(check.valid).toBe(false);
    expect(check.issues.some(i => i.field === 'weightedContribution')).toBe(true);
  });

  it('flags a new progress value that does not match previous + weighted contribution', () => {
    const check = validateProgressCalculation(makeCalculation({ newProgress: 999 }));
    expect(check.valid).toBe(false);
    expect(check.issues.some(i => i.field === 'newProgress')).toBe(true);
  });

  it('clamps the expected new progress to 100 when the sum exceeds it', () => {
    const check = validateProgressCalculation(
      makeCalculation({
        previousProgress: 99,
        baseContribution: 5,
        toolWeight: 1,
        weightedContribution: 5,
        newProgress: 100,
      })
    );
    expect(check.valid).toBe(true);
  });
});

describe('auditTargetProgressIntegrity', () => {
  beforeEach(() => {
    mockState.targets = [];
    mockState.error = null;
  });

  it('reports no issues when all targets are within range', async () => {
    mockState.targets = [
      { id: 1, progress: 50, auto_update_count: 2 },
      { id: 2, progress: 100, auto_update_count: 0 },
    ];

    const check = await auditTargetProgressIntegrity();
    expect(check.valid).toBe(true);
  });

  it('reports issues for out-of-range targets', async () => {
    mockState.targets = [
      { id: 1, progress: 150, auto_update_count: 2 },
      { id: 2, progress: 50, auto_update_count: -3 },
    ];

    const check = await auditTargetProgressIntegrity();
    expect(check.valid).toBe(false);
    expect(check.issues).toHaveLength(2);
  });

  it('reports an error when the targets cannot be loaded', async () => {
    mockState.error = { message: 'connection failed' };

    const check = await auditTargetProgressIntegrity();
    expect(check.valid).toBe(false);
    expect(check.issues[0].message).toBe('connection failed');
  });
});
