// ============================================================
// Real-Time Update Pipeline — RealTimeUpdateService
// ============================================================

import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import type { NBSAPTarget } from '../types/index';
import { eventBus } from './eventBus';

type TargetProgressCallback = (progress: number, target: NBSAPTarget) => void;

/**
 * Manages Supabase real-time subscriptions for NBSAP target progress and
 * fans out changes to interested UI components via the shared event bus.
 */
export class RealTimeUpdateService {
  private subscriptions = new Map<number, RealtimeChannel>();

  /**
   * Subscribe to progress updates for a single NBSAP target. Calling this
   * again for the same target replaces the previous subscription.
   */
  subscribeToTargetProgress(targetId: number, callback: TargetProgressCallback): void {
    this.unsubscribeFromTarget(targetId);

    const channel = supabase
      .channel(`target_progress:${targetId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'nbsap_targets',
          filter: `id=eq.${targetId}`,
        },
        payload => {
          const target = payload.new as NBSAPTarget;
          callback(target.progress, target);
          this.broadcastUpdate(targetId, target.progress);
        }
      )
      .subscribe();

    this.subscriptions.set(targetId, channel);
  }

  /**
   * Remove the subscription for a single target, if one exists.
   */
  unsubscribeFromTarget(targetId: number): void {
    const channel = this.subscriptions.get(targetId);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(targetId);
    }
  }

  /**
   * Notify all connected UI components that a target's progress has changed.
   */
  private broadcastUpdate(targetId: number, progress: number): void {
    const payload = { targetId, progress };
    eventBus.emit('target-progress-updated', payload);
    eventBus.emit('dashboard-refresh', payload);
    eventBus.emit('national-targets-refresh', payload);
  }

  /**
   * Remove all active subscriptions. Call this on component unmount.
   */
  cleanup(): void {
    this.subscriptions.forEach(channel => supabase.removeChannel(channel));
    this.subscriptions.clear();
  }
}

export const realTimeUpdateService = new RealTimeUpdateService();
