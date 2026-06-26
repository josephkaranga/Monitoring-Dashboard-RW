import React, { useCallback, useState, useEffect, useMemo } from 'react';

import { useDashboardStats, useReports } from '../hooks/useData';
import { fetchIndicators } from '../services/dataService';
import type { Indicator } from '../types/index';

import { DashboardSkeleton } from '../components/Skeleton';
import { NBSAPTargetProgress } from '../components/NBSAPTargetProgress';
import { fetchDashboardMetrics, type DashboardMetrics, formatMetricValue } from '../services/systemMetricsService';
import { eventBus } from '../services/eventBus';
import { progressColor } from '../utils/progressColors';
import toast from 'react-hot-toast';

// ── Shared card styles ────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

// ── Metric Card ───────────────────────────────────────────────
function MetricCard({ label, value, sub, color }: {
  label: string; value: string | number; sub: string; color: string;
}) {
  return (
    <div style={{
      padding: '16px 20px', borderRadius: 'var(--radius)',
      background: 'var(--surface)', border: '1px solid var(--border)',
      flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-3)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, loading, refetch: refetchStats } = useDashboardStats(false);
  const { reports, refetch: refetchReports } = useReports({ status: 'approved', pageSize: 4 });
  const [systemMetrics, setSystemMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [indicatorFilter, setIndicatorFilter] = useState<string>('all');

  useEffect(() => { fetchIndicators({ pageSize: 200 }).then(setIndicators); }, []);

  const filteredIndicators = useMemo(() => {
    if (indicatorFilter === 'all') return indicators;
    return indicators.filter(i => i.status === indicatorFilter);
  }, [indicators, indicatorFilter]);

  // Load automated system metrics
  const loadSystemMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const metrics = await fetchDashboardMetrics();
      setSystemMetrics(metrics);
      console.log('📊 Automated system metrics loaded:', metrics);
    } catch (error) {
      console.error('Failed to load system metrics:', error);
      toast.error('Failed to load automated metrics');
    }
    setMetricsLoading(false);
  }, []);

  useEffect(() => {
    loadSystemMetrics();
  }, [loadSystemMetrics]);

  // Refresh dashboard stats and automated metrics when a report submission
  // automatically updates a target's progress.
  useEffect(() => {
    return eventBus.on('dashboard-refresh', () => {
      refetchStats();
      refetchReports();
      loadSystemMetrics();
    });
  }, [refetchStats, refetchReports, loadSystemMetrics]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const s = stats;

  return (
    <div>
      {/* ── Metric Cards ── */}
      <div className="metric-row" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <MetricCard
          label="Total Targets"
          value={s?.totalTargets ?? 22}
          sub="Rwanda NBSAP 2025–2030"
          color="#111827"
        />
        <MetricCard
          label="Data Submissions"
          value={(s?.totalSubmissions ?? 0).toLocaleString()}
          sub={`${s?.pendingVerifications ?? 0} pending review`}
          color="#059669"
        />
        <MetricCard
          label="Active Districts"
          value="30/30"
          sub="All districts active"
          color="#0284c7"
        />
        <MetricCard
          label="Compliance Issues"
          value={s?.complianceIssues ?? 0}
          sub="Requires attention"
          color={s?.complianceIssues ? '#d97706' : '#059669'}
        />
      </div>

      {/* Access Layers removed — moved to Settings page */}

      {/* ── Automated System Metrics ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            System Metrics
          </div>
        </div>
        <div style={{ padding: '16px 18px' }}>
          {metricsLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>Loading automated metrics...</div>
          ) : systemMetrics ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { val: formatMetricValue(systemMetrics.totalForestHa, 'hectares'), label: 'Forest Restored', color: '#10b981' },
                  { val: formatMetricValue(systemMetrics.totalWetlandHa, 'hectares'), label: 'Wetland Restored', color: '#0891b2' },
                  { val: systemMetrics.districtsActive, label: 'Districts Active', color: '#8b5cf6' },
                  { val: `${systemMetrics.financeUtilizedMillionRwf.toFixed(1)}M`, label: 'Finance Utilized (RWF)', color: '#059669' },
                  { val: systemMetrics.totalHwcIncidents || 0, label: 'HWC Incidents', color: '#f59e0b' },
                  { val: `${systemMetrics.eiaCompliancePercentage.toFixed(1)}%`, label: 'EIA Compliance', color: progressColor(systemMetrics.eiaCompliancePercentage).color },
                ].map(({ val, label, color }) => (
                  <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>

              {systemMetrics.eiaFullCompliance + systemMetrics.eiaPartialCompliance + systemMetrics.eiaNonCompliance > 0 && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginTop: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                    EIA Compliance Breakdown
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{systemMetrics.eiaFullCompliance}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Full Compliance</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>{systemMetrics.eiaPartialCompliance}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Partial Compliance</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{systemMetrics.eiaNonCompliance}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>Non-Compliant</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div style={{ fontSize: '0.68rem', color: 'var(--text-4)', marginTop: 12, textAlign: 'right' }}>
                Updated {new Date(systemMetrics.lastUpdated).toLocaleString()}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>No automated metrics available</div>
          )}
        </div>
      </div>

      {/* ── Legacy Live Toolkit Stats (Fallback) ── */}
      {s && !systemMetrics && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
              Toolkit Data
            </div>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { val: s.totalSubmissions, label: 'Reports', color: '#0ea5e9' },
                { val: s.forestHa.toLocaleString(), label: 'Forest (ha)', color: '#10b981' },
                { val: s.wetlandHa.toLocaleString(), label: 'Wetland (ha)', color: '#0891b2' },
                { val: s.activeDistricts, label: 'Districts', color: '#8b5cf6' },
                { val: s.financeAllocated >= 1e6 ? (s.financeAllocated / 1e6).toFixed(1) + 'M' : s.financeAllocated || '—', label: 'Finance (RWF M)', color: '#059669' },
                { val: s.hwcIncidents || '—', label: 'HWC Incidents', color: '#f59e0b' },
              ].map(({ val, label, color }) => (
                <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{val}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts + Activity + NBSAP Targets ── */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: 16, marginBottom: 24 }}>
        {/* Overall Progress vs Submissions — side-by-side comparison */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>🎯 NBSAP Indicator Progress</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Progress linked to report submissions • {indicators.length} tracked indicators
              <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>● Live</span>
            </div>
          </div>
          {(() => {
            const total = s?.totalIndicators ?? 0;
            const onTrack = s?.onTrackIndicators ?? 0;
            const atRisk = s?.atRiskIndicators ?? 0;
            const behind = s?.behindIndicators ?? 0;
            const avg = s?.avgProgress ?? 0;
            const avgPc = progressColor(avg);
            const totalSub = s?.totalSubmissions ?? 0;
            const pending = s?.pendingVerifications ?? 0;
            const approved = totalSub - pending;
            const approvalRate = totalSub > 0 ? Math.round((approved / totalSub) * 100) : 0;
            const approvalPc = progressColor(approvalRate);

            return (
              <>
                {/* Status filter */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { key: 'all', label: 'All', count: total },
                      { key: 'on-track', label: 'On-Track', count: onTrack },
                      { key: 'at-risk', label: 'At-Risk', count: atRisk },
                      { key: 'behind', label: 'Behind', count: behind },
                    ].map(f => (
                      <button key={f.key} onClick={() => setIndicatorFilter(f.key)}
                        style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 600,
                          border: indicatorFilter === f.key ? '1px solid var(--sky-dim)' : '1px solid var(--border)',
                          background: indicatorFilter === f.key ? 'rgba(14,165,233,0.1)' : 'transparent',
                          color: indicatorFilter === f.key ? 'var(--sky-dim)' : 'var(--text-3)',
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}>
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable indicator list */}
                <div style={{ maxHeight: 280, overflowY: 'auto', borderTop: '1px solid var(--surface-3)', paddingTop: 8 }}>
                  {filteredIndicators.map(ind => {
                    const pc = progressColor(ind.progress);
                    return (
                      <div key={ind.id} style={{ padding: '10px 0', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{ind.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Overall</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: pc.color }}>{ind.progress}% · {pc.label}</span>
                          </div>
                          <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${ind.progress}%`, background: pc.color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                          </div>
                          {ind.nbsap_target_id && (
                            <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 2 }}>
                              Target {ind.nbsap_target_id} {ind.periodicity && `• ${ind.periodicity}`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredIndicators.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.78rem' }}>No indicators match this filter.</div>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        {/* Recent Activity */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ marginBottom: 12, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            Recent Activity
          </div>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '0.8rem' }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8, opacity: 0.5 }} />
              No submissions yet
            </div>
          ) : reports.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--surface-3)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem' }}>
                <i className="fa-solid fa-check" />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-1)' }}>{r.tool_name} submitted</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{new Date(r.submitted_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* NBSAP Target Progress */}
        <NBSAPTargetProgress />
      </div>

    </div>
  );
}
