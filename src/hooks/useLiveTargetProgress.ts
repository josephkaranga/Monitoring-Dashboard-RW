// ============================================================
// Real-Time Update Pipeline — useLiveTargetProgress hook
// ============================================================

import { useEffect, useState } from 'react';
import { realTimeUpdateService } from '../services/realTimeUpdateService';

/**
 * Overlays live progress updates (from RealTimeUpdateService) onto a list of
 * targets, so components stay in sync without refetching the whole list.
 */
export function useLiveTargetProgress<T extends { id: number; progress: number }>(targets: T[]): T[] {
  const [liveProgress, setLiveProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    if (targets.length === 0) return;

    targets.forEach((target) => {
      realTimeUpdateService.subscribeToTargetProgress(target.id, (progress) => {
        setLiveProgress((prev) => ({ ...prev, [target.id]: progress }));
      });
    });

    return () => realTimeUpdateService.cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.map((t) => t.id).join(',')]);

  if (Object.keys(liveProgress).length === 0) return targets;
  return targets.map((t) => (liveProgress[t.id] !== undefined ? { ...t, progress: liveProgress[t.id] } : t));
}
