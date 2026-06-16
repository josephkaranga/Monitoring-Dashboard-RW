// ============================================================
// MapPage.tsx — District Map with Supabase data
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { useDistricts } from './useData';
import type { District } from './index';

function getStatusColor(d: District, layer: string) {
  if (layer === 'submission') {
    return d.status === 'submitted' ? '#10b981' : d.status === 'pending' ? '#f59e0b' : '#f43f5e';
  }
  if (layer === 'compliance') {
    return d.compliance >= 85 ? '#10b981' : d.compliance >= 75 ? '#0ea5e9' : d.compliance >= 65 ? '#f59e0b' : '#f43f5e';
  }
  // forest
  return d.forest_cover >= 35 ? '#064e3b' : d.forest_cover >= 25 ? '#059669' : d.forest_cover >= 18 ? '#10b981' : '#6ee7b7';
}

const DIST_POSITIONS = [
  [210,165,60,50],[210,165,30,25],[240,155,30,25],[215,190,30,25],
  [140,215,35,30],[100,230,35,30],[70,250,35,30],[120,255,35,30],[160,245,35,25],
  [145,270,35,25],[180,235,30,25],[175,80,35,30],[140,60,40,35],[185,45,35,35],
  [215,85,35,30],[250,70,35,35],[65,90,40,35],[80,130,35,30],[100,165,35,30],
  [80,195,40,35],[55,155,35,30],[65,235,40,35],[80,270,35,30],[285,155,40,30],
  [340,60,55,65],[310,130,40,35],[300,165,40,35],[330,195,40,35],[285,195,40,30],[260,220,45,40],
];

export function MapPage() {
  const { data: districts = [] } = useDistricts();
  const [layer, setLayer] = useState('submission');
  const [tooltip, setTooltip] = useState<{ d: District; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Map */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>🗺️ Rwanda District Compliance Map</h3>
            <select value={layer} onChange={e => setLayer(e.target.value)} style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.75rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}>
              <option value="submission">Submission Status</option>
              <option value="compliance">Compliance Score</option>
              <option value="forest">Forest Cover</option>
            </select>
          </div>
          <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
            <svg ref={svgRef} viewBox="0 0 500 400" style={{ width: '100%', height: 280 }}>
              <rect width="500" height="400" fill="#f0f9ff" />
              {districts.map((d, i) => {
                const pos = DIST_POSITIONS[i];
                if (!pos) return null;
                const [x, y, w, h] = pos;
                const color = getStatusColor(d, layer);
                const label = layer === 'submission' ? d.status : layer === 'compliance' ? `${d.compliance}%` : `${d.forest_cover}%`;
                return (
                  <g key={d.id}>
                    <rect x={x} y={y} width={w} height={h} rx={4} fill={color} stroke="#fff" strokeWidth={1.5} opacity={0.88} style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                      onMouseEnter={() => setTooltip({ d, x: x + w / 2, y: y - 10 })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {w > 35 && h > 28 && (
                      <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle" fontSize={7} fill="rgba(15,39,68,0.7)" fontFamily="DM Sans,sans-serif" pointerEvents="none">
                        {d.name.length > 9 ? d.name.slice(0, 8) + '…' : d.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            {tooltip && (
              <div style={{ position: 'absolute', background: 'rgba(15,39,68,0.9)', color: '#fff', padding: '6px 10px', borderRadius: 7, fontSize: '0.7rem', pointerEvents: 'none', top: tooltip.y - 20, left: `${(tooltip.x / 500) * 100}%`, transform: 'translateX(-50%)', zIndex: 10, whiteSpace: 'nowrap' }}>
                <strong>{tooltip.d.name}</strong> · {tooltip.d.province?.name}<br />
                {layer}: {layer === 'submission' ? tooltip.d.status : layer === 'compliance' ? `${tooltip.d.compliance}%` : `${tooltip.d.forest_cover}%`}
              </div>
            )}
            {/* Legend */}
            <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: '8px 12px', fontSize: '0.65rem' }}>
              {layer === 'submission' && (
                <>
                  <div style={{ fontWeight: 700, marginBottom: 5, color: '#475569', fontFamily: "'DM Mono', monospace" }}>SUBMISSION STATUS</div>
                  {[['#10b981','Submitted'],['#f59e0b','Pending'],['#f43f5e','Missing']].map(([c,l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: c }} />{l}</div>
                  ))}
                </>
              )}
              {layer === 'compliance' && (
                <>
                  <div style={{ fontWeight: 700, marginBottom: 5, color: '#475569', fontFamily: "'DM Mono', monospace" }}>COMPLIANCE %</div>
                  {[['#10b981','≥85%'],['#0ea5e9','75–84%'],['#f59e0b','65–74%'],['#f43f5e','<65%']].map(([c,l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: c }} />{l}</div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* District list */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14 }}>📊 District Summary</h3>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {[...districts].sort((a, b) => b.compliance - a.compliance).map(d => {
              const dot = d.status === 'submitted' ? '#10b981' : d.status === 'pending' ? '#f59e0b' : '#f43f5e';
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>{d.province?.name}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: d.compliance >= 80 ? '#10b981' : d.compliance >= 70 ? '#f59e0b' : '#f43f5e' }}>{d.compliance}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
