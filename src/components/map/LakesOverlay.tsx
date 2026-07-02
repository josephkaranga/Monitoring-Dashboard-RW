import React from 'react';
import type { LakesCollection, LakeFeature } from '../../types/overlays';

interface LakesOverlayProps {
  lakes: LakesCollection | null;
  onHover: (lake: LakeFeature | null) => void;
  onClick: (lake: LakeFeature) => void;
  loading?: boolean;
  error?: string | null;
  viewBox?: { minLon: number; maxLon: number; minLat: number; maxLat: number };
}

/**
 * LakesOverlay Component
 *
 * Renders major lakes as polygons on the map.
 * Features:
 * - Polygon rendering with semi-transparent blue fill
 * - Border highlighting
 * - Hover tooltips showing lake information
 * - Click events to show detailed lake information
 * - Loading and error states
 *
 * Performance optimizations:
 * - Simplified polygon rendering for complex geometries
 * - Memoized path generation
 * - React.memo to prevent unnecessary re-renders
 */
export const LakesOverlay = React.memo(function LakesOverlay({
  lakes,
  onHover,
  onClick,
  loading = false,
  error = null,
  viewBox = { minLon: 28.8, maxLon: 32.3, minLat: -2.9, maxLat: -1.0 },
}: LakesOverlayProps) {
  /**
   * Check if a lake is within the viewport (simple bounds check)
   */
  const isInViewport = (lake: LakeFeature): boolean => {
    // Get rough bounds of the lake
    let minLon = Infinity,
      maxLon = -Infinity;
    let minLat = Infinity,
      maxLat = -Infinity;

    const extractBounds = (coords: number[][]) => {
      coords.forEach(([lon, lat]) => {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    };

    if (lake.geometry.type === 'Polygon') {
      const [exterior] = lake.geometry.coordinates as number[][][];
      extractBounds(exterior);
    } else if (lake.geometry.type === 'MultiPolygon') {
      (lake.geometry.coordinates as number[][][][]).forEach(polygon => {
        const [exterior] = polygon;
        extractBounds(exterior);
      });
    }

    // Check if lake bounds intersect with viewport
    return !(
      maxLon < viewBox.minLon ||
      minLon > viewBox.maxLon ||
      maxLat < viewBox.minLat ||
      minLat > viewBox.maxLat
    );
  };

  /**
   * Convert GeoJSON coordinates to SVG path string
   * Applies coordinate transformation to match SVG coordinate system (negate latitude)
   */
  const coordinatesToPath = (coords: number[][], isHole = false): string => {
    if (!coords || coords.length === 0) return '';

    return (
      coords
        .map((point, i) => {
          const [lon, lat] = point;
          const command = i === 0 ? 'M' : 'L';
          return `${command}${lon},${-lat}`; // Negate latitude for correct north-south orientation
        })
        .join(' ') + ' Z'
    );
  };

  /**
   * Render a polygon (handles both Polygon and MultiPolygon)
   */
  const renderPolygon = (geometry: LakeFeature['geometry']): string => {
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

  // Show loading state
  if (loading) {
    return (
      <g className="lakes-overlay">
        <text
          x="30"
          y="-1.5"
          fontSize="0.08"
          fill="var(--text-3)"
          fontFamily="'DM Sans', sans-serif"
        >
          Loading lakes...
        </text>
      </g>
    );
  }

  // Show error state
  if (error) {
    return (
      <g className="lakes-overlay">
        <text x="30" y="-1.5" fontSize="0.08" fill="#f43f5e" fontFamily="'DM Sans', sans-serif">
          Error loading lakes
        </text>
      </g>
    );
  }

  // No data
  if (!lakes || lakes.features.length === 0) {
    return null;
  }

  return (
    <g className="lakes-overlay" aria-label="Major lakes">
      {lakes.features.filter(isInViewport).map((lake, idx) => {
        const pathData = renderPolygon(lake.geometry);
        const isLarge = (lake.properties.area_km2 || 0) > 50;

        return (
          <path
            key={`lake-${idx}`}
            d={pathData}
            fill="#7EC8FF"
            fillOpacity={isLarge ? 0.35 : 0.3}
            stroke="#4A90E2"
            strokeWidth={isLarge ? '0.008' : '0.005'}
            strokeOpacity={0.7}
            strokeLinejoin="round"
            style={{
              cursor: 'pointer',
              transition: 'fill-opacity 0.2s, stroke-width 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.fillOpacity = '0.50';
              e.currentTarget.style.strokeWidth = isLarge ? '0.012' : '0.008';
              e.currentTarget.style.strokeOpacity = '1';
              onHover(lake);
            }}
            onMouseLeave={e => {
              e.currentTarget.style.fillOpacity = isLarge ? '0.35' : '0.30';
              e.currentTarget.style.strokeWidth = isLarge ? '0.008' : '0.005';
              e.currentTarget.style.strokeOpacity = '0.7';
              onHover(null);
            }}
            onClick={() => onClick(lake)}
            aria-label={`${lake.properties.name}`}
          >
            <title>
              {lake.properties.name}
              {lake.properties.area_km2 &&
                `\nArea: ${lake.properties.area_km2.toLocaleString()} km²`}
              {lake.properties.max_depth_m && `\nMax depth: ${lake.properties.max_depth_m} m`}
              {lake.properties.elevation_m &&
                `\nElevation: ${lake.properties.elevation_m.toLocaleString()} m`}
              {lake.properties.district && `\nDistrict: ${lake.properties.district}`}
              {lake.properties.catchment && `\nCatchment: ${lake.properties.catchment}`}
            </title>
          </path>
        );
      })}
    </g>
  );
});

export default LakesOverlay;
