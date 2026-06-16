import React from 'react';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

const stakeholders = [
  { name: 'MoE / REMA', cat: 'Government', catBg: '#dbeafe', catColor: '#1e40af', role: 'Lead Agency', resp: 'Overall coordination, RBIS management, CBD reporting', module: 'T01 · All modules', engagement: 'High', engBg: '#dcfce7', engColor: '#166534', highlight: false },
  { name: 'Sector Ministries', cat: 'Government', catBg: '#dbeafe', catColor: '#1e40af', role: 'Data Providers', resp: 'Sectoral data collection, policy implementation, NBSAP targets', module: 'T01 · T05', engagement: 'High', engBg: '#dcfce7', engColor: '#166534', highlight: false },
  { name: 'District Governments', cat: 'Government', catBg: '#dbeafe', catColor: '#1e40af', role: 'Local Coordination', resp: 'Local monitoring, community participation, field data collection', module: 'T02 · T04', engagement: 'Medium', engBg: '#dbeafe', engColor: '#1e40af', highlight: false },
  { name: 'RDB / RFA', cat: 'Government', catBg: '#dbeafe', catColor: '#1e40af', role: 'Protected Areas', resp: 'Species monitoring, habitat management, anti-poaching', module: 'T03', engagement: 'High', engBg: '#dcfce7', engColor: '#166534', highlight: false },
  { name: 'Local Communities', cat: 'Community', catBg: '#fef9c3', catColor: '#854d0e', role: 'Citizen Scientists', resp: 'Biodiversity observations, indigenous knowledge, HWC reporting', module: 'T04', engagement: 'Medium', engBg: '#dbeafe', engColor: '#1e40af', highlight: false },
  { name: 'CSOs & NGOs', cat: 'Civil Society', catBg: '#dcfce7', catColor: '#166534', role: 'Validation & Advocacy', resp: 'Independent monitoring, community mobilization, data validation, grievance channels. Hold significant biodiversity field data outside government systems.', module: 'T04 · T07', engagement: 'Growing', engBg: '#fef9c3', engColor: '#854d0e', highlight: true },
  { name: 'Universities & Research Institutes', cat: 'Academia', catBg: '#dcfce7', catColor: '#166534', role: 'Evidence Generation', resp: 'Indicator development, species surveys, ecosystem assessments, long-term biodiversity datasets. Critical data source for Albertine Rift species.', module: 'T07', engagement: 'Medium', engBg: '#dbeafe', engColor: '#1e40af', highlight: true },
  { name: 'Private Sector', cat: 'Private', catBg: '#dcfce7', catColor: '#166534', role: 'Compliance & Investment', resp: 'EIA compliance, biodiversity offsets, ESG reporting, green investments. Required to report annually on restoration commitments.', module: 'T06', engagement: 'Growing', engBg: '#fef9c3', engColor: '#854d0e', highlight: true },
  { name: 'Development Partners', cat: 'International', catBg: '#f1f5f9', catColor: '#475569', role: 'Capacity & Finance', resp: 'Technical support, resource mobilization, alignment with GEF/GCF frameworks', module: 'T05', engagement: 'High', engBg: '#dcfce7', engColor: '#166534', highlight: false },
];

export default function StakeholdersPage() {
  return (
    <div>
      {/* Engagement Matrix */}
      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-users-gear" style={{ color: 'var(--sky-dim)' }} />
          Stakeholder Engagement Matrix
        </div>
        <p style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginBottom: 14 }}>
          Expanded to include Civil Society, Academia, and Private Sector — key biodiversity data holders outside government.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {['Stakeholder','Category','Role','Responsibilities','Reporting Module','Engagement'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stakeholders.map(s => (
                <tr key={s.name} style={{ borderBottom: '1px solid var(--surface-3)', background: s.highlight ? '#f0fdf4' : 'transparent' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ background: s.catBg, color: s.catColor, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{s.cat}</span>
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-3)', fontSize: '0.78rem' }}>{s.role}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-2)', fontSize: '0.78rem', maxWidth: 280, lineHeight: 1.4 }}>{s.resp}</td>
                  <td style={{ padding: '11px 14px', fontFamily: "'DM Mono', monospace", fontSize: '0.73rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{s.module}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ background: s.engBg, color: s.engColor, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{s.engagement}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Flows */}
      <div style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-circle-nodes" style={{ color: 'var(--sky-dim)' }} />
          Stakeholder Data Flows by Category
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { bg: '#eff6ff', border: '#2563eb', color: '#1e40af', label: '🏛️ GOVERNMENT CHAIN', desc: 'Community → District → Sector → REMA → RBIS → CBD. Primary institutional data pipeline covering T01–T05.' },
            { bg: '#f0fdf4', border: '#16a34a', color: '#166534', label: '🌱 CIVIL SOCIETY CHAIN', desc: 'CSO field observations + University research → T07 submissions → RBIS evidence repository → Policy refinement.' },
            { bg: '#faf5ff', border: '#7c3aed', color: '#6b21a8', label: '🏗️ PRIVATE SECTOR CHAIN', desc: 'Enterprise EIA reports + ESG data → T06 annual submissions → Compliance index → Public dashboard transparency layer.' },
          ].map(f => (
            <div key={f.label} style={{ background: f.bg, borderRadius: 10, padding: 14, borderLeft: `3px solid ${f.border}` }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: f.color, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>{f.label}</div>
              <div style={{ fontSize: '0.77rem', color: f.color, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
