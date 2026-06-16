import React from 'react';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export default function DataPipelinePage() {
  return (
    <div>
      {/* 5-Tier Pipeline */}
      <div style={{ ...card, padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ width: 38, height: 38, background: '#dbeafe', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-diagram-project" style={{ color: '#1e40af' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>5-Tier Biodiversity Data Pipeline</h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>Community → Sector → District → National Agencies → REMA National Dashboard</p>
          </div>
        </div>

        {/* Tier flow */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          {[
            { tier: 'Tier 1', label: 'Community', sub: 'Citizen science\nLocal data', icon: 'fa-people-group', gradient: 'linear-gradient(135deg,#065f46,#059669)', shadow: 'rgba(5,150,105,.3)' },
            { tier: 'Tier 2', label: 'Sector', sub: 'Validation\nField data', icon: 'fa-wheat-awn', gradient: 'linear-gradient(135deg,#059669,#10b981)', shadow: 'rgba(16,185,129,.3)' },
            { tier: 'Tier 3', label: 'District', sub: 'Aggregation\nDistrict index', icon: 'fa-map-location-dot', gradient: 'linear-gradient(135deg,#0284c7,#38bdf8)', shadow: 'rgba(2,132,199,.3)' },
            { tier: 'Tier 4', label: 'National Agencies', sub: 'Institutional\nverification', icon: 'fa-landmark', gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', shadow: 'rgba(124,58,237,.3)' },
            { tier: 'Tier 5', label: 'REMA Dashboard', sub: 'Visualization\n& CBD reporting', icon: 'fa-chart-line', gradient: 'linear-gradient(135deg,#0f2744,#1e3a5f)', shadow: 'rgba(15,39,68,.3)' },
          ].map((t, i) => (
            <React.Fragment key={t.tier}>
              <div style={{ background: t.gradient, color: '#fff', padding: '16px 18px', borderRadius: 12, textAlign: 'center', minWidth: 140, boxShadow: `0 4px 12px ${t.shadow}` }}>
                <i className={`fa-solid ${t.icon}`} style={{ fontSize: '1.4rem', display: 'block', marginBottom: 6 }} />
                <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{t.tier}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: 2 }}>{t.label}</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.8, marginTop: 4, whiteSpace: 'pre-line' }}>{t.sub}</div>
              </div>
              {i < 4 && <i className="fa-solid fa-arrow-right" style={{ color: 'var(--text-3)' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {[
            'Data Collection via Structured Templates',
            'Sector & District Validation',
            'Institutional Aggregation',
            'REMA Technical Verification',
            'RBIS & Dashboard Integration',
          ].map((label, i) => (
            <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 10, textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--navy)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>{i + 1}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reporting Cycle + Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-calendar-days" style={{ color: 'var(--sky-dim)' }} />
            Reporting Cycle Alignment
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { bg: '#059669', label: 'Q1', title: 'Quarterly Submissions', desc: 'All 7 reporting modules — districts, institutions, community', sub: 'Deadline: Mar / Jun / Sep / Dec' },
              { bg: '#0284c7', label: 'ANN', title: 'Annual National Biodiversity Report', desc: 'Consolidated implementation report against 22 NBSAP targets', sub: 'Submitted to Cabinet & Parliament' },
              { bg: '#7c3aed', label: '2027', title: 'Mid-Term Evaluation', desc: 'Comprehensive review of NBSAP implementation progress', sub: 'Q3 2027 · All 22 indicators reviewed' },
              { bg: '#0f2744', label: 'CBD', title: 'CBD National Report Submission', desc: 'KM-GBF progress report to Convention on Biological Diversity', sub: 'Due: June 2029 · Final evaluation 2030' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: item.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>{item.label}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-1)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--text-2)' }}>{item.desc}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-chart-bar" style={{ color: 'var(--sky-dim)' }} />
            Indicator Progress by Category
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Forest', val: 72, color: '#10b981' },
              { label: 'Wetland', val: 43, color: '#0ea5e9' },
              { label: 'Species', val: 52, color: '#8b5cf6' },
              { label: 'Water', val: 61, color: '#0891b2' },
              { label: 'Policy', val: 53, color: '#ec4899' },
              { label: 'Finance', val: 53, color: '#f59e0b' },
            ].map(b => (
              <div key={b.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{b.label}</span>
                  <span style={{ fontWeight: 700, color: b.color }}>{b.val}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${b.val}%`, background: b.color, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Implementation Roadmap */}
      <div style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-bars-progress" style={{ color: 'var(--sky-dim)' }} />
          Implementation Roadmap — Phase &amp; Resource Estimates
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 14, fontFamily: "'DM Mono', monospace" }}>
          Each bar represents approximate duration. Concurrent phases run simultaneously.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'S1 · Indicator Alignment', color: '#0ea5e9', start: 0, width: 16, resources: '2 staff · Low cost', high: false },
            { label: 'S2 · Institutional RACI', color: '#7c3aed', start: 8, width: 16, resources: '3 staff · Low cost', high: false },
            { label: 'S3 · Reporting Templates', color: '#059669', start: 12, width: 22, resources: '4 staff · Medium', high: false },
            { label: 'S4 · M&E Framework', color: '#d97706', start: 16, width: 22, resources: '3 staff · Medium', high: false },
            { label: 'S5 · Dashboard & RBIS', color: '#0f2744', start: 20, width: 50, resources: '6 staff · High cost', high: true },
            { label: 'S6 · Compliance Framework', color: '#e11d48', start: 29, width: 22, resources: '3 staff · Medium', high: false },
            { label: 'S7 · Capacity Building', color: '#10b981', start: 0, width: 100, resources: '5 staff · Medium', concurrent: true },
            { label: 'S8 · Validation & Testing', color: '#8b5cf6', start: 58, width: 25, resources: '4 staff · Medium', high: false },
          ].map(s => (
            <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 100px', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.label}
                {s.high && <span style={{ fontSize: '0.6rem', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>HIGH</span>}
                {(s as any).concurrent && <span style={{ fontSize: '0.6rem', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: 4, fontFamily: "'DM Mono', monospace" }}>CONCURRENT</span>}
              </div>
              <div style={{ height: 22, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: `${s.start}%`, width: `${s.width}%`, height: '100%', background: s.color, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                  <span style={{ fontSize: '0.6rem', color: '#fff', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>{s.width < 20 ? '' : `${Math.round(s.width / 4)} months`}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: s.high ? '#991b1b' : 'var(--text-3)', fontWeight: s.high ? 700 : 400 }}>{s.resources}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#6ee7b7', borderRadius: 2 }} />Concurrent / ongoing phase
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: '#fee2e2', border: '1px solid #f43f5e', borderRadius: 2 }} />HIGH resource intensity
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginLeft: 'auto', fontFamily: "'DM Mono', monospace" }}>
            Total estimated duration: 24 months (2025–2026)
          </div>
        </div>
      </div>
    </div>
  );
}
