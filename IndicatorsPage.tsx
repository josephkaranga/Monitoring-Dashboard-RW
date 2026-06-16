import React, { useState, useCallback, useMemo } from 'react';
import { useIndicators } from './useData';
import { writeAuditEntry } from './dataService';
import type { Indicator, IndicatorTier, IndicatorStatus } from './index';

// ── Tier config ───────────────────────────────────────────────
const TIER_CONFIG: Record<IndicatorTier, { label: string; color: string; bg: string; border: string; icon: string }> = {
  headline:      { label: 'Headline',      color: '#166534', bg: '#dcfce7', border: '#bbf7d0', icon: '⭐' },
  component:     { label: 'Component',     color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe', icon: '🧩' },
  complementary: { label: 'Complementary', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff', icon: 'ℹ️' },
  binary:        { label: 'Binary',        color: '#854d0e', bg: '#fef9c3', border: '#fde68a', icon: '🔀' },
};

const STATUS_CONFIG: Record<IndicatorStatus, { color: string; bg: string; label: string }> = {
  'on-track': { color: '#166534', bg: '#dcfce7', label: '▲ On Track' },
  'at-risk':  { color: '#854d0e', bg: '#fef9c3', label: '⚠ At Risk'  },
  'behind':   { color: '#991b1b', bg: '#fee2e2', label: '▼ Behind'   },
};

// ── Modal ─────────────────────────────────────────────────────
const IndicatorModal = ({ indicator, onClose }: { indicator: Indicator; onClose: () => void }) => {
  const tier = TIER_CONFIG[indicator.tier];
  const status = STATUS_CONFIG[indicator.status];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.6)', backdropFilter: 'blur(6px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 12px 32px rgba(0,0,0,0.14)', width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Head */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', flex: 1, paddingRight: 16 }}>
            #{String(indicator.id).padStart(3, '0')} — {indicator.name}
          </h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: 22 }}>
          {/* Tier + Status */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <span style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`, fontSize: '0.65rem', padding: '2px 10px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
              {tier.icon} {tier.label.toUpperCase()}
            </span>
            <span style={{ background: status.bg, color: status.color, fontSize: '0.65rem', padding: '2px 10px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
              {status.label}
            </span>
          </div>

          {/* Progress */}
          <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 12, padding: 18, color: '#fff', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Progress toward 2030 target</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{indicator.progress}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
              <div style={{ background: '#38bdf8', width: `${indicator.progress}%`, height: '100%', borderRadius: 6, transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', opacity: 0.75 }}>
              <span>Current: <strong style={{ color: '#fff' }}>{indicator.current_value}</strong></span>
              <span>Target: <strong style={{ color: '#fff' }}>{indicator.final_target || indicator.target_2030}</strong></span>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Definition', value: indicator.definition },
              { label: 'Target 2030', value: indicator.target_2030 },
              { label: 'Baseline 2025', value: indicator.baseline },
              { label: 'Midterm 2027', value: indicator.midterm },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{value || '—'}</div>
              </div>
            ))}
          </div>

          {/* Data source + periodicity */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, fontSize: '0.75rem', color: '#64748b' }}>
            <strong>Data Source:</strong> {indicator.data_source}<br />
            <strong>Reporting Frequency:</strong> {indicator.periodicity}<br />
            <strong>KM-GBF Alignment:</strong> {indicator.km_gbf}
          </div>

          {/* Responsible orgs */}
          {indicator.responsible?.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {indicator.responsible.map(org => (
                <span key={org} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.68rem', padding: '2px 9px', borderRadius: 10, fontWeight: 600 }}>{org}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────
export default function IndicatorsPage() {
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [groupByTarget, setGroupByTarget] = useState(false);

  const { data: indicators = [], loading } = useIndicators({
    tier: tierFilter !== 'all' ? tierFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  }) as { data: Indicator[]; loading: boolean; error: string | null; refetch: () => void };

  // Client-side text search on top of server-filtered data
  const filtered = useMemo(() => {
    if (!search.trim()) return indicators;
    const q = search.toLowerCase();
    return indicators.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.definition?.toLowerCase().includes(q) ||
      i.data_source?.toLowerCase().includes(q) ||
      i.responsible?.some(r => r.toLowerCase().includes(q))
    );
  }, [indicators, search]);

  const handleOpen = useCallback(async (indicator: Indicator) => {
    setSelected(indicator);
    await writeAuditEntry('view', `Viewed indicator: ${indicator.name}`, `ID: ${indicator.id}`);
  }, []);

  // Tier summary counts from full indicator list
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    indicators.forEach(i => { counts[i.tier] = (counts[i.tier] || 0) + 1; });
    return counts;
  }, [indicators]);

  // Group by target
  const grouped = useMemo(() => {
    if (!groupByTarget) return null;
    const map: Record<string, Indicator[]> = {};
    filtered.forEach(i => {
      const key = `Target ${i.nbsap_target_id}`;
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return Object.entries(map).sort((a, b) => parseInt(a[0].replace('Target ', '')) - parseInt(b[0].replace('Target ', '')));
  }, [filtered, groupByTarget]);

  return (
    <div>
      {selected && <IndicatorModal indicator={selected} onClose={() => setSelected(null)} />}

      {/* Tier summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {(Object.entries(TIER_CONFIG) as [IndicatorTier, typeof TIER_CONFIG[IndicatorTier]][]).map(([key, cfg]) => (
          <div
            key={key}
            onClick={() => setTierFilter(t => t === key ? 'all' : key)}
            style={{
              background: tierFilter === key ? cfg.bg : '#fff',
              border: `1px solid ${tierFilter === key ? cfg.border : '#e2e8f0'}`,
              borderRadius: 12, padding: 16, cursor: 'pointer', transition: '0.2s',
              borderLeft: `4px solid ${cfg.color}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>{cfg.icon} {cfg.label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: cfg.color }}>{tierCounts[key] || 0}</div>
            <div style={{ fontSize: '0.65rem', color: cfg.color, opacity: 0.7, marginTop: 2 }}>indicators</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}>🔍</span>
          <input
            type="text"
            placeholder={`Search ${indicators.length} indicators…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff' }}
        >
          <option value="all">All Statuses</option>
          <option value="on-track">On Track</option>
          <option value="at-risk">At Risk</option>
          <option value="behind">Behind</option>
        </select>

        {/* Group toggle */}
        <button
          onClick={() => setGroupByTarget(g => !g)}
          style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: groupByTarget ? '#0f2744' : '#fff', color: groupByTarget ? '#fff' : '#475569', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          🗂 {groupByTarget ? 'Flat View' : 'Group by Target'}
        </button>

        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginLeft: 'auto' }}>
          {filtered.length} of {indicators.length} indicators
        </span>
      </div>

      {/* Table / Group view */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            Loading indicators from database…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: '0.85rem' }}>No indicators match your filters.</p>
          </div>
        ) : groupByTarget && grouped ? (
          // Grouped view
          <div style={{ padding: 16 }}>
            {grouped.map(([targetKey, inds]) => (
              <div key={targetKey} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  🎯 {targetKey}
                  <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{inds.length}</span>
                </div>
                {inds.map(ind => <IndicatorRow key={ind.id} indicator={ind} onClick={() => handleOpen(ind)} />)}
              </div>
            ))}
          </div>
        ) : (
          // Table view
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'Indicator Name', 'Tier', 'Target', 'Progress', 'Status', 'Responsible'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ind => (
                  <tr
                    key={ind.id}
                    onClick={() => handleOpen(ind)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: '0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: '#94a3b8', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }}>
                      {String(ind.id).padStart(3, '0')}
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 600, maxWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_CONFIG[ind.status]?.color || '#94a3b8', flexShrink: 0 }} />
                        {ind.name}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: TIER_CONFIG[ind.tier]?.bg, color: TIER_CONFIG[ind.tier]?.color, fontSize: '0.62rem', padding: '2px 8px', borderRadius: 9, fontWeight: 700, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>
                        {TIER_CONFIG[ind.tier]?.icon} {ind.tier}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '0.72rem', color: '#475569', fontFamily: "'DM Mono', monospace" }}>
                      T{ind.nbsap_target_id}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 64, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ height: '100%', width: `${ind.progress}%`, background: STATUS_CONFIG[ind.status]?.color || '#94a3b8', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: STATUS_CONFIG[ind.status]?.color, fontFamily: "'DM Mono', monospace" }}>{ind.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: STATUS_CONFIG[ind.status]?.bg, color: STATUS_CONFIG[ind.status]?.color }}>
                        {STATUS_CONFIG[ind.status]?.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', maxWidth: 180 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {(ind.responsible || []).slice(0, 2).map(r => (
                          <span key={r} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.62rem', padding: '1px 6px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>{r}</span>
                        ))}
                        {(ind.responsible || []).length > 2 && (
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>+{ind.responsible.length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Indicator row for group view ─────────────────────────────
const IndicatorRow = ({ indicator: ind, onClick }: { indicator: Indicator; onClick: () => void }) => {
  const tier = TIER_CONFIG[ind.tier];
  const status = STATUS_CONFIG[ind.status];
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, marginBottom: 5, cursor: 'pointer', transition: '0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <span style={{ background: tier.bg, color: tier.color, fontSize: '0.58rem', padding: '1px 6px', borderRadius: 7, fontWeight: 700, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{tier.icon} {ind.tier}</span>
      <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>{ind.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${ind.progress}%`, background: status.color, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: status.color, width: 32, fontFamily: "'DM Mono', monospace" }}>{ind.progress}%</span>
        <span style={{ fontSize: '0.58rem', padding: '1px 6px', borderRadius: 7, background: status.bg, color: status.color, fontWeight: 700, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>{status.label}</span>
      </div>
    </div>
  );
};
