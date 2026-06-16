// ============================================================
// CompliancePage.tsx
// ============================================================
import React, { useMemo } from 'react';
import { useReports } from '../../hooks/useData';

export function CompliancePage() {
  const { reports } = useReports({ status: 'approved', pageSize: 200 });

  const t06 = reports.filter(r => r.tool_id === 'T06');
  const t02 = reports.filter(r => r.tool_id === 'T02');
  const t05 = reports.filter(r => r.tool_id === 'T05');
  const t01 = reports.filter(r => r.tool_id === 'T01');

  const eiaScore = t06.length ? Math.round(t06.filter(r => r.form_data?.eia_compliance === 'Full compliance').length / t06.length * 100) : 92;
  const disbPct = useMemo(() => {
    const alloc = t05.reduce((a, r) => a + (Number(r.form_data?.budget_allocated) || 0), 0);
    const disb = t05.reduce((a, r) => a + (Number(r.form_data?.budget_disbursed) || 0), 0);
    return alloc > 0 ? Math.round(disb / alloc * 100) : 100;
  }, [t05]);
  const districtPct = useMemo(() => {
    const unique = new Set(t02.map(r => r.district).filter(Boolean)).size;
    return Math.round((unique / 30) * 100);
  }, [t02]);
  const instPct = useMemo(() => {
    const unique = new Set(t01.map(r => r.institution).filter(Boolean)).size;
    return Math.round((unique / 7) * 100);
  }, [t01]);

  const bars = [
    { label: 'EIA Compliance', score: eiaScore, color: eiaScore >= 80 ? '#10b981' : '#f59e0b' },
    { label: 'Protected Area Regulations', score: 88, color: '#10b981' },
    { label: 'ABS Rules Compliance', score: 75, color: '#f59e0b' },
    { label: 'Species Protection Laws', score: 68, color: '#f43f5e' },
    ...(t02.length ? [{ label: 'District Reporting Coverage (live)', score: districtPct, color: districtPct >= 80 ? '#10b981' : '#f59e0b' }] : []),
    ...(t05.length ? [{ label: 'Finance Disbursement Rate (live)', score: disbPct, color: disbPct >= 80 ? '#10b981' : '#f59e0b' }] : []),
    ...(t01.length ? [{ label: 'Institutional Reporting (live)', score: instPct, color: instPct >= 80 ? '#10b981' : '#f59e0b' }] : []),
  ];

  const issues = [
    ...(t06.filter(r => r.form_data?.eia_compliance === 'Non-compliant').length > 0
      ? [{ sev: 'High', title: `EIA Non-Compliance — ${t06.filter(r => r.form_data?.eia_compliance === 'Non-compliant').length} firm(s) flagged`, sub: 'Live T06 data · Requires immediate action', color: '#fee2e2', border: '#fecaca', tagBg: '#fee2e2', tagColor: '#991b1b' }]
      : [{ sev: 'High', title: 'EIA Missing Documentation — Northern Province', sub: 'Flagged 1 day ago', color: '#fee2e2', border: '#fecaca', tagBg: '#fee2e2', tagColor: '#991b1b' }]),
    { sev: 'Medium', title: 'Late Data Submission', sub: '2 districts pending · Deadline passed', color: '#fff7ed', border: '#fed7aa', tagBg: '#ffedd5', tagColor: '#9a3412' },
    { sev: 'Low', title: 'Incomplete Indicator Data', sub: 'Sector: Fisheries · Partial submission', color: '#fefce8', border: '#fef08a', tagBg: '#fef9c3', tagColor: '#854d0e' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>⚖️ Compliance Overview</h3>
          {bars.map(b => (
            <div key={b.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 5 }}>
                <span style={{ color: '#475569' }}>{b.label}</span>
                <span style={{ fontWeight: 700, color: b.color }}>{b.score}%</span>
              </div>
              <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${b.score}%`, background: b.color, borderRadius: 4, transition: 'width 1.2s ease' }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>⚠️ Active Issues</h3>
          {issues.map((iss, i) => (
            <div key={i} style={{ borderRadius: 9, padding: '12px 14px', marginBottom: 8, border: `1px solid ${iss.border}`, background: iss.color }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#0f172a' }}>{iss.title}</div>
                <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: iss.tagBg, color: iss.tagColor, flexShrink: 0, marginLeft: 8 }}>{iss.sev}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{iss.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14 }}>🛡️ Accountability Mechanisms</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[['📋 Regulatory Tracking', 'REMA, RDB, Districts'], ['💰 Performance Incentives', 'MINEMA, Finance'], ['💬 Grievance Channels', 'REMA, Ombudsman']].map(([t, s]) => (
            <div key={t} style={{ background: '#f8fafc', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 3 }}>{t}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompliancePage;
