// @vitest-environment node
// ============================================================
// M03 — Drafts and auto-save (migration 042)
// ============================================================

import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createDatabase, createUser, errorAsUser, setRole } from './harness';

let db: PGlite;
let author: string;
let other: string;

async function createDraft(user: string, formData: object = { stakeholder: 'REMA' }) {
  return asUser(db, user, async tx => {
    const r = await tx.query<{ id: string; version: number; user_id: string }>(
      `INSERT INTO public.report_drafts (user_id, tool_id, form_data)
       VALUES ($1, 'T01', $2::jsonb) RETURNING id, version, user_id`,
      [user, JSON.stringify(formData)]
    );
    return r.rows[0];
  });
}

/** A save based on `version`; returns the new version, or null if the draft moved on. */
async function save(user: string, id: string, version: number, formData: object) {
  return asUser(db, user, async tx => {
    const r = await tx.query<{ version: number }>(
      `UPDATE public.report_drafts SET form_data = $3::jsonb
       WHERE id = $1 AND version = $2 RETURNING version`,
      [id, version, JSON.stringify(formData)]
    );
    return r.rows[0]?.version ?? null;
  });
}

beforeAll(async () => {
  ({ db } = await createDatabase());
  author = await createUser(db, 'focal@rema.gov.rw');
  other = await createUser(db, 'someone@moe.gov.rw');
  await setRole(db, author, 'local_reporting');
  await setRole(db, other, 'local_reporting');
}, 180_000);

describe('drafts are saved on the server and private to their author', () => {
  it('saves, and resumes from any session of the same user', async () => {
    const d = await createDraft(author, { stakeholder: 'REMA', current_status: '12' });
    // "Another device": a fresh session for the same user reads it back.
    const r = await asUser(db, author, tx =>
      tx.query<{ form_data: { current_status: string } }>(
        `SELECT form_data FROM public.report_drafts WHERE id = $1`,
        [d.id]
      )
    );
    expect(r.rows[0].form_data.current_status).toBe('12');
  });

  it('nobody else can read, change or delete a draft', async () => {
    const d = await createDraft(author);
    const seen = await asUser(
      db,
      other,
      async tx => (await tx.query(`SELECT id FROM public.report_drafts WHERE id = $1`, [d.id])).rows
    );
    expect(seen).toEqual([]);
    expect(await save(other, d.id, d.version, { hacked: true })).toBeNull();
    await asUser(db, other, tx =>
      tx.query(`DELETE FROM public.report_drafts WHERE id = $1`, [d.id])
    );
    const still = await db.query(`SELECT 1 FROM public.report_drafts WHERE id = $1`, [d.id]);
    expect(still.rows).toHaveLength(1);
  });

  it('a draft created for someone else is owned by its creator', async () => {
    const d = await asUser(
      db,
      other,
      async tx =>
        (
          await tx.query<{ user_id: string }>(
            `INSERT INTO public.report_drafts (user_id, tool_id) VALUES ($1, 'T01') RETURNING user_id`,
            [author]
          )
        ).rows[0]
    );
    expect(d.user_id).toBe(other);
  });
});

describe('two devices cannot silently overwrite each other', () => {
  it('a save based on an outdated version changes nothing', async () => {
    const d = await createDraft(author);
    const v2 = await save(author, d.id, d.version, { stakeholder: 'REMA', value: 'from laptop' });
    expect(v2).toBe(d.version + 1);

    // The phone still holds version 1.
    expect(
      await save(author, d.id, d.version, { stakeholder: 'REMA', value: 'from phone' })
    ).toBeNull();
    const r = await db.query<{ v: string }>(
      `SELECT form_data->>'value' AS v FROM public.report_drafts WHERE id = $1`,
      [d.id]
    );
    expect(r.rows[0].v).toBe('from laptop');
  });
});

describe('drafts stay out of reporting', () => {
  it('a draft is not a report: not counted, not queued', async () => {
    await createDraft(author);
    const r = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.toolkit_reports`
    );
    expect(r.rows[0].n).toBe(0);
  });

  it('file contents are never stored in a draft, only uploaded files', async () => {
    const err = await errorAsUser(db, author, tx =>
      tx.query(
        `INSERT INTO public.report_drafts (user_id, tool_id, attachments)
         VALUES ($1, 'T01', '[{"name":"a.pdf","data_url":"data:application/pdf;base64,AAAA"}]')`,
        [author]
      )
    );
    expect(err?.message).toMatch(/report_drafts_no_file_contents/);
  });

  it('caps each user at 50 drafts', async () => {
    const u = await createUser(db, 'busy@rema.gov.rw');
    await setRole(db, u, 'local_reporting');
    await db.query(
      `INSERT INTO public.report_drafts (user_id, tool_id) SELECT $1, 'T01' FROM generate_series(1, 50)`,
      [u]
    );
    expect(
      (
        await errorAsUser(db, u, tx =>
          tx.query(`INSERT INTO public.report_drafts (user_id, tool_id) VALUES ($1, 'T01')`, [u])
        )
      )?.message
    ).toMatch(/50 drafts/);
  });
});
