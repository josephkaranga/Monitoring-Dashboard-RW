import React, { useState, useCallback, useEffect } from 'react';
import { useRisks } from './useData';
import { fetchSystemMetrics, type SystemMetrics } from './systemMetricsService';
import toast from 'react-hot-toast';
import type { Risk } from './index';

const LEVEL_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  High:   { bg: '#fee2e2', color: '#991b1b', dot: '#f43f5e' },
  Medium: { bg: '#ffedd5', color: '#9a3412', dot: '#f59e0b' },
  Low:    { bg: '#dcfce7', color: '#166534', dot: '#10b981' },
};

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  Institutional:    { bg: '#fee2e2', color: '#991b1b' },
  Technical:        { bg: '#dbeafe', color: '#1e40af' },
  'Data Governance':{ bg: '#dbeafe', color: '#1e40af' },
  Capacity:         { bg: '#fef9c3', color: '#854d0e' },
  Financial:        { bg: '#fef9c3', color: '#854d0e' },
  Compliance:       { bg: '#fee2e2', color: '#991b1b' },
  Ecological:       { bg: '#fee2e2', color: '#991b1b' },
  Inclusion:        { bg: '#f1f5f9', color: '#475569' },
};

export function RiskPage() {
  const [levelFilter, setLevelFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Load automated system metrics for HWC incidents tracking
  useEffect(() => {
    const loadSystemMetrics = async () => {
      setMetricsLoading(true);
      try {
        const metrics = await fetchSystemMetrics();
        setSystemMetrics(metrics);
        console.log('📊 Risk page - automated metrics loaded:', metrics);
      } catch (error) {
        console.error('Failed to load system metrics:', error);
        toast.error('Failed to load automated risk metrics');
      }
      setMetricsLoading(false);
    };

    loadSystemMetrics();
  }, []);

  const { data: rawRisks, loading } = useRisks({
    level: levelFilter !== 'all' ? levelFilter : undefined,
    category: catFilter !== 'all' ? catFilter : undefined,
    search: search || undefined,
  }) as { data: Risk[] | null; loading: boolean; error: string | null; refetch: () => void };
  const risks: Risk[] = rawRisks ?? [];

  const handleExport = useCallback(() => {
    const fields = ['id','description','category','likelihood','impact','level','mitigation','owner'];
    const csv = [fields.join(','), ...risks.map(r => fields.map(f => `"${String((r as unknown as Record<string,unknown>)[f] || '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'nbsap_risk_register.csv';
    a.click();
  }, [risks]);

  const high  = risks.filter(r => r.level === 'High').length;
  const med   = risks.filter(r => r.level === 'Medium').length;
  const low   = risks.filter(r => r.level === 'Low').length;

  return (
    <div>
      {/* Automated Risk Monitoring Status */}
      {systemMetrics && systemMetrics.totalHwcIncidents > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-shield-exclamation" style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>
            HWC Incidents Monitoring: {systemMetrics.totalHwcIncidents} incidents tracked automatically
          </span>
          <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#ffedd5', color: '#9a3412' }}>● Auto-tracked</span>
          <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
            From T03 & T04 reports
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative', maxWidth: 280 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.8rem' }} />
          <input type="text" placeholder="Search risks…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '7px 10px 7px 32px', border: '1px solid var(--border)', borderRadius: 9, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all','High','Medium','Low'].map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: levelFilter === l ? 'var(--navy)' : 'var(--surface)', color: levelFilter === l ? '#fff' : 'var(--text-2)', transition: '0.2s' }}>
              {l === 'all' ? 'All' : l}
            </button>
          ))}
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'var(--surface)' }}>
          <option value="all">All Categories</option>
          {['Institutional','Technical','Data Governance','Capacity','Financial','Compliance','Ecological'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={handleExport}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid var(--sky-dim)', borderRadius: 8, color: 'var(--sky-dim)', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          <i className="fa-solid fa-download" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'High Risks',   val: high,         gradient: 'linear-gradient(135deg,#be123c,#f43f5e)', icon: 'fa-circle-exclamation', sub: 'Requires immediate action' },
          { label: 'Medium Risks', val: med,          gradient: 'linear-gradient(135deg,#d97706,#f59e0b)', icon: 'fa-triangle-exclamation', sub: 'Mitigation plans active' },
          { label: 'Low Risks',    val: low,          gradient: 'linear-gradient(135deg,#0284c7,#38bdf8)', icon: 'fa-circle-info', sub: 'Monitored quarterly' },
          { label: 'Total Tracked',val: risks.length, gradient: 'linear-gradient(135deg,#059669,#10b981)', icon: 'fa-shield-check', sub: 'Across 7 categories' },
          ...(systemMetrics && systemMetrics.totalHwcIncidents > 0 ? [{
            label: 'HWC Incidents', 
            val: systemMetrics.totalHwcIncidents, 
            gradient: 'linear-gradient(135deg,#9333ea,#a855f7)', 
            icon: 'fa-paw', 
            sub: 'Auto-tracked from T03/T04'
          }] : []),
        ].map(c => (
          <div key={c.label} style={{ background: c.gradient, borderRadius: 'var(--radius)', padding: 20, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{c.val}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 8 }}>{c.sub}</div>
            <i className={`fa-solid ${c.icon}`} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }} />
          </div>
        ))}
      </div>

      {/* Risk table */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-table-cells" style={{ color: 'var(--sky-dim)' }} />
            Risk Mitigation Matrix
          </div>
          <span style={{ fontSize: '0.65rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{risks.length} Identified Risks</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {['#','Risk Description','Category','Likelihood','Impact','Level','Contingency / Mitigation','Owner'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</td></tr>
              ) : risks.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>No risks match your filters.</td></tr>
              ) : risks.map(r => {
                const ls = LEVEL_STYLE[r.level] || LEVEL_STYLE.Low;
                const cs = CAT_STYLE[r.category] || { bg: '#f1f5f9', color: '#475569' };
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                    <td style={{ padding: '11px 14px', fontWeight: 700, fontFamily: "'DM Mono', monospace", color: 'var(--text-3)', fontSize: '0.72rem' }}>{r.id}</td>
                    <td style={{ padding: '11px 14px', fontWeight: 600, maxWidth: 180 }}>{r.description}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: cs.bg, color: cs.color, fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{r.category}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace" }}>{r.likelihood}</td>
                    <td style={{ padding: '11px 14px', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace" }}>{r.impact}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: ls.bg, color: ls.color, fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ls.dot, display: 'inline-block' }} />
                        {r.level}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-2)', fontSize: '0.77rem', maxWidth: 220, lineHeight: 1.4 }}>{r.mitigation}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-3)', fontSize: '0.75rem' }}>{r.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Heat Map */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-fire" style={{ color: '#f43f5e' }} />
          Risk Heat Map (Likelihood × Impact)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(3, 1fr)', gap: 4, maxWidth: 520 }}>
          <div />
          {['LOW IMPACT','MEDIUM IMPACT','HIGH IMPACT'].map(h => (
            <div key={h} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', padding: 8, fontFamily: "'DM Mono', monospace" }}>{h}</div>
          ))}
          {[
            { row: 'HIGH LIKELIHOOD', cells: [{ bg: '#fef9c3', color: '#854d0e', label: 'Medium', ids: 'R07' }, { bg: '#ffedd5', color: '#9a3412', label: 'Medium', ids: 'R04, R05' }, { bg: '#fee2e2', color: '#991b1b', label: 'High', ids: 'R11' }] },
            { row: 'MED LIKELIHOOD',  cells: [{ bg: '#f0fdf4', color: '#166534', label: 'Low',    ids: 'R10' }, { bg: '#ffedd5', color: '#9a3412', label: 'Medium', ids: 'R06, R08' }, { bg: '#fee2e2', color: '#991b1b', label: 'High', ids: 'R01, R03' }] },
            { row: 'LOW LIKELIHOOD',  cells: [{ bg: '#f0fdf4', color: '#166534', label: 'Low',    ids: 'R12' }, { bg: '#fef9c3', color: '#854d0e', label: 'Low–Med', ids: '—' }, { bg: '#ffedd5', color: '#9a3412', label: 'Medium', ids: 'R02, R09' }] },
          ].map(({ row, cells }) => (
            <React.Fragment key={row}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-3)', paddingRight: 10, fontFamily: "'DM Mono', monospace" }}>{row}</div>
              {cells.map(c => (
                <div key={c.ids} style={{ background: c.bg, borderRadius: 8, padding: 12, textAlign: 'center', minHeight: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.color }}>{c.label}</span>
                  <span style={{ fontSize: '0.65rem', color: c.color }}>{c.ids}</span>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RiskPage;
