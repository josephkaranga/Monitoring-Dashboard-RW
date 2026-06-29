import React, { useCallback, useState, useEffect } from 'react';

import { useDashboardStats, useReports, useDistricts } from '../hooks/useData';
import { fetchIndicators, fetchTargets } from '../services/dataService';
import type { Indicator, NBSAPTarget } from '../types/index';

import { DashboardSkeleton } from '../components/Skeleton';
import { ExecutiveSummary } from '../components/ExecutiveSummary';
import { AttentionPanel } from '../components/AttentionPanel';
import { GoalHierarchy } from '../components/GoalHierarchy';
import { MilestoneTimeline } from '../components/MilestoneTimeline';
import { MetricDetailPanel, type MetricKey } from '../components/MetricDetailPanel';
import { fetchDashboardMetrics, type DashboardMetrics, formatMetricValue } from '../services/systemMetricsService';
import { eventBus } from '../services/eventBus';
import { progressColor } from '../utils/progressColors';
import toast from 'react-hot-toast';

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 14,
  border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

export default function DashboardPage() {
  const { stats, loading, refetch: refetchStats } = useDashboardStats(false);
  const { reports, refetch: refetchReports } = useReports({ status: 'approved', pageSize: 6 });
  const [systemMetrics, setSystemMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [targets, setTargets] = useState<NBSAPTarget[]>([]);
  const [activeMetric, setActiveMetric] = useState<MetricKey>(null);
  const { data: districts } = useDistricts();

  useEffect(() => {
    fetchIndicators({ pageSize: 200 }).then(setIndicators);
    fetchTargets().then(setTargets);
  }, []);

  const loadSystemMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      setSystemMetrics(await fetchDashboardMetrics());
    } catch (error) {
      console.error('Failed to load system metrics:', error);
      toast.error('Failed to load automated metrics');
    }
    setMetricsLoading(false);
  }, []);

  useEffect(() => { loadSystemMetrics(); }, [loadSystemMetrics]);

  useEffect(() => {
    return eventBus.on('dashboard-refresh', () => {
      refetchStats();
      refetchReports();
      loadSystemMetrics();
      fetchTargets().then(setTargets);
      fetchIndicators({ pageSize: 200 }).then(setIndicators);
    });
  }, [refetchStats, refetchReports, loadSystemMetrics]);

  if (loading) return <DashboardSkeleton />;

  const s = stats;
  const m = systemMetrics;

  const forestHa = (m?.totalForestHa || 0) || (s?.forestHa || 0);
  const wetlandHa = (m?.totalWetlandHa || 0) || (s?.wetlandHa || 0);
  const financeVal = (m?.financeUtilizedMillionRwf || 0) || (s?.financeAllocated ? s.financeAllocated / 1e6 : 0);
  const hwcVal = (m?.totalHwcIncidents || 0) || (s?.hwcIncidents || 0);
  const eiaVal = m?.eiaCompliancePercentage || 0;
  const districtsStr = '30/30';

  const metricItems = (m || s) ? [
    { label: 'Forest Restored',      val: formatMetricValue(forestHa, 'hectares'),     color: '#10b981', icon: 'fa-tree',             key: 'forest' as MetricKey },
    { label: 'Wetland Restored',     val: formatMetricValue(wetlandHa, 'hectares'),     color: '#0891b2', icon: 'fa-water',            key: 'wetland' as MetricKey },
    { label: 'Finance Utilized',     val: `${financeVal.toFixed(1)}M RWF`,              color: '#059669', icon: 'fa-coins',            key: 'finance' as MetricKey },
    { label: 'HWC Incidents',        val: String(hwcVal),                               color: '#f59e0b', icon: 'fa-paw',              key: 'hwc' as MetricKey },
    { label: 'EIA Compliance',       val: `${eiaVal.toFixed(0)}%`,                      color: progressColor(eiaVal).color, icon: 'fa-clipboard-check', key: 'eia' as MetricKey },
    { label: 'Districts Reporting',  val: districtsStr,                                 color: '#6366f1', icon: 'fa-map-location-dot', key: 'districts' as MetricKey },
  ] : null;

  return (
    <div>
      {/* ═══ 1. EXECUTIVE SUMMARY — 3 donuts: progress, targets, indicators ═══ */}
      <ExecutiveSummary stats={s} targets={targets} indicators={indicators} />

      {/* ═══ 2. KEY NATIONAL METRICS — 3x2 clickable cards ═══ */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Key National Metrics</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Click any metric for district-level breakdown</div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          {metricsLoading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
          ) : metricItems ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {metricItems.map(item => (
                <div
                  key={item.label}
                  onClick={() => setActiveMetric(item.key)}
                  style={{
                    padding: '14px 12px', borderRadius: 10,
                    border: '1px solid #f1f5f9', background: '#fafbfc',
                    cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.background = `${item.color}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.background = '#fafbfc'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: '0.82rem' }} />
                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color, fontFamily: "'Playfair Display', serif" }}>
                    {item.val}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No metrics available</div>
          )}
        </div>
      </div>

      {/* ═══ 3. GOAL → TARGET → INDICATOR HIERARCHY ═══ */}
      <div style={{ marginBottom: 24 }}>
        <GoalHierarchy targets={targets} />
      </div>

      {/* ═══ 4. WHAT NEEDS ATTENTION ═══ */}
      <div style={{ marginBottom: 24 }}>
        <AttentionPanel targets={targets} indicators={indicators} />
      </div>

      {/* ═══ 5. MILESTONES + RECENT ACTIVITY ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <MilestoneTimeline targets={targets} />

        <div style={card}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Recent Activity</div>
              {(s?.pendingVerifications ?? 0) > 0 && (
                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: '#fef3c7', color: '#d97706' }}>
                  {s?.pendingVerifications} pending review
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: '8px 22px', maxHeight: 360, overflowY: 'auto' }}>
            {reports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: '1.6rem', display: 'block', marginBottom: 10, opacity: 0.4 }} />
                No approved submissions yet
              </div>
            ) : reports.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: '#f0fdf4', color: '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '0.78rem',
                }}>
                  <i className="fa-solid fa-check" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{r.tool_name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
                    Approved · {new Date(r.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SLIDE-OUT PANEL ═══ */}
      {activeMetric && (
        <MetricDetailPanel
          metricKey={activeMetric}
          metrics={systemMetrics}
          stats={s}
          districts={(districts as any[]) ?? []}
          targets={targets}
          onClose={() => setActiveMetric(null)}
        />
      )}
    </div>
  );
}
