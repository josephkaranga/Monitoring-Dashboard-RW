# Design Document: GIS-Based Biodiversity Visualization Enhancement

## High-Level Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MapPage Component                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Map Controls Layer                        │ │
│  │  • Layer Switcher  • Overlay Toggles  • Refresh Btn   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              SVG Map Canvas                            │ │
│  │  • District Boundaries (GeoJSON)                       │ │
│  │  • Color-coded Layers                                  │ │
│  │  • Overlays (Protected Areas, Rivers, GBIF Points)     │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Visualization Panels (Side/Bottom)             │ │
│  │  • Biodiversity Index Chart                            │ │
│  │  • Species by Kingdom                                  │ │
│  │  • Hotspots List  • Protected Areas List              │ │
│  │  • GBIF Live Counter                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                    ↓
┌──────────────────┐              ┌──────────────────┐
│  Data Services   │              │  Hooks/Utils     │
│                  │              │                  │
│ • dataService.ts │              │ • useGBIF.ts     │
│ • Supabase RPC   │              │ • useBiodiversity│
│ • District Data  │              │ • useProtected   │
│ • Indicator Data │              │ • useCalculations│
│ • Risk Data      │              │                  │
└──────────────────┘              └──────────────────┘
        ↓                                    ↓
┌──────────────────┐              ┌──────────────────┐
│  Supabase DB     │              │  External APIs   │
│                  │              │                  │
│ • districts      │              │ • GBIF API       │
│ • indicators     │              │ • GeoJSON Files  │
│ • risks          │              │                  │
│ • audit_log      │              │                  │
└──────────────────┘              └──────────────────┘
```

### Component Hierarchy

```
MapPage
├── MapControls
│   ├── LayerSwitcher (dropdown)
│   ├── OverlayToggles (checkboxes)
│   └── RefreshButton
├── MapCanvas (SVG)
│   ├── DistrictLayer (base)
│   ├── ProtectedAreasOverlay
│   ├── RiverNetworkOverlay
│   └── GBIFOccurrencesOverlay
├── MapLegend
├── MapTooltip
├── BiodiversityIndexPanel
├── SpeciesByKingdomPanel
├── HotspotsListPanel
├── ProtectedAreasListPanel
└── GBIFLiveCounter
```

### Data Flow

1. **Initial Load**:
   - Fetch district GeoJSON from `/rwanda-districts.geojson`
   - Fetch district data from Supabase (districts table)
   - Fetch GBIF occurrences for Rwanda
   - Calculate biodiversity metrics
   - Render map with default layer

2. **Layer Switch**:
   - User selects layer → Update active layer state
   - Recalculate district colors based on layer data
   - Update legend
   - Re-render map

3. **Overlay Toggle**:
   - User toggles overlay → Update overlay state
   - Load overlay data if not cached
   - Render/hide overlay elements

4. **GBIF Refresh**:
   - Auto-trigger every 30 minutes OR manual button click
   - Fetch new GBIF data
   - Recalculate biodiversity index and species richness
   - Update occurrence overlay
   - Update species breakdown chart

## Low-Level Design

### Data Structures

#### BiodiversityData Interface
```typescript
interface BiodiversityData {
  districtId: number;
  districtName: string;
  biodiversityIndex: number;  // 0-100
  speciesRichness: number;    // count
  speciesByKingdom: {
    [kingdom: string]: number;
  };
  occurrenceCount: number;
  lastUpdated: Date;
}
```

#### MapLayer Type
```typescript
type MapLayer = 
  | 'biodiversity'
  | 'forest'
  | 'species-richness'
  | 'protected-areas'
  | 'wetlands'
  | 'threat-level'
  | 'nbsap-progress'
  | 'submission'  // existing
  | 'compliance'; // existing

interface LayerConfig {
  id: MapLayer;
  label: string;
  colorScale: (value: number) => string;
  valueFormatter: (value: number) => string;
  dataSource: (districts: District[]) => Promise<Map<number, number>>;
}
```

#### Overlay Type
```typescript
type MapOverlay = 'gbif' | 'protected-areas' | 'rivers';

interface OverlayConfig {
  id: MapOverlay;
  label: string;
  enabled: boolean;
  dataSource: () => Promise<GeoJSON.FeatureCollection | OccurrencePoint[]>;
  renderer: (data: any, svg: SVGElement) => void;
}
```

#### GBIF Occurrence
```typescript
interface GBIFOccurrence {
  key: number;
  scientificName: string;
  kingdom: string;
  family: string;
  decimalLatitude: number;
  decimalLongitude: number;
  year: number;
  basisOfRecord: string;
}
```

### Algorithms

#### Biodiversity Index Calculation
```typescript
function calculateBiodiversityIndex(
  occurrences: GBIFOccurrence[],
  districtArea: number
): number {
  // Shannon Diversity Index adapted for spatial data
  const uniqueSpecies = new Set(occurrences.map(o => o.scientificName)).size;
  const kingdomDiversity = new Set(occurrences.map(o => o.kingdom)).size;
  const observationDensity = occurrences.length / districtArea;
  
  // Weighted formula
  const speciesScore = Math.min(uniqueSpecies / 100, 1) * 40;
  const kingdomScore = (kingdomDiversity / 8) * 30;
  const densityScore = Math.min(observationDensity / 10, 1) * 30;
  
  return Math.round(speciesScore + kingdomScore + densityScore);
}
```

#### Hotspot Detection
```typescript
function identifyHotspots(
  biodiversityData: BiodiversityData[]
): number[] {
  // Calculate 80th percentile thresholds
  const sortedByIndex = [...biodiversityData]
    .sort((a, b) => b.biodiversityIndex - a.biodiversityIndex);
  const sortedByRichness = [...biodiversityData]
    .sort((a, b) => b.speciesRichness - a.speciesRichness);
  
  const indexThreshold = sortedByIndex[Math.floor(biodiversityData.length * 0.2)]
    .biodiversityIndex;
  const richnessThreshold = sortedByRichness[Math.floor(biodiversityData.length * 0.2)]
    .speciesRichness;
  
  return biodiversityData
    .filter(d => 
      d.biodiversityIndex >= indexThreshold &&
      d.speciesRichness >= richnessThreshold
    )
    .map(d => d.districtId);
}
```

#### Threat Level Calculation
```typescript
function calculateThreatLevel(
  district: District,
  risks: Risk[],
  forestCoverTrend: number
): 'high' | 'medium' | 'low' {
  let threatScore = 0;
  
  // Forest cover loss (0-40 points)
  if (forestCoverTrend < -5) threatScore += 40;
  else if (forestCoverTrend < 0) threatScore += 20;
  
  // Documented risks (0-40 points)
  const districtRisks = risks.filter(r => r.district_id === district.id);
  threatScore += Math.min(districtRisks.length * 10, 40);
  
  // Species decline (0-20 points) - placeholder for future implementation
  // Would compare current vs historical GBIF data
  
  if (threatScore >= 60) return 'high';
  if (threatScore >= 30) return 'medium';
  return 'low';
}
```

#### Point Clustering (for >500 occurrences)
```typescript
function clusterOccurrences(
  occurrences: GBIFOccurrence[],
  maxPoints: number = 500
): ClusteredPoint[] {
  // Simple grid-based clustering
  const gridSize = 0.1; // degrees
  const clusters = new Map<string, GBIFOccurrence[]>();
  
  occurrences.forEach(occ => {
    const gridX = Math.floor(occ.decimalLongitude / gridSize);
    const gridY = Math.floor(occ.decimalLatitude / gridSize);
    const key = `${gridX},${gridY}`;
    
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(occ);
  });
  
  return Array.from(clusters.values()).map(group => ({
    latitude: group.reduce((sum, o) => sum + o.decimalLatitude, 0) / group.length,
    longitude: group.reduce((sum, o) => sum + o.decimalLongitude, 0) / group.length,
    count: group.length,
    species: new Set(group.map(o => o.scientificName)).size,
    kingdoms: [...new Set(group.map(o => o.kingdom))]
  }));
}
```

### Custom Hooks

#### useBiodiversityData
```typescript
function useBiodiversityData(districts: District[]) {
  const [data, setData] = useState<Map<number, BiodiversityData>>(new Map());
  const [loading, setLoading] = useState(true);
  const { occurrences, loading: gbifLoading } = useGBIF({ country: 'RW', limit: 5000 });
  
  useEffect(() => {
    if (!gbifLoading && occurrences && districts.length > 0) {
      const biodivData = calculateBiodiversityMetrics(occurrences, districts);
      setData(biodivData);
      setLoading(false);
    }
  }, [occurrences, gbifLoading, districts]);
  
  return { data, loading };
}
```

#### useProtectedAreas
```typescript
function useProtectedAreas() {
  const [areas, setAreas] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetch('/rwanda-protected-areas.geojson')
      .then(res => res.json())
      .then(data => {
        setAreas(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  
  return { areas, loading, error };
}
```

### Component Specifications

#### LayerSwitcher Component
```typescript
interface LayerSwitcherProps {
  activeLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
}

const LayerSwitcher: React.FC<LayerSwitcherProps> = ({ activeLayer, onLayerChange }) => {
  const layers: LayerConfig[] = [
    { id: 'biodiversity', label: 'Biodiversity Index', ... },
    { id: 'forest', label: 'Forest Cover', ... },
    { id: 'species-richness', label: 'Species Richness', ... },
    { id: 'protected-areas', label: 'Protected Areas', ... },
    { id: 'wetlands', label: 'Wetlands', ... },
    { id: 'threat-level', label: 'Threat Level', ... },
    { id: 'nbsap-progress', label: 'NBSAP Progress', ... },
  ];
  
  return (
    <select value={activeLayer} onChange={e => onLayerChange(e.target.value as MapLayer)}>
      {layers.map(layer => (
        <option key={layer.id} value={layer.id}>{layer.label}</option>
      ))}
    </select>
  );
};
```

#### GBIFOccurrencesOverlay Component
```typescript
interface GBIFOccurrencesOverlayProps {
  occurrences: GBIFOccurrence[];
  viewBox: string;
  onHover: (occurrence: GBIFOccurrence | null) => void;
}

const GBIFOccurrencesOverlay: React.FC<GBIFOccurrencesOverlayProps> = ({
  occurrences,
  viewBox,
  onHover
}) => {
  const clustered = occurrences.length > 500 
    ? clusterOccurrences(occurrences)
    : occurrences;
  
  const getKingdomColor = (kingdom: string) => {
    const colors = {
      'Plantae': '#10b981',
      'Animalia': '#3b82f6',
      'Fungi': '#f59e0b',
      'default': '#6b7280'
    };
    return colors[kingdom] || colors.default;
  };
  
  return (
    <g className="gbif-occurrences">
      {clustered.map((occ, idx) => (
        <circle
          key={idx}
          cx={occ.decimalLongitude}
          cy={-occ.decimalLatitude}
          r={occ.count ? 0.02 * Math.log(occ.count) : 0.01}
          fill={getKingdomColor(occ.kingdom)}
          opacity={0.6}
          onMouseEnter={() => onHover(occ)}
          onMouseLeave={() => onHover(null)}
        />
      ))}
    </g>
  );
};
```

### File Structure

```
src/
├── MapPage.tsx (enhanced)
├── components/
│   ├── map/
│   │   ├── LayerSwitcher.tsx
│   │   ├── OverlayToggles.tsx
│   │   ├── MapLegend.tsx
│   │   ├── MapTooltip.tsx
│   │   ├── GBIFOccurrencesOverlay.tsx
│   │   ├── ProtectedAreasOverlay.tsx
│   │   └── RiverNetworkOverlay.tsx
│   └── panels/
│       ├── BiodiversityIndexPanel.tsx
│       ├── SpeciesByKingdomPanel.tsx
│       ├── HotspotsListPanel.tsx
│       ├── ProtectedAreasListPanel.tsx
│       └── GBIFLiveCounter.tsx
├── hooks/
│   ├── useGBIF.ts (existing, enhance)
│   ├── useBiodiversityData.ts
│   ├── useProtectedAreas.ts
│   ├── useRiverNetwork.ts
│   └── useMapLayers.ts
├── utils/
│   ├── biodiversityCalculations.ts
│   ├── hotspotDetection.ts
│   ├── threatAssessment.ts
│   ├── pointClustering.ts
│   └── geoUtils.ts
└── types/
    ├── biodiversity.ts
    ├── mapLayers.ts
    └── overlays.ts

public/
├── rwanda-districts.geojson (existing)
├── rwanda-protected-areas.geojson (new)
└── rwanda-rivers.geojson (new)
```

### Performance Optimizations

1. **Memoization**: Use React.memo for expensive components
2. **Debouncing**: Debounce hover events (300ms)
3. **Lazy Loading**: Load overlay data only when enabled
4. **Viewport Culling**: Only render visible map elements
5. **Canvas Fallback**: Use Canvas for >500 points
6. **Web Workers**: Calculate biodiversity metrics in background thread
7. **Request Caching**: Cache GBIF responses for 30 minutes

### Mobile Adaptations

```typescript
const isMobile = window.innerWidth < 768;

// Layout adjustments
const mapLayout = isMobile ? {
  gridTemplateColumns: '1fr',
  gridTemplateRows: 'auto 400px auto'
} : {
  gridTemplateColumns: '2fr 1fr',
  gridTemplateRows: 'auto'
};

// Touch event handlers
const handleTouch = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    // Pinch zoom
    handlePinchZoom(e);
  } else {
    // Pan
    handlePan(e);
  }
};
```

### Export Functionality

```typescript
async function exportMapAsPNG() {
  const svg = document.querySelector('#map-canvas') as SVGElement;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Convert SVG to canvas
  const data = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(data);
  
  await new Promise(resolve => img.onload = resolve);
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  
  // Download
  const link = document.createElement('a');
  link.download = `rwanda-biodiversity-map-${new Date().toISOString()}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

function exportDataAsCSV(data: BiodiversityData[], layer: MapLayer) {
  const headers = ['District', 'Province', 'Value', 'Biodiversity Index', 'Species Richness'];
  const rows = data.map(d => [
    d.districtName,
    d.province,
    d[layer],
    d.biodiversityIndex,
    d.speciesRichness
  ]);
  
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.download = `rwanda-biodiversity-map-${layer}-${new Date().toISOString()}.csv`;
  link.href = URL.createObjectURL(blob);
  link.click();
}
```

## Integration Points

### Supabase Integration
- Fetch districts: `dataService.getDistricts()`
- Fetch indicators: `dataService.getIndicators()`
- Fetch risks: `dataService.getRisks()`
- Log exports: `dataService.logAuditEvent('export', metadata)`

### GBIF API Integration
- Endpoint: `https://api.gbif.org/v1/occurrence/search`
- Parameters: `country=RW&limit=5000&hasCoordinate=true`
- Rate limit: 100 requests/minute
- Caching: 30 minutes

### GeoJSON Files
- Districts: `/rwanda-districts.geojson` (existing)
- Protected Areas: `/rwanda-protected-areas.geojson` (to be added)
- Rivers: `/rwanda-rivers.geojson` (to be added)

## Testing Strategy

### Unit Tests
- Biodiversity index calculation
- Hotspot detection algorithm
- Threat level assessment
- Point clustering
- Color scale functions

### Integration Tests
- GBIF data fetch and processing
- Supabase data integration
- GeoJSON loading and parsing
- Layer switching
- Overlay toggling

### Performance Tests
- Render time with 500 occurrences
- Layer switch latency
- Memory usage with all overlays enabled
- Mobile responsiveness

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Color contrast validation
- ARIA label verification
