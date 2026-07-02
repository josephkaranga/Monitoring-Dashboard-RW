import React from 'react';
import { useDashboardStats } from '../hooks/useData';

const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
};

export default function AdaptiveManagementPage() {
  const { stats } = useDashboardStats(false);

  const forestPct = stats ? Math.round((stats.forestHa / 2500) * 100) : 44;
  const financePct = stats?.financeAllocated
    ? `RWF ${(stats.financeAllocated / 1e9).toFixed(1)}B of 10B`
    : 'RWF 7.2B of 10B';

  return (
    <div>
      {/* Monitoring-to-Policy Feedback Loop */}
      <div style={{ ...card, padding: 20, marginBottom: 24 }}>
        <div style={{ marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
          Monitoring-to-Policy Feedback Loop
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            flexWrap: 'wrap',
            padding: '8px 0',
          }}
        >
          {[
            { num: '1', label: 'Monitor', sub: 'T01–T07 submitted quarterly', bg: '#1e3a5f' },
            { num: '2', label: 'Analyse', sub: 'Gap detection vs milestones', bg: '#0284c7' },
            { num: '3', label: 'Alert', sub: 'Trigger if indicator <60%', bg: '#d97706' },
            { num: '4', label: 'Decide', sub: 'Policy review or budget shift', bg: '#7c3aed' },
            { num: '5', label: 'Adjust', sub: 'Implement and re-monitor', bg: '#059669' },
          ].map((step, i) => (
            <React.Fragment key={step.num}>
              <div
                style={{
                  background: step.bg,
                  color: '#fff',
                  padding: '14px 16px',
                  borderRadius: 8,
                  textAlign: 'center',
                  minWidth: 120,
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {step.num}. {step.label}
                </div>
                <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 3 }}>{step.sub}</div>
              </div>
              {i < 4 && <span style={{ color: 'var(--text-3)', fontSize: '1.1rem' }}>&rarr;</span>}
            </React.Fragment>
          ))}
        </div>
        <div
          style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}
        >
          {[
            {
              bg: '#fee2e2',
              border: '#f43f5e',
              color: '#991b1b',
              label: 'Critical',
              desc: 'Indicator <40% of milestone — emergency ministerial review + budget reallocation within 30 days',
            },
            {
              bg: '#fff7ed',
              border: '#f59e0b',
              color: '#9a3412',
              label: 'Warning',
              desc: 'Indicator 40–60% of milestone — technical review + corrective action plan within 60 days',
            },
            {
              bg: '#f0fdf4',
              border: '#10b981',
              color: '#166534',
              label: 'On Track',
              desc: 'Indicator ≥60% of milestone — standard quarterly monitoring, no corrective action needed',
            },
          ].map(t => (
            <div
              key={t.label}
              style={{
                background: t.bg,
                borderRadius: 8,
                padding: '12px 14px',
                borderLeft: `3px solid ${t.border}`,
              }}
            >
              <div
                style={{ fontSize: '0.72rem', fontWeight: 700, color: t.color, marginBottom: 4 }}
              >
                {t.label}
              </div>
              <div style={{ fontSize: '0.77rem', color: t.color }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Support Functions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            color: '#f43f5e',
            title: 'Implementation Gap Detection',
            desc: `Early warning system for indicators falling behind targets. Currently ${(stats?.atRiskIndicators ?? 0) + (stats?.behindIndicators ?? 0)} indicators flagged for corrective action.`,
          },
          {
            color: '#10b981',
            title: 'Restoration Performance',
            desc: `Monitoring forest and wetland restoration against milestones. Currently at ${forestPct}% of 2,500 ha 2030 target.`,
          },
          {
            color: '#f59e0b',
            title: 'Financing Shortfall Monitoring',
            desc: `Tracking biodiversity budget allocations vs disbursements. ${financePct} mobilized.`,
          },
          {
            color: '#6366f1',
            title: 'Institutional Compliance',
            desc: 'Evaluating ministry and district reporting compliance. 92% EIA, 88% Protected Areas, 75% ABS, 68% Species Laws.',
          },
          {
            color: '#0ea5e9',
            title: 'Evidence-Based Policy Adjustment',
            desc: 'Enabling dynamic response to biodiversity risks. 28 decisions made from M&E data out of 50 target decisions by 2030.',
          },
          {
            color: '#ec4899',
            title: 'Gender-Responsive Monitoring',
            desc: 'Tracking women, youth & local community inclusion in biodiversity M&E. Currently 32% women and 18% local community participation.',
          },
        ].map(c => (
          <div key={c.title} style={{ ...card, padding: 18, borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
              {c.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Reporting & Evaluation Timeline */}
      <div style={{ ...card, padding: 18 }}>
        <div style={{ marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
          Reporting &amp; Evaluation Timeline
        </div>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div
            style={{
              position: 'absolute',
              left: 8,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'var(--border)',
            }}
          />
          {[
            {
              color: '#10b981',
              label: 'Quarterly 2026',
              title: 'Institutional Submissions',
              desc: 'All 7 reporting modules — T01 through T07',
            },
            {
              color: '#0ea5e9',
              label: 'Annual Mar 2026',
              title: 'National Biodiversity Implementation Report',
              desc: 'Consolidated progress against 22 NBSAP targets submitted to Cabinet',
            },
            {
              color: '#8b5cf6',
              label: 'Q3 2027',
              title: 'Mid-Term Evaluation',
              desc: 'Comprehensive review of NBSAP 2025–2030 halfway milestone',
            },
            {
              color: '#f59e0b',
              label: 'Annual 2028',
              title: 'Annual Progress Report',
              desc: 'Third annual report with course-correction recommendations',
            },
            {
              color: '#e11d48',
              label: 'Jun 2030',
              title: 'CBD National Report Submission',
              desc: 'International reporting to Convention on Biological Diversity Secretariat',
            },
            {
              color: '#0f2744',
              label: 'Q4 2030',
              title: 'Final Evaluation',
              desc: 'Comprehensive evaluation against all 22 targets and KM-GBF commitments',
            },
          ].map(item => (
            <div
              key={item.title}
              style={{ position: 'relative', paddingLeft: 20, marginBottom: 18 }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: 4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: 'var(--surface-3)',
                  border: `2px solid ${item.color}`,
                }}
              />
              <div
                style={{ fontSize: '0.72rem', color: item.color, fontWeight: 700, marginBottom: 2 }}
              >
                {item.label}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '0.77rem', color: 'var(--text-2)', marginTop: 2 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
