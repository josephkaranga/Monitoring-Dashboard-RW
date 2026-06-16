// ============================================================
// Resilient Update Service — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResilientUpdateService } from './resilientUpdateService';

const { mockFrom, insertedRows, updateCalls, mockState } = vi.hoisted(() => {
  const insertedRows: Record<string, unknown>[] = [];
  const updateCalls: Array<{ values: Record<string, unknown>; id: number }> = [];
  const mockState = {
    targetProgress: 30,
    autoUpdateCount: 2 as number | null,
    fetchQueue: [] as Array<{ data: unknown; error: unknown }>,
    updateQueue: [] as Array<{ error: unknown }>,
  };

  function makeEqResult(data: unknown, error: unknown) {
    const result = Promise.resolve({ data, error }) as Promise<{ data: unknown; error: unknown }> & {
      single: () => Promise<{ data: unknown; error: unknown }>;
    };
    result.single = () => Promise.resolve({ data, error });
    return result;
  }

  const mockFrom = vi.fn((table: string) => {
    if (table === 'nbsap_targets') {
      return {
        select: () => ({
          eq: () => {
            const next = mockState.fetchQueue.shift() || {
              data: { progress: mockState.targetProgress, auto_update_count: mockState.autoUpdateCount },
              error: null,
            };
            return makeEqResult(next.data, next.error);
          },
        }),
        update: (values: Record<string, unknown>) => ({
          eq: (_col: string, id: number) => {
            updateCalls.push({ values, id });
            const next = mockState.updateQueue.shift() || { error: null };
            return Promise.resolve({ data: null, error: next.error });
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

describe('ResilientUpdateService', () => {
  let service: ResilientUpdateService;

  beforeEach(() => {
    service = new ResilientUpdateService();
    insertedRows.length = 0;
    updateCalls.length = 0;
    mockState.targetProgress = 30;
    mockState.autoUpdateCount = 2;
    mockState.fetchQueue = [];
    mockState.updateQueue = [];
  });

  it('updates target progress on the first attempt', async () => {
    const result = await service.updateTargetProgress(5, 10);

    expect(result.success).toBe(true);
    expect(result.progressUpdated).toBe(true);
    expect(result.newProgress).toBe(40);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].id).toBe(5);
    expect(updateCalls[0].values.progress).toBe(40);
    expect(updateCalls[0].values.auto_update_count).toBe(3);
    expect(insertedRows).toHaveLength(0);
  });

  it('clamps progress to the 0-100 range', async () => {
    mockState.targetProgress = 95;
    const result = await service.updateTargetProgress(5, 20);

    expect(result.newProgress).toBe(100);
  });

  it('retries once after a transient fetch failure and succeeds', async () => {
    mockState.fetchQueue.push({ data: null, error: { message: 'temporary network error' } });

    const result = await service.updateTargetProgress(5, 10);

    expect(result.success).toBe(true);
    expect(result.newProgress).toBe(40);
    expect(insertedRows).toHaveLength(0);
    expect(service.getRetryQueueSize()).toBe(0);
  });

  it('queues the update for retry and logs the failure when both attempts fail', async () => {
    mockState.fetchQueue.push({ data: null, error: { message: 'fetch failed' } });
    mockState.fetchQueue.push({ data: null, error: { message: 'fetch failed again' } });

    const result = await service.updateTargetProgress(5, 10);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('fetch failed again');
    expect(service.getRetryQueueSize()).toBe(1);
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0].action_type).toBe('update_failed');
  });

  it('processRetryQueue succeeds and clears the queue when the retry works', async () => {
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 1' } });
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 2' } });
    await service.updateTargetProgress(5, 10);
    expect(service.getRetryQueueSize()).toBe(1);

    const summary = await service.processRetryQueue();

    expect(summary).toEqual({ succeeded: 1, failed: 0, abandoned: 0 });
    expect(service.getRetryQueueSize()).toBe(0);
  });

  it('processRetryQueue re-queues items that fail again but have not hit the retry limit', async () => {
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 1' } });
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 2' } });
    await service.updateTargetProgress(5, 10);

    mockState.fetchQueue.push({ data: null, error: { message: 'fail again' } });
    const summary = await service.processRetryQueue();

    expect(summary).toEqual({ succeeded: 0, failed: 1, abandoned: 0 });
    expect(service.getRetryQueueSize()).toBe(1);
  });

  it('abandons an item and logs an alert after exceeding the max retry count', async () => {
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 1' } });
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 2' } });
    await service.updateTargetProgress(5, 10);

    // First processRetryQueue: retryCount goes 0 -> 1 (below MAX_RETRY_COUNT=3)
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 3' } });
    await service.processRetryQueue();
    expect(service.getRetryQueueSize()).toBe(1);

    // Second processRetryQueue: retryCount goes 1 -> 2 (still below MAX_RETRY_COUNT)
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 4' } });
    await service.processRetryQueue();
    expect(service.getRetryQueueSize()).toBe(1);

    // Third processRetryQueue: retryCount goes 2 -> 3 (meets MAX_RETRY_COUNT, abandoned)
    mockState.fetchQueue.push({ data: null, error: { message: 'fail 5' } });
    const summary = await service.processRetryQueue();

    expect(summary).toEqual({ succeeded: 0, failed: 0, abandoned: 1 });
    expect(service.getRetryQueueSize()).toBe(0);
    expect(insertedRows.filter((r) => r.action_type === 'update_failed')).toHaveLength(2);
    expect(JSON.parse(insertedRows[1].detail as string).error).toContain('Abandoned after 3 attempts');
  });

  it('treats a missing target row as a fetch failure', async () => {
    mockState.fetchQueue.push({ data: null, error: null });
    mockState.fetchQueue.push({ data: null, error: null });

    const result = await service.updateTargetProgress(99, 5);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Target 99 not found');
  });

  it('returns a failed result when the database update itself fails', async () => {
    mockState.updateQueue.push({ error: { message: 'update rejected' } });
    mockState.updateQueue.push({ error: { message: 'update rejected again' } });

    const result = await service.updateTargetProgress(5, 10);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('update rejected again');
    expect(service.getRetryQueueSize()).toBe(1);
  });
});
