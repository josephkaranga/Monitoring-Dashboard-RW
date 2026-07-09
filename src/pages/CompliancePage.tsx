import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useReports } from '../hooks/useData';
import { fetchSystemMetrics, type SystemMetrics } from '../services/systemMetricsService';
import { useEIAComplianceTracking } from '../hooks/useEIAComplianceTracking';
import { fetchTargets, fetchIndicators } from '../services/dataService';
import { progressColor } from '../utils/progressColors';
import type { NBSAPTarget, Indicator } from '../types/index';
import toast from 'react-hot-toast';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

export function CompliancePage() {
  const { reports, loading } = useReports({ status: 'approved', pageSize: 200 });
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const { eiaMetrics } = useEIAComplianceTracking();
  const eiaLive = eiaMetrics.totalReports > 0;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightTargetId = searchParams.get('target') ? Number(searchParams.get('target')) : null;
  const [targets, setTargets] = useState<NBSAPTarget[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  useEffect(() => {
    fetchTargets().then(setTargets).catch(console.error);
    fetchIndicators({ pageSize: 200 }).then(setIndicators).catch(console.error);
  }, []);

  // Deep-linked from the dashboard's "Requires attention" panel
  useEffect(() => {
    if (highlightTargetId == null || targets.length === 0) return;
    document
      .getElementById(`compliance-target-${highlightTargetId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightTargetId, targets]);

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
      : t06.length
        ? Math.round(
            (t06.filter(r => r.form_data?.eia_compliance === 'Full compliance').length /
              t06.length) *
              100
          )
        : 0;

  const disbPct = useMemo(() => {
    // Use automated metrics if available
    if (systemMetrics && systemMetrics.financeAllocatedRwf > 0) {
      return Math.round(
        (systemMetrics.financeDisbursedRwf / systemMetrics.financeAllocatedRwf) * 100
      );
    }
    // Fallback to legacy calculation
    const alloc = t05.reduce((a, r) => a + (Number(r.form_data?.budget_allocated) || 0), 0);
    const disb = t05.reduce((a, r) => a + (Number(r.form_data?.budget_disbursed) || 0), 0);
    return alloc > 0 ? Math.round((disb / alloc) * 100) : 0;
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
      label: eiaLive
        ? 'EIA Compliance (real-time from T06)'
        : systemMetrics
          ? 'EIA Compliance (automated from T06)'
          : 'EIA Compliance',
      score: eiaScore,
      color: eiaScore >= 80 ? '#10b981' : '#f59e0b',
      isAutomated: eiaLive || !!systemMetrics,
    },
    ...(systemMetrics || t02.length
      ? [
          {
            label: systemMetrics
              ? 'District Reporting Coverage (automated)'
              : 'District Reporting Coverage (live)',
            score: districtPct,
            color: districtPct >= 80 ? '#10b981' : '#f59e0b',
            isAutomated: !!systemMetrics,
          },
        ]
      : []),
    ...(systemMetrics || t05.length
      ? [
          {
            label: systemMetrics
              ? 'Finance Disbursement Rate (automated)'
              : 'Finance Disbursement Rate (live)',
            score: disbPct,
            color: disbPct >= 80 ? '#10b981' : '#f59e0b',
            isAutomated: !!systemMetrics,
          },
        ]
      : []),
    ...(t01.length
      ? [
          {
            label: 'Institutional Reporting (live)',
            score: instPct,
            color: instPct >= 80 ? '#10b981' : '#f59e0b',
          },
        ]
      : []),
  ];

  // Use the real-time EIA Compliance Tracker for the breakdown, falling back to automated/legacy sources
  const nonCompliant = eiaLive
    ? eiaMetrics.nonCompliant
    : systemMetrics
      ? systemMetrics.eiaNonCompliance
      : t06.filter(r => r.form_data?.eia_compliance === 'Non-compliant').length;
  const partial = eiaLive
    ? eiaMetrics.partialCompliant
    : systemMetrics
      ? systemMetrics.eiaPartialCompliance
      : t06.filter(r => r.form_data?.eia_compliance === 'Partial compliance').length;
  const fullCompliant = eiaLive
    ? eiaMetrics.compliantReports
    : systemMetrics
      ? systemMetrics.eiaFullCompliance
      : t06.filter(r => r.form_data?.eia_compliance === 'Full compliance').length;

  const trackingLabel = eiaLive
    ? 'Real-time T06 tracking'
    : systemMetrics
      ? 'Automated T06 tracking'
      : 'Live T06 data';

  const issues = [
    ...(nonCompliant > 0
      ? [
          {
            sev: 'High',
            sevBg: '#fee2e2',
            sevColor: '#991b1b',
            title: `EIA Non-Compliance — ${nonCompliant} firm(s) flagged`,
            sub: `${trackingLabel} · Requires immediate action`,
            bg: '#fef2f2',
            border: '#fecaca',
          },
        ]
      : []),
    ...(partial > 0
      ? [
          {
            sev: 'Medium',
            sevBg: '#ffedd5',
            sevColor: '#9a3412',
            title: `EIA Partial Compliance — ${partial} firm(s) need improvement`,
            sub: `${trackingLabel} · Monitoring required`,
            bg: '#fff7ed',
            border: '#fed7aa',
          },
        ]
      : []),
  ];

  const complianceTargets = [
    { id: 3, label: 'Protected Area Regulations' },
    { id: 4, label: 'Species Protection' },
    { id: 7, label: 'Pollution & EIA Control' },
    { id: 13, label: 'Access & Benefit Sharing (ABS)' },
    { id: 15, label: 'Business & Financial Disclosure' },
  ];

  return (
    <div>
      {/* Loading skeleton */}
      {(loading || metricsLoading) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            marginBottom: 16,
            fontSize: '0.82rem',
            color: '#94a3b8',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid #e2e8f0',
              borderTopColor: '#1f6cb4',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              flexShrink: 0,
            }}
          />
          Loading compliance data{systemMetrics ? ' and automated metrics' : ''}…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Automated Metrics Status */}
      {systemMetrics && (
        <div
          style={{
            ...card,
            marginBottom: 16,
            background: '#f0fdf4',
            borderColor: '#16a34a',
          }}
        >
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-satellite-dish" style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
              Automated Compliance Monitoring Active
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                padding: '3px 8px',
                borderRadius: 12,
                fontWeight: 700,
                background: '#dcfce7',
                color: '#166534',
              }}
            >
              ● Live
            </span>
            <div
              style={{
                marginLeft: 'auto',
                fontSize: '0.7rem',
                color: '#166534',
              }}
            >
              Last updated: {new Date(systemMetrics.lastUpdated).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Compliance bars */}
        <div style={{ ...card, padding: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            <i className="fa-solid fa-scale-balanced" style={{ color: '#1f6cb4' }} />
            Compliance Overview
          </div>
          {bars.map(b => (
            <div key={b.label} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  marginBottom: 5,
                }}
              >
                <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {b.label}
                  {b.isAutomated && (
                    <span
                      style={{
                        fontSize: '0.6rem',
                        padding: '2px 6px',
                        borderRadius: 8,
                        fontWeight: 700,
                        background: '#dcfce7',
                        color: '#166534',
                      }}
                    >
                      AUTO
                    </span>
                  )}
                </span>
                <span style={{ fontWeight: 700, color: b.color }}>{b.score}%</span>
              </div>
              <div
                style={{
                  height: 7,
                  background: '#f1f5f9',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${b.score}%`,
                    background: b.color,
                    borderRadius: 4,
                    transition: 'width 1.2s ease',
                  }}
                />
              </div>
            </div>
          ))}
          {eiaLive || systemMetrics ? (
            <div
              style={{
                marginTop: 8,
                fontSize: '0.68rem',
                color: '#94a3b8',
              }}
            >
              ✓ {fullCompliant} full · ⚠ {partial} partial · ✗ {nonCompliant} non-compliant (
              {eiaLive ? 'real-time' : 'automated'} from T06 reports)
            </div>
          ) : t06.length > 0 ? (
            <div
              style={{
                marginTop: 8,
                fontSize: '0.68rem',
                color: '#94a3b8',
              }}
            >
              ✓ {fullCompliant} full · ⚠ {partial} partial · ✗ {nonCompliant} non-compliant
            </div>
          ) : null}
        </div>

        {/* Active issues */}
        <div style={{ ...card, padding: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }} />
            Active Issues
          </div>
          {issues.length === 0 && (
            <div
              style={{
                padding: '24px 12px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.8rem',
              }}
            >
              <i
                className="fa-solid fa-circle-check"
                style={{ color: '#16a34a', fontSize: '1.4rem', display: 'block', marginBottom: 8 }}
              />
              No compliance issues flagged from current reports.
            </div>
          )}
          {issues.map((iss, i) => (
            <div
              key={i}
              style={{
                borderRadius: 9,
                padding: '12px 14px',
                marginBottom: 8,
                border: `1px solid ${iss.border}`,
                background: iss.bg,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{iss.title}</div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    padding: '2px 7px',
                    borderRadius: 6,
                    fontWeight: 700,
                    background: iss.sevBg,
                    color: iss.sevColor,
                    flexShrink: 0,
                    marginLeft: 8,
                  }}
                >
                  {iss.sev}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{iss.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Regulatory & thematic implementation — real NBSAP target + indicator progress */}
      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          <i className="fa-solid fa-scale-balanced" style={{ color: '#1f6cb4' }} />
          Regulatory &amp; thematic implementation
        </div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 14, lineHeight: 1.5 }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: 5, color: '#1f6cb4' }} />
          Shows NBSAP <b style={{ color: '#475569' }}>implementation progress</b> for
          compliance-related targets — this is target progress, not a compliance rate. Click any
          target or indicator for details.
        </div>
        {targets.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: 8 }}>Loading targets…</div>
        ) : (
          complianceTargets.map(ct => {
            const t = targets.find(x => x.id === ct.id);
            if (!t) return null;
            const pc = progressColor(t.progress);
            const tInd = indicators.filter(i => i.nbsap_target_id === t.id);
            const isHighlighted = highlightTargetId === ct.id;
            return (
              <div
                key={ct.id}
                id={`compliance-target-${ct.id}`}
                style={{
                  marginBottom: 14,
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: 12,
                  ...(isHighlighted
                    ? {
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 10,
                        padding: 10,
                      }
                    : {}),
                }}
              >
                <div
                  onClick={() => navigate(`/targets?expand=${t.id}`)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                    {ct.label}
                    <span
                      style={{
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 8,
                        background: '#e0e7ff',
                        color: '#3730a3',
                        marginLeft: 8,
                      }}
                    >
                      PROGRESS
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#94a3b8',
                        fontWeight: 400,
                        marginLeft: 6,
                      }}
                    >
                      Target {t.id}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 8,
                      background: pc.bg,
                      color: pc.color,
                    }}
                  >
                    {pc.label}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: pc.color,
                      fontSize: '0.82rem',
                      width: 42,
                      textAlign: 'right',
                    }}
                  >
                    {t.progress}%
                  </span>
                </div>
                <div
                  style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${t.progress}%`,
                      background: pc.color,
                      borderRadius: 4,
                      transition: 'width 1.2s ease',
                    }}
                  />
                </div>
                {tInd.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {tInd.map(ind => {
                      const ipc = progressColor(ind.progress);
                      return (
                        <div
                          key={ind.id}
                          onClick={() => navigate(`/indicators?target=${t.id}`)}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.72rem',
                            color: '#475569',
                            padding: '3px 0',
                          }}
                        >
                          <i
                            className="fa-solid fa-angle-right"
                            style={{ color: '#94a3b8', fontSize: '0.6rem' }}
                          />
                          <span
                            style={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ind.name}
                          </span>
                          <span style={{ fontWeight: 700, color: ipc.color }}>{ind.progress}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Accountability mechanisms */}
      <div style={{ ...card, padding: 18 }}>
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
          <i className="fa-solid fa-shield-check" style={{ color: '#1f6cb4' }} />
          Accountability Mechanisms
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            {
              icon: 'fa-clipboard-check',
              color: '#0284c7',
              title: 'Regulatory Tracking',
              sub: 'REMA, RDB, Districts',
            },
            {
              icon: 'fa-coins',
              color: '#16a34a',
              title: 'Performance Incentives',
              sub: 'MoE, Finance',
            },
            {
              icon: 'fa-comments',
              color: '#f59e0b',
              title: 'Grievance Channels',
              sub: 'REMA, Ombudsman',
            },
          ].map(m => (
            <div
              key={m.title}
              style={{
                background: '#f8fafc',
                borderRadius: 10,
                padding: 14,
                textAlign: 'center',
              }}
            >
              <i
                className={`fa-solid ${m.icon}`}
                style={{ fontSize: '1.6rem', color: m.color, display: 'block', marginBottom: 8 }}
              />
              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{m.title}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompliancePage;
