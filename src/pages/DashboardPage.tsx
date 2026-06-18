import React, { useCallback, useState, useEffect } from 'react';

import { useDashboardStats, useReports } from '../hooks/useData';

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
function MetricCard({ label, value, sub, gradient, icon }: {
  label: string; value: string | number; sub: string; gradient: string; icon: string;
}) {
  return (
    <div style={{
      padding: 20, borderRadius: 'var(--radius)', color: '#fff',
      background: gradient, position: 'relative', overflow: 'hidden', flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: '0.72rem', opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 8 }}>{sub}</div>
      <i className={`fa-solid ${icon}`} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }} />
    </div>
  );
}

// ── Progress Row ──────────────────────────────────────────────
function ProgRow({ label, value, target, color }: { label: string; value: string; target: string; color: string }) {
  const numVal = parseFloat(value) || 0;
  const numTarget = parseFloat(target) || 0;
  // If value contains '%', treat as absolute percentage; otherwise compute ratio
  const pct = value.includes('%')
    ? Math.min(100, Math.max(0, numVal))
    : numTarget > 0 ? Math.min(100, (numVal / numTarget) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 5 }}>
        <span style={{ fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{value} / {target}</span>
      </div>
      <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, loading, refetch: refetchStats } = useDashboardStats(false);
  const { reports, refetch: refetchReports } = useReports({ status: 'approved', pageSize: 4 });
  const [systemMetrics, setSystemMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

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
          label="Total Targets" icon="fa-bullseye"
          value={s?.totalTargets ?? 22}
          sub="Rwanda NBSAP 2025–2030"
          gradient="linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)"
        />
        <MetricCard
          label="Data Submissions" icon="fa-database"
          value={(s?.totalSubmissions ?? 0).toLocaleString()}
          sub={`${s?.pendingVerifications ?? 0} pending review`}
          gradient="linear-gradient(135deg, #059669 0%, #10b981 100%)"
        />
        <MetricCard
          label="Active Districts" icon="fa-map-location-dot"
          value="30/30"
          sub="All districts active"
          gradient="linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
        />
        <MetricCard
          label="Compliance Issues" icon="fa-triangle-exclamation"
          value={s?.complianceIssues ?? 0}
          sub="Requires attention"
          gradient={s?.complianceIssues ? "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" : "linear-gradient(135deg, #059669 0%, #10b981 100%)"}
        />
      </div>

      {/* Access Layers removed — moved to Settings page */}

      {/* ── Automated System Metrics ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--sky-dim)' }} />
            Automated System Metrics
            <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>● Live</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>Auto-updates when reports are approved - all tools (T01-T07) feed into system metrics</p>
        </div>
        <div style={{ padding: '16px 18px' }}>
          {metricsLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>Loading automated metrics...</div>
          ) : systemMetrics ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { 
                    val: formatMetricValue(systemMetrics.totalForestHa, 'hectares'), 
                    label: 'Forest Restored', 
                    color: '#10b981',
                    source: 'T02, T03, T06'
                  },
                  { 
                    val: formatMetricValue(systemMetrics.totalWetlandHa, 'hectares'), 
                    label: 'Wetland Restored', 
                    color: '#0891b2',
                    source: 'T02'
                  },
                  { 
                    val: systemMetrics.districtsActive, 
                    label: 'Districts Active', 
                    color: '#8b5cf6',
                    source: 'T02'
                  },
                  { 
                    val: `${systemMetrics.financeUtilizedMillionRwf.toFixed(1)}M`, 
                    label: 'Finance Utilized (RWF)', 
                    color: '#059669',
                    source: 'T01, T05'
                  },
                  { 
                    val: systemMetrics.totalHwcIncidents || 0, 
                    label: 'HWC Incidents', 
                    color: '#f59e0b',
                    source: 'T03, T04'
                  },
                  { 
                    val: `${systemMetrics.eiaCompliancePercentage.toFixed(1)}%`, 
                    label: 'EIA Compliance', 
                    color: progressColor(systemMetrics.eiaCompliancePercentage).color,
                    source: 'T06'
                  },
                ].map(({ val, label, color, source }) => (
                  <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color }}>{val}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-4)', marginTop: 1, opacity: 0.7 }}>{source}</div>
                  </div>
                ))}
              </div>

              {/* EIA Compliance Details */}
              {systemMetrics.eiaFullCompliance + systemMetrics.eiaPartialCompliance + systemMetrics.eiaNonCompliance > 0 && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-shield-check" style={{ color: '#10b981' }} />
                    EIA Compliance Breakdown (T06 - Private Sector)
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
              
              <div style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginTop: 12, textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>
                Last updated: {new Date(systemMetrics.lastUpdated).toLocaleString()} · Auto-calculated from approved reports
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
              <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--sky-dim)' }} />
              Live Toolkit Data
              <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>● Live</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>Auto-updates when reports are submitted via the Reporting Toolkit</p>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { val: s.totalSubmissions, label: 'Toolkit Reports', color: '#0ea5e9' },
                { val: s.forestHa.toLocaleString(), label: 'Forest (ha)', color: '#10b981' },
                { val: s.wetlandHa.toLocaleString(), label: 'Wetland (ha)', color: '#0891b2' },
                { val: s.activeDistricts, label: 'Districts', color: '#8b5cf6' },
                { val: s.financeAllocated >= 1e6 ? (s.financeAllocated / 1e6).toFixed(1) + 'M' : s.financeAllocated || '—', label: 'Finance (RWF M)', color: '#059669' },
                { val: s.hwcIncidents || '—', label: 'HWC Incidents', color: '#f59e0b' },
              ].map(({ val, label, color }) => (
                <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color }}>{val}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 3, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts + Activity + NBSAP Targets ── */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr', gap: 16, marginBottom: 24 }}>
        {/* Progress */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            <i className="fa-solid fa-chart-line" style={{ color: 'var(--sky-dim)' }} />
            Indicator Progress Trends
          </div>
          {(() => {
            const total = s?.totalIndicators ?? 0;
            const onTrack = s?.onTrackIndicators ?? 0;
            const atRisk = s?.atRiskIndicators ?? 0;
            const behind = s?.behindIndicators ?? 0;
            const avg = s?.avgProgress ?? 0;
            const avgPc = progressColor(avg);
            return (
              <>
                <ProgRow label="Average Progress" value={`${avg}%`} target="100%" color={avgPc.color} />
                <ProgRow label="On-Track" value={`${onTrack}`} target={`${total}`} color="#16a34a" />
                <ProgRow label="At-Risk" value={`${atRisk}`} target={`${total}`} color="#d97706" />
                <ProgRow label="Behind Schedule" value={`${behind}`} target={`${total}`} color="#dc2626" />
                {/* Tier breakdown — informational chips, not progress bars */}
                <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--surface-3)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Headline', count: s?.headlineIndicators ?? 0, bg: '#dcfce7', color: '#16a34a' },
                    { label: 'Component', count: s?.componentIndicators ?? 0, bg: '#fef3c7', color: '#d97706' },
                    { label: 'Binary', count: s?.binaryIndicators ?? 0, bg: '#fee2e2', color: '#dc2626' },
                  ].map(({ label, count, bg, color }) => (
                    <span key={label} style={{ background: bg, color, fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, fontFamily: "'DM Mono', monospace" }}>
                      {label}: {count}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", alignSelf: 'center' }}>
                    {total} total
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Recent Activity */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--sky-dim)' }} />
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
