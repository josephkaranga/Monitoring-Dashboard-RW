// ============================================================
// Resilient Update Service — Unit Tests
//
// The service is now a no-op stub (migration 023 moved progress
// calculation to DB views). These tests verify the stub contract
// so regressions are caught if the stub is accidentally changed.
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ResilientUpdateService } from './resilientUpdateService';

describe('ResilientUpdateService (stub)', () => {
  let service: ResilientUpdateService;

  beforeEach(() => {
    service = new ResilientUpdateService();
  });

  it('always reports success with no progress written', async () => {
    const result = await service.updateTargetProgress(5, 10);

    expect(result.success).toBe(true);
    expect(result.targetId).toBe(5);
    expect(result.progressUpdated).toBe(false);
  });

  it('returns the correct targetId for any input', async () => {
    const result = await service.updateTargetProgress(99, 50);
    expect(result.targetId).toBe(99);
  });

  it('retry queue is always empty', () => {
    expect(service.getRetryQueueSize()).toBe(0);
  });

  it('retry queue stays empty after an update call', async () => {
    await service.updateTargetProgress(1, 10);
    expect(service.getRetryQueueSize()).toBe(0);
  });

  it('processRetryQueue always returns all-zero summary', async () => {
    const summary = await service.processRetryQueue();
    expect(summary).toEqual({ succeeded: 0, failed: 0, abandoned: 0 });
  });

  it('result carries required UpdateResult shape', async () => {
    const result = await service.updateTargetProgress(7, 20);

    expect(typeof result.success).toBe('boolean');
    expect(typeof result.progressUpdated).toBe('boolean');
    expect(typeof result.processingTime).toBe('number');
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});
