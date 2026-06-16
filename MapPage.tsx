import React, { useState, useEffect } from 'react';
import { useDistricts } from './useData';
import type { District } from './index';

interface GeoJSONFeature {
  type: string;
  properties: {
    shapeName: string;
    shapeISO: string;
    shapeID: string;
    shapeGroup: string;
    shapeType: string;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

function getColor(d: District, layer: string) {
  if (layer === 'submission') {
    return d.status === 'submitted' ? '#10b981' : d.status === 'pending' ? '#f59e0b' : '#f43f5e';
  }
  if (layer === 'compliance') {
    return d.compliance >= 85 ? '#10b981' : d.compliance >= 75 ? '#0ea5e9' : d.compliance >= 65 ? '#f59e0b' : '#f43f5e';
  }
  return d.forest_cover >= 35 ? '#064e3b' : d.forest_cover >= 25 ? '#059669' : d.forest_cover >= 18 ? '#10b981' : '#6ee7b7';
}

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export function MapPage() {
  const { data: rawDistricts } = useDistricts();
  const districts: District[] = (rawDistricts as District[] | null) ?? [];
  const [layer, setLayer] = useState('submission');
  const [tooltip, setTooltip] = useState<{ d: District; x: number; y: number } | null>(null);
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Rwanda district boundaries from geoBoundaries API
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, get the metadata which includes the download URL
        const metaResponse = await fetch('https://www.geoboundaries.org/api/current/gbOpen/RWA/ADM2/');
        if (!metaResponse.ok) throw new Error('Failed to fetch boundary metadata');
        
        const metadata = await metaResponse.json();
        const geoJsonUrl = metadata.gjDownloadURL;
        
        // Use allOrigins CORS proxy to fetch the GeoJSON from GitHub
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(geoJsonUrl)}`;
        const geoResponse = await fetch(proxyUrl);
        if (!geoResponse.ok) throw new Error('Failed to fetch GeoJSON data');
        
        const geoJson = await geoResponse.json();
        setGeoData(geoJson);
      } catch (err) {
        console.error('Error loading map data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, []);

  // Match GeoJSON features with district data
  const getDistrictData = (featureName: string): District | null => {
    // Normalize names for matching
    const normalized = featureName.toLowerCase().trim();
    return districts.find(d => 
      d.name.toLowerCase().trim() === normalized ||
      d.name.toLowerCase().replace(/\s+/g, '') === normalized.replace(/\s+/g, '')
    ) || null;
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Map */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700 }}>
              <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--sky-dim)' }} />
              Rwanda District Compliance Map
            </div>
            <select value={layer} onChange={e => setLayer(e.target.value)}
              style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.72rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}>
              <option value="submission">Submission Status</option>
              <option value="compliance">Compliance Score</option>
              <option value="forest">Forest Cover</option>
            </select>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 400 }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'var(--text-3)', fontSize: '0.85rem' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
                Loading map data...
              </div>
            )}
            
            {error && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, padding: 20 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '2rem', color: '#f43f5e', marginBottom: 12 }} />
                <div style={{ color: '#991b1b', fontSize: '0.85rem', textAlign: 'center' }}>
                  {error}
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  style={{ marginTop: 12, padding: '6px 14px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Retry
                </button>
              </div>
            )}
            
            {!loading && !error && geoData && (
              <svg viewBox="28.8 -2.9 3.5 2.8" style={{ width: '100%', height: 400, cursor: 'pointer' }} preserveAspectRatio="xMidYMid meet">
                <rect x="28.8" y="-2.9" width="3.5" height="2.8" fill="#f0f9ff" />
                {geoData.features.map((feature, idx) => {
                  const districtData = getDistrictData(feature.properties.shapeName);
                  const color = districtData ? getColor(districtData, layer) : '#e2e8f0';
                  
                  // Convert coordinates to SVG path
                  const renderGeometry = (coords: any, type: string): string => {
                    if (type === 'Polygon') {
                      return coords.map((ring: any) => {
                        return ring.map((point: any, i: number) => 
                          `${i === 0 ? 'M' : 'L'}${point[0]},${point[1]}`
                        ).join(' ') + ' Z';
                      }).join(' ');
                    } else if (type === 'MultiPolygon') {
                      return coords.map((polygon: any) => 
                        polygon.map((ring: any) => {
                          return ring.map((point: any, i: number) => 
                            `${i === 0 ? 'M' : 'L'}${point[0]},${point[1]}`
                          ).join(' ') + ' Z';
                        }).join(' ')
                      ).join(' ');
                    }
                    return '';
                  };

                  const pathData = renderGeometry(feature.geometry.coordinates, feature.geometry.type);
                  
                  return (
                    <path
                      key={idx}
                      d={pathData}
                      fill={color}
                      stroke="#fff"
                      strokeWidth="0.005"
                      opacity={0.88}
                      style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                      onMouseEnter={(e) => {
                        if (districtData) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const svg = e.currentTarget.ownerSVGElement;
                          if (svg) {
                            const svgRect = svg.getBoundingClientRect();
                            setTooltip({ 
                              d: districtData, 
                              x: ((rect.left + rect.width / 2 - svgRect.left) / svgRect.width) * 100,
                              y: rect.top - svgRect.top
                            });
                          }
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </svg>
            )}
            
            {tooltip && (
              <div style={{ position: 'absolute', background: 'rgba(15,39,68,0.9)', color: '#fff', padding: '6px 10px', borderRadius: 7, fontSize: '0.7rem', pointerEvents: 'none', top: tooltip.y - 50, left: `${tooltip.x}%`, transform: 'translateX(-50%)', zIndex: 10, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
                <strong>{tooltip.d.name}</strong><br />
                {tooltip.d.province?.name} Province<br />
                {layer === 'submission' ? tooltip.d.status : layer === 'compliance' ? `${tooltip.d.compliance}%` : `${tooltip.d.forest_cover}%`}
              </div>
            )}
            
            {/* Legend */}
            {!loading && !error && (
              <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '8px 12px', fontSize: '0.65rem' }}>
                {layer === 'submission' && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 5, color: 'var(--text-2)', fontFamily: "'DM Mono', monospace" }}>SUBMISSION STATUS</div>
                    {[['#10b981','Submitted'],['#f59e0b','Pending'],['#f43f5e','Missing'],['#e2e8f0','No data']].map(([c,l]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: c }} />{l}
                      </div>
                    ))}
                  </>
                )}
                {layer === 'compliance' && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 5, color: 'var(--text-2)', fontFamily: "'DM Mono', monospace" }}>COMPLIANCE SCORE</div>
                    {[['#10b981','≥85%'],['#0ea5e9','75–84%'],['#f59e0b','65–74%'],['#f43f5e','<65%']].map(([c,l]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: c }} />{l}
                      </div>
                    ))}
                  </>
                )}
                {layer === 'forest' && (
                  <>
                    <div style={{ fontWeight: 700, marginBottom: 5, color: 'var(--text-2)', fontFamily: "'DM Mono', monospace" }}>FOREST COVER</div>
                    {[['#064e3b','≥35%'],['#059669','25–34%'],['#10b981','18–24%'],['#6ee7b7','<18%']].map(([c,l]) => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: c }} />{l}
                      </div>
                    ))}
                  </>
                )}
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #e2e8f0', fontSize: '0.6rem', color: 'var(--text-3)' }}>
                  Source: geoBoundaries
                </div>
              </div>
            )}
          </div>
        </div>

        {/* District list */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-table-cells" style={{ color: 'var(--sky-dim)' }} />
            District Summary
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {[...districts].sort((a, b) => b.compliance - a.compliance).map(d => {
              const dot = d.status === 'submitted' ? '#10b981' : d.status === 'pending' ? '#f59e0b' : '#f43f5e';
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--surface-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>{d.province?.name}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: d.compliance >= 80 ? '#10b981' : d.compliance >= 70 ? '#f59e0b' : '#f43f5e' }}>{d.compliance}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Province chart (static bars) */}
      <div style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-chart-bar" style={{ color: 'var(--sky-dim)' }} />
          District Reporting by Province
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {['Kigali','South','North','West','East'].map(prov => {
            const provDistricts = districts.filter(d => d.province?.name === prov);
            const sub = provDistricts.filter(d => d.status === 'submitted').length;
            const pend = provDistricts.filter(d => d.status === 'pending').length;
            const miss = provDistricts.filter(d => d.status === 'missing').length;
            const total = provDistricts.length || 1;
            return (
              <div key={prov} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 8 }}>{prov}</div>
                <div style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 2 }}>
                  {[['#10b981', sub, 'Submitted'], ['#f59e0b', pend, 'Pending'], ['#f43f5e', miss, 'Missing']].map(([color, count, label]) => (
                    Number(count) > 0 && (
                      <div key={String(label)} style={{ background: String(color), borderRadius: 3, height: `${(Number(count) / total) * 70}px`, minHeight: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 700 }}>{count}</span>
                      </div>
                    )
                  ))}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', marginTop: 6, fontFamily: "'DM Mono', monospace" }}>{provDistricts.length} districts</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          {[['#10b981','Submitted'],['#f59e0b','Pending'],['#f43f5e','Missing']].map(([c,l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'var(--text-3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MapPage;
