// ============================================================
// RiskPage.tsx
// ============================================================
import React, { useState, useCallback } from 'react';
import { useRisks } from './useData';
import { exportAuditLogToCSV } from './dataService';
import type { Risk } from './index';

const LEVEL_STYLE = {
  High:   { bg: '#fee2e2', color: '#991b1b', dot: '#f43f5e' },
  Medium: { bg: '#ffedd5', color: '#9a3412', dot: '#f59e0b' },
  Low:    { bg: '#dcfce7', color: '#166534', dot: '#10b981' },
};

export function RiskPage() {
  const [levelFilter, setLevelFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data: risks = [], loading } = useRisks({ level: levelFilter !== 'all' ? levelFilter : undefined, category: catFilter !== 'all' ? catFilter : undefined, search: search || undefined }) as { data: Risk[]; loading: boolean; error: string | null; refetch: () => void };

  const handleExport = useCallback(() => {
    const fields = ['id','description','category','likelihood','impact','level','mitigation','owner'];
    const csv = [fields.join(','), ...risks.map(r => fields.map(f => `"${String((r as unknown as Record<string,unknown>)[f] || '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'nbsap_risk_register.csv'; a.click();
  }, [risks]);

  const high = risks.filter(r => r.level === 'High').length;
  const med  = risks.filter(r => r.level === 'Medium').length;
  const low  = risks.filter(r => r.level === 'Low').length;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 280 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}>🔍</span>
          <input type="text" placeholder="Search risks…" value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '7px 10px 7px 30px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%' }} />
        </div>
        {['all','High','Medium','Low'].map(l => (
          <button key={l} onClick={() => setLevelFilter(l)} style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: levelFilter === l ? '#0f2744' : '#fff', color: levelFilter === l ? '#fff' : '#475569' }}>{l === 'all' ? 'All' : l}</button>
        ))}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff' }}>
          <option value="all">All Categories</option>
          {['Institutional','Technical','Data Governance','Capacity','Financial','Compliance','Ecological'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={handleExport} style={{ marginLeft: 'auto', padding: '7px 14px', border: '1.5px solid #0ea5e9', borderRadius: 8, color: '#0ea5e9', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>📥 Export CSV</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[['High Risks', high, '#be123c', '#f43f5e'], ['Medium Risks', med, '#d97706', '#f59e0b'], ['Low Risks', low, '#0284c7', '#38bdf8'], ['Total', risks.length, '#059669', '#10b981']].map(([l, v, c1, c2]) => (
          <div key={String(l)} style={{ background: `linear-gradient(135deg,${c1}dd,${c2})`, borderRadius: 14, padding: 16, color: '#fff' }}>
            <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Risk table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>🗂️ Risk Mitigation Matrix</span>
          <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{risks.length} risks</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['ID','Description','Category','Likelihood','Impact','Level','Mitigation','Owner'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
              ) : risks.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>No risks match your filters.</td></tr>
              ) : risks.map(r => {
                const ls = LEVEL_STYLE[r.level] || LEVEL_STYLE.Low;
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, fontFamily: "'DM Mono', monospace", color: '#94a3b8', fontSize: '0.72rem' }}>{r.id}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600, maxWidth: 180 }}>{r.description}</td>
                    <td style={{ padding: '11px 14px' }}><span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>{r.category}</span></td>
                    <td style={{ padding: '11px 14px', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace" }}>{r.likelihood}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace" }}>{r.impact}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: ls.bg, color: ls.color, fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ls.dot, display: 'inline-block' }} />
                        {r.level}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#475569', fontSize: '0.77rem', maxWidth: 220, lineHeight: 1.4 }}>{r.mitigation}</td>
                    <td style={{ padding: '11px 14px', color: '#94a3b8', fontSize: '0.75rem' }}>{r.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RiskPage;
