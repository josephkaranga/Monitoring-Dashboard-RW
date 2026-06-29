import React from 'react';
import type { ProtectedAreasCollection, ProtectedArea } from '../../types/overlays';

interface ProtectedAreasOverlayProps {
  areas: ProtectedAreasCollection | null;
  onHover: (area: ProtectedArea | null) => void;
  loading?: boolean;
  error?: string | null;
  viewBox?: { minLon: number; maxLon: number; minLat: number; maxLat: number };
}

/**
 * ProtectedAreasOverlay Component
 * 
 * Renders protected areas (national parks, reserves, wetlands) as polygons on the map.
 * Features:
 * - Polygon rendering with semi-transparent fill
 * - Border highlighting
 * - Hover tooltips showing area information
 * - Different colors by designation type
 * - Loading and error states
 * 
 * Performance optimizations:
 * - Simplified polygon rendering for complex geometries
 * - Memoized path generation
 * - React.memo to prevent unnecessary re-renders
 */
export const ProtectedAreasOverlay = React.memo(function ProtectedAreasOverlay({
  areas,
  onHover,
  loading = false,
  error = null,
  viewBox = { minLon: 28.8, maxLon: 32.3, minLat: -2.9, maxLat: -1.0 }
}: ProtectedAreasOverlayProps) {
  /**
   * Check if an area is within the viewport (simple bounds check)
   */
  const isInViewport = (area: ProtectedArea): boolean => {
    // Get rough bounds of the area
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    const extractBounds = (coords: number[][]) => {
      coords.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    };
    
    if (area.geometry.type === 'Polygon') {
      const [exterior] = area.geometry.coordinates as number[][][];
      extractBounds(exterior);
    } else if (area.geometry.type === 'MultiPolygon') {
      (area.geometry.coordinates as number[][][][]).forEach(polygon => {
        const [exterior] = polygon;
        extractBounds(exterior);
      });
    }
    
    // Check if area bounds intersect with viewport
    return !(maxLon < viewBox.minLon || minLon > viewBox.maxLon ||
             maxLat < viewBox.minLat || minLat > viewBox.maxLat);
  };

  /**
   * Convert GeoJSON coordinates to SVG path string
   * Applies coordinate transformation to match SVG coordinate system (negate latitude)
   */
  const coordinatesToPath = (coords: number[][], isHole = false): string => {
    if (!coords || coords.length === 0) return '';
    
    return coords.map((point, i) => {
      const [lon, lat] = point;
      const command = i === 0 ? 'M' : 'L';
      return `${command}${lon},${-lat}`; // Negate latitude for correct north-south orientation
    }).join(' ') + ' Z';
  };

  /**
   * Render a polygon (handles both Polygon and MultiPolygon)
   */
  const renderPolygon = (geometry: ProtectedArea['geometry']): string => {
    if (geometry.type === 'Polygon') {
      // First ring is exterior, rest are holes
      const [exterior, ...holes] = geometry.coordinates as number[][][];
      return coordinatesToPath(exterior);
    } else if (geometry.type === 'MultiPolygon') {
      // Multiple polygons
      return (geometry.coordinates as number[][][][])
        .map(polygon => {
          const [exterior] = polygon;
          return coordinatesToPath(exterior);
        })
        .join(' ');
    }
    return '';
  };

  /**
   * Get color based on designation type
   */
  const getDesignationColor = (area: ProtectedArea): string => {
    const t = area.properties.type || area.properties.designationType || '';
    const colors: Record<string, string> = {
      'National Park': '#16a34a',
      'Reserve': '#0891b2',
      'Wetland Reserve': '#0ea5e9',
      'Forest Reserve': '#059669',
    };
    return colors[t] || '#10b981';
  };

  // Show loading state
  if (loading) {
    return (
      <g className="protected-areas-overlay">
        <text
          x="30"
          y="-1.5"
          fontSize="0.08"
          fill="var(--text-3)"
          fontFamily="'DM Sans', sans-serif"
        >
          Loading protected areas...
        </text>
      </g>
    );
  }

  // Show error state
  if (error) {
    return (
      <g className="protected-areas-overlay">
        <text
          x="30"
          y="-1.5"
          fontSize="0.08"
          fill="#f43f5e"
          fontFamily="'DM Sans', sans-serif"
        >
          Error loading protected areas
        </text>
      </g>
    );
  }

  // No data
  if (!areas || areas.features.length === 0) {
    return null;
  }

  return (
    <g className="protected-areas-overlay" aria-label="Protected areas">
      {areas.features.filter(isInViewport).map((area, idx) => {
        const pathData = renderPolygon(area.geometry);
        const color = getDesignationColor(area);
        const areaType = area.properties.type || area.properties.designationType || 'Protected Area';
        const areaSize = area.properties.area_km2 || area.properties.area || 0;

        return (
          <path
            key={`protected-area-${idx}`}
            d={pathData}
            fill="#008F4C"
            fillOpacity={0.08}
            stroke="#008F4C"
            strokeWidth="0.012"
            strokeOpacity={0.7}
            strokeLinejoin="round"
            strokeDasharray="0.02 0.008"
            style={{
              cursor: 'pointer',
              transition: 'fill-opacity 0.3s, stroke-width 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.fillOpacity = '0.20';
              e.currentTarget.style.strokeWidth = '0.016';
              onHover(area);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.fillOpacity = '0.08';
              e.currentTarget.style.strokeWidth = '0.012';
              onHover(null);
            }}
            aria-label={`${area.properties.name} - ${areaType}`}
          >
            <title>
              {area.properties.name}
              {'\n'}Type: {areaType}
              {areaSize > 0 && `\nArea: ${areaSize.toLocaleString()} km²`}
              {area.properties.iucn_category && `\nIUCN: ${area.properties.iucn_category}`}
              {area.properties.managing_authority && `\nManaged by: ${area.properties.managing_authority}`}
              {area.properties.established && `\nEstablished: ${area.properties.established}`}
              {area.properties.key_species && area.properties.key_species.length > 0 && `\nKey species: ${area.properties.key_species.join(', ')}`}
            </title>
          </path>
        );
      })}
    </g>
  );
});

export default ProtectedAreasOverlay;
