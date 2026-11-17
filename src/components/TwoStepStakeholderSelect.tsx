// ============================================================
// Reporting Stakeholder in two steps (requested 17 Nov 2026):
// first the type of institution (Ministries, Authorities, Boards, ...),
// then a second dropdown with only the institutions of that type.
// Types and their order come from the institutions table (M01).
// ============================================================

import React, { useEffect, useState } from 'react';
import type { StakeholderGroup } from '../utils/stakeholderGroups';

export interface StakeholderOption {
  id: string; // institutions.code
  name: string;
}

const selectStyle = (invalid: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '9px 12px',
  border: `1.5px solid ${invalid ? '#f43f5e' : '#e2e8f0'}`,
  borderRadius: 8,
  fontSize: '0.83rem',
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none',
  background: '#fff',
  color: '#0f172a',
});

const stepLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.66rem',
  color: '#94a3b8',
  margin: '0 0 3px',
};

export default function TwoStepStakeholderSelect({
  groups,
  value,
  onChange,
  invalid = false,
  loading = false,
  emptyMessage = 'No institutions available',
}: {
  groups: StakeholderGroup<StakeholderOption>[];
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}) {
  const groupOf = (code: string) => groups.find(g => g.items.some(i => i.id === code))?.label ?? '';
  const [category, setCategory] = useState<string>(() => groupOf(value));

  // Follow the selected institution (e.g. a resumed draft), and pick the
  // only type automatically when there is just one.
  useEffect(() => {
    if (value) {
      const g = groupOf(value);
      if (g && g !== category) setCategory(g);
    } else if (!category && groups.length === 1) {
      setCategory(groups[0].label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, groups]);

  const items = groups.find(g => g.label === category)?.items ?? [];

  if (loading) {
    return (
      <select disabled style={selectStyle(false)}>
        <option>Loading…</option>
      </select>
    );
  }
  if (groups.length === 0) {
    return (
      <select disabled style={selectStyle(invalid)}>
        <option>{emptyMessage}</option>
      </select>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div>
        <span style={stepLabel}>1. Type of institution</span>
        <select
          aria-label="Type of institution"
          value={category}
          onChange={e => {
            setCategory(e.target.value);
            onChange(''); // the institution must be chosen again for the new type
          }}
          style={selectStyle(invalid && !category)}
        >
          <option value="">— Select type —</option>
          {groups.map(g => (
            <option key={g.label} value={g.label}>
              {g.label} ({g.items.length})
            </option>
          ))}
        </select>
      </div>
      <div>
        <span style={stepLabel}>2. Institution</span>
        <select
          aria-label="Institution"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={!category}
          style={selectStyle(invalid && !!category)}
        >
          <option value="">
            {category ? `— Select ${category.toLowerCase()} —` : 'Choose a type first'}
          </option>
          {items.map(i => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
