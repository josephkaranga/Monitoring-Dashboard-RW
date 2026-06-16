import React, { useState } from "react";
import { useGBIFStats } from "./useGBIF";

const card: React.CSSProperties = {
  background: "var(--surface)", borderRadius: "var(--radius)",
  border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)",
};

export default function RBISPage() {
  const { stats, loading, error, refetch } = useGBIFStats();
  const [iframeError, setIframeError] = useState(false);
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
