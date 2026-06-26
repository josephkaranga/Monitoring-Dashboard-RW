// ============================================================
// Batch Update Processor (DEPRECATED)
//
// Progress is now computed deterministically from approved reports
// via database views (migration 023). No batched writes needed.
// This stub preserves the public API so existing callers don't break.
// ============================================================

export class BatchUpdateProcessor {
  queueUpdate(_targetId: number, _contribution: number): void {
    // No-op: progress is computed on read, not written.
  }

  async flush(): Promise<void> {
    // No-op
  }
}

export const batchUpdateProcessor = new BatchUpdateProcessor();
