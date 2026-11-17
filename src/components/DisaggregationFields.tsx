// ============================================================
// M05 — Sex, age, youth and disability fields on a report, shown when
// the selected indicator requires them (indicators.disaggregations).
// The database refuses the report without them (migration 045).
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  fetchDisaggregationDimensions,
  fetchIndicatorDisaggregations,
} from '../services/indicatorReferenceService';
import type { DisaggregationDimension } from '../types/index';

export const DISAGGREGATION_PREFIX = 'dis_';

export default function DisaggregationFields({
  indicatorId,
  values,
  onChange,
}: {
  indicatorId: number | null;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [dims, setDims] = useState<DisaggregationDimension[]>([]);
  const [required, setRequired] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!indicatorId) {
      setRequired([]);
      return;
    }
    Promise.all([fetchIndicatorDisaggregations(indicatorId), fetchDisaggregationDimensions()])
      .then(([req, all]) => {
        if (!alive) return;
        setRequired(req);
        setDims(all);
        setError(null);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [indicatorId]);

  if (error)
    return (
      <div role="alert" style={{ fontSize: '0.76rem', color: '#b91c1c' }}>
        {error}
      </div>
    );
  const shown = dims.filter(d => required.includes(d.code));
  if (shown.length === 0) return null;

  return (
    <fieldset
      aria-label="Breakdown required by this indicator"
      style={{
        border: '1.5px solid #bae6fd',
        background: '#f0f9ff',
        borderRadius: 10,
        padding: '10px 14px',
        margin: '12px 0',
      }}
    >
      <legend style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', padding: '0 6px' }}>
        Breakdown required by this indicator
      </legend>
      <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: 8 }}>
        Enter the number of people in each group (0 if none).
      </div>
      {shown.map(d => (
        <div key={d.code} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
            {d.label}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 8,
            }}
          >
            {d.fields.map(f => (
              <label key={f.key} style={{ fontSize: '0.72rem', color: '#475569' }}>
                {f.label}
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 7,
                    fontSize: '0.8rem',
                    marginTop: 3,
                    background: '#fff',
                    color: '#0f172a',
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
