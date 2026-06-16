// ============================================================
// Report Service — Automatic Processing Unit Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchToolWeight, processReportAutomatic } from './reportService';
import { UpdateStatus, type OrganizationConfig } from '../types/automaticReporting';
import type { ToolkitReport } from '../types/index';

const { mockFrom, mockState, insertedRows } = vi.hoisted(() => {
  const insertedRows: Record<string, unknown>[] = [];
  const mockState = {
    toolWeightRow: null as { tool_id: string; weight: number; description: string } | null,
    toolWeightError: null as { message: string } | null,
  };

  const mockFrom = vi.fn((table: string) => {
    if (table === 'tool_weights') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockState.toolWeightRow, error: mockState.toolWeightError }),
            }),
          }),
        }),
      };
    }
    if (table === 'audit_log') {
      return {
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return Promise.resolve({ data: null, error: null });
        },
      };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  });

  return { mockFrom, mockState, insertedRows };
});

vi.mock('../utils/supabase', () => ({
  supabase: { from: mockFrom },
}));

function makeOrgConfig(overrides: Partial<OrganizationConfig> = {}): OrganizationConfig {
  return {
    organizationId: 'org-1',
    organizationName: 'Test Org',
    automaticUpdatesEnabled: true,
    requireVerification: false,
    auditLevel: 'standard',
    processingTimeout: 30,
    enableNotifications: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeReport(overrides: Partial<ToolkitReport> = {}): ToolkitReport {
  return {
    id: 'report-1',
    tool_id: 'T02',
    tool_name: 'District Biodiversity Monitoring',
    submitted_by: 'user-1',
    status: 'approved',
    reviewed_by: 'user-1',
    reviewed_at: new Date().toISOString(),
    review_note: null,
    period: '2026-Q1',
    form_data: {},
    attachments: [],
    district: 'Kigali',
    institution: null,
    nbsap_target_id: 3,
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('fetchToolWeight', () => {
  beforeEach(() => {
    mockState.toolWeightRow = null;
    mockState.toolWeightError = null;
  });

  it('returns the weight and description from the tool_weights table when available', async () => {
    mockState.toolWeightRow = { tool_id: 'T02', weight: 0.2, description: 'District Biodiversity Monitoring' };

    const info = await fetchToolWeight('T02');

    expect(info).toEqual({ toolId: 'T02', weight: 0.2, description: 'District Biodiversity Monitoring' });
  });

  it('falls back to the built-in tool weight constants when no row is found', async () => {
    const info = await fetchToolWeight('T01');

    expect(info.toolId).toBe('T01');
    expect(info.weight).toBe(0.25);
    expect(info.description).toBe('National Institutional Reporting');
  });

  it('falls back to the built-in tool weight constants on a database error', async () => {
    mockState.toolWeightError = { message: 'connection failed' };

    const info = await fetchToolWeight('T05');

    expect(info.weight).toBe(0.1);
  });
});

describe('processReportAutomatic', () => {
  beforeEach(() => {
    insertedRows.length = 0;
  });

  it('logs the submission and automatic-processing outcome for an approved report', async () => {
    const result = await processReportAutomatic(makeReport({ status: 'approved' }), makeOrgConfig());

    expect(result.status).toBe(UpdateStatus.COMPLETED);
    expect(result.progressUpdated).toBe(true);
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].action_type).toBe('submit');
    expect(insertedRows[1].action_type).toBe('automatic_processing');
  });

  it('only logs the submission for a pending report', async () => {
    const result = await processReportAutomatic(makeReport({ status: 'pending' }), makeOrgConfig());

    expect(result.status).toBe(UpdateStatus.PENDING);
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].action_type).toBe('submit');
  });
});
