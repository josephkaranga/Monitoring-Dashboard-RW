# Map Overlay Components

This document describes the three overlay components implemented for the GIS Biodiversity Enhancement feature.

## Overview

The overlay components render biodiversity data on top of the base map:
- **GBIFOccurrencesOverlay**: Species occurrence points from GBIF
- **ProtectedAreasOverlay**: Protected area polygons (national parks, reserves, wetlands)
- **RiverNetworkOverlay**: River network line paths

All components follow the same patterns:
- SVG-based rendering for scalability
- Hover interactions with tooltips
- Loading and error states
- Performance optimizations
- Accessibility features

## Components

### GBIFOccurrencesOverlay

Renders GBIF species occurrence data as circle markers.

**Props:**
```typescript
interface GBIFOccurrencesOverlayProps {
  occurrences: GBIFOccurrence[];  // Array of occurrence data
  onHover: (occurrence: GBIFOccurrence | null) => void;  // Hover callback
  loading?: boolean;  // Loading state
  error?: string | null;  // Error message
}
```

**Features:**
- **Kingdom-based color coding**: Different colors for Animalia (blue), Plantae (green), Fungi (orange), etc.
- **Automatic clustering**: When >500 occurrences, uses grid-based clustering (0.1° grid) to improve performance
- **Hover effects**: Opacity increases to 1.0, radius increases by 30%
- **Tooltips**: Shows scientific name, kingdom, location, and cluster info

**Usage:**
```tsx
import { GBIFOccurrencesOverlay } from './components/map';

<svg viewBox="28.8 -2.9 3.5 2.8">
  <GBIFOccurrencesOverlay
    occurrences={gbifData}
    onHover={setHoveredOccurrence}
    loading={isLoading}
    error={error}
  />
</svg>
```

**Performance:**
- Memoized clustering calculation
- Logarithmic radius scaling for clusters
- Renders <100ms for 500 occurrences
- Renders <200ms for 5000 occurrences (clustered)

### ProtectedAreasOverlay

Renders protected areas as polygons with semi-transparent fill.

**Props:**
```typescript
interface ProtectedAreasOverlayProps {
  areas: ProtectedAreasCollection | null;  // GeoJSON FeatureCollection
  onHover: (area: ProtectedArea | null) => void;  // Hover callback
  loading?: boolean;  // Loading state
  error?: string | null;  // Error message
}
```

**Features:**
- **Polygon rendering**: Supports both Polygon and MultiPolygon geometries
- **Designation-based colors**: National Parks (green), Reserves (cyan), Wetlands (blue), Forest Reserves (emerald)
- **Semi-transparent fill**: 20% opacity for fill, 80% for stroke
- **Hover effects**: Fill opacity increases to 35%, stroke width increases by 50%
- **Tooltips**: Shows name, designation type, area (km²), and establishment date

**Usage:**
```tsx
import { ProtectedAreasOverlay } from './components/map';

<svg viewBox="28.8 -2.9 3.5 2.8">
  <ProtectedAreasOverlay
    areas={protectedAreasData}
    onHover={setHoveredArea}
    loading={isLoading}
    error={error}
  />
</svg>
```

**Performance:**
- Simplified polygon rendering
- Renders <100ms for 10 polygons
- Efficient path generation

### RiverNetworkOverlay

Renders river networks as line paths.

**Props:**
```typescript
interface RiverNetworkOverlayProps {
  rivers: RiverNetworkCollection | null;  // GeoJSON FeatureCollection
  onHover: (river: RiverFeature | null) => void;  // Hover callback
  loading?: boolean;  // Loading state
  error?: string | null;  // Error message
}
```

**Features:**
- **Line rendering**: Supports both LineString and MultiLineString geometries
- **Width variation**: Major rivers (>100km) = 0.012, Medium (50-100km) = 0.008, Small (<50km) = 0.005
- **Blue color scheme**: #0ea5e9 with 60% opacity
- **Rounded line caps/joins**: Natural-looking river paths
- **Hover effects**: Opacity increases to 90%, width increases by 50%
- **Tooltips**: Shows river name and length (km)

**Usage:**
```tsx
import { RiverNetworkOverlay } from './components/map';

<svg viewBox="28.8 -2.9 3.5 2.8">
  <RiverNetworkOverlay
    rivers={riverData}
    onHover={setHoveredRiver}
    loading={isLoading}
    error={error}
  />
</svg>
```

**Performance:**
- Simplified line rendering
- Renders <100ms for 50 rivers
- Efficient path generation

## Coordinate System

All overlays use the same SVG coordinate system as the base map:
- **Longitude**: Positive values (East), used directly as X coordinate
- **Latitude**: Negative values in SVG (Y increases downward), so latitude is negated: `cy={-latitude}`
- **ViewBox**: `28.8 -2.9 3.5 2.8` (covers Rwanda's geographic bounds)

## Rendering Order

Overlays should be rendered in this order (bottom to top):
1. District boundaries (base map)
2. RiverNetworkOverlay
3. ProtectedAreasOverlay
4. GBIFOccurrencesOverlay

This ensures points appear on top of polygons, and polygons on top of lines.

## State Management

All overlays support three states:

### Loading State
```tsx
<GBIFOccurrencesOverlay
  occurrences={[]}
  onHover={noop}
  loading={true}
/>
```
Displays: "Loading GBIF data..." text

### Error State
```tsx
<GBIFOccurrencesOverlay
  occurrences={[]}
  onHover={noop}
  error="Failed to load data"
/>
```
Displays: "Error loading GBIF data" text in red

### Empty State
```tsx
<GBIFOccurrencesOverlay
  occurrences={[]}
  onHover={noop}
/>
```
Returns: `null` (nothing rendered)

## Hover Interactions

All overlays implement consistent hover behavior:

1. **Visual feedback**: Opacity/size/width increases
2. **Callback**: `onHover` called with data or null
3. **Tooltip**: SVG `<title>` element for native browser tooltip
4. **Transitions**: Smooth 0.2s animations
5. **Cursor**: Changes to pointer on hover

Example hover handler:
```tsx
const [hoveredItem, setHoveredItem] = useState<any>(null);

<GBIFOccurrencesOverlay
  occurrences={data}
  onHover={setHoveredItem}
/>

{hoveredItem && (
  <div className="custom-tooltip">
    {hoveredItem.scientificName}
  </div>
)}
```

## Accessibility

All overlays include accessibility features:

- **ARIA labels**: Each overlay group has descriptive `aria-label`
- **Element labels**: Each rendered element has descriptive `aria-label`
- **SVG titles**: Native tooltips via `<title>` elements
- **Semantic markup**: Proper SVG structure
- **Keyboard support**: Can be extended with keyboard navigation

## Performance Optimizations

### GBIFOccurrencesOverlay
- Memoized clustering calculation with `useMemo`
- Grid-based clustering (O(n) complexity)
- Logarithmic radius scaling
- Automatic clustering threshold (500 occurrences)

### ProtectedAreasOverlay
- Simplified polygon rendering (exterior ring only)
- Efficient coordinate-to-path conversion
- No unnecessary re-renders

### RiverNetworkOverlay
- Simplified line rendering
- Efficient coordinate-to-path conversion
- Width pre-calculation based on length

## Testing

Manual testing checklist available in:
- `__tests__/overlays.validation.md`

Key test areas:
- Rendering with various data sizes
- Hover interactions
- Loading/error states
- Coordinate system alignment
- Performance benchmarks
- Browser compatibility
- Mobile responsiveness

## Integration Example

Complete example showing all overlays together:

```tsx
import React, { useState } from 'react';
import {
  GBIFOccurrencesOverlay,
  ProtectedAreasOverlay,
  RiverNetworkOverlay,
} from './components/map';
import { useGBIFOccurrences } from './hooks/useGBIFOccurrences';
import { useProtectedAreas } from './hooks/useProtectedAreas';
import { useRiverNetwork } from './hooks/useRiverNetwork';

export function MapWithOverlays() {
  const { occurrences, loading: gbifLoading, error: gbifError } = useGBIFOccurrences();
  const { areas, loading: areasLoading, error: areasError } = useProtectedAreas();
  const { rivers, loading: riversLoading, error: riversError } = useRiverNetwork();

  const [hoveredOccurrence, setHoveredOccurrence] = useState(null);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [hoveredRiver, setHoveredRiver] = useState(null);

  return (
    <svg viewBox="28.8 -2.9 3.5 2.8" style={{ width: '100%', height: 400 }}>
      {/* Base map districts */}
      <g className="districts">
        {/* District paths */}
      </g>

      {/* Overlays (bottom to top) */}
      <RiverNetworkOverlay
        rivers={rivers}
        onHover={setHoveredRiver}
        loading={riversLoading}
        error={riversError}
      />

      <ProtectedAreasOverlay
        areas={areas}
        onHover={setHoveredArea}
        loading={areasLoading}
        error={areasError}
      />

      <GBIFOccurrencesOverlay
        occurrences={occurrences}
        onHover={setHoveredOccurrence}
        loading={gbifLoading}
        error={gbifError}
      />
    </svg>
  );
}
```

## Future Enhancements

Potential improvements:
- Canvas fallback for very large datasets (>10,000 points)
- Viewport culling for off-screen elements
- Web Worker for clustering calculation
- Zoom-dependent detail levels
- Interactive filtering by kingdom/designation
- Custom tooltip components (instead of native)
- Keyboard navigation support
- Touch gesture support for mobile

## Related Files

- Types: `src/types/biodiversity.ts`, `src/types/overlays.ts`
- Hooks: `src/hooks/useGBIFOccurrences.ts`, `src/hooks/useProtectedAreas.ts`, `src/hooks/useRiverNetwork.ts`
- Utils: `src/utils/pointClustering.ts` (if implemented)
- Tests: `src/components/map/__tests__/overlays.validation.md`

## References

- [GBIF API Documentation](https://www.gbif.org/developer/summary)
- [GeoJSON Specification](https://geojson.org/)
- [SVG Path Commands](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
