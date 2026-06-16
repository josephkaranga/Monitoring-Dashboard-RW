// ============================================================
// useLiveTargetProgress — Unit Tests
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveTargetProgress } from './useLiveTargetProgress';

const { subscribeToTargetProgress, cleanup, callbacks } = vi.hoisted(() => {
  const callbacks = new Map<number, (progress: number) => void>();
  const subscribeToTargetProgress = vi.fn((targetId: number, callback: (progress: number) => void) => {
    callbacks.set(targetId, callback);
  });
  const cleanup = vi.fn();
  return { subscribeToTargetProgress, cleanup, callbacks };
});

vi.mock('../services/realTimeUpdateService', () => ({
  realTimeUpdateService: { subscribeToTargetProgress, cleanup },
}));

describe('useLiveTargetProgress', () => {
  beforeEach(() => {
    subscribeToTargetProgress.mockClear();
    cleanup.mockClear();
    callbacks.clear();
  });

  it('subscribes to each target and returns the original list before any update', () => {
    const targets = [{ id: 1, progress: 10 }, { id: 2, progress: 20 }];
    const { result } = renderHook(() => useLiveTargetProgress(targets));

    expect(subscribeToTargetProgress).toHaveBeenCalledWith(1, expect.any(Function));
    expect(subscribeToTargetProgress).toHaveBeenCalledWith(2, expect.any(Function));
    expect(result.current).toEqual(targets);
  });

  it('overlays live progress for the target that received an update', () => {
    const targets = [{ id: 1, progress: 10 }, { id: 2, progress: 20 }];
    const { result } = renderHook(() => useLiveTargetProgress(targets));

    act(() => {
      callbacks.get(1)?.(55);
    });

    expect(result.current).toEqual([{ id: 1, progress: 55 }, { id: 2, progress: 20 }]);
  });

  it('cleans up subscriptions on unmount', () => {
    const targets = [{ id: 1, progress: 10 }];
    const { unmount } = renderHook(() => useLiveTargetProgress(targets));

    unmount();

    expect(cleanup).toHaveBeenCalled();
  });

  it('does not subscribe when the target list is empty', () => {
    renderHook(() => useLiveTargetProgress([]));

    expect(subscribeToTargetProgress).not.toHaveBeenCalled();
  });
});
