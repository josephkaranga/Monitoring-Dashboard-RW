# Biodiversity Visualization Panels

This directory contains React components for displaying biodiversity metrics, species breakdowns, hotspots, and protected areas data.

## Components

### BiodiversityIndexPanel

Displays biodiversity index for all districts in a sortable table.

**Props:**
- `biodiversityData: Map<number, BiodiversityData>` - Map of district ID to biodiversity data
- `loading?: boolean` - Loading state
- `onDistrictClick?: (districtId: number) => void` - Callback when district is clicked

**Features:**
- Sortable columns (district name, biodiversity index, species richness, occurrence count)
- Color-coded biodiversity index with progress bars
- Province information for each district
- Responsive table with scrolling

**Usage:**
```tsx
<BiodiversityIndexPanel
  biodiversityData={biodiversityData}
  loading={loading}
  onDistrictClick={(districtId) => {
    // Zoom to district on map or highlight it
    console.log('District clicked:', districtId);
  }}
/>
```

---

### SpeciesByKingdomPanel

Visual breakdown of species by taxonomic kingdom with pie/bar chart.

**Props:**
- `occurrences: GBIFOccurrence[]` - Array of GBIF occurrences
- `loading?: boolean` - Loading state
- `onKingdomClick?: (kingdom: string | null) => void` - Callback when kingdom is clicked
- `selectedKingdom?: string | null` - Currently selected kingdom for filtering

**Features:**
- Toggle between bar chart and pie chart views
- Click kingdom to filter map occurrences
- Color-coded kingdoms matching map overlay colors
- Shows species count and percentage for each kingdom
- Clear filter button when kingdom is selected

**Usage:**
```tsx
const [selectedKingdom, setSelectedKingdom] = useState<string | null>(null);

<SpeciesByKingdomPanel
  occurrences={occurrences}
  loading={loading}
  onKingdomClick={setSelectedKingdom}
  selectedKingdom={selectedKingdom}
/>
```

---

### HotspotsListPanel

Ranked list of biodiversity hotspots with priority scores.

**Props:**
- `hotspots: BiodiversityHotspot[]` - Array of hotspot districts
- `loading?: boolean` - Loading state
- `onHotspotClick?: (districtId: number) => void` - Callback when hotspot is clicked

**Features:**
- Ranked list with priority badges (1, 2, 3, etc.)
- Color-coded priority levels (Critical, High, Medium, Moderate)
- Shows biodiversity index, species richness, and protected area coverage
- Hover effects with priority color borders

**Usage:**
```tsx
import { identifyHotspots } from '../../utils/hotspotDetection';

const hotspots = identifyHotspots(
  Array.from(biodiversityData.values())
);

<HotspotsListPanel
  hotspots={hotspots}
  loading={loading}
  onHotspotClick={(districtId) => {
    // Zoom to hotspot on map
    console.log('Hotspot clicked:', districtId);
  }}
/>
```

---

### ProtectedAreasListPanel

List of protected areas with filtering by designation type.

**Props:**
- `areas: ProtectedArea[]` - Array of protected area features
- `loading?: boolean` - Loading state
- `onAreaClick?: (areaName: string) => void` - Callback when area is clicked

**Features:**
- Filter by designation type (National Park, Reserve, Wetland, Forest Reserve)
- Color-coded area types with icons
- Shows area size and establishment date
- Total area calculation in footer

**Usage:**
```tsx
import { useProtectedAreas } from '../../hooks/useProtectedAreas';

const { areas, loading } = useProtectedAreas();

<ProtectedAreasListPanel
  areas={areas?.features || []}
  loading={loading}
  onAreaClick={(areaName) => {
    // Highlight area on map
    console.log('Protected area clicked:', areaName);
  }}
/>
```

---

### GBIFLiveCounter

Animated counter displaying total GBIF occurrences with trend indicator.

**Props:**
- `currentCount: number` - Current occurrence count
- `previousCount?: number` - Previous count for trend calculation
- `lastUpdated: Date | null` - Timestamp of last data fetch
- `loading?: boolean` - Loading state
- `onRefresh?: () => void` - Callback for manual refresh

**Features:**
- Animated counter with smooth easing
- Trend indicator (up/down arrow with percentage change)
- Shows absolute change and previous count
- Relative time display (e.g., "5m ago", "2h ago")
- Manual refresh button
- Gradient background with decorative elements

**Usage:**
```tsx
const [previousCount, setPreviousCount] = useState(0);
const { occurrences, totalCount, lastUpdated, loading, refresh } = useGBIFOccurrences();

const handleRefresh = async () => {
  setPreviousCount(totalCount);
  await refresh();
};

<GBIFLiveCounter
  currentCount={totalCount}
  previousCount={previousCount}
  lastUpdated={lastUpdated}
  loading={loading}
  onRefresh={handleRefresh}
/>
```

---

## Styling

All panels follow the existing dashboard design system:

- **Colors**: Use CSS variables (`var(--surface)`, `var(--text-1)`, etc.)
- **Typography**: DM Sans for body, Playfair Display for numbers, DM Mono for metadata
- **Spacing**: Consistent padding (18px for panels, 12px for internal elements)
- **Borders**: `var(--border)` with `var(--radius)` for rounded corners
- **Shadows**: `var(--shadow-sm)` for subtle elevation
- **Icons**: Font Awesome solid icons

### Kingdom Colors

Kingdom colors are defined in `src/types/overlays.ts`:

```typescript
export const kingdomColors: Record<string, string> = {
  'Plantae': '#10b981',      // green
  'Animalia': '#3b82f6',     // blue
  'Fungi': '#f59e0b',        // orange
  'Chromista': '#8b5cf6',    // purple
  'Bacteria': '#ef4444',     // red
  'Archaea': '#ec4899',      // pink
  'Protozoa': '#14b8a6',     // teal
  'Viruses': '#6b7280',      // gray
  'default': '#9ca3af',      // light gray
};
```

---

## Mobile Responsiveness

All panels are designed to be responsive:

- Tables have horizontal scrolling on small screens
- Grid layouts use `repeat(auto-fit, minmax(400px, 1fr))` for flexible columns
- Touch-friendly tap targets (minimum 44x44px)
- Simplified tooltips on mobile

---

## Integration Example

See `PanelsExample.tsx` for a complete example showing:

- Data fetching with custom hooks
- State management for filters and selections
- Event handling for interactive features
- Layout patterns for panel arrangement

---

## Testing

To test the panels:

1. **With real data**: Use the hooks to fetch actual GBIF and Supabase data
2. **With mock data**: Pass sample data directly to props
3. **Loading states**: Set `loading={true}` to test skeleton screens
4. **Empty states**: Pass empty arrays/maps to test no-data messages
5. **Interactive features**: Test click handlers and filter functionality

---

## Performance Considerations

- **Memoization**: Use `useMemo` for expensive calculations (sorting, filtering)
- **Virtualization**: For very long lists (>100 items), consider adding virtual scrolling
- **Debouncing**: Hover events are not debounced; add debouncing if performance issues occur
- **Animation**: Counter animation uses `requestAnimationFrame` for smooth 60fps

---

## Accessibility

- All interactive elements have proper cursor styles
- Color is not the only indicator (text labels accompany colors)
- Keyboard navigation works for sortable tables
- Screen readers can access all data through semantic HTML

---

## Future Enhancements

Potential improvements:

1. **Export functionality**: Add CSV/PNG export buttons to each panel
2. **Customization**: Allow users to configure chart types and color schemes
3. **Tooltips**: Add detailed tooltips on hover for more context
4. **Animations**: Add enter/exit animations for list items
5. **Search**: Add search/filter inputs for large datasets
6. **Comparison**: Allow comparing multiple districts side-by-side
