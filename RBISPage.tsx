import React, { useState } from 'react';
import { useGBIFStats } from './useGBIF';

// ── Data stream definitions ───────────────────────────────────
const DATA_STREAMS = [
  { icon: 'fa-person-hiking',    color: '#059669', bg: '#f0fdf4', label: 'Field Surveys',          desc: 'Structured biodiversity field surveys using Darwin Core-compliant forms via T02–T04 modules', status: 'Active',   statusColor: '#166534', statusBg: '#dcfce7' },
  { icon: 'fa-satellite',        color: '#0284c7', bg: '#e0f2fe', label: 'Remote Sensing',          desc: 'Land cover change, ecosystem extent, and forest degradation via satellite imagery analysis', status: 'Planned',  statusColor: '#1e40af', statusBg: '#dbeafe' },
  { icon: 'fa-users',            color: '#d97706', bg: '#fffbeb', label: 'Community Monitoring',    desc: 'Citizen science observations, HWC reporting, and indigenous knowledge via T04 community module', status: 'Active',   statusColor: '#92400e', statusBg: '#fef9c3' },
  { icon: 'fa-camera',           color: '#7c3aed', bg: '#faf5ff', label: 'Camera Traps',            desc: 'Automated wildlife detection from camera trap networks in protected areas and buffer zones', status: 'Planned',  statusColor: '#6b21a8', statusBg: '#f3e8ff' },
  { icon: 'fa-wave-square',      color: '#0891b2', bg: '#ecfeff', label: 'Bioacoustics',            desc: 'Passive acoustic monitoring for bird, bat, and amphibian species using automated classifiers', status: 'Planned',  statusColor: '#155e75', statusBg: '#cffafe' },
  { icon: 'fa-globe',            color: '#16a34a', bg: '#f0fdf4', label: 'GBIF / Global Platforms', desc: 'Automated ingestion from GBIF, iNaturalist, and eBird via Darwin Core Archive (DwC-A) standard', status: 'Live',     statusColor: '#166534', statusBg: '#dcfce7' },
];

// ── Darwin Core fields ────────────────────────────────────────
const DWC_FIELDS = [
  { term: 'occurrenceID',       desc: 'Unique identifier for each observation record' },
  { term: 'scientificName',     desc: 'Full taxonomic name of the observed organism' },
  { term: 'decimalLatitude',    desc: 'WGS84 latitude of the observation location' },
  { term: 'decimalLongitude',   desc: 'WGS84 longitude of the observation location' },
  { term: 'eventDate',          desc: 'ISO 8601 date/time of the observation event' },
  { term: 'basisOfRecord',      desc: 'Nature of the record (HumanObservation, MachineObservation, etc.)' },
  { term: 'recordedBy',         desc: 'Name or identifier of the observer or institution' },
  { term: 'datasetName',        desc: 'Name of the dataset or monitoring programme' },
  { term: 'countryCode',        desc: 'ISO 3166-1 alpha-2 country code (RW for Rwanda)' },
  { term: 'taxonRank',          desc: 'Taxonomic rank of the most specific name (species, genus, etc.)' },
  { term: 'kingdom',            desc: 'Highest taxonomic rank (Animalia, Plantae, Fungi, etc.)' },
  { term: 'coordinateUncertaintyInMeters', desc: 'Spatial accuracy of the coordinate in metres' },
];

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export default function RBISPage() {
  const { stats, loading, error, refetch } = useGBIFStats();
  const [iframeError, setIframeError] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'|'pipeline'|'standards'|'streams'|'live'>('overview');
  const maxTrend = stats ? Math.max(...stats.yearlyTrend.map((t) => t.count)) : 1;

  return (
    <div>
      <div style={{ ...card, padding: 20, marginBottom: 24, borderLeft: "4px solid var(--sky-dim)", background: "linear-gradient(135deg,#0f2744,#1e3a5f)", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, background: "rgba(56,189,248,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="fa-solid fa-database" style={{ color: "#38bdf8", fontSize: "1.2rem" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>RBIS and GBIF - Rwanda Biodiversity Integration</div>
              <div style={{ fontSize: "0.73rem", color: "#7dd3fc", marginTop: 2 }}>Live data: GBIF API (api.gbif.org) + RBIS (rbis.ur.ac.rw) - Country: Rwanda (RW)</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "0.65rem", padding: "3px 10px", borderRadius: 10, fontWeight: 700, background: loading ? "#fef9c3" : error ? "#fee2e2" : "#dcfce7", color: loading ? "#854d0e" : error ? "#991b1b" : "#166534" }}>
              {loading ? "Loading..." : error ? "Error" : "Live"}
            </span>
            <button onClick={refetch} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
              <i className="fa-solid fa-rotate" /> Refresh
            </button>
            <a href="https://rbis.ur.ac.rw" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(56,189,248,0.2)", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
              <i className="fa-solid fa-arrow-up-right-from-square" /> Open RBIS
            </a>
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: 20, marginBottom: 24, borderLeft: "4px solid #10b981" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: "0.9rem", fontWeight: 700 }}>
          <i className="fa-solid fa-diagram-project" style={{ color: "#10b981" }} />
          Step 4: Integration with Rwanda Biodiversity Information System (RBIS)
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-2)", lineHeight: 1.7, marginBottom: 16 }}>
          The dashboard is technically integrated with RBIS to enable centralized biodiversity data storage, automated indicator aggregation, GIS-based visualization, interoperability with national statistics systems, and compatibility with CBD reporting platforms. RBIS functions as the core biodiversity data repository while this dashboard provides visualization and analytics interfaces for policy makers and implementing agencies.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {[
            { icon: "fa-hard-drive",    color: "#0284c7", label: "Centralized Storage",  desc: "RBIS as core data repository" },
            { icon: "fa-gears",         color: "#059669", label: "Auto Aggregation",      desc: "Automated indicator calculation" },
            { icon: "fa-map",           color: "#7c3aed", label: "GIS Visualization",     desc: "Spatial biodiversity mapping" },
            { icon: "fa-chart-column",  color: "#d97706", label: "National Statistics",   desc: "Interoperability with NSO" },
            { icon: "fa-earth-americas",color: "#0f2744", label: "CBD Compatibility",     desc: "KM-GBF reporting ready" },
          ].map((f) => (
            <div key={f.label} style={{ background: "var(--surface-2)", borderRadius: 9, padding: 12, border: "1px solid var(--border)" }}>
              <i className={"fa-solid " + f.icon} style={{ fontSize: "1.2rem", color: f.color, display: "block", marginBottom: 6 }} />
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-1)" }}>{f.label}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: 2 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Technical Architecture Tabs ── */}
      <div style={{ ...card, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', padding: '0 16px', background: 'var(--surface-2)' }}>
          {([
            { key: 'overview',   label: 'Architecture',    icon: 'fa-diagram-project' },
            { key: 'streams',    label: 'Data Streams',    icon: 'fa-stream' },
            { key: 'pipeline',   label: 'Ingestion Pipeline', icon: 'fa-gears' },
            { key: 'standards',  label: 'Darwin Core',     icon: 'fa-code' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '10px 14px', border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--sky-dim)' : '2px solid transparent', marginBottom: -1, background: 'none', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: activeTab === tab.key ? 'var(--sky-dim)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif" }}>
              <i className={`fa-solid ${tab.icon}`} style={{ fontSize: '0.72rem' }} />
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>

          {/* Architecture overview */}
          {activeTab === 'overview' && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 18 }}>
                RBIS is elevated from a simple repository to a <strong>fully operational data infrastructure layer</strong>. The system enforces common data standards (Darwin Core), automates data ingestion pipelines, and ensures interoperability with global platforms like GBIF. A functional NBMS does not depend on periodic uploads — it enables <strong>continuous, near-real-time data flows</strong>.
              </p>
              {/* Architecture flow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 20, padding: '16px', background: 'var(--surface-2)', borderRadius: 12 }}>
                {[
                  { label: 'Field / Remote / Community / Camera / Bioacoustics', icon: 'fa-satellite-dish', color: '#059669', bg: '#dcfce7' },
                  { label: '→', icon: null, color: 'var(--text-3)', bg: 'transparent' },
                  { label: 'Darwin Core Validation & Standardisation', icon: 'fa-code', color: '#0284c7', bg: '#e0f2fe' },
                  { label: '→', icon: null, color: 'var(--text-3)', bg: 'transparent' },
                  { label: 'RBIS Data Infrastructure Layer', icon: 'fa-database', color: '#7c3aed', bg: '#f3e8ff' },
                  { label: '→', icon: null, color: 'var(--text-3)', bg: 'transparent' },
                  { label: 'NBSAP Dashboard + GBIF + CBD', icon: 'fa-chart-line', color: '#0f2744', bg: '#dbeafe' },
                ].map((step, i) => step.icon ? (
                  <div key={i} style={{ background: step.bg, borderRadius: 9, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 160 }}>
                    <i className={`fa-solid ${step.icon}`} style={{ color: step.color, fontSize: '1rem', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: step.color, lineHeight: 1.3 }}>{step.label}</span>
                  </div>
                ) : (
                  <span key={i} style={{ color: 'var(--text-3)', fontSize: '1.2rem', flexShrink: 0 }}>→</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {[
                  { icon: 'fa-bolt',          color: '#f59e0b', label: 'Near-Real-Time Flows',    desc: 'Continuous data ingestion — no periodic upload dependency' },
                  { icon: 'fa-code',          color: '#0284c7', label: 'Darwin Core Standard',    desc: 'All records validated against DwC schema before ingestion' },
                  { icon: 'fa-gears',         color: '#059669', label: 'Automated Pipelines',     desc: 'Scheduled ingestion jobs with validation and error reporting' },
                  { icon: 'fa-globe',         color: '#7c3aed', label: 'GBIF Interoperability',   desc: 'Bidirectional sync with GBIF via Darwin Core Archive (DwC-A)' },
                  { icon: 'fa-shield-halved', color: '#dc2626', label: 'Data Governance',         desc: 'Role-based access, species fuzzing, audit trail on all flows' },
                  { icon: 'fa-chart-column',  color: '#0891b2', label: 'Indicator Aggregation',   desc: 'Automated calculation of NBSAP indicators from raw data streams' },
                ].map(f => (
                  <div key={f.label} style={{ background: 'var(--surface-2)', borderRadius: 9, padding: '12px 14px', borderLeft: `3px solid ${f.color}` }}>
                    <i className={`fa-solid ${f.icon}`} style={{ color: f.color, fontSize: '1rem', display: 'block', marginBottom: 6 }} />
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', lineHeight: 1.4 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data streams */}
          {activeTab === 'streams' && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>
                The system integrates <strong>multiple data streams</strong> — from traditional field surveys to emerging technologies. Each stream is standardised to Darwin Core before entering the RBIS infrastructure layer.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DATA_STREAMS.map(s => (
                  <div key={s.label} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: s.bg, borderRadius: 10, border: `1px solid ${s.color}22`, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, background: `${s.color}22`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: '1rem' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{s.label}</span>
                        <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: s.statusBg, color: s.statusColor }}>{s.status}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingestion pipeline */}
          {activeTab === 'pipeline' && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>
                Automated ingestion pipelines replace manual uploads. Each pipeline stage validates, transforms, and routes data into the RBIS infrastructure layer with full audit logging.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { step: '1', color: '#059669', bg: '#dcfce7', title: 'Data Collection',       desc: 'Field forms (T02–T04), camera trap uploads, bioacoustic files, remote sensing outputs, GBIF DwC-A archives', icon: 'fa-satellite-dish' },
                  { step: '2', color: '#0284c7', bg: '#dbeafe', title: 'Format Normalisation',  desc: 'All incoming records converted to Darwin Core standard. Mandatory fields enforced: occurrenceID, scientificName, eventDate, coordinates', icon: 'fa-code' },
                  { step: '3', color: '#d97706', bg: '#fef9c3', title: 'Validation & QA',       desc: 'Automated checks: coordinate bounds (Rwanda extent), taxonomic name resolution against GBIF backbone, date format validation, duplicate detection', icon: 'fa-circle-check' },
                  { step: '4', color: '#7c3aed', bg: '#f3e8ff', title: 'RBIS Ingestion',        desc: 'Validated records written to RBIS database. Species location fuzzing applied to threatened taxa. Metadata tagged with data source and pipeline version', icon: 'fa-database' },
                  { step: '5', color: '#0891b2', bg: '#ecfeff', title: 'Indicator Aggregation', desc: 'Automated calculation of NBSAP indicator values from ingested records. Progress percentages updated in real time. Alerts triggered if thresholds breached', icon: 'fa-chart-line' },
                  { step: '6', color: '#16a34a', bg: '#dcfce7', title: 'GBIF Sync & Export',    desc: 'Approved records published to GBIF via Darwin Core Archive. CBD-compatible exports generated. Dashboard visualisations updated automatically', icon: 'fa-globe' },
                ].map((s, i) => (
                  <div key={s.step} style={{ display: 'flex', gap: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.bg, border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: s.color, flexShrink: 0 }}>{s.step}</div>
                      {i < 5 && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20 }} />}
                    </div>
                    <div style={{ flex: 1, paddingLeft: 14, paddingBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                        <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: '0.85rem' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{s.title}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.55, background: s.bg, borderRadius: 8, padding: '10px 12px' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Darwin Core standards */}
          {activeTab === 'standards' && (
            <div>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#0369a1', lineHeight: 1.6 }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }} />
                <strong>Darwin Core (DwC)</strong> is the international standard for biodiversity data exchange. All records entering RBIS must conform to DwC before ingestion. This ensures interoperability with GBIF, iNaturalist, eBird, and CBD reporting platforms.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      {['DwC Term', 'Description', 'Required'].map(h => (
                        <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DWC_FIELDS.map((f, i) => (
                      <tr key={f.term} style={{ borderBottom: '1px solid var(--surface-3)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                        <td style={{ padding: '9px 13px', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>{f.term}</td>
                        <td style={{ padding: '9px 13px', color: 'var(--text-2)', fontSize: '0.78rem' }}>{f.desc}</td>
                        <td style={{ padding: '9px 13px' }}>
                          <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: i < 6 ? '#dcfce7' : '#f1f5f9', color: i < 6 ? '#166534' : '#475569' }}>
                            {i < 6 ? 'Required' : 'Recommended'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href="https://dwc.tdwg.org" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#e0f2fe', color: '#0284c7', borderRadius: 8, textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}>
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.7rem' }} /> Darwin Core Standard (tdwg.org)
                </a>
                <a href="https://www.gbif.org/darwin-core" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#f3e8ff', color: '#7c3aed', borderRadius: 8, textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600 }}>
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.7rem' }} /> GBIF Darwin Core Guide
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Live GBIF Stats ── */}
      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: "0.9rem", fontWeight: 700 }}>
          <i className="fa-solid fa-chart-column" style={{ color: "var(--sky-dim)" }} />
          Rwanda Biodiversity - Live GBIF Statistics
          <span style={{ marginLeft: "auto", fontSize: "0.62rem", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>Source: api.gbif.org</span>
        </div>
        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecaca", borderRadius: 9, padding: "12px 16px", marginBottom: 16, fontSize: "0.8rem", color: "#991b1b" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
            {error} - <button onClick={refetch} style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer", fontWeight: 600 }}>Retry</button>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(135deg,#0f2744,#1e3a5f)", borderRadius: 12, padding: "16px 14px", color: "#fff", textAlign: "center" }}>
            <i className="fa-solid fa-globe" style={{ fontSize: "1.4rem", display: "block", marginBottom: 6, opacity: 0.8 }} />
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{loading ? "-" : (stats?.totalOccurrences ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: "0.6rem", opacity: 0.75, marginTop: 3 }}>TOTAL OCCURRENCES</div>
          </div>
          {[
            { key: "mammals",    icon: "fa-paw",        label: "MAMMALS",    color: "#f43f5e", bg: "#fff1f2" },
            { key: "birds",      icon: "fa-dove",       label: "BIRDS",      color: "#0284c7", bg: "#e0f2fe" },
            { key: "plants",     icon: "fa-seedling",   label: "PLANTS",     color: "#059669", bg: "#f0fdf4" },
            { key: "insects",    icon: "fa-bug",        label: "INSECTS",    color: "#d97706", bg: "#fffbeb" },
            { key: "fish",       icon: "fa-fish",       label: "FISH",       color: "#0891b2", bg: "#ecfeff" },
            { key: "amphibians", icon: "fa-frog",       label: "AMPHIBIANS", color: "#16a34a", bg: "#f0fdf4" },
            { key: "reptiles",   icon: "fa-dragon",     label: "REPTILES",   color: "#7c3aed", bg: "#faf5ff" },
            { key: "fungi",      icon: "fa-circle-dot", label: "FUNGI",      color: "#92400e", bg: "#fffbeb" },
          ].map((g) => (
            <div key={g.key} style={{ background: g.bg, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
              <i className={"fa-solid " + g.icon} style={{ fontSize: "1.3rem", color: g.color, display: "block", marginBottom: 6 }} />
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: g.color }}>
                {loading ? "-" : ((stats as any)?.[g.key] ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: "0.65rem", color: g.color, opacity: 0.8, marginTop: 3 }}>{g.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-3)", marginBottom: 10 }}>Occurrence Trend 2020-2024</div>
        {loading ? (
          <div style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>Loading trend...</div>
        ) : (
          <div>
            {stats?.yearlyTrend.map((t) => {
              const pct = maxTrend > 0 ? Math.round((t.count / maxTrend) * 100) : 0;
              return (
                <div key={t.year} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, fontSize: "0.72rem", color: "var(--text-3)", flexShrink: 0 }}>{t.year}</div>
                  <div style={{ flex: 1, height: 18, background: "var(--surface-3)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#0284c7,#38bdf8)", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                      {pct > 20 && <span style={{ fontSize: "0.6rem", color: "#fff" }}>{t.count.toLocaleString()}</span>}
                    </div>
                  </div>
                  {pct <= 20 && <div style={{ fontSize: "0.68rem", color: "var(--text-3)", minWidth: 50 }}>{t.count.toLocaleString()}</div>}
                </div>
              );
            })}
            <div style={{ marginTop: 8, fontSize: "0.65rem", color: "var(--text-3)" }}>Source: api.gbif.org/v1/occurrence/search?country=RW</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: "0.9rem", fontWeight: 700 }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: "var(--sky-dim)" }} />
            Recent Observations (GBIF)
          </div>
          {loading ? (
            <div style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>Loading...</div>
          ) : (stats?.recentOccurrences ?? []).length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>No recent observations</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
              {stats?.recentOccurrences.map((occ) => (
                <a key={occ.key} href={"https://www.gbif.org/occurrence/" + occ.key} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", gap: 10, padding: "8px 10px", background: "var(--surface-2)", borderRadius: 9, textDecoration: "none", border: "1px solid var(--border)" }}>
                  {occ.mediaUrl ? (
                    <img src={occ.mediaUrl} alt={occ.scientificName} style={{ width: 44, height: 44, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 7, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <i className="fa-solid fa-leaf" style={{ color: "#0284c7" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-1)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{occ.scientificName}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: 2 }}>{occ.kingdom}{occ.family ? " - " + occ.family : ""}{occ.year ? " - " + occ.year : ""}</div>
                    {occ.stateProvince && <div style={{ fontSize: "0.65rem", color: "var(--sky-dim)", marginTop: 1 }}><i className="fa-solid fa-location-dot" style={{ marginRight: 3 }} />{occ.stateProvince}</div>}
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "var(--text-3)", fontSize: "0.7rem", alignSelf: "center", flexShrink: 0 }} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem", fontWeight: 700 }}>
              <i className="fa-solid fa-map-location-dot" style={{ color: "var(--sky-dim)" }} />
              RBIS Spatial Map
            </div>
            <a href="https://rbis.ur.ac.rw/map" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--sky-dim)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              <i className="fa-solid fa-expand" /> Full Screen
            </a>
          </div>
          <div style={{ position: "relative", width: "100%", height: 340, background: "#f0f9ff" }}>
            {iframeError ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: 20, textAlign: "center" }}>
                <i className="fa-solid fa-map-location-dot" style={{ fontSize: "2rem", color: "#0284c7", opacity: 0.4 }} />
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-1)" }}>RBIS map cannot be embedded</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-3)", maxWidth: 280, lineHeight: 1.5 }}>Open directly for the full interactive map.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href="https://rbis.ur.ac.rw/map" target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: "#0284c7", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700 }}>Open RBIS Map</a>
                  <a href="https://www.gbif.org/occurrence/map?country=RW" target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: "#059669", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: "0.78rem", fontWeight: 700 }}>GBIF Rwanda Map</a>
                </div>
              </div>
            ) : (
              <iframe src="https://rbis.ur.ac.rw/map" title="RBIS Map" style={{ width: "100%", height: "100%", border: "none" }} loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onError={() => setIframeError(true)}
                onLoad={(e) => { try { const doc = (e.target as HTMLIFrameElement).contentDocument; if (!doc || doc.body?.innerHTML === "") setIframeError(true); } catch { setIframeError(true); } }}
              />
            )}
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: "0.9rem", fontWeight: 700 }}>
          <i className="fa-solid fa-link" style={{ color: "var(--sky-dim)" }} />
          Quick Access - RBIS and GBIF Rwanda
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
          {[
            { href: "https://rbis.ur.ac.rw/map",                                icon: "fa-map-location-dot", color: "#0284c7", bg: "#e0f2fe", label: "RBIS Biodiversity Map",    desc: "Interactive spatial data" },
            { href: "https://rbis.ur.ac.rw/taxa",                               icon: "fa-leaf",             color: "#059669", bg: "#dcfce7", label: "RBIS Taxa Database",       desc: "Species records" },
            { href: "https://www.gbif.org/occurrence/search?country=RW",        icon: "fa-globe",            color: "#7c3aed", bg: "#f3e8ff", label: "GBIF Rwanda Occurrences", desc: "All biodiversity records" },
            { href: "https://www.gbif.org/occurrence/map?country=RW",           icon: "fa-map",              color: "#0891b2", bg: "#ecfeff", label: "GBIF Rwanda Map",          desc: "Occurrence map" },
            { href: "https://www.gbif.org/species/search?country=RW",           icon: "fa-dna",              color: "#d97706", bg: "#fffbeb", label: "GBIF Species List",        desc: "Species checklist" },
            { href: "https://rbis.ur.ac.rw/download",                           icon: "fa-download",         color: "#16a34a", bg: "#f0fdf4", label: "RBIS Data Download",       desc: "Export datasets" },
          ].map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
              style={{ background: link.bg, borderRadius: 10, padding: 14, textDecoration: "none", display: "flex", flexDirection: "column", gap: 6, border: "1px solid transparent", transition: "0.2s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}>
              <i className={"fa-solid " + link.icon} style={{ fontSize: "1.3rem", color: link.color }} />
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: link.color }}>{link.label}</div>
              <div style={{ fontSize: "0.7rem", color: link.color, opacity: 0.8 }}>{link.desc}</div>
              <div style={{ fontSize: "0.65rem", color: link.color, display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.58rem" }} /> Open
              </div>
            </a>
          ))}
        </div>
      </div>

      <div style={{ ...card, padding: 18, borderLeft: "4px solid #7c3aed" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: "0.9rem", fontWeight: 700 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: "#7c3aed" }} />
          Data Governance Protocols
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { label: "DATA CLASSIFICATION", items: ["Restricted: Threatened species GPS, enforcement locations", "Internal: District raw data, compliance scores", "Public: Headline indicators, national summaries, trends"] },
            { label: "ACCESS CONTROL",      items: ["Role-based permissions across all 3 dashboard layers", "Species location fuzzing on public-facing maps", "Audit log of all data access and exports"] },
            { label: "SUBMISSION STANDARDS",items: ["Standardized metadata schema per indicator", "Automated validation checks on submission", "Manual REMA verification within 10 working days"] },
          ].map((g) => (
            <div key={g.label} style={{ background: "var(--surface-2)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#6b21a8", marginBottom: 8 }}>{g.label}</div>
              {g.items.map((item) => <div key={item} style={{ fontSize: "0.77rem", color: "var(--text-2)", marginBottom: 4 }}>{item}</div>)}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: "0.65rem", color: "var(--text-3)" }}>
          GBIF data licensed under CC BY 4.0 - gbif.org/terms | RBIS - rbis.ur.ac.rw
        </div>
      </div>
    </div>
  );
}
