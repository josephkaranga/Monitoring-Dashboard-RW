// ============================================================
// M05 — Indicator reference data in the indicator dialog.
// Everyone signed in sees the reference sheet and downloads it as a
// one-page PDF. REMA administrators edit the fields and record the TWG
// approval; the database refuses to approve incomplete data and returns
// approved data to draft when it changes (migration 045).
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchDisaggregationDimensions,
  fetchIndicatorReference,
  fetchNationalTiers,
  updateIndicatorReference,
} from '../services/indicatorReferenceService';
import { useInstitutions } from '../hooks/useInstitutions';
import { downloadIndicatorSheet, sheetSections, sheetStatusLine } from '../utils/indicatorSheet';
import type {
  DisaggregationDimension,
  IndicatorReference,
  IndicatorReferenceEdit,
  NationalTier,
} from '../types/index';

const input: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 7,
  fontSize: '0.78rem',
  fontFamily: "'DM Sans', sans-serif",
  background: 'var(--surface)',
  color: 'var(--text-1)',
};

const btn = (bg: string, fg = '#fff'): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: 8,
  border: bg === 'transparent' ? '1px solid var(--border)' : 'none',
  background: bg,
  color: fg,
  fontSize: '0.76rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

type Draft = Required<
  Pick<
    IndicatorReferenceEdit,
    'unit' | 'formula' | 'methodology' | 'data_source' | 'periodicity' | 'rbis_code'
  >
> & {
  national_tier: number | null;
  lead_institution_id: number | null;
  disaggregations: string[] | null;
  requires_statistical_validation: boolean;
};

const toDraft = (r: IndicatorReference): Draft => ({
  unit: r.unit ?? '',
  formula: r.formula ?? '',
  methodology: r.methodology ?? '',
  data_source: r.data_source ?? '',
  periodicity: r.periodicity ?? '',
  rbis_code: r.rbis_code ?? '',
  national_tier: r.national_tier,
  lead_institution_id: r.lead_institution_id,
  disaggregations: r.disaggregations,
  requires_statistical_validation: r.requires_statistical_validation,
});

export default function IndicatorReferencePanel({
  indicatorId,
  isAdmin,
}: {
  indicatorId: number;
  isAdmin: boolean;
}) {
  const [ref, setRef] = useState<IndicatorReference | null>(null);
  const [dims, setDims] = useState<DisaggregationDimension[]>([]);
  const [tiers, setTiers] = useState<NationalTier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const { institutions } = useInstitutions();

  const load = useCallback(async () => {
    try {
      const [r, d, t] = await Promise.all([
        fetchIndicatorReference(indicatorId),
        fetchDisaggregationDimensions(),
        fetchNationalTiers(),
      ]);
      setRef(r);
      setDims(d);
      setTiers(t);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [indicatorId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error)
    return (
      <div role="alert" style={{ fontSize: '0.78rem', color: '#b91c1c', margin: '12px 0' }}>
        {error}
      </div>
    );
  if (!ref)
    return (
      <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '12px 0' }}>
        Loading reference data…
      </div>
    );

  const save = async (changes: IndicatorReferenceEdit, done: string) => {
    setBusy(true);
    const { error: e } = await updateIndicatorReference(ref.id, changes);
    setBusy(false);
    if (e) {
      toast.error(e);
      return false;
    }
    toast.success(done);
    await load();
    return true;
  };

  const saveDraft = async () => {
    if (!draft) return;
    const ok = await save(
      {
        unit: draft.unit.trim() || undefined,
        formula: draft.formula.trim() || undefined,
        methodology: draft.methodology.trim() || undefined,
        data_source: draft.data_source.trim() || undefined,
        periodicity: draft.periodicity.trim() || undefined,
        rbis_code: draft.rbis_code.trim() || undefined,
        national_tier: draft.national_tier ?? undefined,
        lead_institution_id: draft.lead_institution_id ?? undefined,
        disaggregations: draft.disaggregations ?? undefined,
        requires_statistical_validation: draft.requires_statistical_validation,
      },
      'Reference data saved'
    );
    if (ok) setEditing(false);
  };

  const approved = ref.reference_status === 'approved';
  const sections = sheetSections(ref, dims);

  return (
    <section
      aria-label="Indicator reference sheet"
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
        margin: '14px 0',
        background: 'var(--surface-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Reference sheet</div>
          <div
            style={{
              fontSize: '0.72rem',
              color: approved ? '#166534' : '#92400e',
              marginTop: 2,
            }}
          >
            {sheetStatusLine(ref)}
          </div>
          {!ref.in_use && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
              Not in use{ref.duplicate_of ? ` — duplicate of indicator ${ref.duplicate_of}` : ''}.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={btn('var(--navy)')}
            onClick={() => downloadIndicatorSheet(ref, dims)}
          >
            <i className="fa-solid fa-file-pdf" /> Reference sheet (PDF)
          </button>
          {isAdmin && !editing && (
            <button
              type="button"
              style={btn('transparent', 'var(--text-1)')}
              onClick={() => {
                setDraft(toDraft(ref));
                setEditing(true);
              }}
            >
              <i className="fa-solid fa-pen" /> Edit
            </button>
          )}
          {isAdmin && !editing && !approved && (
            <button
              type="button"
              disabled={busy || ref.gaps.length > 0}
              title={
                ref.gaps.length ? `Complete first: ${ref.gaps.join(', ')}` : 'Record TWG approval'
              }
              style={{ ...btn('#166534'), opacity: busy || ref.gaps.length ? 0.5 : 1 }}
              onClick={() =>
                void save({ reference_status: 'approved' }, 'Reference data approved (TWG)')
              }
            >
              <i className="fa-solid fa-check" /> Approve (TWG)
            </button>
          )}
        </div>
      </div>

      {!editing && (
        <dl style={{ margin: 0, fontSize: '0.76rem' }}>
          {sections.map(s => (
            <div
              key={s.label}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(110px, 30%) 1fr',
                gap: 8,
                padding: '5px 0',
                borderTop: '1px solid var(--border)',
              }}
            >
              <dt style={{ color: 'var(--text-3)', fontWeight: 600 }}>{s.label}</dt>
              <dd style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-1)' }}>
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {editing && draft && (
        <form
          onSubmit={e => {
            e.preventDefault();
            void saveDraft();
          }}
          style={{ display: 'grid', gap: 10, fontSize: '0.72rem', color: 'var(--text-3)' }}
        >
          {approved && (
            <div style={{ color: '#92400e' }}>
              Saving a change returns this indicator to draft; the TWG approves it again.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label>
              Unit
              <input
                style={input}
                value={draft.unit}
                onChange={e => setDraft({ ...draft, unit: e.target.value })}
              />
            </label>
            <label>
              Frequency
              <input
                style={input}
                value={draft.periodicity}
                onChange={e => setDraft({ ...draft, periodicity: e.target.value })}
              />
            </label>
            <label>
              National tier
              <select
                style={input}
                value={draft.national_tier ?? ''}
                onChange={e =>
                  setDraft({
                    ...draft,
                    national_tier: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">— Not set —</option>
                {tiers.map(t => (
                  <option key={t.tier} value={t.tier}>
                    Tier {t.tier} — {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Lead institution
              <select
                style={input}
                value={draft.lead_institution_id ?? ''}
                onChange={e =>
                  setDraft({
                    ...draft,
                    lead_institution_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">— Not set —</option>
                {institutions.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              RBIS code
              <input
                style={input}
                value={draft.rbis_code}
                onChange={e => setDraft({ ...draft, rbis_code: e.target.value })}
                placeholder="Code supplied by RBIS"
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
              <input
                type="checkbox"
                checked={draft.requires_statistical_validation}
                onChange={e =>
                  setDraft({ ...draft, requires_statistical_validation: e.target.checked })
                }
              />
              NISR statistical sign-off (adds NISR to the validation route)
            </label>
          </div>
          <label>
            Formula
            <textarea
              style={{ ...input, resize: 'vertical' }}
              rows={2}
              value={draft.formula}
              onChange={e => setDraft({ ...draft, formula: e.target.value })}
            />
          </label>
          <label>
            Methodology
            <textarea
              style={{ ...input, resize: 'vertical' }}
              rows={3}
              value={draft.methodology}
              onChange={e => setDraft({ ...draft, methodology: e.target.value })}
            />
          </label>
          <label>
            Data source
            <input
              style={input}
              value={draft.data_source}
              onChange={e => setDraft({ ...draft, data_source: e.target.value })}
            />
          </label>
          <fieldset style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            <legend>Breakdowns reports must give</legend>
            <label style={{ display: 'inline-flex', gap: 4, marginRight: 12 }}>
              <input
                type="checkbox"
                checked={draft.disaggregations !== null && draft.disaggregations.length === 0}
                onChange={e =>
                  setDraft({ ...draft, disaggregations: e.target.checked ? [] : null })
                }
              />
              None
            </label>
            {dims.map(d => (
              <label key={d.code} style={{ display: 'inline-flex', gap: 4, marginRight: 12 }}>
                <input
                  type="checkbox"
                  checked={draft.disaggregations?.includes(d.code) ?? false}
                  onChange={e => {
                    const cur = new Set(draft.disaggregations ?? []);
                    if (e.target.checked) cur.add(d.code);
                    else cur.delete(d.code);
                    setDraft({ ...draft, disaggregations: [...cur] });
                  }}
                />
                {d.label}
              </label>
            ))}
          </fieldset>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={btn('transparent', 'var(--text-1)')}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} style={btn('var(--navy)')}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
