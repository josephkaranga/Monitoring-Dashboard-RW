// ============================================================
// Resilient Update Service — Error Handling & Retry
// ============================================================

import { supabase } from '../utils/supabase';
import type { UpdateResult } from '../types/automaticReporting';

const MAX_RETRY_COUNT = 3;

interface RetryQueueItem {
  targetId: number;
  contribution: number;
  retryCount: number;
  lastError: string;
  queuedAt: Date;
}

interface TargetProgressRow {
  progress: number;
  auto_update_count: number | null;
}

/**
 * Wraps target progress updates with a retry-on-failure fallback and an
 * in-memory retry queue for updates that fail even after a retry. Failed
 * and abandoned updates are logged to `audit_log` for error tracking and
 * alerting.
 */
export class ResilientUpdateService {
  private retryQueue: RetryQueueItem[] = [];

  /**
   * Apply a progress contribution to a target, retrying once on failure
   * before queuing the update for later retry.
   */
  async updateTargetProgress(targetId: number, contribution: number): Promise<UpdateResult> {
    const startTime = Date.now();

    try {
      return await this.updateViaDirect(targetId, contribution, startTime);
    } catch (primaryError) {
      console.warn(`[ResilientUpdateService] Update failed for target ${targetId}, retrying:`, primaryError);

      try {
        return await this.updateViaDirect(targetId, contribution, startTime);
      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        await this.queueForRetry(targetId, contribution, message);

        return {
          success: false,
          targetId,
          progressUpdated: false,
          eiaComplianceUpdated: false,
          processingTime: Date.now() - startTime,
          errorMessage: message,
          updatedAt: new Date(),
        };
      }
    }
  }

  /**
   * Number of updates currently waiting to be retried.
   */
  getRetryQueueSize(): number {
    return this.retryQueue.length;
  }

  /**
   * Retry all queued updates once. Updates that fail again are re-queued
   * unless they have exceeded the maximum retry count, in which case they
   * are abandoned and logged for alerting.
   */
  async processRetryQueue(): Promise<{ succeeded: number; failed: number; abandoned: number }> {
    const items = this.retryQueue;
    this.retryQueue = [];

    let succeeded = 0;
    let failed = 0;
    let abandoned = 0;

    for (const item of items) {
      try {
        await this.updateViaDirect(item.targetId, item.contribution, Date.now());
        succeeded++;
      } catch (error) {
        const retryCount = item.retryCount + 1;
        const lastError = error instanceof Error ? error.message : 'Unknown error';

        if (retryCount >= MAX_RETRY_COUNT) {
          abandoned++;
          await this.logFailure(
            item.targetId,
            item.contribution,
            `Abandoned after ${retryCount} attempts: ${lastError}`
          );
        } else {
          failed++;
          this.retryQueue.push({ ...item, retryCount, lastError });
        }
      }
    }

    return { succeeded, failed, abandoned };
  }

  /**
   * Fetch the target's current progress, apply the contribution clamped to
   * 0-100, and persist the result.
   */
  private async updateViaDirect(targetId: number, contribution: number, startTime: number): Promise<UpdateResult> {
    const { data: target, error: fetchError } = await supabase
      .from('nbsap_targets')
      .select('progress, auto_update_count')
      .eq('id', targetId)
      .single();

    if (fetchError || !target) {
      throw new Error(fetchError?.message || `Target ${targetId} not found`);
    }

    const row = target as TargetProgressRow;
    const previousProgress = row.progress;
    const newProgress = Math.min(100, Math.max(0, previousProgress + contribution));

    const { error: updateError } = await supabase
      .from('nbsap_targets')
      .update({
        progress: newProgress,
        last_auto_update: new Date().toISOString(),
        auto_update_count: (row.auto_update_count || 0) + 1,
      })
      .eq('id', targetId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      success: true,
      targetId,
      progressUpdated: newProgress !== previousProgress,
      eiaComplianceUpdated: false,
      processingTime: Date.now() - startTime,
      newProgress,
      updatedAt: new Date(),
    };
  }

  private async queueForRetry(targetId: number, contribution: number, errorMessage: string): Promise<void> {
    this.retryQueue.push({ targetId, contribution, retryCount: 0, lastError: errorMessage, queuedAt: new Date() });
    await this.logFailure(targetId, contribution, errorMessage);
  }

  private async logFailure(targetId: number, contribution: number, errorMessage: string): Promise<void> {
    await supabase.from('audit_log').insert({
      user_id: 'system',
      action_type: 'update_failed',
      action: `Progress update for target ${targetId} failed`,
      detail: JSON.stringify({ targetId, contribution, error: errorMessage }),
    });
  }
}

export const resilientUpdateService = new ResilientUpdateService();
