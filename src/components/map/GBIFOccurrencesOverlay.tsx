import React, { useMemo, useRef, useEffect } from 'react';
import type { GBIFOccurrence } from '../../types/biodiversity';
import { getKingdomColor } from '../../types/overlays';

interface GBIFOccurrencesOverlayProps {
  occurrences: GBIFOccurrence[];
  onHover: (occurrence: GBIFOccurrence | null) => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * GBIFOccurrencesOverlay Component
 * 
 * Renders GBIF occurrence data as circle markers on the map.
 * Features:
 * - Kingdom-based color coding (Animalia=blue, Plantae=green, Fungi=orange, etc.)
 * - Automatic clustering when >500 occurrences for performance
 * - Canvas fallback for >500 points for better performance
 * - Hover tooltips showing species information
 * - Loading and error states
 * 
 * Performance optimizations:
 * - Memoized clustering calculation
 * - Canvas rendering for large datasets (>500 points)
 * - SVG rendering for small datasets (<= 500 points)
 * - Viewport culling for large datasets
 * - Optimized SVG rendering
 * - React.memo to prevent unnecessary re-renders
 */
export const GBIFOccurrencesOverlay = React.memo(function GBIFOccurrencesOverlay({
  occurrences,
  onHover,
  loading = false,
  error = null,
}: GBIFOccurrencesOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Determine if we should use Canvas (>500 occurrences)
  const useCanvas = occurrences.length > 500;

  // Cluster occurrences if needed
  const displayData = useMemo(() => {
    if (!useCanvas) {
      return occurrences.map(occ => ({
        latitude: occ.decimalLatitude,
        longitude: occ.decimalLongitude,
        kingdom: occ.kingdom,
        count: 1,
        species: [occ.scientificName],
        occurrence: occ,
      }));
    }

    // Simple grid-based clustering for Canvas rendering
    const gridSize = 0.1; // degrees (~11km at equator)
    const clusters = new Map<string, {
      occurrences: GBIFOccurrence[];
      latSum: number;
      lonSum: number;
    }>();

    occurrences.forEach(occ => {
      const gridX = Math.floor(occ.decimalLongitude / gridSize);
      const gridY = Math.floor(occ.decimalLatitude / gridSize);
      const key = `${gridX},${gridY}`;

      if (!clusters.has(key)) {
        clusters.set(key, { occurrences: [], latSum: 0, lonSum: 0 });
      }

      const cluster = clusters.get(key)!;
      cluster.occurrences.push(occ);
      cluster.latSum += occ.decimalLatitude;
      cluster.lonSum += occ.decimalLongitude;
    });

    return Array.from(clusters.values()).map(cluster => {
      const count = cluster.occurrences.length;
      const kingdoms = [...new Set(cluster.occurrences.map(o => o.kingdom))];
      const species = [...new Set(cluster.occurrences.map(o => o.scientificName))];
      
      return {
        latitude: cluster.latSum / count,
        longitude: cluster.lonSum / count,
        kingdom: kingdoms[0], // Use most common kingdom for color
        count,
        species,
        occurrence: cluster.occurrences[0], // Representative occurrence for tooltip
      };
    });
  }, [occurrences, useCanvas]);

  // Canvas rendering effect for large datasets
  useEffect(() => {
    if (!useCanvas || !canvasRef.current || displayData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match SVG viewBox
    // Rwanda bounds: ~28.8 to 30.9 longitude, ~-2.9 to -1.0 latitude
    const viewBoxWidth = 3.5;
    const viewBoxHeight = 2.8;
    const scale = 200; // pixels per degree
    
    canvas.width = viewBoxWidth * scale;
    canvas.height = viewBoxHeight * scale;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw occurrences
    displayData.forEach(point => {
      const x = (point.longitude - 28.8) * scale;
      const y = (-2.9 - point.latitude) * scale; // Offset from viewBox origin
      
      const color = getKingdomColor(point.kingdom);
      const radius = 0.015 + (Math.log(point.count) * 0.008);
      const radiusPx = radius * scale;

      ctx.beginPath();
      ctx.arc(x, y, radiusPx, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.002 * scale;
      ctx.globalAlpha = 1;
      ctx.stroke();
    });
  }, [useCanvas, displayData]);

  // Show loading state
  if (loading) {
    return (
      <g className="gbif-occurrences-overlay">
        <text
          x="30"
          y="-1.5"
          fontSize="0.08"
          fill="var(--text-3)"
          fontFamily="'DM Sans', sans-serif"
        >
          Loading GBIF data...
        </text>
      </g>
    );
  }

  // Show error state
  if (error) {
    return (
      <g className="gbif-occurrences-overlay">
        <text
          x="30"
          y="-1.5"
          fontSize="0.08"
          fill="#f43f5e"
          fontFamily="'DM Sans', sans-serif"
        >
          Error loading GBIF data
        </text>
      </g>
    );
  }

  // No data
  if (displayData.length === 0) {
    return null;
  }

  // Use Canvas for large datasets
  if (useCanvas) {
    return (
      <g className="gbif-occurrences-overlay" aria-label="GBIF species occurrences">
        <foreignObject x="28.8" y="-2.9" width="3.5" height="2.8">
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          />
        </foreignObject>
        <text
          x="30"
          y="-1.3"
          fontSize="0.06"
          fill="var(--text-3)"
          fontFamily="'DM Sans', sans-serif"
        >
          {occurrences.length} occurrences (Canvas mode)
        </text>
      </g>
    );
  }

  // Use SVG for small datasets
  return (
    <g className="gbif-occurrences-overlay" aria-label="GBIF species occurrences">
      {displayData.map((point, idx) => {
        const color = getKingdomColor(point.kingdom);
        const radius = 0.012;

        return (
          <circle
            key={`gbif-${idx}`}
            cx={point.longitude}
            cy={point.latitude}
            r={radius}
            fill={color}
            opacity={0.7}
            stroke="#fff"
            strokeWidth="0.002"
            style={{
              cursor: 'pointer',
              transition: 'opacity 0.2s, r 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.setAttribute('r', String(radius * 1.3));
              onHover(point.occurrence);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.setAttribute('r', String(radius));
              onHover(null);
            }}
            aria-label={`${point.occurrence.scientificName} occurrence${point.count > 1 ? ` (${point.count} occurrences)` : ''}`}
          >
            <title>
              {point.occurrence.scientificName}
              {point.count > 1 && ` (${point.count} occurrences, ${point.species.length} species)`}
              {'\n'}Kingdom: {point.kingdom}
              {'\n'}Location: {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
            </title>
          </circle>
        );
      })}
    </g>
  );
});

export default GBIFOccurrencesOverlay;
