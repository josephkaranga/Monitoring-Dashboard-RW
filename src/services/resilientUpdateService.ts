// ============================================================
// Resilient Update Service (DEPRECATED)
//
// Progress is now computed deterministically from approved reports
// via database views (migration 023). No direct target updates needed.
// This stub preserves the public API so existing callers don't break.
// ============================================================

import type { UpdateResult } from '../types/automaticReporting';

export class ResilientUpdateService {
  async updateTargetProgress(targetId: number, _contribution: number): Promise<UpdateResult> {
    return {
      success: true,
      targetId,
      progressUpdated: false,
      eiaComplianceUpdated: false,
      processingTime: 0,
      updatedAt: new Date(),
    };
  }

  async processRetryQueue(): Promise<{ succeeded: number; failed: number; abandoned: number }> {
    return { succeeded: 0, failed: 0, abandoned: 0 };
  }

  getRetryQueueSize(): number {
    return 0;
  }
}

export const resilientUpdateService = new ResilientUpdateService();
