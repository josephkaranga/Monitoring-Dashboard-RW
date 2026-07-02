import React from 'react';
import type { MapLayer } from '../../types/mapLayers';

interface LayerSwitcherProps {
  activeLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  isMobile?: boolean;
}

const layerOptions: Array<{ id: MapLayer; label: string }> = [
  { id: 'biodiversity', label: 'Biodiversity Index' },
  { id: 'forest', label: 'Forest Cover' },
  { id: 'species-richness', label: 'Species Richness' },
  { id: 'protected-areas', label: 'Protected Areas' },
  { id: 'wetlands', label: 'Wetlands' },
  { id: 'threat-level', label: 'Threat Level' },
  { id: 'nbsap-progress', label: 'NBSAP Progress' },
];

/**
 * LayerSwitcher Component
 *
 * Provides a dropdown control for switching between different map visualization layers.
 * Supports 9 layer options including biodiversity metrics, compliance data, and conservation indicators.
 *
 * Features:
 * - Keyboard navigation (Tab, Enter, Arrow keys)
 * - ARIA labels for accessibility
 * - Matches existing MapPage styling (dark theme)
 */
export function LayerSwitcher({
  activeLayer,
  onLayerChange,
  isMobile = false,
}: LayerSwitcherProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLayerChange(e.target.value as MapLayer);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    // Allow default select behavior for Enter and Space
    if (e.key === 'Enter' || e.key === ' ') {
      e.currentTarget.click();
    }
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: isMobile ? '100%' : 'auto' }}
    >
      <label
        htmlFor="layer-switcher"
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-2)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Layer:
      </label>
      <select
        id="layer-switcher"
        value={activeLayer}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="Select map visualization layer"
        aria-describedby="layer-description"
        style={{
          padding: isMobile ? '10px 12px' : '5px 10px',
          border: '1px solid var(--border)',
          borderRadius: 7,
          fontSize: '0.72rem',
          fontFamily: "'DM Sans', sans-serif",
          outline: 'none',
          cursor: 'pointer',
          background: 'var(--surface)',
          color: 'var(--text-1)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          flex: isMobile ? 1 : 'initial',
          minHeight: isMobile ? 44 : 'auto',
          minWidth: isMobile ? 44 : 'auto',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--sky-dim)';
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(14, 165, 233, 0.1)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {layerOptions.map(layer => (
          <option key={layer.id} value={layer.id}>
            {layer.label}
          </option>
        ))}
      </select>
      <span
        id="layer-description"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Choose a map layer to visualize different biodiversity and compliance metrics
      </span>
    </div>
  );
}

export default LayerSwitcher;
