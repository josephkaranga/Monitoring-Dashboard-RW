// ============================================================
// Real-Time Update Pipeline — Event Bus
// ============================================================

/**
 * Payload broadcast when an NBSAP target's progress changes.
 */
export interface TargetProgressEventPayload {
  targetId: number;
  progress: number;
}

/**
 * Events emitted by the Real-Time Update Pipeline so that UI components
 * (NBSAPTargetProgress, DashboardPage, NationalTargetsPage, ...) can refresh
 * in response to automatic progress updates.
 */
export interface UpdateEventMap {
  'target-progress-updated': TargetProgressEventPayload;
  'dashboard-refresh': TargetProgressEventPayload;
  'national-targets-refresh': TargetProgressEventPayload;
}

export type UpdateEventName = keyof UpdateEventMap;
type EventCallback<E extends UpdateEventName> = (payload: UpdateEventMap[E]) => void;

/**
 * Minimal typed publish/subscribe bus used to fan out real-time update
 * notifications to multiple, decoupled UI components.
 */
class EventBus {
  private listeners = new Map<UpdateEventName, Set<EventCallback<UpdateEventName>>>();

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<E extends UpdateEventName>(event: E, callback: EventCallback<E>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback as EventCallback<UpdateEventName>);
    return () => this.off(event, callback);
  }

  /**
   * Remove a previously registered listener.
   */
  off<E extends UpdateEventName>(event: E, callback: EventCallback<E>): void {
    this.listeners.get(event)?.delete(callback as EventCallback<UpdateEventName>);
  }

  /**
   * Notify all listeners registered for an event.
   */
  emit<E extends UpdateEventName>(event: E, payload: UpdateEventMap[E]): void {
    this.listeners.get(event)?.forEach((callback) => callback(payload));
  }

  /**
   * Remove all listeners for every event.
   */
  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
