// ============================================================
// M02 — Validation workflow configuration (REMA administrators)
// Decision 3 in the PDF ("validation order") is a setting here, not code:
// the order of the stages, whether each is in use, and which reports pass
// through it. Changes apply to reports submitted (or resubmitted) after
// the change; reports already in validation keep their route.
// The database restricts these edits to administrators (RLS).
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchValidationStages, updateValidationStage } from '../services/reportService';
import { fetchIndicators } from '../services/dataService';
import { supabase } from '../utils/supabase';
import { SCOPE_ROLE_LABELS } from '../types/index';
import type { Indicator, ValidationStage } from '../types/index';

const APPLIES_TO_LABEL: Record<ValidationStage['applies_to'], string> = {
  all_reports: 'Every report',
  district_reports: 'Reports about a district',
  institution_reports: 'Reports of a single institution (not District Authorities)',
  flagged_indicators: 'Reports on indicators flagged for statistical sign-off',
  spatial_reports: 'Reports with map / GIS evidence',
};

const MATCH_LABEL: Record<ValidationStage['scope_match'], string> = {
  report_district: "the report's district",
  report_institution: "the report's institution",
  national: 'any report (national)',
};

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow-sm)',
  padding: 18,
};
const small: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 7,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  cursor: 'pointer',
  fontSize: '0.76rem',
};

export default function ValidationWorkflowPage() {
  const [stages, setStages] = useState<ValidationStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStages(await fetchValidationStages());
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (id: number, changes: Parameters<typeof updateValidationStage>[1]) => {
    setBusy(true);
    const r = await updateValidationStage(id, changes);
    setBusy(false);
    if (r.error) {
      toast.error(r.error);
      return false;
    }
    return true;
  };

  // Swap ordinals with the neighbour (two updates; audited by the database).
  const move = async (index: number, delta: -1 | 1) => {
    const a = stages[index];
    const b = stages[index + delta];
    if (!a || !b) return;
    if ((await save(a.id, { ordinal: b.ordinal })) && (await save(b.id, { ordinal: a.ordinal }))) {
      toast.success('Order changed');
    }
    load();
  };

  const toggle = async (s: ValidationStage) => {
    const activeAll = stages.filter(x => x.is_active && x.applies_to === 'all_reports');
    if (s.is_active && s.applies_to === 'all_reports' && activeAll.length === 1) {
      toast.error(
        'At least one active stage must apply to every report, or reports could not be submitted.'
      );
      return;
    }
    if (await save(s.id, { is_active: !s.is_active })) {
      toast.success(`${s.name} ${s.is_active ? 'switched off' : 'switched on'}`);
    }
    load();
  };

  const changeAppliesTo = async (s: ValidationStage, applies_to: ValidationStage['applies_to']) => {
    if (await save(s.id, { applies_to })) toast.success('Saved');
    load();
  };

  // Indicators flagged for NISR statistical sign-off (applies_to = flagged_indicators).
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorSearch, setIndicatorSearch] = useState('');
  useEffect(() => {
    fetchIndicators({ pageSize: 500 })
      .then(setIndicators)
      .catch(e => toast.error((e as Error).message));
  }, []);
  const setFlag = async (ind: Indicator, value: boolean) => {
    const { data, error } = await supabase
      .from('indicators')
      .update({ requires_statistical_validation: value })
      .eq('id', ind.id)
      .select('id');
    if (error || !data?.length) {
      toast.error(error?.message ?? 'Only administrators can change indicators.');
      return;
    }
    setIndicators(list =>
      list.map(i => (i.id === ind.id ? { ...i, requires_statistical_validation: value } : i))
    );
  };
  const shownIndicators = indicators.filter(i =>
    i.name.toLowerCase().includes(indicatorSearch.trim().toLowerCase())
  );
  const flaggedCount = indicators.filter(i => i.requires_statistical_validation).length;

  const active = stages.filter(s => s.is_active);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Validation workflow</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', maxWidth: 760 }}>
          Every report passes, in this order, through the active stages that apply to it. The last
          stage publishes it, and only published reports count toward progress. Changes apply to
          reports submitted or resubmitted afterwards. Validators are assigned in User Management →
          Access &amp; institution.
        </div>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div
          style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}
        >
          CURRENT ROUTE FOR A REPORT THAT MEETS EVERY CONDITION
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {active.map((s, i) => (
            <React.Fragment key={s.id}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 14,
                  background: i === active.length - 1 ? '#dcfce7' : '#e0f2fe',
                  color: i === active.length - 1 ? '#166534' : '#0369a1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                {s.name}
              </span>
              {i < active.length - 1 && <span style={{ color: 'var(--text-3)' }}>→</span>}
            </React.Fragment>
          ))}
          {active.length > 0 && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>→ published</span>
          )}
        </div>
      </div>

      <div style={card}>
        {loading ? (
          'Loading…'
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-3)' }}>
                <th style={{ padding: 8 }}>Order</th>
                <th style={{ padding: 8 }}>Stage</th>
                <th style={{ padding: 8 }}>Applies to</th>
                <th style={{ padding: 8 }}>Who acts</th>
                <th style={{ padding: 8 }}>In use</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr
                  key={s.id}
                  style={{ borderTop: '1px solid var(--border)', opacity: s.is_active ? 1 : 0.55 }}
                >
                  <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                    <button
                      style={small}
                      disabled={busy || i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`Move ${s.name} earlier`}
                    >
                      ↑
                    </button>{' '}
                    <button
                      style={small}
                      disabled={busy || i === stages.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`Move ${s.name} later`}
                    >
                      ↓
                    </button>
                  </td>
                  <td style={{ padding: 8, fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: 8 }}>
                    <select
                      value={s.applies_to}
                      disabled={busy}
                      onChange={e =>
                        changeAppliesTo(s, e.target.value as ValidationStage['applies_to'])
                      }
                      aria-label={`Which reports pass through ${s.name}`}
                      style={{
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                      }}
                    >
                      {(Object.keys(APPLIES_TO_LABEL) as ValidationStage['applies_to'][]).map(k => (
                        <option key={k} value={k}>
                          {APPLIES_TO_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 8, color: 'var(--text-2)' }}>
                    {SCOPE_ROLE_LABELS[s.scope_role]}
                    {s.institution_code ? ` (${s.institution_code})` : ''} for{' '}
                    {MATCH_LABEL[s.scope_match]}
                  </td>
                  <td style={{ padding: 8 }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        gap: 6,
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={s.is_active}
                        disabled={busy}
                        onChange={() => toggle(s)}
                      />
                      {s.is_active ? 'On' : 'Off'}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Indicators needing NISR statistical sign-off ({flaggedCount})
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginBottom: 10 }}>
          Reports on a ticked indicator pass through the NISR stage. Full validation routes per
          indicator come with the indicator reference data (M05).
        </div>
        <input
          type="search"
          placeholder="Search indicators…"
          value={indicatorSearch}
          onChange={e => setIndicatorSearch(e.target.value)}
          aria-label="Search indicators"
          style={{
            width: '100%',
            maxWidth: 360,
            padding: '7px 10px',
            border: '1px solid var(--border)',
            borderRadius: 8,
            marginBottom: 10,
          }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {shownIndicators.map(ind => (
            <label
              key={ind.id}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding: '5px 0',
                fontSize: '0.8rem',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={!!ind.requires_statistical_validation}
                onChange={e => setFlag(ind, e.target.checked)}
              />
              <span style={{ color: 'var(--text-3)', minWidth: 64 }}>
                Target {ind.nbsap_target_id}
              </span>
              {ind.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
