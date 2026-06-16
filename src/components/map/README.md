# Map Control Components

This directory contains UI components for the GIS Biodiversity Enhancement feature. These components provide interactive controls for layer switching, overlay management, data refresh, and dynamic legend display.

## Components

### LayerSwitcher

A dropdown control for switching between different map visualization layers.

**Props:**
- `activeLayer: MapLayer` - Currently active layer
- `onLayerChange: (layer: MapLayer) => void` - Callback when layer changes

**Supported Layers:**
1. Biodiversity Index
2. Forest Cover
3. Species Richness
4. Protected Areas
5. Wetlands
6. Threat Level
7. NBSAP Progress
8. Submission Status
9. Compliance Score

**Features:**
- Keyboard navigation (Tab, Enter, Arrow keys)
- ARIA labels for screen readers
- Focus indicators
- Matches MapPage dark theme styling

**Usage:**
```tsx
import { LayerSwitcher } from './components/map';

<LayerSwitcher
  activeLayer={activeLayer}
  onLayerChange={(layer) => setActiveLayer(layer)}
/>
```

---

### OverlayToggles

Checkbox controls for toggling map overlays on/off.

**Props:**
- `overlays: OverlayToggleConfig[]` - Array of overlay configurations
- `onToggle: (overlayId: MapOverlay) => void` - Callback when overlay is toggled

**OverlayToggleConfig Interface:**
```typescript
interface OverlayToggleConfig {
  id: MapOverlay;
  label: string;
  enabled: boolean;
  loading?: boolean;
  error?: string | null;
}
```

**Supported Overlays:**
1. GBIF Occurrences
2. Protected Area Borders
3. River Network

**Features:**
- Multiple overlays can be enabled simultaneously
- Loading indicators during data fetch
- Error state display
- Keyboard navigation (Tab, Space, Enter)
- ARIA labels and error descriptions
- Hover effects

**Usage:**
```tsx
import { OverlayToggles } from './components/map';

const overlays = [
  { id: 'gbif', label: 'GBIF Occurrences', enabled: false },
  { id: 'protected-areas', label: 'Protected Area Borders', enabled: true },
  { id: 'rivers', label: 'River Network', enabled: false },
];

<OverlayToggles
  overlays={overlays}
  onToggle={(id) => handleOverlayToggle(id)}
/>
```

---

### RefreshButton

A button for manually refreshing GBIF occurrence data.

**Props:**
- `onRefresh: () => void` - Callback when refresh is triggered
- `loading: boolean` - Whether data is currently loading
- `lastUpdated?: Date | null` - Timestamp of last data update
- `disabled?: boolean` - Whether button is disabled

**Features:**
- Loading state with spinner animation
- Disabled state during loading
- Last updated timestamp with relative time display
- Keyboard navigation (Tab, Enter, Space)
- ARIA labels and busy state
- Hover and focus effects

**Usage:**
```tsx
import { RefreshButton } from './components/map';

<RefreshButton
  onRefresh={handleRefresh}
  loading={isLoading}
  lastUpdated={lastUpdateTime}
/>
```

---

### MapLegend

A dynamic legend that updates based on the active map layer.

**Props:**
- `activeLayer: MapLayer` - Currently active layer
- `position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'` - Legend position (default: 'bottom-right')

**Features:**
- Dynamic content based on active layer
- Color-coded value ranges
- Data source attribution
- Configurable positioning
- Semi-transparent background with backdrop blur
- ARIA region label

**Usage:**
```tsx
import { MapLegend } from './components/map';

<div style={{ position: 'relative' }}>
  <svg>{/* Map content */}</svg>
  <MapLegend activeLayer={activeLayer} position="bottom-right" />
</div>
```

---

## Styling

All components use CSS-in-JS with inline styles to match the existing MapPage design:

- **Colors:** CSS variables (`var(--surface)`, `var(--text-1)`, `var(--border)`, `var(--sky-dim)`)
- **Typography:** 'DM Sans' for UI text, 'DM Mono' for data/labels
- **Borders:** 7px border radius for consistency
- **Shadows:** Subtle shadows on hover/focus
- **Transitions:** 0.2s for smooth interactions

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- ✅ Keyboard navigation support (Tab, Enter, Space)
- ✅ ARIA labels and descriptions
- ✅ Focus indicators (2px outline with offset)
- ✅ Minimum 44x44px touch targets
- ✅ Color contrast ratios meet AA standards
- ✅ Screen reader announcements for state changes

## Integration Example

See `MapControls.example.tsx` for a complete integration example showing:
- State management
- Event handling
- Layout composition
- Error handling

## Type Definitions

All components use TypeScript types from:
- `src/types/mapLayers.ts` - MapLayer type and layer configurations
- `src/types/overlays.ts` - MapOverlay type and overlay configurations

## Testing

To test components:
1. Import into MapPage.tsx
2. Wire up state management
3. Test keyboard navigation (Tab through controls, Enter/Space to activate)
4. Test screen reader compatibility
5. Verify styling matches existing MapPage theme

## Future Enhancements

Potential improvements:
- [ ] Add tooltips with layer descriptions
- [ ] Add keyboard shortcuts (e.g., 1-9 for layers)
- [ ] Add animation when switching layers
- [ ] Add export button for map snapshots
- [ ] Add zoom controls
- [ ] Add search/filter for overlays
