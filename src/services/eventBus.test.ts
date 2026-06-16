// ============================================================
// Event Bus — Unit Tests
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from './eventBus';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('should call subscribed listeners when an event is emitted', () => {
    const listener = vi.fn();
    eventBus.on('target-progress-updated', listener);

    eventBus.emit('target-progress-updated', { targetId: 1, progress: 42 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ targetId: 1, progress: 42 });
  });

  it('should support multiple listeners for the same event', () => {
    const first = vi.fn();
    const second = vi.fn();
    eventBus.on('dashboard-refresh', first);
    eventBus.on('dashboard-refresh', second);

    eventBus.emit('dashboard-refresh', { targetId: 2, progress: 50 });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('should not call listeners for other events', () => {
    const listener = vi.fn();
    eventBus.on('national-targets-refresh', listener);

    eventBus.emit('dashboard-refresh', { targetId: 3, progress: 60 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should stop calling a listener after unsubscribing via the returned function', () => {
    const listener = vi.fn();
    const unsubscribe = eventBus.on('target-progress-updated', listener);

    unsubscribe();
    eventBus.emit('target-progress-updated', { targetId: 1, progress: 10 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should stop calling a listener after off() is called', () => {
    const listener = vi.fn();
    eventBus.on('target-progress-updated', listener);

    eventBus.off('target-progress-updated', listener);
    eventBus.emit('target-progress-updated', { targetId: 1, progress: 10 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should remove all listeners on clear()', () => {
    const listener = vi.fn();
    eventBus.on('target-progress-updated', listener);

    eventBus.clear();
    eventBus.emit('target-progress-updated', { targetId: 1, progress: 10 });

    expect(listener).not.toHaveBeenCalled();
  });
});
