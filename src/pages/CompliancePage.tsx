import React, { useMemo, useState, useEffect } from 'react';
import { useReports } from '../hooks/useData';
import { fetchSystemMetrics, type SystemMetrics } from '../services/systemMetricsService';
import { useEIAComplianceTracking, getCurrentQuarterLabel } from '../hooks/useEIAComplianceTracking';
import toast from 'react-hot-toast';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export function CompliancePage() {
  const { reports, loading } = useReports({ status: 'approved', pageSize: 200 });
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const { eiaMetrics } = useEIAComplianceTracking();
  const eiaLive = eiaMetrics.totalReports > 0;

  // Load automated system metrics
  useEffect(() => {
    const loadSystemMetrics = async () => {
      setMetricsLoading(true);
      try {
        const metrics = await fetchSystemMetrics();
        setSystemMetrics(metrics);
        console.log('📊 Compliance page - automated metrics loaded:', metrics);
      } catch (error) {
        console.error('Failed to load system metrics:', error);
        toast.error('Failed to load automated compliance metrics');
      }
      setMetricsLoading(false);
    };

    loadSystemMetrics();
  }, []);

  const t06 = reports.filter(r => r.tool_id === 'T06');
  const t02 = reports.filter(r => r.tool_id === 'T02');
  const t05 = reports.filter(r => r.tool_id === 'T05');
  const t01 = reports.filter(r => r.tool_id === 'T01');

  // Prefer the real-time EIA Compliance Tracker, then automated system metrics, then legacy calculation
  const eiaScore = eiaLive
    ? eiaMetrics.compliancePercentage
    : systemMetrics
      ? systemMetrics.eiaCompliancePercentage
      : (t06.length
          ? Math.round(t06.filter(r => r.form_data?.eia_compliance === 'Full compliance').length / t06.length * 100)
          : 92);

  const disbPct = useMemo(() => {
    // Use automated metrics if available
    if (systemMetrics && systemMetrics.financeAllocatedRwf > 0) {
      return Math.round((systemMetrics.financeDisbursedRwf / systemMetrics.financeAllocatedRwf) * 100);
    }
    // Fallback to legacy calculation
    const alloc = t05.reduce((a, r) => a + (Number(r.form_data?.budget_allocated) || 0), 0);
    const disb  = t05.reduce((a, r) => a + (Number(r.form_data?.budget_disbursed)  || 0), 0);
    return alloc > 0 ? Math.round(disb / alloc * 100) : 100;
  }, [t05, systemMetrics]);

  const districtPct = useMemo(() => {
    // Use automated metrics if available
    if (systemMetrics) {
      return Math.round((systemMetrics.districtsActive / 30) * 100);
    }
    // Fallback to legacy calculation
    const unique = new Set(t02.map(r => r.district).filter(Boolean)).size;
    return Math.round((unique / 30) * 100);
  }, [t02, systemMetrics]);

  const instPct = useMemo(() => {
    const unique = new Set(t01.map(r => r.institution).filter(Boolean)).size;
    return Math.round((unique / 7) * 100);
  }, [t01]);

  const bars = [
    {
      label: eiaLive ? 'EIA Compliance (real-time from T06)' : systemMetrics ? 'EIA Compliance (automated from T06)' : 'EIA Compliance',
      score: eiaScore,
      color: eiaScore >= 80 ? '#10b981' : '#f59e0b',
      isAutomated: eiaLive || !!systemMetrics
    },
    { label: 'Protected Area Regulations', score: 88, color: '#10b981' },
    { label: 'ABS Rules Compliance', score: 75, color: '#f59e0b' },
    { label: 'Species Protection Laws', score: 68, color: '#f43f5e' },
    ...(systemMetrics || t02.length ? [{
      label: systemMetrics ? 'District Reporting Coverage (automated)' : 'District Reporting Coverage (live)', 
      score: districtPct, 
      color: districtPct >= 80 ? '#10b981' : '#f59e0b',
      isAutomated: !!systemMetrics
    }] : []),
    ...(systemMetrics || t05.length ? [{
      label: systemMetrics ? 'Finance Disbursement Rate (automated)' : 'Finance Disbursement Rate (live)', 
      score: disbPct, 
      color: disbPct >= 80 ? '#10b981' : '#f59e0b',
      isAutomated: !!systemMetrics
    }] : []),
    ...(t01.length ? [{ label: 'Institutional Reporting (live)', score: instPct, color: instPct >= 80 ? '#10b981' : '#f59e0b' }] : []),
  ];

  // Use the real-time EIA Compliance Tracker for the breakdown, falling back to automated/legacy sources
  const nonCompliant = eiaLive ? eiaMetrics.nonCompliant : systemMetrics ? systemMetrics.eiaNonCompliance : t06.filter(r => r.form_data?.eia_compliance === 'Non-compliant').length;
  const partial = eiaLive ? eiaMetrics.partialCompliant : systemMetrics ? systemMetrics.eiaPartialCompliance : t06.filter(r => r.form_data?.eia_compliance === 'Partial compliance').length;
  const fullCompliant = eiaLive ? eiaMetrics.compliantReports : systemMetrics ? systemMetrics.eiaFullCompliance : t06.filter(r => r.form_data?.eia_compliance === 'Full compliance').length;

  const issues = [
    nonCompliant > 0
      ? { 
          sev: 'High', 
          sevBg: '#fee2e2', 
          sevColor: '#991b1b', 
          title: `EIA Non-Compliance — ${nonCompliant} firm(s) flagged`,
          sub: eiaLive ? 'Real-time T06 tracking · Requires immediate action' : systemMetrics ? 'Automated T06 tracking · Requires immediate action' : 'Live T06 data · Requires immediate action',
          bg: '#fef2f2', 
          border: '#fecaca' 
        }
      : { sev: 'High', sevBg: '#fee2e2', sevColor: '#991b1b', title: 'EIA Missing Documentation — Northern Province', sub: 'Flagged 1 day ago', bg: '#fef2f2', border: '#fecaca' },
    partial > 0
      ? {
          sev: 'Medium',
          sevBg: '#ffedd5',
          sevColor: '#9a3412',
          title: `EIA Partial Compliance — ${partial} firm(s) need improvement`,
          sub: eiaLive ? 'Real-time T06 tracking · Monitoring required' : systemMetrics ? 'Automated T06 tracking · Monitoring required' : 'Live T06 data · Monitoring required',
          bg: '#fff7ed',
          border: '#fed7aa'
        }
      : { sev: 'Medium', sevBg: '#ffedd5', sevColor: '#9a3412', title: 'Late Data Submission', sub: '2 districts pending · Deadline passed', bg: '#fff7ed', border: '#fed7aa' },
    { sev: 'Low', sevBg: '#fef9c3', sevColor: '#854d0e', title: 'Incomplete Indicator Data', sub: 'Sector: Fisheries · Partial submission', bg: '#fefce8', border: '#fef08a' },
    { sev: 'Low', sevBg: '#fef9c3', sevColor: '#854d0e', title: 'ABS Documentation Gap', sub: '3 enterprises missing Access & Benefit Sharing docs', bg: '#fefce8', border: '#fef08a' },
  ];

  return (
    <div>
      {/* Loading skeleton */}
      {(loading || metricsLoading) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-3)' }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--sky-dim)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          Loading compliance data{systemMetrics ? ' and automated metrics' : ''}…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Automated Metrics Status */}
      {systemMetrics && (
        <div style={{ ...card, marginBottom: 16, background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)', borderColor: '#16a34a' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-satellite-dish" style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
              Automated Compliance Monitoring Active
            </span>
            <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>● Live</span>
            <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#166534', fontFamily: "'DM Mono', monospace" }}>
              Last updated: {new Date(systemMetrics.lastUpdated).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Compliance bars */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-scale-balanced" style={{ color: 'var(--sky-dim)' }} />
            Compliance Overview
          </div>
          {bars.map(b => (
            <div key={b.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 5 }}>
                <span style={{ color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {b.label}
                  {b.isAutomated && (
                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>AUTO</span>
                  )}
                </span>
                <span style={{ fontWeight: 700, color: b.color }}>{b.score}%</span>
              </div>
              <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${b.score}%`, background: b.color, borderRadius: 4, transition: 'width 1.2s ease' }} />
              </div>
            </div>
          ))}
          {eiaLive || systemMetrics ? (
            <div style={{ marginTop: 8, fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
              ✓ {fullCompliant} full · ⚠ {partial} partial · ✗ {nonCompliant} non-compliant ({eiaLive ? 'real-time' : 'automated'} from T06 reports)
            </div>
          ) : t06.length > 0 ? (
            <div style={{ marginTop: 8, fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
              ✓ {fullCompliant} full · ⚠ {partial} partial · ✗ {nonCompliant} non-compliant
            </div>
          ) : null}
        </div>

        {/* Active issues */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }} />
            Active Issues
          </div>
          {issues.map((iss, i) => (
            <div key={i} style={{ borderRadius: 9, padding: '12px 14px', marginBottom: 8, border: `1px solid ${iss.border}`, background: iss.bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{iss.title}</div>
                <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: iss.sevBg, color: iss.sevColor, flexShrink: 0, marginLeft: 8 }}>{iss.sev}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 2 }}>{iss.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance trend */}
      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-chart-line" style={{ color: 'var(--sky-dim)' }} />
          Compliance Trend Over Time
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {['Q1 2025','Q2 2025','Q3 2025','Q4 2025', getCurrentQuarterLabel()].map((q, qi) => {
            const vals = [85, 87, 89, 91, eiaScore];
            const v = vals[qi];
            const color = v >= 85 ? '#10b981' : v >= 70 ? '#f59e0b' : '#f43f5e';
            return (
              <div key={q} style={{ textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: '10px 8px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color }}>{v}%</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginTop: 3 }}>{q}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accountability mechanisms */}
      <div style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-shield-check" style={{ color: 'var(--sky-dim)' }} />
          Accountability Mechanisms
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: 'fa-clipboard-check', color: '#0284c7', title: 'Regulatory Tracking', sub: 'REMA, RDB, Districts' },
            { icon: 'fa-coins',           color: '#16a34a', title: 'Performance Incentives', sub: 'MoE, Finance' },
            { icon: 'fa-comments',        color: '#f59e0b', title: 'Grievance Channels', sub: 'REMA, Ombudsman' },
          ].map(m => (
            <div key={m.title} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <i className={`fa-solid ${m.icon}`} style={{ fontSize: '1.6rem', color: m.color, display: 'block', marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{m.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 3 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompliancePage;