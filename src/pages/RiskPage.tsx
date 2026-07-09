import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRisks } from '../hooks/useData';
import { fetchSystemMetrics, type SystemMetrics } from '../services/systemMetricsService';
import toast from 'react-hot-toast';
import type { Risk } from '../types/index';

const LEVEL_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  High: { bg: '#fee2e2', color: '#991b1b', dot: '#f43f5e' },
  Medium: { bg: '#ffedd5', color: '#9a3412', dot: '#f59e0b' },
  Low: { bg: '#dcfce7', color: '#166534', dot: '#10b981' },
};

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  Institutional: { bg: '#fee2e2', color: '#991b1b' },
  Technical: { bg: '#dbeafe', color: '#1e40af' },
  'Data Governance': { bg: '#dbeafe', color: '#1e40af' },
  Capacity: { bg: '#fef9c3', color: '#854d0e' },
  Financial: { bg: '#fef9c3', color: '#854d0e' },
  Compliance: { bg: '#fee2e2', color: '#991b1b' },
  Ecological: { bg: '#fee2e2', color: '#991b1b' },
  Inclusion: { bg: '#f1f5f9', color: '#475569' },
};

export function RiskPage() {
  const [searchParams] = useSearchParams();
  const [levelFilter, setLevelFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Deep-linked from the dashboard's "Requires attention" panel
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

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
    const fields = [
      'id',
      'description',
      'category',
      'likelihood',
      'impact',
      'level',
      'mitigation',
      'owner',
    ];
    const csv = [
      fields.join(','),
      ...risks.map(r =>
        fields
          .map(
            f =>
              `"${String((r as unknown as Record<string, unknown>)[f] || '').replace(/"/g, '""')}"`
          )
          .join(',')
      ),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'nbsap_risk_register.csv';
    a.click();
  }, [risks]);

  const high = risks.filter(r => r.level === 'High').length;
  const med = risks.filter(r => r.level === 'Medium').length;
  const low = risks.filter(r => r.level === 'Low').length;

  return (
    <div>
      {/* Automated Risk Monitoring Status */}
      {systemMetrics && systemMetrics.totalHwcIncidents > 0 && (
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="fa-solid fa-shield-exclamation" style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
            HWC Incidents Monitoring: {systemMetrics.totalHwcIncidents} incidents tracked
            automatically
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              padding: '3px 8px',
              borderRadius: 12,
              fontWeight: 700,
              background: '#ffedd5',
              color: '#9a3412',
            }}
          >
            ● Auto-tracked
          </span>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: '0.7rem',
              color: '#94a3b8',
            }}
          >
            From T03 & T04 reports
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div style={{ position: 'relative', maxWidth: 280 }}>
          <i
            className="fa-solid fa-magnifying-glass"
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '0.8rem',
            }}
          />
          <input
            type="text"
            placeholder="Search risks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 10px 7px 32px',
              border: '1px solid #e2e8f0',
              borderRadius: 9,
              fontSize: '0.82rem',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'High', 'Medium', 'Low'].map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: levelFilter === l ? '#14385c' : '#fff',
                color: levelFilter === l ? '#fff' : '#475569',
                transition: '0.2s',
              }}
            >
              {l === 'all' ? 'All' : l}
            </button>
          ))}
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: '0.78rem',
            outline: 'none',
            background: '#fff',
          }}
        >
          <option value="all">All Categories</option>
          {[
            'Institutional',
            'Technical',
            'Data Governance',
            'Capacity',
            'Financial',
            'Compliance',
            'Ecological',
          ].map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            border: '1.5px solid #1f6cb4',
            borderRadius: 8,
            color: '#1f6cb4',
            background: 'transparent',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <i className="fa-solid fa-download" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: 'High Risks',
            val: high,
            color: '#dc2626',
            icon: 'fa-circle-exclamation',
            sub: 'Requires immediate action',
          },
          {
            label: 'Medium Risks',
            val: med,
            color: '#d97706',
            icon: 'fa-triangle-exclamation',
            sub: 'Mitigation plans active',
          },
          {
            label: 'Low Risks',
            val: low,
            color: '#1f6cb4',
            icon: 'fa-circle-info',
            sub: 'Monitored quarterly',
          },
          {
            label: 'Total Tracked',
            val: risks.length,
            color: '#16a34a',
            icon: 'fa-shield-check',
            sub: 'Across 7 categories',
          },
          ...(systemMetrics && systemMetrics.totalHwcIncidents > 0
            ? [
                {
                  label: 'HWC Incidents',
                  val: systemMetrics.totalHwcIncidents,
                  color: '#7c3aed',
                  icon: 'fa-paw',
                  sub: 'Auto-tracked from T03/T04',
                },
              ]
            : []),
        ].map(c => (
          <div
            key={c.label}
            style={{
              background: '#fff',
              border: '1px solid #eef2f6',
              borderTop: `3px solid ${c.color}`,
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: `${c.color}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <i className={`fa-solid ${c.icon}`} style={{ color: c.color, fontSize: '0.9rem' }} />
            </div>
            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500 }}>{c.label}</div>
            <div
              style={{
                fontSize: '1.7rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.1,
                marginTop: 2,
              }}
            >
              {c.val}
            </div>
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Risk table */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            <i className="fa-solid fa-table-cells" style={{ color: '#1f6cb4' }} />
            Risk Mitigation Matrix
          </div>
          <span
            style={{
              fontSize: '0.65rem',
              background: '#e0f2fe',
              color: '#0369a1',
              padding: '3px 8px',
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            {risks.length} Identified Risks
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {[
                  '#',
                  'Risk Description',
                  'Category',
                  'Likelihood',
                  'Impact',
                  'Level',
                  'Contingency / Mitigation',
                  'Owner',
                ].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#94a3b8',
                      background: '#f8fafc',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    Loading…
                  </td>
                </tr>
              ) : risks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                    No risks match your filters.
                  </td>
                </tr>
              ) : (
                risks.map(r => {
                  const ls = LEVEL_STYLE[r.level] || LEVEL_STYLE.Low;
                  const cs = CAT_STYLE[r.category] || { bg: '#f1f5f9', color: '#475569' };
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td
                        style={{
                          padding: '11px 14px',
                          fontWeight: 700,
                          color: '#94a3b8',
                          fontSize: '0.72rem',
                        }}
                      >
                        {r.id}
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, maxWidth: 180 }}>
                        {r.description}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            background: cs.bg,
                            color: cs.color,
                            fontSize: '0.62rem',
                            padding: '2px 8px',
                            borderRadius: 8,
                            fontWeight: 700,
                          }}
                        >
                          {r.category}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '11px 14px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {r.likelihood}
                      </td>
                      <td
                        style={{
                          padding: '11px 14px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {r.impact}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span
                          style={{
                            background: ls.bg,
                            color: ls.color,
                            fontSize: '0.62rem',
                            padding: '2px 8px',
                            borderRadius: 8,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: ls.dot,
                              display: 'inline-block',
                            }}
                          />
                          {r.level}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '11px 14px',
                          color: '#475569',
                          fontSize: '0.77rem',
                          maxWidth: 220,
                          lineHeight: 1.4,
                        }}
                      >
                        {r.mitigation}
                      </td>
                      <td
                        style={{
                          padding: '11px 14px',
                          color: '#94a3b8',
                          fontSize: '0.75rem',
                        }}
                      >
                        {r.owner}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Heat Map */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: 18,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          <i className="fa-solid fa-fire" style={{ color: '#f43f5e' }} />
          Risk Heat Map (Likelihood × Impact)
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto repeat(3, 1fr)',
            gap: 4,
            maxWidth: 520,
          }}
        >
          <div />
          {['LOW IMPACT', 'MEDIUM IMPACT', 'HIGH IMPACT'].map(h => (
            <div
              key={h}
              style={{
                textAlign: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#94a3b8',
                padding: 8,
              }}
            >
              {h}
            </div>
          ))}
          {[
            {
              row: 'HIGH LIKELIHOOD',
              cells: [
                { bg: '#fef9c3', color: '#854d0e', label: 'Medium', ids: 'R07' },
                { bg: '#ffedd5', color: '#9a3412', label: 'Medium', ids: 'R04, R05' },
                { bg: '#fee2e2', color: '#991b1b', label: 'High', ids: 'R11' },
              ],
            },
            {
              row: 'MED LIKELIHOOD',
              cells: [
                { bg: '#f0fdf4', color: '#166534', label: 'Low', ids: 'R10' },
                { bg: '#ffedd5', color: '#9a3412', label: 'Medium', ids: 'R06, R08' },
                { bg: '#fee2e2', color: '#991b1b', label: 'High', ids: 'R01, R03' },
              ],
            },
            {
              row: 'LOW LIKELIHOOD',
              cells: [
                { bg: '#f0fdf4', color: '#166534', label: 'Low', ids: 'R12' },
                { bg: '#fef9c3', color: '#854d0e', label: 'Low–Med', ids: '—' },
                { bg: '#ffedd5', color: '#9a3412', label: 'Medium', ids: 'R02, R09' },
              ],
            },
          ].map(({ row, cells }) => (
            <React.Fragment key={row}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  paddingRight: 10,
                }}
              >
                {row}
              </div>
              {cells.map(c => (
                <div
                  key={c.ids}
                  style={{
                    background: c.bg,
                    borderRadius: 8,
                    padding: 12,
                    textAlign: 'center',
                    minHeight: 70,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.color }}>
                    {c.label}
                  </span>
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
