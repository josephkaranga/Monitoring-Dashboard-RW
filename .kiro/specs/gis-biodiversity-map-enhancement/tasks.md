# Implementation Tasks: GIS-Based Biodiversity Visualization Enhancement

## Task 1: Setup Project Structure and Types

Create the foundational file structure, TypeScript interfaces, and type definitions for the biodiversity visualization system.

### Sub-tasks:
- [x] 1.1 Create `src/types/biodiversity.ts` with BiodiversityData, GBIFOccurrence, and related interfaces
- [x] 1.2 Create `src/types/mapLayers.ts` with MapLayer, LayerConfig, and color scale types
- [x] 1.3 Create `src/types/overlays.ts` with MapOverlay, OverlayConfig, and ClusteredPoint types
- [x] 1.4 Create folder structure: `src/components/map/`, `src/components/panels/`, `src/hooks/`, `src/utils/`
- [x] 1.5 Update `tsconfig.json` if needed for path aliases

## Task 2: Implement Biodiversity Calculation Utilities

Create utility functions for calculating biodiversity metrics, hotspot detection, and threat assessment.

### Sub-tasks:
- [x] 2.1 Create `src/utils/biodiversityCalculations.ts` with `calculateBiodiversityIndex()` function
- [x] 2.2 Implement `calculateSpeciesRichness()` function in biodiversityCalculations.ts
- [x] 2.3 Create `src/utils/hotspotDetection.ts` with `identifyHotspots()` algorithm
- [x] 2.4 Create `src/utils/threatAssessment.ts` with `calculateThreatLevel()` function
- [x] 2.5 Create `src/utils/pointClustering.ts` with `clusterOccurrences()` for performance optimization
- [x] 2.6 Create `src/utils/geoUtils.ts` with helper functions for coordinate transformations and distance calculations
- [x] 2.7 Write unit tests for all calculation functions

## Task 3: Create Custom Hooks for Data Management

Implement React hooks for fetching and managing biodiversity data, protected areas, and GBIF occurrences.

### Sub-tasks:
- [x] 3.1 Enhance `src/hooks/useGBIF.ts` to support Rwanda-specific queries with caching
- [x] 3.2 Create `src/hooks/useBiodiversityData.ts` to calculate and manage biodiversity metrics
- [x] 3.3 Create `src/hooks/useProtectedAreas.ts` to load protected areas GeoJSON
- [x] 3.4 Create `src/hooks/useRiverNetwork.ts` to load river network GeoJSON
- [x] 3.5 Create `src/hooks/useMapLayers.ts` to manage layer state and data sources
- [x] 3.6 Implement auto-refresh logic in useGBIF (30-minute interval)
- [x] 3.7 Add error handling and retry logic with exponential backoff

## Task 4: Download and Prepare GeoJSON Data Files

Obtain and prepare the protected areas and river network GeoJSON files for local hosting.

### Sub-tasks:
- [x] 4.1 Research and download Rwanda protected areas GeoJSON data
- [x] 4.2 Validate and simplify protected areas GeoJSON (reduce file size if needed)
- [x] 4.3 Save as `public/rwanda-protected-areas.geojson` with proper properties (name, type, area)
- [x] 4.4 Research and download Rwanda river network GeoJSON data
- [x] 4.5 Validate and simplify river network GeoJSON
- [x] 4.6 Save as `public/rwanda-rivers.geojson`
- [x] 4.7 Update `public/README.md` with data sources and licenses

## Task 5: Implement Map Control Components

Create UI components for layer switching, overlay toggles, and refresh controls.

### Sub-tasks:
- [x] 5.1 Create `src/components/map/LayerSwitcher.tsx` with dropdown for 9 layer options
- [x] 5.2 Create `src/components/map/OverlayToggles.tsx` with checkboxes for 3 overlays
- [x] 5.3 Create `src/components/map/RefreshButton.tsx` with manual GBIF refresh and loading state
- [x] 5.4 Create `src/components/map/MapLegend.tsx` with dynamic legend based on active layer
- [x] 5.5 Style components to match existing MapPage design
- [x] 5.6 Add keyboard navigation support (Tab, Enter, Space)
- [x] 5.7 Add ARIA labels for accessibility

## Task 6: Implement Map Overlay Components

Create SVG overlay components for GBIF occurrences, protected areas, and river networks.

### Sub-tasks:
- [x] 6.1 Create `src/components/map/GBIFOccurrencesOverlay.tsx` with circle markers
- [x] 6.2 Implement kingdom-based color coding in GBIFOccurrencesOverlay
- [x] 6.3 Add clustering logic for >500 occurrences
- [x] 6.4 Create `src/components/map/ProtectedAreasOverlay.tsx` with polygon rendering
- [x] 6.5 Create `src/components/map/RiverNetworkOverlay.tsx` with line rendering
- [x] 6.6 Implement hover tooltips for all overlay elements
- [x] 6.7 Add loading states and error handling for each overlay

## Task 7: Implement Visualization Panel Components

Create side panel components for biodiversity metrics, species breakdown, and hotspots.

### Sub-tasks:
- [x] 7.1 Create `src/components/panels/BiodiversityIndexPanel.tsx` with sortable district table
- [x] 7.2 Create `src/components/panels/SpeciesByKingdomPanel.tsx` with pie/bar chart
- [x] 7.3 Create `src/components/panels/HotspotsListPanel.tsx` with ranked hotspot list
- [x] 7.4 Create `src/components/panels/ProtectedAreasListPanel.tsx` with area details
- [x] 7.5 Create `src/components/panels/GBIFLiveCounter.tsx` with animated counter and trend indicator
- [x] 7.6 Implement click handlers for interactive filtering (e.g., click kingdom to filter map)
- [x] 7.7 Style panels to match existing dashboard design

## Task 8: Enhance MapPage with Layer System

Integrate the new layer system into the existing MapPage component.

### Sub-tasks:
- [x] 8.1 Add state management for active layer and enabled overlays
- [x] 8.2 Implement layer data fetching and caching
- [x] 8.3 Create color scale functions for each layer type
- [x] 8.4 Update district rendering to use active layer colors
- [x] 8.5 Preserve existing layers (submission, compliance, forest cover)
- [x] 8.6 Implement layer switching with <500ms transition
- [x] 8.7 Update tooltip content based on active layer

## Task 9: Implement NBSAP Progress Layer

Create the NBSAP Progress layer with indicator spatial analysis.

### Sub-tasks:
- [x] 9.1 Extend dataService.ts with `getIndicatorsByDistrict()` function
- [x] 9.2 Implement indicator aggregation logic (average progress per district)
- [x] 9.3 Create target filter dropdown in MapControls
- [x] 9.4 Implement district coloring based on indicator progress (0-100%)
- [x] 9.5 Add tooltip showing progress percentage and indicator count
- [x] 9.6 Handle districts with no indicator data (neutral color)

## Task 10: Implement Threat Level Layer

Create the Threat Level layer with risk assessment visualization.

### Sub-tasks:
- [x] 10.1 Extend dataService.ts with `getRisksByDistrict()` function
- [x] 10.2 Implement threat level calculation algorithm (high/medium/low)
- [x] 10.3 Create red-yellow-green color scale for threat levels
- [x] 10.4 Add tooltip showing contributing risk factors
- [x] 10.5 Integrate with existing risks table in Supabase
- [x] 10.6 Handle districts with no risk data

## Task 11: Implement Performance Optimizations

Add performance enhancements for smooth interaction with large datasets.

### Sub-tasks:
- [x] 11.1 Implement React.memo for expensive components (overlays, panels)
- [x] 11.2 Add debouncing to hover event handlers (300ms)
- [x] 11.3 Implement viewport-based rendering (only draw visible elements)
- [x] 11.4 Add lazy loading for overlay data (load on first enable)
- [x] 11.5 Implement Canvas fallback for >500 occurrence points
- [x] 11.6 Add loading skeletons for initial data fetch
- [x] 11.7 Profile and optimize render performance (target <16ms per frame)

## Task 12: Implement Mobile Responsive Design

Adapt the map interface for mobile devices with touch support.

### Sub-tasks:
- [x] 12.1 Add responsive CSS media queries for <768px screens
- [x] 12.2 Convert LayerSwitcher to collapsible dropdown on mobile
- [x] 12.3 Stack OverlayToggles vertically in collapsible panel on mobile
- [x] 12.4 Implement touch gesture handlers (pan, pinch zoom)
- [x] 12.5 Simplify tooltips for mobile (smaller, less text)
- [x] 12.6 Stack visualization panels vertically on mobile
- [x] 12.7 Ensure minimum 44x44px tap targets for all interactive elements

## Task 13: Implement Data Export Functionality

Add export capabilities for map visualizations and underlying data.

### Sub-tasks:
- [x] 13.1 Create export button with dropdown (PNG, CSV options)
- [x] 13.2 Implement `exportMapAsPNG()` function using SVG-to-Canvas conversion
- [x] 13.3 Implement `exportDataAsCSV()` function with metadata
- [x] 13.4 Generate descriptive filenames with layer and date
- [x] 13.5 Extend dataService.ts with `logAuditEvent()` for export tracking
- [x] 13.6 Add loading state during export generation
- [x] 13.7 Handle export errors gracefully

## Task 14: Implement Real-Time GBIF Refresh

Add automatic and manual GBIF data refresh functionality.

### Sub-tasks:
- [x] 14.1 Implement 30-minute auto-refresh timer in useGBIF hook
- [x] 14.2 Add "Last Updated" timestamp display
- [x] 14.3 Create manual "Refresh Now" button
- [x] 14.4 Implement retry logic with exponential backoff (3 attempts)
- [x] 14.5 Add loading indicator during refresh (non-blocking)
- [x] 14.6 Preserve user's layer and overlay selections during refresh
- [x] 14.7 Log refresh events to browser console

## Task 15: Update CSP and API Configuration

Update Content Security Policy and API configurations to support new data sources.

### Sub-tasks:
- [x] 15.1 Update `index.html` CSP meta tag to allow GBIF API domain
- [x] 15.2 Update `vercel.json` CSP headers for production
- [x] 15.3 Update `vite.config.ts` CSP headers for local development
- [x] 15.4 Verify no CORS issues with GBIF API
- [x] 15.5 Test GeoJSON file loading from public folder

## Task 16: Integration Testing and Bug Fixes

Test the complete system integration and fix any issues.

### Sub-tasks:
- [x] 16.1 Test all 9 layer switches with real data
- [x] 16.2 Test all 3 overlay toggles individually and in combination
- [x] 16.3 Test GBIF data refresh (auto and manual)
- [x] 16.4 Test biodiversity calculations with various data scenarios
- [x] 16.5 Test hotspot detection algorithm
- [x] 16.6 Test export functionality (PNG and CSV)
- [x] 16.7 Test mobile responsiveness on various screen sizes
- [x] 16.8 Test keyboard navigation and accessibility
- [x] 16.9 Fix any bugs discovered during testing
- [x] 16.10 Verify performance targets (load time, layer switch time)

## Task 17: Documentation and Deployment

Update documentation and deploy the enhanced map feature.

### Sub-tasks:
- [x] 17.1 Update `DOCUMENTATION.md` with new map features
- [-] 17.2 Add inline code comments for complex algorithms
- [-] 17.3 Create user guide for map layers and overlays
- [x] 17.4 Document data sources and licenses in public/README.md
- [-] 17.5 Update README.md with feature screenshots
- [-] 17.6 Commit all changes with descriptive commit messages
- [-] 17.7 Push to repository and verify Vercel deployment
- [-] 17.8 Test deployed version on production URL
- [-] 17.9 Monitor for any production errors or performance issues

## Optional Enhancements

- [ ]* Add species search/filter functionality
- [ ]* Implement time-series animation for GBIF data over years
- [ ]* Add comparison mode (side-by-side layer comparison)
- [ ]* Implement custom area selection for detailed analysis
- [ ]* Add print-friendly map view
- [ ]* Integrate with additional biodiversity data sources
- [ ]* Add user preferences for default layer and overlays
- [ ]* Implement map bookmarking/sharing functionality

## Notes

- Tasks should be completed in order as they have dependencies
- Each sub-task should be tested before moving to the next
- Use existing MapPage.tsx as reference for styling and patterns
- Maintain backward compatibility with existing map features
- Follow TypeScript best practices and existing code style
- Ensure all new code has proper error handling
- Test on both desktop and mobile devices throughout development
