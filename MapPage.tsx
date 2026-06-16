import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDistricts, useNBSAPProgress, useThreatLevels } from './useData';
import type { District } from './index';
import type { MapLayer } from './src/types/mapLayers';
import type { MapOverlay } from './src/types/overlays';
import { LayerSwitcher } from './src/components/map/LayerSwitcher';
import { OverlayToggles } from './src/components/map/OverlayToggles';
import { MapLegend } from './src/components/map/MapLegend';
import { GBIFOccurrencesOverlay } from './src/components/map/GBIFOccurrencesOverlay';
import { ProtectedAreasOverlay } from './src/components/map/ProtectedAreasOverlay';
import { RiverNetworkOverlay } from './src/components/map/RiverNetworkOverlay';
import { MapLoadingSkeleton } from './src/components/map/MapLoadingSkeleton';
import { ExportButton } from './src/components/map/ExportButton';
import { RefreshButton } from './src/components/map/RefreshButton';
import { useGBIFOccurrences } from './src/hooks/useGBIFOccurrences';
import { useProtectedAreas } from './src/hooks/useProtectedAreas';
import { useRiverNetwork } from './src/hooks/useRiverNetwork';
import { useBiodiversityData } from './src/hooks/useBiodiversityData';
import { logAuditEvent } from './dataService';
import type { GBIFOccurrence } from './src/types/biodiversity';
import type { ProtectedArea, RiverFeature } from './src/types/overlays';

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

// Color scale functions for each layer type
function getColor(
  d: District, 
  layer: MapLayer, 
  biodiversityData?: Map<number, any>,
  nbsapData?: Map<number, { progress: number; indicatorCount: number }>,
  threatData?: Map<number, { threatScore: number; threatLevel: 'high' | 'medium' | 'low'; riskFactors: string[] }>
): string {
  // Existing layers
  if (layer === 'submission') {
    return d.status === 'submitted' ? '#10b981' : d.status === 'pending' ? '#f59e0b' : '#f43f5e';
  }
  if (layer === 'compliance') {
    return d.compliance >= 85 ? '#10b981' : d.compliance >= 75 ? '#0ea5e9' : d.compliance >= 65 ? '#f59e0b' : '#f43f5e';
  }
  if (layer === 'forest') {
    return d.forest_cover >= 35 ? '#064e3b' : d.forest_cover >= 25 ? '#059669' : d.forest_cover >= 18 ? '#10b981' : '#6ee7b7';
  }
  
  // NBSAP Progress layer
  if (layer === 'nbsap-progress') {
    if (!nbsapData) return '#e2e8f0';
    const districtData = nbsapData.get(d.id);
    if (!districtData) return '#e2e8f0';
    
    const value = districtData.progress;
    if (value >= 90) return '#86efac'; // light green
    if (value >= 75) return '#d9f99d'; // lime
    if (value >= 50) return '#fef3c7'; // yellow
    if (value >= 25) return '#fed7aa'; // orange
    return '#fee2e2'; // red
  }
  
  // Threat Level layer
  if (layer === 'threat-level') {
    if (!threatData) return '#e2e8f0';
    const districtData = threatData.get(d.id);
    if (!districtData) return '#e2e8f0';
    
    if (districtData.threatLevel === 'high') return '#ef4444'; // red
    if (districtData.threatLevel === 'medium') return '#f59e0b'; // yellow
    return '#10b981'; // green (low threat)
  }
  
  // New biodiversity layers
  if (!biodiversityData) return '#e2e8f0'; // neutral color for no data
  
  const districtData = biodiversityData.get(d.id);
  if (!districtData) return '#e2e8f0';
  
  if (layer === 'biodiversity') {
    const value = districtData.biodiversityIndex || 0;
    if (value >= 90) return '#16a34a';
    if (value >= 80) return '#22c55e';
    if (value >= 60) return '#4ade80';
    if (value >= 40) return '#86efac';
    if (value >= 20) return '#bbf7d0';
    return '#f0fdf4';
  }
  
  if (layer === 'species-richness') {
    const value = districtData.speciesRichness || 0;
    if (value >= 100) return '#16a34a';
    if (value >= 50) return '#22c55e';
    if (value >= 25) return '#4ade80';
    if (value >= 10) return '#86efac';
    return '#bbf7d0';
  }
  
  if (layer === 'protected-areas') {
    const value = districtData.protectedAreaCoverage || 0;
    if (value >= 50) return '#16a34a';
    if (value >= 25) return '#22c55e';
    if (value >= 10) return '#4ade80';
    return '#bbf7d0';
  }
  
  if (layer === 'wetlands') {
    const value = districtData.wetlandCoverage || 0;
    if (value >= 20) return '#0891b2';
    if (value >= 10) return '#06b6d4';
    if (value >= 5) return '#22d3ee';
    return '#a5f3fc';
  }
  
  return '#e2e8f0';
}

// Get tooltip content based on active layer
function getTooltipContent(
  d: District, 
  layer: MapLayer, 
  biodiversityData?: Map<number, any>,
  nbsapData?: Map<number, { progress: number; indicatorCount: number }>,
  threatData?: Map<number, { threatScore: number; threatLevel: 'high' | 'medium' | 'low'; riskFactors: string[] }>
): string {
  const districtData = biodiversityData?.get(d.id);
  
  switch (layer) {
    case 'submission':
      return d.status;
    case 'compliance':
      return `${d.compliance}%`;
    case 'forest':
      return `${d.forest_cover}%`;
    case 'nbsap-progress': {
      const data = nbsapData?.get(d.id);
      return data ? `${data.progress}% (${data.indicatorCount} indicators)` : 'No data';
    }
    case 'threat-level': {
      const data = threatData?.get(d.id);
      if (!data) return 'No data';
      const levelText = data.threatLevel.charAt(0).toUpperCase() + data.threatLevel.slice(1);
      return `${levelText} threat (${data.threatScore}/100)`;
    }
    case 'biodiversity':
      return districtData ? `${districtData.biodiversityIndex}/100` : 'No data';
    case 'species-richness':
      return districtData ? `${districtData.speciesRichness} species` : 'No data';
    case 'protected-areas':
      return districtData ? `${districtData.protectedAreaCoverage?.toFixed(1)}% coverage` : 'No data';
    case 'wetlands':
      return districtData ? `${districtData.wetlandCoverage?.toFixed(1)}% coverage` : 'No data';
    default:
      return 'No data';
  }
}

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

export function MapPage() {
  const isMobile = useIsMobile();
  const { data: rawDistricts } = useDistricts();
  const districts: District[] = (rawDistricts as District[] | null) ?? [];
  
  // Load NBSAP Progress data
  const { data: nbsapProgressData, loading: nbsapLoading } = useNBSAPProgress();
  
  // Load Threat Level data
  const { data: threatLevelData, loading: threatLoading } = useThreatLevels();
  
  // Layer and overlay state
  const [layer, setLayer] = useState<MapLayer>('submission');
  const [enabledOverlays, setEnabledOverlays] = useState<Set<MapOverlay>>(new Set());
  
  // Mobile controls state
  const [controlsExpanded, setControlsExpanded] = useState(!isMobile);
  const [overlaysExpanded, setOverlaysExpanded] = useState(!isMobile);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{ d: District; x: number; y: number } | null>(null);
  
  // GeoJSON state
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load GBIF occurrences
  const { 
    occurrences, 
    loading: gbifLoading, 
    error: gbifError,
    lastUpdated: gbifLastUpdated,
    refresh: refreshGBIF 
  } = useGBIFOccurrences({ country: 'RW', limit: 5000, autoRefresh: true });
  
  // Load biodiversity data (depends on GBIF occurrences)
  const { data: biodiversityData, loading: biodivLoading } = useBiodiversityData({
    districts,
    occurrences,
    loading: gbifLoading
  });
  
  // Load protected areas (lazy - only when overlay is enabled)
  const { areas: protectedAreas, loading: areasLoading, error: areasError } = useProtectedAreas({
    enabled: enabledOverlays.has('protected-areas')
  });
  
  // Load river network (lazy - only when overlay is enabled)
  const { rivers, loading: riversLoading, error: riversError } = useRiverNetwork({
    enabled: enabledOverlays.has('rivers')
  });

  // Debounce timer refs for hover handlers
  const hoverDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Touch gesture state for pan and pinch zoom
  const [touchState, setTouchState] = useState<{
    isPanning: boolean;
    initialDistance: number | null;
    initialScale: number;
    scale: number;
    translateX: number;
    translateY: number;
  }>({
    isPanning: false,
    initialDistance: null,
    initialScale: 1,
    scale: 1,
    translateX: 0,
    translateY: 0
  });
  
  // Touch gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setTouchState(prev => ({
        ...prev,
        initialDistance: distance,
        initialScale: prev.scale
      }));
    } else if (e.touches.length === 1) {
      // Pan
      setTouchState(prev => ({
        ...prev,
        isPanning: true
      }));
    }
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && touchState.initialDistance) {
      // Pinch zoom
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const scale = (distance / touchState.initialDistance) * touchState.initialScale;
      setTouchState(prev => ({
        ...prev,
        scale: Math.max(0.5, Math.min(3, scale)) // Limit zoom between 0.5x and 3x
      }));
    }
  }, [touchState.initialDistance, touchState.initialScale]);
  
  const handleTouchEnd = useCallback(() => {
    setTouchState(prev => ({
      ...prev,
      isPanning: false,
      initialDistance: null,
      initialScale: prev.scale
    }));
  }, []);
  
  // Debounced hover handlers (300ms delay)
  const debouncedHover = useCallback((callback: () => void, delay: number = 300) => {
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }
    hoverDebounceRef.current = setTimeout(callback, delay);
  }, []);
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (hoverDebounceRef.current) {
        clearTimeout(hoverDebounceRef.current);
      }
    };
  }, []);
  
  // Toggle overlay
  const toggleOverlay = useCallback((overlayId: MapOverlay) => {
    setEnabledOverlays(prev => {
      const next = new Set(prev);
      if (next.has(overlayId)) {
        next.delete(overlayId);
      } else {
        next.add(overlayId);
      }
      return next;
    });
  }, []);
  
  // Handle overlay hover events with debouncing
  const handleGBIFHover = useCallback((occurrence: GBIFOccurrence | null) => {
    debouncedHover(() => {
      // Tooltip is handled by the overlay component itself
      // This is just a placeholder for future enhancements
    });
  }, [debouncedHover]);
  
  const handleProtectedAreaHover = useCallback((area: ProtectedArea | null) => {
    debouncedHover(() => {
      // Tooltip is handled by the overlay component itself
      // This is just a placeholder for future enhancements
    });
  }, [debouncedHover]);
  
  const handleRiverHover = useCallback((river: RiverFeature | null) => {
    debouncedHover(() => {
      // Tooltip is handled by the overlay component itself
      // This is just a placeholder for future enhancements
    });
  }, [debouncedHover]);
  
  // Prepare overlay toggle configs
  const overlayConfigs = useMemo(() => [
    {
      id: 'gbif' as MapOverlay,
      label: 'GBIF Occurrences',
      enabled: enabledOverlays.has('gbif'),
      loading: gbifLoading,
      error: gbifError
    },
    {
      id: 'protected-areas' as MapOverlay,
      label: 'Protected Area Borders',
      enabled: enabledOverlays.has('protected-areas'),
      loading: areasLoading,
      error: areasError
    },
    {
      id: 'rivers' as MapOverlay,
      label: 'River Network',
      enabled: enabledOverlays.has('rivers'),
      loading: riversLoading,
      error: riversError
    }
  ], [enabledOverlays, gbifLoading, gbifError, areasLoading, areasError, riversLoading, riversError]);

  // Export error state
  const [exportError, setExportError] = useState<string | null>(null);

  // Generate descriptive filename with layer and timestamp
  const generateFilename = useCallback((extension: 'png' | 'csv'): string => {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const layerName = layer.replace(/-/g, '_');
    return `rwanda-biodiversity-${layerName}-${timestamp}.${extension}`;
  }, [layer]);

  // Export map as PNG (sub-tasks 13.2, 13.4, 13.6, 13.7)
  const exportMapAsPNG = useCallback(async () => {
    try {
      setExportError(null);
      
      // Find the SVG element
      const svgElement = document.querySelector('svg[viewBox]') as SVGElement;
      if (!svgElement) {
        throw new Error('Map SVG not found');
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Get SVG dimensions
      const viewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number);
      if (!viewBox || viewBox.length !== 4) {
        throw new Error('Invalid SVG viewBox');
      }
      
      const [minX, minY, width, height] = viewBox;
      const scale = 4; // Higher resolution for better quality
      const canvasWidth = Math.abs(width) * scale * 100;
      const canvasHeight = Math.abs(height) * scale * 100;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Serialize SVG to string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);
      
      // Add XML namespace if not present
      if (!svgString.includes('xmlns')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Create blob and object URL
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      // Load image and draw to canvas
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        // Convert canvas to PNG and download
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            setExportError('Failed to generate PNG image');
            return;
          }
          
          const pngUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement('a');
          link.download = generateFilename('png');
          link.href = pngUrl;
          link.click();
          
          // Cleanup
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
          
          // Log audit event
          logAuditEvent('export_map_png', {
            layer,
            filename: generateFilename('png'),
            timestamp: new Date().toISOString()
          });
        }, 'image/png');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setExportError('Failed to load SVG for export');
      };
      
      img.src = url;
    } catch (error) {
      console.error('Export PNG error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export map as PNG');
    }
  }, [layer, generateFilename]);

  // Export data as CSV (sub-tasks 13.3, 13.4, 13.6, 13.7)
  const exportDataAsCSV = useCallback(async () => {
    try {
      setExportError(null);
      
      if (districts.length === 0) {
        throw new Error('No district data available');
      }

      // Prepare CSV headers
      const headers = [
        'District',
        'Province',
        'Layer Value',
        'Biodiversity Index',
        'Species Richness',
        'Forest Cover (%)',
        'Compliance (%)',
        'Status'
      ];

      // Prepare CSV rows
      const rows = districts.map(d => {
        const districtData = biodiversityData?.get(d.id);
        const nbsapData = nbsapProgressData?.get(d.id);
        const threatData = threatLevelData?.get(d.id);
        
        // Get layer-specific value
        let layerValue = '';
        switch (layer) {
          case 'submission':
            layerValue = d.status;
            break;
          case 'compliance':
            layerValue = `${d.compliance}%`;
            break;
          case 'forest':
            layerValue = `${d.forest_cover}%`;
            break;
          case 'biodiversity':
            layerValue = districtData ? `${districtData.biodiversityIndex}/100` : 'N/A';
            break;
          case 'species-richness':
            layerValue = districtData ? `${districtData.speciesRichness}` : 'N/A';
            break;
          case 'nbsap-progress':
            layerValue = nbsapData ? `${nbsapData.progress}%` : 'N/A';
            break;
          case 'threat-level':
            layerValue = threatData ? threatData.threatLevel : 'N/A';
            break;
          case 'protected-areas':
            layerValue = districtData?.protectedAreaCoverage 
              ? `${districtData.protectedAreaCoverage.toFixed(1)}%` 
              : 'N/A';
            break;
          case 'wetlands':
            layerValue = districtData?.wetlandCoverage 
              ? `${districtData.wetlandCoverage.toFixed(1)}%` 
              : 'N/A';
            break;
          default:
            layerValue = 'N/A';
        }

        return [
          d.name,
          d.province?.name || 'N/A',
          layerValue,
          districtData?.biodiversityIndex?.toString() || 'N/A',
          districtData?.speciesRichness?.toString() || 'N/A',
          d.forest_cover?.toString() || 'N/A',
          d.compliance?.toString() || 'N/A',
          d.status
        ];
      });

      // Add metadata header
      const metadata = [
        ['Rwanda Biodiversity Map Export'],
        [`Layer: ${layer}`],
        [`Export Date: ${new Date().toISOString()}`],
        [`Total Districts: ${districts.length}`],
        [], // Empty row separator
      ];

      // Combine metadata, headers, and rows
      const csvContent = [
        ...metadata.map(row => row.join(',')),
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = generateFilename('csv');
      link.href = url;
      link.click();
      
      // Cleanup
      URL.revokeObjectURL(url);
      
      // Log audit event
      await logAuditEvent('export_data_csv', {
        layer,
        filename: generateFilename('csv'),
        rowCount: districts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Export CSV error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export data as CSV');
    }
  }, [districts, layer, biodiversityData, nbsapProgressData, threatLevelData, generateFilename]);

  // Clear export error after 5 seconds
  useEffect(() => {
    if (exportError) {
      const timer = setTimeout(() => setExportError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [exportError]);

  useEffect(() => {
    // Fetch Rwanda district boundaries from local GeoJSON file
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch from local public folder (no CORS issues)
        const response = await fetch('/rwanda-districts.geojson');
        if (!response.ok) throw new Error('Failed to load district boundaries');
        
        const geoJson = await response.json();
        
        // If the file is empty (placeholder), create mock data
        if (!geoJson.features || geoJson.features.length === 0) {
          // Create a simple mock map showing districts as rectangles in a grid
          const mockGeoData: GeoJSONData = {
            type: 'FeatureCollection',
            features: districts.map((district, idx) => ({
              type: 'Feature',
              properties: {
                shapeName: district.name,
                shapeISO: 'RW',
                shapeID: String(district.id),
                shapeGroup: 'RWA',
                shapeType: 'ADM2'
              },
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  // Create a simple rectangle for each district in a 6x5 grid
                  [29 + (idx % 6) * 0.5, -1 - Math.floor(idx / 6) * 0.4],
                  [29.5 + (idx % 6) * 0.5, -1 - Math.floor(idx / 6) * 0.4],
                  [29.5 + (idx % 6) * 0.5, -1.4 - Math.floor(idx / 6) * 0.4],
                  [29 + (idx % 6) * 0.5, -1.4 - Math.floor(idx / 6) * 0.4],
                  [29 + (idx % 6) * 0.5, -1 - Math.floor(idx / 6) * 0.4]
                ]]
              }
            }))
          };
          setGeoData(mockGeoData);
        } else {
          setGeoData(geoJson);
        }
      } catch (err) {
        console.error('Error loading map data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
      } finally {
        setLoading(false);
      }
    };

    if (districts.length > 0) {
      fetchGeoData();
    }
  }, [districts]);

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
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', 
        gap: 16, 
        marginBottom: 16 
      }}>
        {/* Map */}
        <div style={{ ...card, padding: isMobile ? 12 : 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700 }}>
              <i className="fa-solid fa-map-location-dot" style={{ color: 'var(--sky-dim)' }} />
              Rwanda Biodiversity Map
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {isMobile ? (
                <>
                  {/* Mobile: Collapsible controls */}
                  <button
                    onClick={() => setControlsExpanded(!controlsExpanded)}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 7,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 44,
                      minHeight: 44
                    }}
                  >
                    <i className={`fa-solid fa-${controlsExpanded ? 'chevron-up' : 'chevron-down'}`} />
                    Controls
                  </button>
                  {controlsExpanded && (
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: 12,
                      background: 'var(--surface-2)',
                      borderRadius: 7,
                      border: '1px solid var(--border)'
                    }}>
                      <LayerSwitcher activeLayer={layer} onLayerChange={setLayer} isMobile={isMobile} />
                      <button
                        onClick={() => setOverlaysExpanded(!overlaysExpanded)}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 7,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minWidth: 44,
                          minHeight: 44
                        }}
                      >
                        <span>Overlays</span>
                        <i className={`fa-solid fa-${overlaysExpanded ? 'chevron-up' : 'chevron-down'}`} />
                      </button>
                      {overlaysExpanded && (
                        <OverlayToggles overlays={overlayConfigs} onToggle={toggleOverlay} isMobile={isMobile} />
                      )}
                      <RefreshButton 
                        onRefresh={refreshGBIF}
                        loading={gbifLoading}
                        lastUpdated={gbifLastUpdated}
                        isMobile={isMobile}
                      />
                      <ExportButton 
                        onExportPNG={exportMapAsPNG}
                        onExportCSV={exportDataAsCSV}
                        disabled={loading || !!error}
                        isMobile={isMobile}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Desktop: Inline controls */}
                  <LayerSwitcher activeLayer={layer} onLayerChange={setLayer} isMobile={isMobile} />
                  <OverlayToggles overlays={overlayConfigs} onToggle={toggleOverlay} isMobile={isMobile} />
                  <RefreshButton 
                    onRefresh={refreshGBIF}
                    loading={gbifLoading}
                    lastUpdated={gbifLastUpdated}
                    isMobile={isMobile}
                  />
                  <ExportButton 
                    onExportPNG={exportMapAsPNG}
                    onExportCSV={exportDataAsCSV}
                    disabled={loading || !!error}
                    isMobile={isMobile}
                  />
                </>
              )}
            </div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 400 }}>
            {loading && <MapLoadingSkeleton />}
            
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
            
            {/* Export error notification */}
            {exportError && (
              <div style={{
                position: 'absolute',
                top: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: 7,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                zIndex: 1000,
                maxWidth: isMobile ? '90%' : '400px',
                boxShadow: 'var(--shadow-md)'
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ color: '#dc2626' }} />
                <div style={{ fontSize: '0.8rem', color: '#991b1b', flex: 1 }}>
                  {exportError}
                </div>
                <button
                  onClick={() => setExportError(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    color: '#991b1b'
                  }}
                  aria-label="Close error message"
                >
                  <i className="fa-solid fa-times" />
                </button>
              </div>
            )}
            
            {!loading && !error && geoData && (
              <svg 
                viewBox="28.8 -2.9 3.5 2.8" 
                style={{ 
                  width: '100%', 
                  height: isMobile ? 300 : 400, 
                  cursor: touchState.isPanning ? 'grabbing' : 'pointer',
                  touchAction: 'none' // Prevent default touch behaviors
                }} 
                preserveAspectRatio="xMidYMid meet"
                onTouchStart={isMobile ? handleTouchStart : undefined}
                onTouchMove={isMobile ? handleTouchMove : undefined}
                onTouchEnd={isMobile ? handleTouchEnd : undefined}
              >
                <g transform={isMobile ? `scale(${touchState.scale})` : undefined}>
                <rect x="28.8" y="-2.9" width="3.5" height="2.8" fill="#f0f9ff" />
                
                {/* District base layer */}
                {geoData.features.map((feature, idx) => {
                  const districtData = getDistrictData(feature.properties.shapeName);
                  const color = districtData ? getColor(districtData, layer, biodiversityData, nbsapProgressData, threatLevelData) : '#e2e8f0';
                  
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
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'opacity 0.3s, fill 0.4s',
                      }}
                      onMouseEnter={(e) => {
                        if (districtData) {
                          e.currentTarget.style.opacity = '1';
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
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.88';
                        setTooltip(null);
                      }}
                    />
                  );
                })}
                
                {/* Protected Areas Overlay */}
                {enabledOverlays.has('protected-areas') && protectedAreas && (
                  <ProtectedAreasOverlay 
                    areas={protectedAreas} 
                    onHover={handleProtectedAreaHover}
                    loading={areasLoading}
                    error={areasError}
                  />
                )}
                
                {/* River Network Overlay */}
                {enabledOverlays.has('rivers') && rivers && (
                  <RiverNetworkOverlay 
                    rivers={rivers} 
                    onHover={handleRiverHover}
                    loading={riversLoading}
                    error={riversError}
                  />
                )}
                
                {/* GBIF Occurrences Overlay */}
                {enabledOverlays.has('gbif') && occurrences.length > 0 && (
                  <GBIFOccurrencesOverlay 
                    occurrences={occurrences} 
                    onHover={handleGBIFHover}
                    loading={gbifLoading}
                    error={gbifError}
                  />
                )}
                </g>
              </svg>
            )}
            
            {tooltip && (
              <div style={{ 
                position: 'absolute', 
                background: 'rgba(15,39,68,0.9)', 
                color: '#fff', 
                padding: isMobile ? '4px 8px' : '6px 10px', 
                borderRadius: 7, 
                fontSize: isMobile ? '0.65rem' : '0.7rem', 
                pointerEvents: 'none', 
                top: tooltip.y - 50, 
                left: `${tooltip.x}%`, 
                transform: 'translateX(-50%)', 
                zIndex: 10, 
                whiteSpace: 'nowrap', 
                backdropFilter: 'blur(4px)',
                maxWidth: isMobile ? '150px' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                <strong>{tooltip.d.name}</strong>
                {!isMobile && (
                  <>
                    <br />
                    {tooltip.d.province?.name} Province
                  </>
                )}
                <br />
                {getTooltipContent(tooltip.d, layer, biodiversityData, nbsapProgressData, threatLevelData)}
              </div>
            )}
            
            {/* Legend */}
            {!loading && !error && (
              <MapLegend activeLayer={layer} position="bottom-right" isMobile={isMobile} />
            )}
          </div>
        </div>

        {/* District list */}
        <div style={{ ...card, padding: isMobile ? 12 : 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-table-cells" style={{ color: 'var(--sky-dim)' }} />
            District Summary
          </div>
          <div style={{ maxHeight: isMobile ? 300 : 400, overflowY: 'auto' }}>
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
      <div style={{ ...card, padding: isMobile ? 12 : 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-chart-bar" style={{ color: 'var(--sky-dim)' }} />
          District Reporting by Province
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 12 }}>
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
