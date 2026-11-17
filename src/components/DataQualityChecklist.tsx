// ============================================================
// M04 — Data-quality self-check before submission.
// Every item must be ticked and the declaration accepted; the database
// refuses the report otherwise (migration 043). Items are maintained by
// REMA administrators (table dqa_checklist_items).
// ============================================================

import React from 'react';
import type { DqaChecklistItem, DqaDeclaration } from '../types/index';
import { isChecklistComplete } from '../utils/dataQuality';

export default function DataQualityChecklist({
  items,
  declaration,
  onChange,
  loading = false,
  error = null,
}: {
  items: DqaChecklistItem[];
  declaration: DqaDeclaration;
  onChange: (next: DqaDeclaration) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const confirmed = new Set(declaration.items);
  const complete = isChecklistComplete(items, declaration);
  const ticked = items.filter(i => confirmed.has(i.id)).length;

  const toggle = (id: number) => {
    const next = new Set(confirmed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...declaration, items: [...next] });
  };

  const allTicked = items.length > 0 && ticked === items.length;
  const toggleAll = () =>
    onChange({ ...declaration, items: allTicked ? [] : items.map(i => i.id) });

  return (
    <fieldset
      aria-label="Data quality checklist"
      style={{
        border: `1.5px solid ${complete ? '#86efac' : '#e2e8f0'}`,
        borderRadius: 10,
        padding: '12px 14px',
        margin: '16px 0 8px',
        background: complete ? '#f0fdf4' : '#f8fafc',
      }}
    >
      <legend style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', padding: '0 6px' }}>
        Data quality check{' '}
        <span style={{ fontWeight: 500, color: '#64748b', fontSize: '0.74rem' }}>
          ({ticked}/{items.length} confirmed)
        </span>
      </legend>

      {loading && (
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Loading the checklist…</div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: '0.78rem', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 8 }}>
            Confirm each point before submitting. Validators see that you confirmed them.{' '}
            {items.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#0369a1',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.74rem',
                  textDecoration: 'underline',
                }}
              >
                {allTicked ? 'Untick all' : 'I have checked all of these'}
              </button>
            )}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map(item => (
              <li key={item.id} style={{ marginBottom: 6 }}>
                <label
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    fontSize: '0.8rem',
                    color: '#1e293b',
                    cursor: 'pointer',
                  }}
                  title={item.source ?? undefined}
                >
                  <input
                    type="checkbox"
                    checked={confirmed.has(item.id)}
                    onChange={() => toggle(item.id)}
                    style={{ marginTop: 3 }}
                  />
                  <span>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
          <label
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#0f172a',
              borderTop: '1px solid #e2e8f0',
              paddingTop: 8,
              marginTop: 6,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={declaration.declared}
              onChange={e => onChange({ ...declaration, declared: e.target.checked })}
              style={{ marginTop: 3 }}
            />
            <span>
              I declare that the information in this report is accurate and complete to the best of
              my knowledge.
            </span>
          </label>
        </>
      )}
    </fieldset>
  );
}
