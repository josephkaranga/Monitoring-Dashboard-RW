// @vitest-environment node
// ============================================================
// Migration 044 — the four reporting modules REMA uses:
// T01 Institutional, T02 District, T03 Private Sector, T04 Research.
// ============================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { createDatabase } from './harness';

let db: PGlite;

async function modules(code: string): Promise<string[]> {
  const r = await db.query<{ tool_ids: string[] }>(
    `SELECT tool_ids FROM public.institutions WHERE code = $1`,
    [code]
  );
  if (!r.rows[0]) throw new Error(`institution ${code} not seeded`);
  return r.rows[0].tool_ids;
}

beforeAll(async () => {
  ({ db } = await createDatabase());
}, 180_000);

describe('institutions use the four modules', () => {
  it('no institution keeps an old module number', async () => {
    const r = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM public.institutions
       WHERE NOT (tool_ids <@ ARRAY['T01', 'T02', 'T03', 'T04']) OR cardinality(tool_ids) = 0`
    );
    expect(r.rows[0].n).toBe(0);
  });

  it.each([
    // 039 seed (old numbering)          -> after 044
    ['REMA', ['T01', 'T02', 'T03']], //    T01 T02 T03(PA) T06(private)
    ['RDB', ['T01', 'T03']], //            T01 T03(PA) T05(finance) T06(private)
    ['RAB', ['T01', 'T02', 'T04']], //     T01 T02 T07(research)
    ['GGGI', ['T04']], //                  T05(finance) T07(research)
    ['ADRRES', ['T01']], //                T04(community) only: nothing left -> T01
    ['Nyungwe Management Company', ['T03']], // T03(PA) only, private sector -> T03
    ['District Authorities', ['T02']], //  T02 T04(community)
  ])('%s -> %j', async (code, expected) => {
    expect(await modules(code)).toEqual(expected);
  });

  it('running 044 again changes nothing', async () => {
    const before = await db.query(`SELECT code, tool_ids FROM public.institutions ORDER BY code`);
    const sql = readFileSync(
      join(__dirname, '../../../migrations/044_four_reporting_modules.sql'),
      'utf8'
    );
    await db.exec(sql);
    const after = await db.query(`SELECT code, tool_ids FROM public.institutions ORDER BY code`);
    expect(after.rows).toEqual(before.rows);
  });
});

describe('weights and data-quality rules', () => {
  it('weights are 0.40 / 0.35 / 0.15 / 0.10 and the retired modules are inactive', async () => {
    const r = await db.query<{ tool_id: string; weight: string }>(
      `SELECT tool_id, weight::text AS weight FROM public.tool_weights WHERE active ORDER BY tool_id`
    );
    expect(r.rows).toEqual([
      { tool_id: 'T01', weight: '0.400' },
      { tool_id: 'T02', weight: '0.350' },
      { tool_id: 'T03', weight: '0.150' },
      { tool_id: 'T04', weight: '0.100' },
    ]);
  });

  it('rules follow the new T03 (Private Sector) form; none for retired modules', async () => {
    const r = await db.query<{ tool_id: string; field_key: string }>(
      `SELECT tool_id, field_key FROM public.dqa_field_rules
       WHERE tool_id NOT IN ('T01', 'T02') ORDER BY tool_id, field_key`
    );
    expect(r.rows).toEqual([
      { tool_id: 'T03', field_key: 'esg_score' },
      { tool_id: 'T03', field_key: 'restoration_ha' },
    ]);
  });
});
