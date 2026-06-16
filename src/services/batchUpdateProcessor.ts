// ============================================================
// Real-Time Update Pipeline — Batch Update Processor
// ============================================================

import { supabase } from '../utils/supabase';

const BATCH_INTERVAL_MS = 500;

interface QueuedTargetRow {
  id: number;
  progress: number;
  auto_update_count: number | null;
}

/**
 * Accumulates per-target progress contributions and flushes them to the
 * database in a single batched request every 500ms, reducing the number of
 * round trips when many reports are processed in quick succession.
 */
export class BatchUpdateProcessor {
  private updateQueue = new Map<number, number>();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Queue a progress contribution for a target. Starts the 500ms batch
   * timer if it isn't already running.
   */
  queueUpdate(targetId: number, contribution: number): void {
    const current = this.updateQueue.get(targetId) || 0;
    this.updateQueue.set(targetId, current + contribution);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        void this.processBatch();
      }, BATCH_INTERVAL_MS);
    }
  }

  /**
   * Immediately process any queued updates, bypassing the batch timer.
   */
  async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    await this.processBatch();
  }

  private async processBatch(): Promise<void> {
    if (this.updateQueue.size === 0) return;

    const entries = Array.from(this.updateQueue.entries());
    this.updateQueue.clear();

    const targetIds = entries.map(([targetId]) => targetId);
    const { data: targets, error } = await supabase
      .from('nbsap_targets')
      .select('id, progress, auto_update_count')
      .in('id', targetIds);

    if (error || !targets) return;

    const now = new Date().toISOString();
    const rows = targets as unknown as QueuedTargetRow[];
    const updates = entries
      .map(([targetId, contribution]) => {
        const target = rows.find((row) => row.id === targetId);
        if (!target) return null;
        return {
          id: targetId,
          progress: Math.min(100, Math.max(0, target.progress + Math.ceil(contribution))),
          last_auto_update: now,
          auto_update_count: (target.auto_update_count || 0) + 1,
        };
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);

    if (updates.length === 0) return;

    await supabase.from('nbsap_targets').upsert(updates, { onConflict: 'id' });
  }
}

export const batchUpdateProcessor = new BatchUpdateProcessor();
