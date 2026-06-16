import React from 'react';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

const integrationSources = [
  { name: 'MINEMA', date: 'Mar 22, 2026', records: 342, validation: '✓ Passed', valColor: '#16a34a', status: 'Active', statusBg: '#dcfce7', statusColor: '#166534' },
  { name: 'MINAGRI', date: 'Mar 23, 2026', records: 528, validation: '✓ Passed', valColor: '#16a34a', status: 'Active', statusBg: '#dcfce7', statusColor: '#166534' },
  { name: 'NSO', date: 'Mar 20, 2026', records: 1248, validation: '⟳ Processing', valColor: '#f59e0b', status: 'Validating', statusBg: '#dbeafe', statusColor: '#1e40af' },
  { name: 'Research Inst.', date: 'Mar 18, 2026', records: 156, validation: '✓ Passed', valColor: '#16a34a', status: 'Active', statusBg: '#dcfce7', statusColor: '#166534' },
  { name: 'Districts (Avg)', date: 'Mar 21, 2026', records: 2840, validation: '⚠ Issues', valColor: '#f43f5e', status: 'Review', statusBg: '#fef9c3', statusColor: '#854d0e' },
];

export default function RBISPage() {
  return (
    <div>
      {/* Live RBIS Embed Banner */}
      <div style={{ ...card, padding: 20, marginBottom: 24, borderLeft: '4px solid var(--sky-dim)', background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'rgba(56,189,248,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-database" style={{ color: '#38bdf8', fontSize: '1.2rem' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Rwanda Biodiversity Information System (RBIS)</div>
              <div style={{ fontSize: '0.73rem', color: '#7dd3fc', marginTop: 2 }}>Live biodiversity data repository · University of Rwanda, CoEB</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="https://rbis.ur.ac.rw" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              <i className="fa-solid fa-arrow-up-right-from-square" /> Open RBIS
            </a>
            <a href="https://rbis.ur.ac.rw/map" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              <i className="fa-solid fa-map" /> Spatial Map
            </a>
          </div>
        </div>
      </div>

      {/* Live RBIS Map Embed */}
      <div style={{ ...card, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--sky-dim)' }} />
            Live RBIS Spatial Data
            <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>● Live</span>
          </div>
          <a href="https://rbis.ur.ac.rw/map" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', color: 'var(--sky-dim)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fa-solid fa-expand" /> Full Screen
          </a>
        </div>
        <div style={{ position: 'relative', width: '100%', height: 500, background: '#f0f9ff' }}>
          <iframe
            src="https://rbis.ur.ac.rw/map"
            title="RBIS Live Biodiversity Map"
            style={{ width: '100%', height: '100%', border: 'none' }}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>

      {/* Overview card */}
      <div style={{ ...card, padding: 20, marginBottom: 24, borderLeft: '4px solid var(--sky-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, background: '#e0f2fe', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-database" style={{ color: '#0284c7', fontSize: '1.2rem' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>RBIS Core Capabilities</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: 2 }}>Core biodiversity data repository · Dashboard visualization &amp; analytics interface</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>● Live</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { icon: 'fa-hard-drive', color: '#0284c7', label: 'Centralized Storage' },
            { icon: 'fa-gears', color: '#059669', label: 'Auto Aggregation' },
            { icon: 'fa-map', color: '#7c3aed', label: 'GIS Visualization' },
            { icon: 'fa-chart-column', color: '#d97706', label: 'National Statistics' },
            { icon: 'fa-earth-americas', color: '#0f2744', label: 'CBD Compatibility' },
          ].map(f => (
            <div key={f.label} style={{ background: 'var(--surface-2)', borderRadius: 9, padding: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
              <i className={`fa-solid ${f.icon}`} style={{ fontSize: '1.2rem', color: f.color, display: 'block', marginBottom: 6 }} />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', fontWeight: 500 }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links to RBIS sections */}
      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-link" style={{ color: 'var(--sky-dim)' }} />
          Quick Access to RBIS Modules
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { href: 'https://rbis.ur.ac.rw/map', icon: 'fa-map-location-dot', color: '#0284c7', bg: '#e0f2fe', label: 'Biodiversity Map', desc: 'Interactive spatial data explorer' },
            { href: 'https://rbis.ur.ac.rw/taxa', icon: 'fa-leaf', color: '#059669', bg: '#dcfce7', label: 'Taxa Database', desc: 'Species records & taxonomy' },
            { href: 'https://rbis.ur.ac.rw/wetland', icon: 'fa-water', color: '#0891b2', bg: '#e0f2fe', label: 'Wetland Data', desc: 'Freshwater biodiversity records' },
            { href: 'https://rbis.ur.ac.rw/download', icon: 'fa-download', color: '#7c3aed', bg: '#f3e8ff', label: 'Data Download', desc: 'Export biodiversity datasets' },
          ].map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
              style={{ background: link.bg, borderRadius: 10, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, transition: '0.2s', border: '1px solid transparent' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}>
              <i className={`fa-solid ${link.icon}`} style={{ fontSize: '1.4rem', color: link.color }} />
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: link.color }}>{link.label}</div>
              <div style={{ fontSize: '0.72rem', color: link.color, opacity: 0.8 }}>{link.desc}</div>
              <div style={{ fontSize: '0.68rem', color: link.color, display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.6rem' }} /> Open in RBIS
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Data providers grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { color: '#16a34a', bg: '#dcfce7', icon: 'fa-landmark', title: 'Sector Ministries', sub: 'Primary Data Providers', items: ['Environment (MINEMA)', 'Agriculture (MINAGRI)', 'Forestry (RFA)', 'Fisheries'], status: '✓ Active', statusColor: '#16a34a' },
          { color: '#2563eb', bg: '#dbeafe', icon: 'fa-chart-column', title: 'National Statistics', sub: 'Data Integration & Validation', items: ['Data Integration', 'Indicator Validation', 'Baseline Alignment'], status: '✓ Active', statusColor: '#16a34a' },
          { color: '#9333ea', bg: '#f3e8ff', icon: 'fa-microscope', title: 'Research Institutions', sub: 'Scientific Studies', items: ['Biodiversity Studies', 'Species Monitoring', 'Ecosystem Analysis'], status: '✓ Active', statusColor: '#16a34a' },
          { color: '#0891b2', bg: '#e0f2fe', icon: 'fa-building-columns', title: 'Coordination Unit', sub: 'REMA Biodiversity M&E', items: ['Data Consolidation', 'Analysis & QA', 'Report Generation'], status: '✓ Active', statusColor: '#16a34a' },
          { color: '#f97316', bg: '#ffedd5', icon: 'fa-users', title: 'Districts & Local Gov.', sub: 'Field Monitoring', items: ['District Reports', 'Field Monitoring', 'Community Data'], status: '⚠ 18/20 Active', statusColor: '#f59e0b' },
          { color: '#1e40af', bg: '#dbeafe', icon: 'fa-earth-americas', title: 'CBD & Global Reports', sub: 'International Reporting', items: ['CBD National Reports', 'SDG Alignment', 'GBF Indicators'], status: 'Next: Jun 2029', statusColor: '#1e40af' },
        ].map(p => (
          <div key={p.title} style={{ ...card, padding: 18, borderLeft: `4px solid ${p.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: p.bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${p.icon}`} style={{ color: p.color }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{p.sub}</div>
              </div>
            </div>
            <ul style={{ listStyle: 'none', fontSize: '0.8rem', color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {p.items.map(item => <li key={item}>● {item}</li>)}
            </ul>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-3)' }}>Status</span>
              <span style={{ color: p.statusColor, fontWeight: 600 }}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Status table */}
      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-link" style={{ color: 'var(--sky-dim)' }} />
          Integration Status
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {['Source','Last Submission','Records','Validation','Status'].map(h => (
                  <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontSize: '0.67rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {integrationSources.map(s => (
                <tr key={s.name} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                  <td style={{ padding: '11px 13px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '11px 13px', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem' }}>{s.date}</td>
                  <td style={{ padding: '11px 13px' }}>{s.records.toLocaleString()}</td>
                  <td style={{ padding: '11px 13px', color: s.valColor, fontWeight: 600 }}>{s.validation}</td>
                  <td style={{ padding: '11px 13px' }}>
                    <span style={{ background: s.statusBg, color: s.statusColor, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Governance */}
      <div style={{ ...card, padding: 18, borderLeft: '4px solid #7c3aed' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#7c3aed' }} />
          Data Governance Protocols
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: '🔐 DATA CLASSIFICATION', items: ['Restricted: Threatened species GPS, enforcement locations', 'Internal: District raw data, compliance scores', 'Public: Headline indicators, national summaries, trends'] },
            { label: '👤 ACCESS CONTROL', items: ['Role-based permissions across all 3 dashboard layers', 'Species location fuzzing on public-facing maps', 'Audit log of all data access and exports', 'Annual access review by REMA data officer'] },
            { label: '📋 SUBMISSION STANDARDS', items: ['Standardized metadata schema per indicator', 'Automated validation checks on submission', 'Manual REMA verification within 10 working days', 'Feedback loop to reporting institution on errors'] },
          ].map(g => (
            <div key={g.label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b21a8', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', marginBottom: 8 }}>{g.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {g.items.map(item => <div key={item} style={{ fontSize: '0.77rem', color: 'var(--text-2)' }}>{item}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

