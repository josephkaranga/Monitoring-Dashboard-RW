import { describe, it, expect, vi, beforeEach } from 'vitest';

const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('../utils/supabase', () => ({
  supabase: { storage: { from: () => ({ upload }) } },
}));

import { uploadEvidence } from './reportService';

const file = (name: string) => ({
  name,
  ext: name.split('.').pop()!,
  size: 4,
  data_url: 'data:application/pdf;base64,' + btoa('test'),
  evidence_type: 'dataset',
});

describe('uploadEvidence', () => {
  beforeEach(() => upload.mockReset());

  it('stores each file with its type and classification', async () => {
    upload.mockResolvedValue({ error: null });
    const r = await uploadEvidence('u1', [file('a.pdf'), file('b.xlsx')]);
    expect(r.failed).toEqual([]);
    expect(r.uploaded.map(a => a.evidence_type)).toEqual(['dataset', 'dataset']);
    expect(upload.mock.calls[1][2]).toEqual({
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  });

  it('reports failures instead of silently dropping files', async () => {
    upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'quota' } });
    const r = await uploadEvidence('u1', [file('ok.pdf'), file('lost.pdf')]);
    expect(r.uploaded.map(a => a.name)).toEqual(['ok.pdf']);
    expect(r.failed).toEqual(['lost.pdf']);
  });

  it('keeps files that are already stored', async () => {
    const stored = { name: 'old.pdf', ext: 'pdf', size: 1, storage_path: 'u1/old.pdf' };
    const r = await uploadEvidence('u1', [stored]);
    expect(upload).not.toHaveBeenCalled();
    expect(r.uploaded).toEqual([stored]);
  });
});
