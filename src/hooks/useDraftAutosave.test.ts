import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  createDraft: vi.fn(),
  saveDraft: vi.fn(),
  fetchDraft: vi.fn(),
  deleteDraft: vi.fn(),
}));
vi.mock('../services/draftService', async () => {
  const actual = await vi.importActual<typeof import('../services/draftService')>(
    '../services/draftService'
  );
  return { ...actual, ...svc };
});
vi.mock('../utils/supabase', () => ({ supabase: {} }));

import { useDraftAutosave, DEBOUNCE_MS, INTERVAL_MS, RETRY_MS } from './useDraftAutosave';
import type { ReportAttachment } from '../types/index';

const draft = (version: number, form_data: Record<string, string> = {}) => ({
  id: 'd1',
  user_id: 'u',
  tool_id: 'T01' as const,
  form_data,
  attachments: [],
  version,
  created_at: '',
  updated_at: new Date().toISOString(),
});

type Props = { formData: Record<string, string>; attachments: ReportAttachment[] };
const render = (initial: Props) =>
  renderHook((p: Props) => useDraftAutosave({ toolId: 'T01', ...p }), { initialProps: initial });

/** Let pending promises settle inside fake-timer tests. */
const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(svc).forEach(f => f.mockReset());
});
afterEach(() => vi.useRealTimers());

describe('useDraftAutosave', () => {
  it('does nothing for an empty form, then creates a draft shortly after the first change', async () => {
    const h = render({ formData: {}, attachments: [] });
    await act(async () => vi.advanceTimersByTime(INTERVAL_MS));
    expect(svc.createDraft).not.toHaveBeenCalled();

    svc.createDraft.mockResolvedValue({ data: draft(1), error: null });
    h.rerender({ formData: { stakeholder: 'REMA' }, attachments: [] });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS - 1));
    expect(svc.createDraft).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    await flush();
    expect(svc.createDraft).toHaveBeenCalledWith('T01', { stakeholder: 'REMA' }, []);
    expect(h.result.current.status).toBe('saved');
    expect(h.result.current.draftId).toBe('d1');
  });

  it('saves each later change on top of the version it last saw', async () => {
    svc.createDraft.mockResolvedValue({ data: draft(1), error: null });
    svc.saveDraft.mockResolvedValue({ ok: true, draft: draft(2) });
    const h = render({ formData: { a: '1' }, attachments: [] });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    await flush();

    h.rerender({ formData: { a: '2' }, attachments: [] });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    await flush();
    expect(svc.saveDraft).toHaveBeenCalledWith('d1', 1, { a: '2' }, []);
  });

  it('within the 5-minute bound, unsaved work reaches the server once the network returns', async () => {
    svc.createDraft
      .mockResolvedValueOnce({ data: null, error: 'Failed to fetch' })
      .mockResolvedValueOnce({ data: null, error: 'Failed to fetch' })
      .mockResolvedValue({ data: draft(1), error: null });
    const h = render({ formData: { value: '42' }, attachments: [] });

    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    await flush();
    expect(h.result.current.status).toBe('error');

    for (let t = 0; t < INTERVAL_MS && h.result.current.status !== 'saved'; t += RETRY_MS) {
      await act(async () => vi.advanceTimersByTime(RETRY_MS));
      await flush();
    }
    expect(h.result.current.status).toBe('saved');
    expect(svc.createDraft).toHaveBeenCalledTimes(3);
  });

  it('stops on a conflict with another device and lets the user keep their version', async () => {
    svc.createDraft.mockResolvedValue({ data: draft(1), error: null });
    svc.saveDraft.mockResolvedValueOnce({ ok: false, conflict: true });
    const h = render({ formData: { a: '1' }, attachments: [] });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    await flush();

    h.rerender({ formData: { a: 'mine' }, attachments: [] });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    await flush();
    expect(h.result.current.status).toBe('conflict');

    // No further saves while in conflict...
    h.rerender({ formData: { a: 'mine, more' }, attachments: [] });
    await act(async () => vi.advanceTimersByTime(INTERVAL_MS));
    await flush();
    expect(svc.saveDraft).toHaveBeenCalledTimes(1);

    // ...until the user decides.
    svc.fetchDraft.mockResolvedValue(draft(5, { a: 'theirs' }));
    svc.saveDraft.mockResolvedValue({ ok: true, draft: draft(6) });
    await act(async () => {
      await h.result.current.keepMine();
    });
    expect(svc.saveDraft).toHaveBeenLastCalledWith('d1', 5, { a: 'mine, more' }, []);
    expect(h.result.current.status).toBe('saved');
  });

  it('after submission the draft is deleted but its evidence files are kept', async () => {
    svc.createDraft.mockResolvedValue({ data: draft(1), error: null });
    svc.deleteDraft.mockResolvedValue({ data: null, error: null });
    const att = { name: 'a.pdf', ext: 'pdf', size: 1, storage_path: 'u/drafts/d1/a.pdf' };
    const h = render({ formData: { a: '1' }, attachments: [att] });
    await act(async () => vi.advanceTimersByTime(DEBOUNCE_MS));
    await flush();
    await act(async () => {
      await h.result.current.finish({ discarded: false });
    });
    expect(svc.deleteDraft).toHaveBeenCalledWith(
      { id: 'd1', attachments: [att] },
      { keepFiles: true }
    );
  });
});
