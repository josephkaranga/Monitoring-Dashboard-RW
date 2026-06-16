/**
 * MapControls Usage Example
 * 
 * This file demonstrates how to integrate the map control components
 * into the MapPage component. This is a reference implementation showing
 * proper state management and event handling.
 */

import React, { useState } from 'react';
import { LayerSwitcher } from './LayerSwitcher';
import { OverlayToggles } from './OverlayToggles';
import { RefreshButton } from './RefreshButton';
import { MapLegend } from './MapLegend';
import type { MapLayer } from '../../types/mapLayers';
import type { MapOverlay } from '../../types/overlays';

/**
 * Example integration of map controls
 * 
 * Usage in MapPage.tsx:
 * 
 * ```tsx
 * import { LayerSwitcher, OverlayToggles, RefreshButton, MapLegend } from './components/map';
 * 
 * function MapPage() {
 *   const [activeLayer, setActiveLayer] = useState<MapLayer>('biodiversity');
 *   const [overlays, setOverlays] = useState([...]);
 *   const [gbifLoading, setGbifLoading] = useState(false);
 *   const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
 *   
 *   const handleRefresh = async () => {
 *     setGbifLoading(true);
 *     try {
 *       // Fetch GBIF data
 *       await fetchGBIFData();
 *       setLastUpdated(new Date());
 *     } finally {
 *       setGbifLoading(false);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
 *         <LayerSwitcher activeLayer={activeLayer} onLayerChange={setActiveLayer} />
 *         <OverlayToggles overlays={overlays} onToggle={handleOverlayToggle} />
 *         <RefreshButton onRefresh={handleRefresh} loading={gbifLoading} lastUpdated={lastUpdated} />
 *       </div>
 *       
 *       <div style={{ position: 'relative' }}>
 *         <svg>...</svg>
 *         <MapLegend activeLayer={activeLayer} position="bottom-right" />
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function MapControlsExample() {
  // State management
  const [activeLayer, setActiveLayer] = useState<MapLayer>('biodiversity');
  const [gbifLoading, setGbifLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  
  const [overlays, setOverlays] = useState([
    { id: 'gbif' as MapOverlay, label: 'GBIF Occurrences', enabled: false, loading: false, error: null },
    { id: 'protected-areas' as MapOverlay, label: 'Protected Area Borders', enabled: false, loading: false, error: null },
    { id: 'rivers' as MapOverlay, label: 'River Network', enabled: false, loading: false, error: null },
  ]);

  // Event handlers
  const handleLayerChange = (layer: MapLayer) => {
    console.log('Layer changed to:', layer);
    setActiveLayer(layer);
  };

  const handleOverlayToggle = (overlayId: MapOverlay) => {
    console.log('Overlay toggled:', overlayId);
    setOverlays(prev =>
      prev.map(overlay =>
        overlay.id === overlayId
          ? { ...overlay, enabled: !overlay.enabled }
          : overlay
      )
    );
  };

  const handleRefresh = async () => {
    console.log('Refreshing GBIF data...');
    setGbifLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setGbifLoading(false);
    setLastUpdated(new Date());
    console.log('GBIF data refreshed');
  };

  return (
    <div style={{ padding: 20, background: 'var(--surface)', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 20, fontSize: '1.5rem', fontWeight: 700 }}>
        Map Controls Example
      </h1>
      
      {/* Control Panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
          padding: 18,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <LayerSwitcher
          activeLayer={activeLayer}
          onLayerChange={handleLayerChange}
        />
        
        <div style={{ borderLeft: '1px solid var(--border)', height: 60 }} />
        
        <OverlayToggles
          overlays={overlays}
          onToggle={handleOverlayToggle}
        />
        
        <div style={{ marginLeft: 'auto' }}>
          <RefreshButton
            onRefresh={handleRefresh}
            loading={gbifLoading}
            lastUpdated={lastUpdated}
          />
        </div>
      </div>

      {/* Map Container with Legend */}
      <div
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
          borderRadius: 12,
          height: 500,
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-3)',
            fontSize: '0.9rem',
          }}
        >
          Map Canvas (SVG would render here)
        </div>
        
        <MapLegend activeLayer={activeLayer} position="bottom-right" />
      </div>

      {/* State Display */}
      <div
        style={{
          marginTop: 20,
          padding: 18,
          background: 'var(--surface-2)',
          borderRadius: 12,
          fontFamily: "'DM Mono', monospace",
          fontSize: '0.75rem',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Current State:</div>
        <div>Active Layer: {activeLayer}</div>
        <div>
          Enabled Overlays: {overlays.filter(o => o.enabled).map(o => o.label).join(', ') || 'None'}
        </div>
        <div>GBIF Loading: {gbifLoading ? 'Yes' : 'No'}</div>
        <div>Last Updated: {lastUpdated?.toLocaleString() || 'Never'}</div>
      </div>
    </div>
  );
}

export default MapControlsExample;
