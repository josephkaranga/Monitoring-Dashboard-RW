import React, { useState } from 'react';
import { useGBIFStats } from './useGBIF';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

// ── Stat tile ─────────────────────────────────────────────────
function StatTile({ icon, label, value, color, bg }: {
  icon: string; label: string; value: string | number; color: string; bg: string;
}) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '14px 12px', textAlign: 'center', border: `1px solid ${color}22` }}>
      <i className={`fa-solid ${icon}`} style={{ fontSize: '1.3rem', color, display: 'block', marginBottom: 6 }} />
      <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: '0.65rem', color, opacity: 0.8, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>{label}</div>
    </div>
  );
}

// ── Trend bar ─────────────────────────────────────────────────
function TrendBar({ year, count, max }: { year: number; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 36, fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{year}</div>
      <div style={{ flex: 1, height: 18, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#0284c7,#38bdf8)', borderRadius: 4, transition: 'width 1s ease', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
          {pct > 20 && <span style={{ fontSize: '0.6rem', color: '#fff', fontFamily: "'DM Mono', monospace" }}>{count.toLocaleString()}</span>}
        </div>
      </div>
      {pct <= 20 && <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", minWidth: 50 }}>{count.toLocaleString()}</div>}
    </div>
  );
}

export default function RBISPage() {
  const { stats, loading, error, refetch } = useGBIFStats();
  const [iframeError, setIframeError] = useState(false);

  const maxTrend = stats ? Math.max(...stats.yearlyTrend.map(t => t.count)) : 1;

  return (
    <div>
      {/* Header banner */}
      <div style={{ ...card, padding: 20, marginBottom: 24, borderLeft: '4px solid var(--sky-dim)', background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'rgba(56,189,248,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-database" style={{ color: '#38bdf8', fontSize: '1.2rem' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>RBIS / GBIF — Rwanda Biodiversity Data</div>
              <div style={{ fontSize: '0.73rem', color: '#7dd3fc', marginTop: 2 }}>
                Live data from the Global Biodiversity Information Facility (GBIF) · Country: Rwanda (RW)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: loading ? '#fef9c3' : error ? '#fee2e2' : '#dcfce7', color: loading ? '#854d0e' : error ? '#991b1b' : '#166534' }}>
              {loading ? '⟳ Loading…' : error ? '✕ Error' : '● Live'}
            </span>
            <button onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <i className="fa-solid fa-rotate" /> Refresh
            </button>
            <a href="https://rbis.ur.ac.rw" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
              <i className="fa-solid fa-arrow-up-right-from-square" /> Open RBIS
            </a>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ ...card, padding: 20, marginBottom: 24, borderLeft: '4px solid #f43f5e', background: '#fff1f2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f43f5e', fontSize: '1.2rem' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#991b1b' }}>GBIF data unavailable</div>
              <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: 2 }}>{error}</div>
            </div>
            <button onClick={refetch} style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 8, border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── LIVE GBIF STATS ── */}
      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-chart-column" style={{ color: 'var(--sky-dim)' }} />
          Rwanda Biodiversity — Live GBIF Statistics
          {stats && (
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
              Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Top-level counts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 12, padding: '16px 14px', color: '#fff', textAlign: 'center' }}>
            <i className="fa-solid fa-globe" style={{ fontSize: '1.4rem', display: 'block', marginBottom: 6, opacity: 0.8 }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
              {loading ? '—' : (stats?.totalOccurrences ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', opacity: 0.75, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>TOTAL OCCURRENCES</div>
          </div>
          <div style={{ background: 'linear-gradient(135deg,#059669,#10b981)', borderRadius: 12, padding: '16px 14px', color: '#fff', textAlign: 'center' }}>
            <i className="fa-solid fa-leaf" style={{ fontSize: '1.4rem', display: 'block', marginBottom: 6, opacity: 0.8 }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
              {loading ? '—' : (stats?.totalSpecies ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', opacity: 0.75, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>SPECIES RECORDED</div>
          </div>
        </div>

        {/* Taxonomic breakdown */}
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
          Occurrences by Taxonomic Group
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))
          ) : (
            <>
              <StatTile icon="fa-paw"        label="MAMMALS"    value={stats?.mammals ?? 0}    color="#f43f5e" bg="#fff1f2" />
              <StatTile icon="fa-dove"       label="BIRDS"      value={stats?.birds ?? 0}      color="#0284c7" bg="#e0f2fe" />
              <StatTile icon="fa-seedling"   label="PLANTS"     value={stats?.plants ?? 0}     color="#059669" bg="#f0fdf4" />
              <StatTile icon="fa-bug"        label="INSECTS"    value={stats?.insects ?? 0}    color="#d97706" bg="#fffbeb" />
              <StatTile icon="fa-fish"       label="FISH"       value={stats?.fish ?? 0}       color="#0891b2" bg="#ecfeff" />
              <StatTile icon="fa-frog"       label="AMPHIBIANS" value={stats?.amphibians ?? 0} color="#16a34a" bg="#f0fdf4" />
              <StatTile icon="fa-dragon"     label="REPTILES"   value={stats?.reptiles ?? 0}   color="#7c3aed" bg="#faf5ff" />
              <StatTile icon="fa-circle-dot" label="FUNGI"      value={stats?.fungi ?? 0}      color="#92400e" bg="#fffbeb" />
            </>
          )}
        </div>
      </div>

      {/* ── YEARLY TREND + RECENT OCCURRENCES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Yearly trend */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-chart-line" style={{ color: 'var(--sky-dim)' }} />
            Occurrence Trend (2020–2024)
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>Loading trend data…</div>
          ) : (
            <div>
              {stats?.yearlyTrend.map(t => (
                <TrendBar key={t.year} year={t.year} count={t.count} max={maxTrend} />
              ))}
              <div style={{ marginTop: 12, fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                Source: GBIF · Country: Rwanda (RW) · All taxa
              </div>
            </div>
          )}
        </div>

        {/* Recent occurrences */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--sky-dim)' }} />
            Recent Observations (with photos)
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>Loading observations…</div>
          ) : (stats?.recentOccurrences ?? []).length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>No recent observations found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {stats?.recentOccurrences.map(occ => (
                <a
                  key={occ.key}
                  href={`https://www.gbif.org/occurrence/${occ.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 9, textDecoration: 'none', transition: '0.15s', border: '1px solid var(--border)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f0f9ff')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
                >
                  {occ.mediaUrl ? (
                    <img src={occ.mediaUrl} alt={occ.scientificName} style={{ width: 44, height: 44, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 7, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fa-solid fa-leaf" style={{ color: '#0284c7', fontSize: '1rem' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {occ.scientificName}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 2 }}>
                      {occ.kingdom}{occ.family ? ` · ${occ.family}` : ''}{occ.year ? ` · ${occ.year}` : ''}
                    </div>
                    {occ.stateProvince && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--sky-dim)', marginTop: 1 }}>
                        <i className="fa-solid fa-location-dot" style={{ marginRight: 3 }} />{occ.stateProvince}
                      </div>
                    )}
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: 'var(--text-3)', fontSize: '0.7rem', alignSelf: 'center', flexShrink: 0 }} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RBIS MAP EMBED ── */}
      <div style={{ ...card, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--sky-dim)' }} />
            RBIS Live Spatial Data
          </div>
          <a href="https://rbis.ur.ac.rw/map" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.75rem', color: 'var(--sky-dim)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="fa-solid fa-expand" /> Full Screen
          </a>
        </div>
        <div style={{ position: 'relative', width: '100%', height: 420, background: '#f0f9ff' }}>
          {iframeError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, padding: 24, textAlign: 'center' }}>
              <i className="fa-solid fa-map-location-dot" style={{ fontSize: '2.5rem', color: '#0284c7', opacity: 0.35 }} />
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-1)' }}>RBIS map cannot be embedded</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', maxWidth: 360, lineHeight: 1.6 }}>
                The RBIS website restricts embedding. Open it directly to access the full interactive biodiversity map.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <a href="https://rbis.ur.ac.rw/map" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: '#0284c7', color: '#fff', borderRadius: 9, textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                  <i className="fa-solid fa-arrow-up-right-from-square" /> Open RBIS Map
                </a>
                <a href={`https://www.gbif.org/occurrence/map?country=RW`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', background: '#059669', color: '#fff', borderRadius: 9, textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                  <i className="fa-solid fa-map" /> GBIF Rwanda Map
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src="https://rbis.ur.ac.rw/map"
              title="RBIS Live Biodiversity Map"
              style={{ width: '100%', height: '100%', border: 'none' }}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onError={() => setIframeError(true)}
              onLoad={e => {
                try {
                  const doc = (e.target as HTMLIFrameElement).contentDocument;
                  if (!doc || doc.body?.innerHTML === '') setIframeError(true);
                } catch { setIframeError(true); }
              }}
            />
          )}
        </div>
      </div>

      {/* ── QUICK LINKS ── */}
      <div style={{ ...card, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-link" style={{ color: 'var(--sky-dim)' }} />
          Quick Access — RBIS &amp; GBIF Rwanda
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { href: 'https://rbis.ur.ac.rw/map',                                    icon: 'fa-map-location-dot', color: '#0284c7', bg: '#e0f2fe', label: 'RBIS Biodiversity Map',    desc: 'Interactive spatial data explorer' },
            { href: 'https://rbis.ur.ac.rw/taxa',                                   icon: 'fa-leaf',             color: '#059669', bg: '#dcfce7', label: 'RBIS Taxa Database',       desc: 'Species records & taxonomy' },
            { href: 'https://www.gbif.org/occurrence/search?country=RW',            icon: 'fa-globe',            color: '#7c3aed', bg: '#f3e8ff', label: 'GBIF Rwanda Occurrences', desc: 'All biodiversity records for Rwanda' },
            { href: 'https://www.gbif.org/occurrence/map?country=RW',               icon: 'fa-map',              color: '#0891b2', bg: '#ecfeff', label: 'GBIF Rwanda Map',          desc: 'Interactive occurrence map' },
            { href: 'https://www.gbif.org/species/search?country=RW',               icon: 'fa-dna',              color: '#d97706', bg: '#fffbeb', label: 'GBIF Species List',        desc: 'Species checklist for Rwanda' },
            { href: 'https://rbis.ur.ac.rw/download',                               icon: 'fa-download',         color: '#16a34a', bg: '#f0fdf4', label: 'RBIS Data Download',       desc: 'Export biodiversity datasets' },
          ].map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
              style={{ background: link.bg, borderRadius: 10, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6, transition: '0.2s', border: '1px solid transparent' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}>
              <i className={`fa-solid ${link.icon}`} style={{ fontSize: '1.3rem', color: link.color }} />
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: link.color }}>{link.label}</div>
              <div style={{ fontSize: '0.7rem', color: link.color, opacity: 0.8 }}>{link.desc}</div>
              <div style={{ fontSize: '0.65rem', color: link.color, display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.58rem' }} /> Open
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── DATA GOVERNANCE ── */}
      <div style={{ ...card, padding: 18, borderLeft: '4px solid #7c3aed' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#7c3aed' }} />
          Data Governance Protocols
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
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
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
          Data source: Global Biodiversity Information Facility (GBIF) · <a href="https://www.gbif.org/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-dim)' }}>Terms of Use</a> · Licensed under CC BY 4.0
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
    </div>
  );
}
