import React from 'react';
import type { MapLayer } from '../../types/mapLayers';

interface LegendStop {
  value: number;
  color: string;
  label: string;
}

interface OverlayLegendItem {
  id: string;
  label: string;
  color: string;
  style: 'fill' | 'line' | 'dot';
}

interface MapLegendProps {
  activeLayer: MapLayer;
  enabledOverlays?: Set<string>;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  isMobile?: boolean;
}

/**
 * MapLegend Component
 * 
 * Displays a dynamic legend that updates based on the active map layer.
 * Shows color scales and value ranges for each layer type.
 * 
 * Features:
 * - Dynamic legend content based on active layer
 * - Color-coded value ranges
 * - Configurable position
 * - Matches existing MapPage styling
 * - Accessible with ARIA labels
 */
const OVERLAY_LEGEND: OverlayLegendItem[] = [
  { id: 'protected-areas', label: 'Protected Areas', color: '#16a34a', style: 'fill' },
  { id: 'rivers', label: 'Rivers', color: '#0284c7', style: 'line' },
  { id: 'lakes', label: 'Lakes', color: '#2563eb', style: 'fill' },
  { id: 'gbif', label: 'GBIF Occurrences', color: '#3b82f6', style: 'dot' },
  { id: 'reports', label: 'Approved Reports', color: '#1E7D4B', style: 'dot' },
];

export function MapLegend({ activeLayer, enabledOverlays, position = 'bottom-right', isMobile = false }: MapLegendProps) {
  const getLegendData = (layer: MapLayer): { title: string; stops: LegendStop[] } => {
    switch (layer) {
      case 'biodiversity':
        return {
          title: 'BIODIVERSITY INDEX',
          stops: [
            { value: 90, color: '#16a34a', label: '90-100 (Very High)' },
            { value: 80, color: '#22c55e', label: '80-89 (High)' },
            { value: 60, color: '#4ade80', label: '60-79 (Medium)' },
            { value: 40, color: '#86efac', label: '40-59 (Low)' },
            { value: 20, color: '#bbf7d0', label: '20-39 (Very Low)' },
            { value: 0, color: '#f0fdf4', label: '0-19 (Minimal)' },
          ],
        };
      
      case 'forest':
        return {
          title: 'FOREST COVER',
          stops: [
            { value: 35, color: '#064e3b', label: '≥35%' },
            { value: 25, color: '#059669', label: '25-34%' },
            { value: 18, color: '#10b981', label: '18-24%' },
            { value: 0, color: '#6ee7b7', label: '<18%' },
          ],
        };
      
      case 'species-richness':
        return {
          title: 'SPECIES RICHNESS',
          stops: [
            { value: 100, color: '#16a34a', label: '≥100 species' },
            { value: 50, color: '#22c55e', label: '50-99 species' },
            { value: 25, color: '#4ade80', label: '25-49 species' },
            { value: 10, color: '#86efac', label: '10-24 species' },
            { value: 0, color: '#bbf7d0', label: '<10 species' },
          ],
        };
      
      case 'protected-areas':
        return {
          title: 'PROTECTED AREAS',
          stops: [
            { value: 50, color: '#16a34a', label: '≥50% coverage' },
            { value: 25, color: '#22c55e', label: '25-49% coverage' },
            { value: 10, color: '#4ade80', label: '10-24% coverage' },
            { value: 0, color: '#bbf7d0', label: '<10% coverage' },
          ],
        };
      
      case 'wetlands':
        return {
          title: 'WETLANDS',
          stops: [
            { value: 20, color: '#0891b2', label: '≥20% coverage' },
            { value: 10, color: '#06b6d4', label: '10-19% coverage' },
            { value: 5, color: '#22d3ee', label: '5-9% coverage' },
            { value: 0, color: '#a5f3fc', label: '<5% coverage' },
          ],
        };
      
      case 'threat-level':
        return {
          title: 'THREAT LEVEL',
          stops: [
            { value: 60, color: '#ef4444', label: 'High (≥60)' },
            { value: 30, color: '#f59e0b', label: 'Medium (30-59)' },
            { value: 0, color: '#10b981', label: 'Low (<30)' },
          ],
        };
      
      case 'nbsap-progress':
        return {
          title: 'NBSAP PROGRESS',
          stops: [
            { value: 90, color: '#86efac', label: '90-100% (Excellent)' },
            { value: 75, color: '#d9f99d', label: '75-89% (Good)' },
            { value: 50, color: '#fef3c7', label: '50-74% (Fair)' },
            { value: 25, color: '#fed7aa', label: '25-49% (Poor)' },
            { value: 0, color: '#fee2e2', label: '0-24% (Critical)' },
          ],
        };
      
      default:
        return {
          title: 'LEGEND',
          stops: [],
        };
    }
  };

  const legendData = getLegendData(activeLayer);

  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 12, right: 12 },
    'bottom-left': { bottom: 12, left: 12 },
    'top-right': { top: 12, right: 12 },
    'top-left': { top: 12, left: 12 },
  };

  return (
    <div
      role="region"
      aria-label="Map legend"
      style={{
        position: 'absolute',
        ...positionStyles[position],
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(4px)',
        borderRadius: 8,
        padding: isMobile ? '6px 10px' : '8px 12px',
        fontSize: isMobile ? '0.6rem' : '0.65rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        minWidth: isMobile ? 120 : 140,
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 5,
          color: 'var(--text-2)',
          fontFamily: "'DM Mono', monospace",
          fontSize: isMobile ? '0.6rem' : '0.65rem',
        }}
      >
        {legendData.title}
      </div>
      {legendData.stops.map((stop, index) => (
        <div
          key={`${stop.value}-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: isMobile ? 10 : 12,
              height: isMobile ? 10 : 12,
              borderRadius: 2,
              background: stop.color,
              flexShrink: 0,
              border: '1px solid rgba(0, 0, 0, 0.1)',
            }}
            aria-hidden="true"
          />
          <span style={{ color: 'var(--text-1)', fontFamily: "'DM Sans', sans-serif" }}>
            {stop.label}
          </span>
        </div>
      ))}
      {enabledOverlays && enabledOverlays.size > 0 && (
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-2)', fontFamily: "'DM Mono', monospace", fontSize: isMobile ? '0.55rem' : '0.6rem' }}>
            OVERLAYS
          </div>
          {OVERLAY_LEGEND.filter(o => enabledOverlays.has(o.id)).map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              {o.style === 'line' ? (
                <div style={{ width: isMobile ? 10 : 12, height: 3, borderRadius: 2, background: o.color, flexShrink: 0 }} />
              ) : o.style === 'dot' ? (
                <div style={{ width: isMobile ? 8 : 10, height: isMobile ? 8 : 10, borderRadius: '50%', background: o.color, opacity: 0.7, flexShrink: 0 }} />
              ) : (
                <div style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: 2, background: o.color, opacity: 0.35, border: `2px solid ${o.color}`, flexShrink: 0 }} />
              )}
              <span style={{ color: 'var(--text-1)', fontFamily: "'DM Sans', sans-serif" }}>{o.label}</span>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.6rem',
          color: 'var(--text-3)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Source: {activeLayer === 'biodiversity' || activeLayer === 'species-richness' ? 'GBIF' : 'geoBoundaries'}
      </div>
    </div>
  );
}

export default MapLegend;
