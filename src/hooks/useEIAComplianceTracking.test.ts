// ============================================================
// EIA Compliance Tracker — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ComplianceState } from '../types/automaticReporting';
import {
  calculateEIAMetrics,
  getCurrentQuarterLabel,
  getEIAComplianceState,
  useEIAComplianceTracking,
} from './useEIAComplianceTracking';

const { mockFrom, mockChannel, mockRemoveChannel, state } = vi.hoisted(() => {
  const state = {
    reports: [] as Array<{ form_data: Record<string, unknown> | null }>,
    fetchError: null as { message: string } | null,
    postgresChangesCallback: null as (() => void) | null,
  };

  function chainable(data: unknown, error: unknown) {
    const result = Promise.resolve({ data, error }) as Promise<{ data: unknown; error: unknown }> & {
      eq: () => ReturnType<typeof chainable>;
    };
    result.eq = () => chainable(data, error);
    return result;
  }

  const mockFrom = vi.fn((table: string) => {
    if (table !== 'toolkit_reports') throw new Error(`Unexpected table in test: ${table}`);
    return {
      select: () => ({
        eq: () => chainable(state.reports, state.fetchError),
      }),
    };
  });

  const mockRemoveChannel = vi.fn();

  const mockChannel = vi.fn(() => ({
    on: (_event: string, _filter: unknown, callback: () => void) => {
      state.postgresChangesCallback = callback;
      return { subscribe: () => ({ unsubscribe: vi.fn() }) };
    },
  }));

  return { mockFrom, mockChannel, mockRemoveChannel, state };
});

vi.mock('../utils/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}));

describe('getEIAComplianceState', () => {
  it('maps known form values to compliance states', () => {
    expect(getEIAComplianceState('Full compliance')).toBe(ComplianceState.COMPLIANT);
    expect(getEIAComplianceState('Partial compliance')).toBe(ComplianceState.PARTIAL_COMPLIANT);
    expect(getEIAComplianceState('Non-compliant')).toBe(ComplianceState.NON_COMPLIANT);
  });

  it('maps unknown or missing values to pending review', () => {
    expect(getEIAComplianceState(undefined)).toBe(ComplianceState.PENDING_REVIEW);
    expect(getEIAComplianceState('something else')).toBe(ComplianceState.PENDING_REVIEW);
  });
});

describe('calculateEIAMetrics', () => {
  it('returns zeroed metrics for an empty report list', () => {
    const metrics = calculateEIAMetrics([]);

    expect(metrics.totalReports).toBe(0);
    expect(metrics.compliancePercentage).toBe(0);
    expect(metrics.activeIssues).toBe(0);
  });

  it('counts compliance categories and computes the compliance percentage', () => {
    const metrics = calculateEIAMetrics([
      { form_data: { eia_compliance: 'Full compliance' } },
      { form_data: { eia_compliance: 'Full compliance' } },
      { form_data: { eia_compliance: 'Partial compliance' } },
      { form_data: { eia_compliance: 'Non-compliant' } },
    ]);

    expect(metrics.totalReports).toBe(4);
    expect(metrics.compliantReports).toBe(2);
    expect(metrics.partialCompliant).toBe(1);
    expect(metrics.nonCompliant).toBe(1);
    expect(metrics.compliancePercentage).toBe(50); // 2/4 * 100
    expect(metrics.activeIssues).toBe(2); // partial + non-compliant
  });

  it('treats reports with missing form_data as pending review', () => {
    const metrics = calculateEIAMetrics([{ form_data: null }]);

    expect(metrics.totalReports).toBe(1);
    expect(metrics.compliantReports).toBe(0);
    expect(metrics.activeIssues).toBe(0);
  });
});

describe('getCurrentQuarterLabel', () => {
  it('labels each month with the correct quarter', () => {
    expect(getCurrentQuarterLabel(new Date(2026, 0, 15))).toBe('Q1 2026');
    expect(getCurrentQuarterLabel(new Date(2026, 3, 1))).toBe('Q2 2026');
    expect(getCurrentQuarterLabel(new Date(2026, 6, 30))).toBe('Q3 2026');
    expect(getCurrentQuarterLabel(new Date(2026, 11, 31))).toBe('Q4 2026');
  });
});

describe('useEIAComplianceTracking', () => {
  beforeEach(() => {
    state.reports = [];
    state.fetchError = null;
    state.postgresChangesCallback = null;
    mockRemoveChannel.mockClear();
  });

  it('loads initial EIA metrics on mount', async () => {
    state.reports = [
      { form_data: { eia_compliance: 'Full compliance' } },
      { form_data: { eia_compliance: 'Non-compliant' } },
    ];

    const { result } = renderHook(() => useEIAComplianceTracking());

    await waitFor(() => expect(result.current.eiaMetrics.totalReports).toBe(2));
    expect(result.current.eiaMetrics.compliantReports).toBe(1);
    expect(result.current.eiaMetrics.nonCompliant).toBe(1);
    expect(result.current.eiaMetrics.compliancePercentage).toBe(50);
    expect(result.current.complianceTrend).toHaveLength(1);
  });

  it('refreshes metrics when a real-time T06 update is received', async () => {
    const { result } = renderHook(() => useEIAComplianceTracking());

    await waitFor(() => expect(result.current.eiaMetrics.totalReports).toBe(0));

    state.reports = [{ form_data: { eia_compliance: 'Full compliance' } }];
    await act(async () => {
      state.postgresChangesCallback?.();
    });

    await waitFor(() => expect(result.current.eiaMetrics.totalReports).toBe(1));
    expect(result.current.eiaMetrics.compliancePercentage).toBe(100);
  });

  it('removes the realtime channel on unmount', async () => {
    const { result, unmount } = renderHook(() => useEIAComplianceTracking());

    await waitFor(() => expect(result.current.eiaMetrics.lastUpdated.getTime()).toBeGreaterThan(0));

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });
});
