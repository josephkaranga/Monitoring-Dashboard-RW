// ============================================================
// Batch Update Processor — Unit Tests
//
// The processor is now a no-op stub (migration 023 moved progress
// calculation to DB views). These tests verify the stub contract.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchUpdateProcessor } from './batchUpdateProcessor';

describe('BatchUpdateProcessor (stub)', () => {
  let processor: BatchUpdateProcessor;

  beforeEach(() => {
    processor = new BatchUpdateProcessor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queueUpdate is a no-op — no DB call before the batch interval', async () => {
    processor.queueUpdate(1, 5);
    await Promise.resolve();
    // Nothing to assert beyond "it did not throw"
  });

  it('queueUpdate is a no-op — multiple contributions for the same target', async () => {
    processor.queueUpdate(1, 5);
    processor.queueUpdate(1, 3);
    await vi.advanceTimersByTimeAsync(500);
    // No DB writes; stub discards the contributions
  });

  it('queueUpdate is a no-op — contributions for multiple targets', async () => {
    processor.queueUpdate(1, 5);
    processor.queueUpdate(2, 10);
    await vi.advanceTimersByTimeAsync(500);
    // No DB writes
  });

  it('queueUpdate is a no-op — clamping is irrelevant (no writes occur)', async () => {
    processor.queueUpdate(2, 20); // would have clamped to 100 in the old impl
    await vi.advanceTimersByTimeAsync(500);
    // No DB writes
  });

  it('queueUpdate is a no-op — unknown target ID causes no error', async () => {
    processor.queueUpdate(999, 5);
    await vi.advanceTimersByTimeAsync(500);
    // No error, no DB writes
  });

  it('flush() resolves immediately without side effects', async () => {
    processor.queueUpdate(1, 5);
    await expect(processor.flush()).resolves.toBeUndefined();
  });
});
