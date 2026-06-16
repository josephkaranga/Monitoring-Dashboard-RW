// ============================================================
// Batch Update Processor — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchUpdateProcessor } from './batchUpdateProcessor';

const { mockFrom, state } = vi.hoisted(() => {
  const state = {
    targets: [] as Array<{ id: number; progress: number; auto_update_count: number | null }>,
    upsertCalls: [] as Array<Record<string, unknown>[]>,
    selectError: null as { message: string } | null,
  };

  const mockFrom = vi.fn((table: string) => {
    if (table !== 'nbsap_targets') {
      throw new Error(`Unexpected table in test: ${table}`);
    }

    return {
      select: () => ({
        in: (_column: string, ids: number[]) =>
          Promise.resolve({
            data: state.selectError ? null : state.targets.filter((t) => ids.includes(t.id)),
            error: state.selectError,
          }),
      }),
      upsert: (rows: Record<string, unknown>[]) => {
        state.upsertCalls.push(rows);
        return Promise.resolve({ data: rows, error: null });
      },
    };
  });

  return { mockFrom, state };
});

vi.mock('../utils/supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('BatchUpdateProcessor', () => {
  let processor: BatchUpdateProcessor;

  beforeEach(() => {
    processor = new BatchUpdateProcessor();
    state.targets = [
      { id: 1, progress: 30, auto_update_count: 2 },
      { id: 2, progress: 95, auto_update_count: null },
    ];
    state.upsertCalls.length = 0;
    state.selectError = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not write to the database before the batch interval elapses', async () => {
    processor.queueUpdate(1, 5);
    await Promise.resolve();

    expect(state.upsertCalls).toHaveLength(0);
  });

  it('combines multiple contributions for the same target within the batch window', async () => {
    processor.queueUpdate(1, 5);
    processor.queueUpdate(1, 3);

    await vi.advanceTimersByTimeAsync(500);

    expect(state.upsertCalls).toHaveLength(1);
    expect(state.upsertCalls[0]).toEqual([
      { id: 1, progress: 38, last_auto_update: expect.any(String), auto_update_count: 3 },
    ]);
  });

  it('batches updates for multiple targets into a single upsert call', async () => {
    processor.queueUpdate(1, 5);
    processor.queueUpdate(2, 10);

    await vi.advanceTimersByTimeAsync(500);

    expect(state.upsertCalls).toHaveLength(1);
    const ids = state.upsertCalls[0].map((row) => row.id);
    expect(ids).toEqual(expect.arrayContaining([1, 2]));
  });

  it('clamps progress to the 0-100 range', async () => {
    processor.queueUpdate(2, 20);

    await vi.advanceTimersByTimeAsync(500);

    expect(state.upsertCalls[0][0].progress).toBe(100);
  });

  it('skips targets that no longer exist', async () => {
    processor.queueUpdate(999, 5);

    await vi.advanceTimersByTimeAsync(500);

    expect(state.upsertCalls).toHaveLength(0);
  });

  it('flush() processes queued updates immediately without waiting for the timer', async () => {
    processor.queueUpdate(1, 5);
    await processor.flush();

    expect(state.upsertCalls).toHaveLength(1);
  });

  it('does not write to the database when the target lookup fails', async () => {
    state.selectError = { message: 'lookup failed' };
    processor.queueUpdate(1, 5);

    await vi.advanceTimersByTimeAsync(500);

    expect(state.upsertCalls).toHaveLength(0);
  });
});
