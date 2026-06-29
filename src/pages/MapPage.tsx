import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDistricts, useNBSAPProgress, useThreatLevels, useReports } from '../hooks/useData';
import type { District, ToolkitReport } from '../types/index';
import type { MapLayer } from '../types/mapLayers';
import type { MapOverlay } from '../types/overlays';
import { LayerSwitcher } from '../components/map/LayerSwitcher';
import { OverlayToggles } from '../components/map/OverlayToggles';
import { MapLegend } from '../components/map/MapLegend';
import { GBIFOccurrencesOverlay } from '../components/map/GBIFOccurrencesOverlay';
import { ProtectedAreasOverlay } from '../components/map/ProtectedAreasOverlay';
import { RiverNetworkOverlay } from '../components/map/RiverNetworkOverlay';
import { LakesOverlay } from '../components/map/LakesOverlay';
import { ReportMarkersOverlay } from '../components/map/ReportMarkersOverlay';
import { TimeSlider } from '../components/map/TimeSlider';
import { MapLoadingSkeleton } from '../components/map/MapLoadingSkeleton';
import { ExportButton } from '../components/map/ExportButton';
import { RefreshButton } from '../components/map/RefreshButton';
import { DistrictDetailPanel } from '../components/map/DistrictDetailPanel';
import { useGBIFOccurrences } from '../hooks/useGBIFOccurrences';
import { useProtectedAreas } from '../hooks/useProtectedAreas';
import { useRiverNetwork } from '../hooks/useRiverNetwork';
import { useLakes } from '../hooks/useLakes';
import { useBiodiversityData } from '../hooks/useBiodiversityData';
import { logAuditEvent } from '../services/dataService';
import { eventBus } from '../services/eventBus';
import type { GBIFOccurrence } from '../types/biodiversity';
import type { ProtectedArea, RiverFeature, LakeFeature } from '../types/overlays';

// Rwanda Geographic Bounding Box (WGS84 coordinates)
// Source: Natural Earth Data and OpenStreetMap
const RWANDA_BOUNDS = {
  minLon: 28.8617546,  // Western border (Lake Kivu region)
  maxLon: 30.8990738,  // Eastern border (Tanzania border)
  minLat: -2.8389804,  // Southern border (Burundi border)
  maxLat: -1.0474083   // Northern border (Uganda border)
};

// Calculate viewBox dimensions for proper map orientation
// SVG coordinate system: Y increases downward, but latitude increases upward
// To display Rwanda correctly (north at top), we need to invert the Y-axis
const RWANDA_VIEWBOX = {
  x: RWANDA_BOUNDS.minLon,
  y: -RWANDA_BOUNDS.maxLat,  // Negative of maxLat for correct north-south orientation
  width: RWANDA_BOUNDS.maxLon - RWANDA_BOUNDS.minLon,  // ~2.037 degrees
  height: RWANDA_BOUNDS.maxLat - RWANDA_BOUNDS.minLat  // ~1.792 degrees (always positive)
};

/**
 * Validates that GeoJSON coordinates fall within Rwanda's bounding box
 * This ensures the map displays with correct geographic orientation
 */
function validateGeoJSONCoordinates(geoData: GeoJSONData): boolean {
  try {
    for (const feature of geoData.features) {
      const coords = feature.geometry.coordinates;
      
      // Check a sample of coordinates from each feature
      const checkCoords = (coordArray: any): boolean => {
        if (Array.isArray(coordArray)) {
          if (typeof coordArray[0] === 'number' && typeof coordArray[1] === 'number') {
            const [lon, lat] = coordArray;
            // Validate coordinates are within Rwanda bounds
            if (lon < RWANDA_BOUNDS.minLon || lon > RWANDA_BOUNDS.maxLon ||
                lat < RWANDA_BOUNDS.minLat || lat > RWANDA_BOUNDS.maxLat) {
              console.warn(`Coordinate out of bounds: [${lon}, ${lat}]`);
              return false;
            }
            return true;
          } else {
            // Recursively check nested arrays
            return coordArray.every(checkCoords);
          }
        }
        return true;
      };
      
      if (!checkCoords(coords)) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error validating GeoJSON coordinates:', error);
    return false;
  }
}

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
  const { data: rawDistricts, refetch: refetchDistricts } = useDistricts();
  const districts: District[] = (rawDistricts as District[] | null) ?? [];

  // Load NBSAP Progress data
  const { data: nbsapProgressData, loading: nbsapLoading, refetch: refetchNBSAP } = useNBSAPProgress();

  // Load Threat Level data
  const { data: threatLevelData, loading: threatLoading, refetch: refetchThreat } = useThreatLevels();

  // ── Layer refresh listeners ───────────────────────────────────
  // T02 district report → refresh submission / compliance / forest layers
  useEffect(() => {
    return eventBus.on('district-status-updated', () => {
      refetchDistricts();
    });
  }, [refetchDistricts]);

  // Any report approved → refresh district data (submission & compliance layers)
  useEffect(() => {
    return eventBus.on('dashboard-refresh', () => {
      refetchDistricts();
    });
  }, [refetchDistricts]);

  // Target progress change → refresh NBSAP progress layer
  useEffect(() => {
    return eventBus.on('target-progress-updated', () => {
      refetchNBSAP();
      refetchThreat();
    });
  }, [refetchNBSAP, refetchThreat]);
  
  // Layer and overlay state
  const [layer, setLayer] = useState<MapLayer>('biodiversity');
  const [enabledOverlays, setEnabledOverlays] = useState<Set<MapOverlay>>(new Set());
  
  // Mobile controls state
  const [controlsExpanded, setControlsExpanded] = useState(!isMobile);
  const [overlaysExpanded, setOverlaysExpanded] = useState(!isMobile);
  
  // Tooltip state
  const [tooltip, setTooltip] = useState<{ d: District; x: number; y: number } | null>(null);
  
  // Selected district state for detail panel
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Report overlay data
  const { reports: allReports, loading: reportsLoading } = useReports({ status: 'approved', pageSize: 500 });
  const [selectedMapReport, setSelectedMapReport] = useState<ToolkitReport | null>(null);
  const [hoveredReport, setHoveredReport] = useState<ToolkitReport | null>(null);

  // Time filter
  const reportDateRange = useMemo(() => {
    if (allReports.length === 0) return { min: new Date(2025, 0, 1), max: new Date() };
    const dates = allReports.map(r => new Date(r.submitted_at).getTime());
    return { min: new Date(Math.min(...dates)), max: new Date(Math.max(...dates)) };
  }, [allReports]);
  const [timeRange, setTimeRange] = useState<[Date, Date]>([new Date(2025, 0, 1), new Date()]);
  const filteredReports = useMemo(() => {
    const [start, end] = timeRange;
    return allReports.filter(r => {
      const d = new Date(r.submitted_at).getTime();
      return d >= start.getTime() && d <= end.getTime();
    });
  }, [allReports, timeRange]);

  // Zoom/pan state for desktop (modifies viewBox)
  const [mapView, setMapView] = useState({
    x: RWANDA_VIEWBOX.x,
    y: RWANDA_VIEWBOX.y,
    width: RWANDA_VIEWBOX.width,
    height: RWANDA_VIEWBOX.height,
  });

  const zoomIn = useCallback(() => {
    setMapView(v => {
      const factor = 0.75;
      const newW = v.width * factor;
      const newH = v.height * factor;
      return { x: v.x + (v.width - newW) / 2, y: v.y + (v.height - newH) / 2, width: newW, height: newH };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setMapView(v => {
      const factor = 1.33;
      const newW = Math.min(v.width * factor, RWANDA_VIEWBOX.width * 1.2);
      const newH = Math.min(v.height * factor, RWANDA_VIEWBOX.height * 1.2);
      return { x: v.x + (v.width - newW) / 2, y: v.y + (v.height - newH) / 2, width: newW, height: newH };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setMapView({ x: RWANDA_VIEWBOX.x, y: RWANDA_VIEWBOX.y, width: RWANDA_VIEWBOX.width, height: RWANDA_VIEWBOX.height });
  }, []);

  const zoomToCoords = useCallback((lon: number, lat: number, padding = 0.15) => {
    setMapView({ x: lon - padding, y: -lat - padding, width: padding * 2, height: padding * 2 });
  }, []);
  
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
  
  // Log GBIF data for debugging
  useEffect(() => {
    console.log('GBIF occurrences loaded:', occurrences.length, 'items');
    if (gbifError) console.error('GBIF error:', gbifError);
  }, [occurrences, gbifError]);
  
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
  
  // Log protected areas for debugging
  useEffect(() => {
    if (enabledOverlays.has('protected-areas')) {
      console.log('Protected areas loaded:', protectedAreas?.features?.length || 0, 'areas');
      if (areasError) console.error('Protected areas error:', areasError);
    }
  }, [protectedAreas, areasError, enabledOverlays]);
  
  // Load river network (lazy - only when overlay is enabled)
  const { rivers, loading: riversLoading, error: riversError } = useRiverNetwork({
    enabled: enabledOverlays.has('rivers')
  });
  
  // Log rivers for debugging
  useEffect(() => {
    if (enabledOverlays.has('rivers')) {
      console.log('Rivers loaded:', rivers?.features?.length || 0, 'rivers');
      if (riversError) console.error('Rivers error:', riversError);
    }
  }, [rivers, riversError, enabledOverlays]);
  
  // Load lakes (lazy - only when overlay is enabled)
  const { lakes, loading: lakesLoading, error: lakesError } = useLakes({
    enabled: enabledOverlays.has('lakes')
  });
  
  // Log lakes for debugging
  useEffect(() => {
    if (enabledOverlays.has('lakes')) {
      console.log('Lakes loaded:', lakes?.features?.length || 0, 'lakes');
      if (lakesError) console.error('Lakes error:', lakesError);
    }
  }, [lakes, lakesError, enabledOverlays]);

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
    console.log('Toggling overlay:', overlayId);
    setEnabledOverlays(prev => {
      const next = new Set(prev);
      if (next.has(overlayId)) {
        next.delete(overlayId);
        console.log('Disabled overlay:', overlayId);
      } else {
        next.add(overlayId);
        console.log('Enabled overlay:', overlayId);
      }
      console.log('Enabled overlays:', Array.from(next));
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
  
  const handleLakeHover = useCallback((lake: LakeFeature | null) => {
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
    },
    {
      id: 'lakes' as MapOverlay,
      label: 'Major Lakes',
      enabled: enabledOverlays.has('lakes'),
      loading: lakesLoading,
      error: lakesError
    },
    {
      id: 'reports' as MapOverlay,
      label: `Approved Reports (${filteredReports.length})`,
      enabled: enabledOverlays.has('reports'),
      loading: reportsLoading,
      error: null
    }
  ], [enabledOverlays, gbifLoading, gbifError, areasLoading, areasError, riversLoading, riversError, lakesLoading, lakesError, reportsLoading, filteredReports.length]);

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
          // Validate coordinates are within Rwanda bounds
          const isValid = validateGeoJSONCoordinates(geoJson);
          if (!isValid) {
            console.warn('Some GeoJSON coordinates are outside Rwanda bounds, but continuing...');
          }
          
          // Log bounding box info for debugging
          console.log('Rwanda map loaded with correct orientation:');
          console.log(`  Longitude range: ${RWANDA_BOUNDS.minLon}° to ${RWANDA_BOUNDS.maxLon}° (West to East)`);
          console.log(`  Latitude range: ${RWANDA_BOUNDS.minLat}° to ${RWANDA_BOUNDS.maxLat}° (South to North)`);
          console.log(`  SVG viewBox: x=${RWANDA_VIEWBOX.x}, y=${RWANDA_VIEWBOX.y}, width=${RWANDA_VIEWBOX.width}, height=${RWANDA_VIEWBOX.height}`);
          console.log(`  Coordinate transformation: Latitude values are negated for correct north-up orientation`);
          console.log(`  Features loaded: ${geoJson.features.length}`);
          
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
                viewBox={`${mapView.x} ${mapView.y} ${mapView.width} ${mapView.height}`}
                style={{
                  width: '100%',
                  height: isMobile ? 300 : 400,
                  cursor: touchState.isPanning ? 'grabbing' : 'pointer',
                  touchAction: 'none',
                  overflow: 'hidden',
                }}
                preserveAspectRatio="xMidYMid meet"
                onTouchStart={isMobile ? handleTouchStart : undefined}
                onTouchMove={isMobile ? handleTouchMove : undefined}
                onTouchEnd={isMobile ? handleTouchEnd : undefined}
                onWheel={!isMobile ? (e) => { e.preventDefault(); e.deltaY < 0 ? zoomIn() : zoomOut(); } : undefined}
              >
                <g transform={isMobile ? `scale(${touchState.scale})` : undefined}>
                <rect
                  x={mapView.x - 1}
                  y={mapView.y - 1}
                  width={mapView.width + 2}
                  height={mapView.height + 2}
                  fill="#f0f9ff"
                />
                
                {/* District base layer */}
                {geoData.features.map((feature, idx) => {
                  const districtData = getDistrictData(feature.properties.shapeName);
                  const color = districtData ? getColor(districtData, layer, biodiversityData, nbsapProgressData, threatLevelData) : '#e2e8f0';
                  
                  // Convert GeoJSON coordinates to SVG path with proper orientation
                  // GeoJSON uses [longitude, latitude] where latitude is positive north
                  // SVG uses [x, y] where y increases downward
                  // To display north at the top, we negate the latitude values
                  const transformCoordinate = (lon: number, lat: number): string => {
                    return `${lon},${-lat}`;  // Negate latitude to flip north-south orientation
                  };

                  const renderGeometry = (coords: any, type: string): string => {
                    if (type === 'Polygon') {
                      return coords.map((ring: any) => {
                        return ring.map((point: any, i: number) => 
                          `${i === 0 ? 'M' : 'L'}${transformCoordinate(point[0], point[1])}`
                        ).join(' ') + ' Z';
                      }).join(' ');
                    } else if (type === 'MultiPolygon') {
                      return coords.map((polygon: any) => 
                        polygon.map((ring: any) => {
                          return ring.map((point: any, i: number) => 
                            `${i === 0 ? 'M' : 'L'}${transformCoordinate(point[0], point[1])}`
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
                      onClick={() => {
                        if (districtData) {
                          setSelectedDistrict(districtData);
                          setTooltip(null); // Hide tooltip when detail panel opens
                        }
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
                
                {/* District Labels */}
                {geoData.features.map((feature, idx) => {
                  const districtData = getDistrictData(feature.properties.shapeName);
                  if (!districtData) return null;
                  
                  // Calculate centroid (simplified - average of all coordinates)
                  // Apply the same coordinate transformation for proper positioning
                  const calculateCentroid = (coords: any, type: string): [number, number] | null => {
                    let allPoints: [number, number][] = [];
                    
                    if (type === 'Polygon') {
                      allPoints = coords[0]; // Use outer ring
                    } else if (type === 'MultiPolygon') {
                      allPoints = coords[0][0]; // Use first polygon's outer ring
                    }
                    
                    if (allPoints.length === 0) return null;
                    
                    const sumX = allPoints.reduce((sum, p) => sum + p[0], 0);
                    const sumY = allPoints.reduce((sum, p) => sum + p[1], 0);
                    
                    // Return transformed coordinates (negate latitude for SVG)
                    return [sumX / allPoints.length, -(sumY / allPoints.length)];
                  };
                  
                  const centroid = calculateCentroid(feature.geometry.coordinates, feature.geometry.type);
                  if (!centroid) return null;
                  
                  return (
                    <g key={`label-${idx}`}>
                      {/* White outline for better readability */}
                      <text
                        x={centroid[0]}
                        y={centroid[1]}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: isMobile ? '0.04px' : '0.05px',
                          fontWeight: 700,
                          fill: 'white',
                          stroke: 'white',
                          strokeWidth: '0.008px',
                          pointerEvents: 'none',
                          userSelect: 'none'
                        }}
                      >
                        {districtData.name}
                      </text>
                      {/* Main text */}
                      <text
                        x={centroid[0]}
                        y={centroid[1]}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: isMobile ? '0.04px' : '0.05px',
                          fontWeight: 700,
                          fill: '#1e293b',
                          pointerEvents: 'none',
                          userSelect: 'none'
                        }}
                      >
                        {districtData.name}
                      </text>
                    </g>
                  );
                })}
                
                {/* Protected Areas (lowest overlay — dashed green border) */}
                {enabledOverlays.has('protected-areas') && protectedAreas && (
                  <ProtectedAreasOverlay
                    areas={protectedAreas}
                    onHover={handleProtectedAreaHover}
                    loading={areasLoading}
                    error={areasError}
                  />
                )}

                {/* Lakes (above protected areas) */}
                {enabledOverlays.has('lakes') && lakes && (
                  <LakesOverlay
                    lakes={lakes}
                    onHover={handleLakeHover}
                    onClick={(lake) => {
                      console.log('Lake clicked:', lake.properties.name);
                    }}
                    loading={lakesLoading}
                    error={lakesError}
                  />
                )}

                {/* Rivers (above lakes for visibility) */}
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

                {/* Report Markers Overlay */}
                {enabledOverlays.has('reports') && filteredReports.length > 0 && (
                  <ReportMarkersOverlay
                    reports={filteredReports}
                    districts={districts}
                    geoData={geoData}
                    onReportClick={setSelectedMapReport}
                    onReportHover={setHoveredReport}
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
              <MapLegend activeLayer={layer} enabledOverlays={enabledOverlays} position="bottom-right" isMobile={isMobile} />
            )}

            {/* Zoom controls */}
            {!loading && !error && !isMobile && (
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
                {[
                  { icon: 'fa-plus', action: zoomIn, label: 'Zoom in' },
                  { icon: 'fa-minus', action: zoomOut, label: 'Zoom out' },
                  { icon: 'fa-expand', action: resetZoom, label: 'Reset view' },
                ].map(b => (
                  <button key={b.icon} onClick={b.action} title={b.label} aria-label={b.label}
                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-1)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <i className={`fa-solid ${b.icon}`} />
                  </button>
                ))}
              </div>
            )}
            {/* Hovered report tooltip */}
            {hoveredReport && (
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)', borderRadius: 8, padding: '8px 12px', fontSize: '0.72rem', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.06)', zIndex: 10, maxWidth: 220 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{hoveredReport.tool_name}</div>
                <div style={{ color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: '0.65rem' }}>
                  {hoveredReport.district || (hoveredReport.form_data?.district as string) || '—'}
                  {hoveredReport.period && ` · ${hoveredReport.period}`}
                </div>
                {hoveredReport.submitted_by_profile?.full_name && (
                  <div style={{ color: 'var(--text-2)', marginTop: 2 }}>{hoveredReport.submitted_by_profile.full_name}</div>
                )}
              </div>
            )}
          </div>

          {/* Time slider — shown when reports overlay is active */}
          {enabledOverlays.has('reports') && allReports.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <TimeSlider
                minDate={reportDateRange.min}
                maxDate={reportDateRange.max}
                value={timeRange}
                onChange={setTimeRange}
                totalCount={allReports.length}
                filteredCount={filteredReports.length}
              />
            </div>
          )}
        </div>

        {/* District list + search */}
        <div style={{ ...card, padding: isMobile ? 12 : 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-table-cells" style={{ color: 'var(--sky-dim)' }} />
            District Summary
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <i className="fa-solid fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--text-3)' }} />
            <input
              type="text"
              placeholder="Search districts, parks, rivers, lakes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'var(--surface)', color: 'var(--text-1)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.75rem', padding: 2 }}>
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Search results for overlays */}
          {searchQuery.length >= 2 && (() => {
            const q = searchQuery.toLowerCase();
            const matchedAreas = (protectedAreas?.features || []).filter(a => a.properties.name.toLowerCase().includes(q));
            const matchedRivers = (rivers?.features || []).filter(r => r.properties.name.toLowerCase().includes(q));
            const matchedLakes = (lakes?.features || []).filter(l => l.properties.name.toLowerCase().includes(q));
            const hasOverlayResults = matchedAreas.length + matchedRivers.length + matchedLakes.length > 0;

            if (!hasOverlayResults) return null;
            return (
              <div style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, fontSize: '0.75rem' }}>
                {matchedAreas.map((a, i) => {
                  const coords = (a.geometry.type === 'Polygon' ? a.geometry.coordinates[0] : (a.geometry.coordinates as number[][][][])[0][0]) as number[][];
                  const cLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
                  const cLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
                  const size = Math.max(...coords.map(c => c[0])) - Math.min(...coords.map(c => c[0]));
                  return (
                    <div key={`pa-${i}`} onClick={() => { zoomToCoords(cLon, cLat, Math.max(size * 0.8, 0.1)); setSearchQuery(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 4px', color: '#16a34a', cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <i className="fa-solid fa-shield-halved" style={{ fontSize: '0.65rem' }} />
                      <span style={{ fontWeight: 600 }}>{a.properties.name}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.65rem', marginLeft: 'auto' }}>{a.properties.type}</span>
                    </div>
                  );
                })}
                {matchedRivers.map((r, i) => {
                  const coords = (r.geometry.type === 'LineString' ? r.geometry.coordinates : (r.geometry.coordinates as number[][][])[0]) as number[][];
                  const mid = coords[Math.floor(coords.length / 2)];
                  return (
                    <div key={`rv-${i}`} onClick={() => { zoomToCoords(mid[0], mid[1], 0.3); setSearchQuery(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 4px', color: '#0284c7', cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <i className="fa-solid fa-water" style={{ fontSize: '0.65rem' }} />
                      <span style={{ fontWeight: 600 }}>{r.properties.name}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.65rem', marginLeft: 'auto' }}>{r.properties.basin}</span>
                    </div>
                  );
                })}
                {matchedLakes.map((l, i) => {
                  const coords = (l.geometry.coordinates[0]) as number[][];
                  const cLon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
                  const cLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
                  const size = Math.max(...coords.map(c => c[0])) - Math.min(...coords.map(c => c[0]));
                  return (
                    <div key={`lk-${i}`} onClick={() => { zoomToCoords(cLon, cLat, Math.max(size * 0.8, 0.08)); setSearchQuery(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 4px', color: '#2563eb', cursor: 'pointer', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <i className="fa-solid fa-droplet" style={{ fontSize: '0.65rem' }} />
                      <span style={{ fontWeight: 600 }}>{l.properties.name}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.65rem', marginLeft: 'auto' }}>{l.properties.area_km2 ? `${l.properties.area_km2} km²` : ''}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ maxHeight: isMobile ? 300 : 400, overflowY: 'auto' }}>
            {[...districts].filter(d => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)).map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--surface-3)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{d.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>{d.province?.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District Detail Panel */}
      <DistrictDetailPanel
        district={selectedDistrict}
        onClose={() => setSelectedDistrict(null)}
        occurrences={occurrences}
        protectedAreas={protectedAreas}
        biodiversityData={biodiversityData}
        threatData={threatLevelData}
        nbsapData={nbsapProgressData}
      />

      {/* Report Detail Modal (from map marker click) */}
      {selectedMapReport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setSelectedMapReport(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'relative', width: '90%', maxWidth: 600, maxHeight: '80vh', background: 'var(--surface)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'auto', padding: 24 }}>
            <button onClick={() => setSelectedMapReport(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-3)' }}>
              <i className="fa-solid fa-xmark" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: ({ T01: '#1B6CA8', T02: '#1E7D4B', T03: '#5B3FA6', T04: '#B56A00', T05: '#0E6655', T06: '#922B21', T07: '#1A5276' })[selectedMapReport.tool_id] || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>
                {selectedMapReport.tool_id}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-1)' }}>{selectedMapReport.tool_name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                  {new Date(selectedMapReport.submitted_at).toLocaleDateString()}
                  {selectedMapReport.submitted_by_profile?.full_name && ` · ${selectedMapReport.submitted_by_profile.full_name}`}
                  {selectedMapReport.period && ` · ${selectedMapReport.period}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {Object.entries(selectedMapReport.form_data || {}).map(([key, val]) => (
                <div key={key} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', wordBreak: 'break-word' }}>
                    {val === null || val === undefined || val === '' ? '—' : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapPage;
