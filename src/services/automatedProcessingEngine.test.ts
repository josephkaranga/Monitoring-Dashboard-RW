// ============================================================
// Automated Processing Engine — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { AutomatedProcessingEngine } from './automatedProcessingEngine';
import {
  ToolId,
  UpdateStatus,
  type OrganizationConfig,
  type ReportSubmission,
} from '../types/automaticReporting';

const { mockFrom, insertedRows, updateCalls, mockState } = vi.hoisted(() => {
  const insertedRows: Record<string, unknown>[] = [];
  const updateCalls: Array<{ table: string; values: Record<string, unknown>; id: number }> = [];
  const mockState = {
    targetProgress: 30,
    fetchError: null as { message: string } | null,
    updateError: null as { message: string } | null,
  };

  function makeEqResult(data: unknown, error: unknown) {
    const result = Promise.resolve({ data, error }) as Promise<{
      data: unknown;
      error: unknown;
    }> & {
      single: () => Promise<{ data: unknown; error: unknown }>;
    };
    result.single = () => Promise.resolve({ data, error });
    return result;
  }

  const mockFrom = vi.fn((table: string) => {
    if (table === 'nbsap_targets') {
      return {
        select: () => ({
          eq: () => makeEqResult({ progress: mockState.targetProgress }, mockState.fetchError),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: (_col: string, id: number) => {
            updateCalls.push({ table, values, id });
            return Promise.resolve({ data: null, error: mockState.updateError });
          },
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

  return { mockFrom, insertedRows, updateCalls, mockState };
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

function makeReport(overrides: Partial<ReportSubmission> = {}): ReportSubmission {
  return {
    id: 'report-1',
    toolId: ToolId.T01,
    toolName: 'National Institutional Reporting',
    submittedBy: 'user-1',
    status: 'approved',
    nbsapTargetId: 5,
    formData: {},
    submissionTime: new Date(),
    contributionValue: 1,
    ...overrides,
  };
}

describe('AutomatedProcessingEngine', () => {
  let engine: AutomatedProcessingEngine;

  beforeEach(() => {
    engine = new AutomatedProcessingEngine();
    insertedRows.length = 0;
    updateCalls.length = 0;
    mockState.targetProgress = 30;
    mockState.fetchError = null;
    mockState.updateError = null;
  });

  it('queues for manual approval when automatic updates are disabled', async () => {
    const result = await engine.processReportSubmission(
      makeReport(),
      makeOrgConfig({ automaticUpdatesEnabled: false })
    );

    expect(result.status).toBe(UpdateStatus.PENDING);
    expect(result.success).toBe(true);
    expect(result.progressUpdated).toBe(false);
    expect(updateCalls).toHaveLength(0);
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].action_type).toBe('submit');
  });

  it('processes immediately and returns COMPLETED when automatic updates are enabled', async () => {
    // processImmediate no longer writes directly to nbsap_targets — the DB trigger
    // (migration 017) handles progress updates. The engine only logs the outcome.
    const report = makeReport({ contributionValue: 10 });
    const result = await engine.processReportSubmission(report, makeOrgConfig());

    expect(result.status).toBe(UpdateStatus.COMPLETED);
    expect(result.success).toBe(true);
    expect(result.progressUpdated).toBe(true); // nbsapTargetId is set, so progressUpdated = true

    expect(updateCalls).toHaveLength(0); // no direct DB update; handled by trigger
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].action_type).toBe('submit');
    expect(insertedRows[1].action_type).toBe('automatic_processing');
  });

  it('does not touch the database when the report has no associated target', async () => {
    const report = makeReport({ nbsapTargetId: null });
    const result = await engine.processReportSubmission(report, makeOrgConfig());

    expect(result.status).toBe(UpdateStatus.COMPLETED);
    expect(result.success).toBe(true);
    expect(result.progressUpdated).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it('returns COMPLETED regardless of DB state — engine no longer fetches the target', async () => {
    // processImmediate was refactored: it no longer reads nbsap_targets, so DB errors
    // for that table have no effect on the engine's own result.
    mockState.fetchError = { message: 'not found' };
    const result = await engine.processReportSubmission(makeReport(), makeOrgConfig());

    expect(result.status).toBe(UpdateStatus.COMPLETED);
    expect(result.success).toBe(true);
    expect(updateCalls).toHaveLength(0);
  });

  it('returns COMPLETED regardless of DB state — engine no longer writes the target', async () => {
    // processImmediate was refactored: the DB trigger handles the progress write.
    mockState.updateError = { message: 'update failed' };
    const result = await engine.processReportSubmission(makeReport(), makeOrgConfig());

    expect(result.status).toBe(UpdateStatus.COMPLETED);
    expect(result.success).toBe(true);
    expect(updateCalls).toHaveLength(0);
  });

  it('skips the automatic-processing audit entry when the audit level is minimal', async () => {
    await engine.processReportSubmission(makeReport(), makeOrgConfig({ auditLevel: 'minimal' }));

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].action_type).toBe('submit');
  });

  it('logSubmission detail includes the tool weight and report status', async () => {
    await engine.processReportSubmission(
      makeReport({ toolId: ToolId.T02, status: 'approved' }),
      makeOrgConfig()
    );

    const detail = JSON.parse(insertedRows[0].detail as string);
    expect(detail.toolWeight).toBe(0.2);
    expect(detail.status).toBe('approved');
  });
});

describe('AutomatedProcessingEngine.recordSubmission', () => {
  let engine: AutomatedProcessingEngine;

  beforeEach(() => {
    engine = new AutomatedProcessingEngine();
    insertedRows.length = 0;
    updateCalls.length = 0;
  });

  it('logs the submission without touching nbsap_targets when the report is pending', async () => {
    const result = await engine.recordSubmission(
      makeReport({ status: 'pending' }),
      makeOrgConfig()
    );

    expect(result.status).toBe(UpdateStatus.PENDING);
    expect(result.progressUpdated).toBe(false);
    expect(updateCalls).toHaveLength(0);
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].action_type).toBe('submit');
  });

  it('logs the submission and the automatic-processing outcome without re-writing progress when approved', async () => {
    const result = await engine.recordSubmission(
      makeReport({ status: 'approved', nbsapTargetId: 7 }),
      makeOrgConfig()
    );

    expect(result.status).toBe(UpdateStatus.COMPLETED);
    expect(result.success).toBe(true);
    expect(result.progressUpdated).toBe(true);
    // The database trigger already applied the progress update; this method
    // must not perform its own write to nbsap_targets.
    expect(updateCalls).toHaveLength(0);
    expect(insertedRows).toHaveLength(2);
    expect(insertedRows[0].action_type).toBe('submit');
    expect(insertedRows[1].action_type).toBe('automatic_processing');
  });

  it('reports progressUpdated as false when an approved report has no target', async () => {
    const result = await engine.recordSubmission(
      makeReport({ status: 'approved', nbsapTargetId: null }),
      makeOrgConfig()
    );

    expect(result.progressUpdated).toBe(false);
    expect(updateCalls).toHaveLength(0);
  });

  it('skips the automatic-processing audit entry when the audit level is minimal', async () => {
    await engine.recordSubmission(
      makeReport({ status: 'approved' }),
      makeOrgConfig({ auditLevel: 'minimal' })
    );

    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].action_type).toBe('submit');
  });
});
