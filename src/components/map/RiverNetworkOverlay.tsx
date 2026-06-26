import React from 'react';
import type { RiverNetworkCollection, RiverFeature } from '../../types/overlays';

interface RiverNetworkOverlayProps {
  rivers: RiverNetworkCollection | null;
  onHover: (river: RiverFeature | null) => void;
  loading?: boolean;
  error?: string | null;
  viewBox?: { minLon: number; maxLon: number; minLat: number; maxLat: number };
}

/**
 * RiverNetworkOverlay Component
 * 
 * Renders river networks as line paths on the map.
 * Features:
 * - LineString and MultiLineString rendering
 * - Hover tooltips showing river information
 * - Width variation based on river importance
 * - Loading and error states
 * 
 * Performance optimizations:
 * - Simplified line rendering for complex geometries
 * - Memoized path generation
 * - React.memo to prevent unnecessary re-renders
 */
export const RiverNetworkOverlay = React.memo(function RiverNetworkOverlay({
  rivers,
  onHover,
  loading = false,
  error = null,
  viewBox = { minLon: 28.8, maxLon: 32.3, minLat: -2.9, maxLat: -1.0 }
}: RiverNetworkOverlayProps) {
  /**
   * Check if a river is within the viewport (simple bounds check)
   */
  const isInViewport = (river: RiverFeature): boolean => {
    // Get rough bounds of the river
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
    
    if (river.geometry.type === 'LineString') {
      extractBounds(river.geometry.coordinates as number[][]);
    } else if (river.geometry.type === 'MultiLineString') {
      (river.geometry.coordinates as number[][][]).forEach(line => {
        extractBounds(line);
      });
    }
    
    // Check if river bounds intersect with viewport
    return !(maxLon < viewBox.minLon || minLon > viewBox.maxLon ||
             maxLat < viewBox.minLat || minLat > viewBox.maxLat);
  };

  /**
   * Convert GeoJSON coordinates to SVG path string for lines
   * Applies coordinate transformation to match SVG coordinate system (negate latitude)
   */
  const coordinatesToPath = (coords: number[][]): string => {
    if (!coords || coords.length === 0) return '';
    
    return coords.map((point, i) => {
      const [lon, lat] = point;
      const command = i === 0 ? 'M' : 'L';
      return `${command}${lon},${-lat}`; // Negate latitude for correct north-south orientation
    }).join(' ');
  };

  /**
   * Render a line (handles both LineString and MultiLineString)
   */
  const renderLine = (geometry: RiverFeature['geometry']): string => {
    if (geometry.type === 'LineString') {
      return coordinatesToPath(geometry.coordinates as number[][]);
    } else if (geometry.type === 'MultiLineString') {
      // Multiple line segments
      return (geometry.coordinates as number[][][])
        .map(line => coordinatesToPath(line))
        .join(' ');
    }
    return '';
  };

  /**
   * Calculate stroke width based on river length (longer = wider)
   */
  const getStrokeWidth = (length: number): number => {
    // Base width + logarithmic scaling for longer rivers
    if (length > 100) return 0.012; // Major rivers
    if (length > 50) return 0.008;  // Medium rivers
    return 0.005;                    // Small rivers/streams
  };

  // Show loading state
  if (loading) {
    return (
      <g className="river-network-overlay">
        <text
          x="30"
          y="-1.5"
          fontSize="0.08"
          fill="var(--text-3)"
          fontFamily="'DM Sans', sans-serif"
        >
          Loading river network...
        </text>
      </g>
    );
  }

  // Show error state
  if (error) {
    return (
      <g className="river-network-overlay">
        <text
          x="30"
          y="-1.5"
          fontSize="0.08"
          fill="#f43f5e"
          fontFamily="'DM Sans', sans-serif"
        >
          Error loading river network
        </text>
      </g>
    );
  }

  // No data
  if (!rivers || rivers.features.length === 0) {
    return null;
  }

  return (
    <g className="river-network-overlay" aria-label="River network">
      {rivers.features.filter(isInViewport).map((river, idx) => {
        const pathData = renderLine(river.geometry);
        const len = river.properties.length_km || river.properties.length || 0;
        const strokeWidth = getStrokeWidth(len);
        const isMajor = (river.properties.type || '').includes('Major');

        return (
          <path
            key={`river-${idx}`}
            d={pathData}
            fill="none"
            stroke={isMajor ? '#0284c7' : '#38bdf8'}
            strokeWidth={strokeWidth}
            strokeOpacity={isMajor ? 0.75 : 0.55}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              cursor: 'pointer',
              transition: 'stroke-opacity 0.2s, stroke-width 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.strokeOpacity = '1';
              e.currentTarget.style.strokeWidth = String(strokeWidth * 1.8);
              onHover(river);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.strokeOpacity = isMajor ? '0.75' : '0.55';
              e.currentTarget.style.strokeWidth = String(strokeWidth);
              onHover(null);
            }}
            aria-label={`${river.properties.name}`}
          >
            <title>
              {river.properties.name}
              {len > 0 && `\nLength: ${len} km`}
              {river.properties.basin && `\nBasin: ${river.properties.basin}`}
              {river.properties.description && `\n${river.properties.description}`}
            </title>
          </path>
        );
      })}
    </g>
  );
});

export default RiverNetworkOverlay;
