# Requirements Document: GIS-Based Biodiversity Visualization Enhancement

## Introduction

This feature enhances the existing MapPage component with advanced GIS-based biodiversity visualization capabilities. The system will integrate GBIF (Global Biodiversity Information Facility) occurrence data with Rwanda's district boundaries to provide real-time biodiversity monitoring, spatial analysis of NBSAP indicators, and interactive visualization of protected areas, species richness, and conservation threats. This enhancement transforms the map from a basic compliance visualization tool into a comprehensive biodiversity intelligence platform supporting Rwanda's NBSAP 2025-2030 implementation.

## Glossary

- **Map_System**: The enhanced MapPage component that displays Rwanda district boundaries with biodiversity overlays
- **GBIF_Service**: The Global Biodiversity Information Facility API integration service (useGBIF hook)
- **Layer_Switcher**: UI control allowing users to select one primary map visualization layer at a time
- **Overlay_Toggle**: UI control allowing users to enable/disable multiple data overlays simultaneously
- **Biodiversity_Index**: A calculated metric representing species diversity within a geographic area
- **Species_Richness**: The count of unique species observed within a geographic area
- **NBSAP_Target**: A specific biodiversity conservation goal from Rwanda's National Biodiversity Strategy and Action Plan
- **Protected_Area**: Legally designated conservation zones (national parks, reserves, wetlands)
- **Threat_Level**: A calculated risk assessment for biodiversity loss in a geographic area
- **Hotspot**: A geographic area with exceptionally high biodiversity value or conservation priority
- **GeoJSON_Boundary**: Vector geographic data defining district administrative boundaries
- **Occurrence_Point**: A specific geographic location where a species was observed (from GBIF)
- **Spatial_Analysis**: Geographic computation of indicator values aggregated by district or region
- **Data_Service**: The backend service layer (dataService.ts) for fetching data from Supabase
- **Real_Time_Refresh**: Automatic periodic fetching of updated GBIF occurrence data

## Requirements

### Requirement 1: Multi-Layer Map Visualization System

**User Story:** As a biodiversity analyst, I want to switch between different map visualization layers, so that I can analyze various aspects of Rwanda's biodiversity and conservation status.

#### Acceptance Criteria

1. THE Map_System SHALL display exactly one primary layer at any time
2. THE Layer_Switcher SHALL provide the following layer options: Biodiversity Index, Forest Cover, Species Richness, Protected Areas, Wetlands, Threat Level, and NBSAP Progress
3. WHEN a user selects a layer, THE Map_System SHALL color-code Rwanda districts according to that layer's data values
4. THE Map_System SHALL display a legend showing the color scale and value ranges for the active layer
5. WHEN layer data is unavailable for a district, THE Map_System SHALL display that district in a neutral color with a "No data" indicator
6. THE Map_System SHALL preserve the existing GeoJSON_Boundary rendering for Rwanda districts
7. THE Map_System SHALL maintain interactive hover tooltips showing district name, province, and layer-specific values

### Requirement 2: GBIF Occurrence Data Overlay

**User Story:** As a conservation officer, I want to see real-time species occurrence points on the map, so that I can identify where biodiversity observations are being recorded.

#### Acceptance Criteria

1. THE Map_System SHALL provide a toggleable "GBIF Occurrences" overlay
2. WHEN the GBIF Occurrences overlay is enabled, THE Map_System SHALL display occurrence points as markers on the map
3. THE GBIF_Service SHALL fetch occurrence data with geographic coordinates for Rwanda (country code RW)
4. THE Map_System SHALL limit displayed occurrences to a maximum of 500 points to maintain performance
5. WHEN a user hovers over an occurrence point, THE Map_System SHALL display a tooltip with species name, kingdom, family, and observation year
6. THE Map_System SHALL use different marker colors or icons to distinguish between kingdoms (Plants, Animals, Fungi)
7. WHEN GBIF data is loading, THE Map_System SHALL display a loading indicator on the overlay toggle
8. IF GBIF data fetch fails, THE Map_System SHALL display an error message and disable the overlay toggle

### Requirement 3: Protected Areas and Geographic Overlays

**User Story:** As a policy maker, I want to visualize protected area boundaries and river networks on the map, so that I can understand the spatial relationship between conservation zones and administrative districts.

#### Acceptance Criteria

1. THE Map_System SHALL provide toggleable overlays for Protected Area Borders and River Network
2. WHEN Protected Area Borders overlay is enabled, THE Map_System SHALL render protected area boundaries as distinct polygons with semi-transparent fill
3. WHEN River Network overlay is enabled, THE Map_System SHALL render major rivers as blue lines
4. THE Map_System SHALL allow multiple overlays to be enabled simultaneously
5. THE Map_System SHALL render overlays above the base layer but below occurrence points
6. THE Map_System SHALL load protected area and river network data from local GeoJSON files to avoid CORS issues
7. WHEN a user hovers over a protected area, THE Map_System SHALL display a tooltip with the area name and designation type

### Requirement 4: Biodiversity Index Calculation and Visualization

**User Story:** As a data analyst, I want to see biodiversity index values calculated for each district, so that I can compare biodiversity richness across Rwanda's administrative regions.

#### Acceptance Criteria

1. THE Data_Service SHALL calculate Biodiversity_Index for each district based on GBIF occurrence data
2. THE Biodiversity_Index calculation SHALL consider species count, kingdom diversity, and observation density
3. THE Map_System SHALL display Biodiversity_Index values using a color gradient from low (light) to high (dark green)
4. THE Map_System SHALL provide a visualization panel showing "Biodiversity Index by Rwanda Districts" as a sortable table or bar chart
5. THE Map_System SHALL update Biodiversity_Index calculations when new GBIF data is fetched
6. THE Map_System SHALL display the calculation timestamp for Biodiversity_Index data

### Requirement 5: Species Breakdown Visualization

**User Story:** As a biodiversity researcher, I want to see species counts broken down by taxonomic kingdom, so that I can understand the composition of Rwanda's documented biodiversity.

#### Acceptance Criteria

1. THE Map_System SHALL display a "Species by Kingdom" visualization panel
2. THE visualization SHALL show counts for the following kingdoms: Plantae, Animalia, Fungi, Chromista, Bacteria, Archaea, Protozoa, and Viruses
3. THE Map_System SHALL use a pie chart or bar chart to represent kingdom proportions
4. WHEN a user clicks on a kingdom segment, THE Map_System SHALL filter the GBIF Occurrences overlay to show only that kingdom
5. THE Map_System SHALL display the total unique species count across all kingdoms
6. THE Map_System SHALL update species counts when Real_Time_Refresh occurs

### Requirement 6: NBSAP Indicator Spatial Analysis

**User Story:** As an NBSAP coordinator, I want to see indicator values mapped spatially by district, so that I can identify geographic patterns in target achievement.

#### Acceptance Criteria

1. THE Map_System SHALL provide an "NBSAP Progress" layer showing indicator achievement by district
2. THE Data_Service SHALL aggregate indicator progress values by district from the indicators table
3. THE Map_System SHALL color-code districts based on average indicator progress (0-100%)
4. THE Map_System SHALL allow users to filter the NBSAP Progress layer by specific NBSAP_Target
5. WHEN a user hovers over a district in NBSAP Progress layer, THE Map_System SHALL display the district's average progress percentage and number of indicators
6. THE Map_System SHALL provide a dropdown selector to choose which NBSAP_Target to visualize

### Requirement 7: Biodiversity Hotspot Identification

**User Story:** As a conservation planner, I want the system to automatically identify biodiversity hotspots, so that I can prioritize conservation efforts in high-value areas.

#### Acceptance Criteria

1. THE Map_System SHALL calculate and display Hotspot designations for districts
2. A district SHALL be designated as a Hotspot IF its Biodiversity_Index is in the top 20% AND its Species_Richness is in the top 20%
3. THE Map_System SHALL highlight Hotspot districts with a distinct visual indicator (border, icon, or badge)
4. THE Map_System SHALL provide a "Biodiversity Hotspots" list panel showing hotspot districts ranked by priority
5. THE hotspot list SHALL display district name, Biodiversity_Index, Species_Richness, and Protected_Area coverage percentage
6. WHEN a user clicks on a hotspot in the list, THE Map_System SHALL zoom to and highlight that district

### Requirement 8: Real-Time GBIF Data Refresh

**User Story:** As a system administrator, I want GBIF data to refresh automatically at regular intervals, so that the map displays current biodiversity observations without manual intervention.

#### Acceptance Criteria

1. THE GBIF_Service SHALL automatically refresh occurrence data every 30 minutes
2. THE Map_System SHALL display a "Last Updated" timestamp showing when GBIF data was last fetched
3. THE Map_System SHALL provide a manual "Refresh Now" button to trigger immediate data refresh
4. WHEN Real_Time_Refresh is in progress, THE Map_System SHALL display a loading indicator without blocking user interaction
5. IF Real_Time_Refresh fails, THE Map_System SHALL retry up to 3 times with exponential backoff
6. THE Map_System SHALL log refresh events to the browser console for debugging
7. THE Map_System SHALL preserve user's current layer and overlay selections during refresh

### Requirement 9: Protected Areas Data Management

**User Story:** As a GIS administrator, I want to manage protected areas data locally, so that the system works reliably without external API dependencies.

#### Acceptance Criteria

1. THE Map_System SHALL load protected areas data from a local GeoJSON file at public/rwanda-protected-areas.geojson
2. THE protected areas GeoJSON file SHALL include properties for area name, designation type (National Park, Reserve, Wetland), and area size
3. IF the protected areas GeoJSON file is missing or empty, THE Map_System SHALL display a warning message and disable the Protected Area Borders overlay
4. THE Map_System SHALL validate protected areas GeoJSON structure on load and log errors if invalid
5. THE Map_System SHALL provide a "Protected Areas" list panel showing all protected areas with name, type, and size

### Requirement 10: Threat Level Assessment Layer

**User Story:** As a risk analyst, I want to see threat levels for biodiversity loss mapped by district, so that I can identify areas requiring urgent intervention.

#### Acceptance Criteria

1. THE Map_System SHALL provide a "Threat Level" layer showing risk assessment by district
2. THE Threat_Level calculation SHALL consider forest cover loss, species decline trends, and proximity to development zones
3. THE Map_System SHALL color-code districts using a red-yellow-green scale (High-Medium-Low threat)
4. THE Map_System SHALL display threat level categories: High (red), Medium (yellow), Low (green)
5. WHEN a user hovers over a district in Threat Level layer, THE Map_System SHALL display contributing risk factors
6. THE Map_System SHALL integrate with the existing risks table to incorporate documented biodiversity risks

### Requirement 11: Performance Optimization for Large Datasets

**User Story:** As a user, I want the map to remain responsive when displaying large amounts of biodiversity data, so that I can interact with visualizations smoothly.

#### Acceptance Criteria

1. THE Map_System SHALL render up to 500 GBIF occurrence points without performance degradation
2. WHEN occurrence point count exceeds 500, THE Map_System SHALL implement clustering to group nearby points
3. THE Map_System SHALL use SVG rendering for vector layers and Canvas rendering for large point datasets
4. THE Map_System SHALL implement viewport-based rendering to only draw visible map elements
5. THE Map_System SHALL debounce hover events to prevent excessive tooltip rendering
6. THE Map_System SHALL load GeoJSON data asynchronously without blocking the UI thread
7. THE Map_System SHALL display a loading skeleton during initial data fetch

### Requirement 12: Mobile-Responsive Map Interface

**User Story:** As a field officer using a mobile device, I want the map interface to be fully functional on small screens, so that I can access biodiversity data in the field.

#### Acceptance Criteria

1. THE Map_System SHALL adapt layout for screen widths below 768px
2. WHEN on mobile, THE Layer_Switcher SHALL collapse into a dropdown menu
3. WHEN on mobile, THE overlay toggles SHALL stack vertically in a collapsible panel
4. THE Map_System SHALL support touch gestures for pan and zoom on mobile devices
5. THE Map_System SHALL display simplified tooltips on mobile to avoid screen clutter
6. THE visualization panels SHALL stack vertically on mobile screens
7. THE Map_System SHALL maintain a minimum tap target size of 44x44 pixels for all interactive elements

### Requirement 13: Data Export and Reporting

**User Story:** As a report author, I want to export map visualizations and underlying data, so that I can include biodiversity analysis in official reports.

#### Acceptance Criteria

1. THE Map_System SHALL provide an "Export" button with options for PNG image and CSV data
2. WHEN exporting as PNG, THE Map_System SHALL capture the current map view including active layer and overlays
3. WHEN exporting as CSV, THE Map_System SHALL include district names, active layer values, and overlay data
4. THE exported CSV SHALL include metadata: export date, active layer, enabled overlays, and data source timestamps
5. THE Map_System SHALL generate a filename with format: "rwanda-biodiversity-map-{layer}-{date}.{ext}"
6. THE Map_System SHALL log export events to the audit_log table with action_type "export"

### Requirement 14: Integration with Existing District Data

**User Story:** As a system integrator, I want the new biodiversity layers to seamlessly integrate with existing district compliance and forest cover data, so that users have a unified data experience.

#### Acceptance Criteria

1. THE Map_System SHALL preserve existing layer options: Submission Status, Compliance Score, and Forest Cover
2. THE Data_Service SHALL fetch district data from the existing districts table in Supabase
3. THE Map_System SHALL match GeoJSON_Boundary features to district records using normalized name matching
4. WHEN district data is updated in Supabase, THE Map_System SHALL reflect changes on next page load or manual refresh
5. THE Map_System SHALL display a warning IF GeoJSON districts do not match database district records
6. THE Map_System SHALL maintain backward compatibility with existing MapPage component structure

### Requirement 15: GBIF Live Records Counter

**User Story:** As a biodiversity monitor, I want to see a real-time counter of GBIF records for Rwanda, so that I can track the growth of biodiversity documentation.

#### Acceptance Criteria

1. THE Map_System SHALL display a "GBIF Live Records" counter showing total occurrence count for Rwanda
2. THE counter SHALL update automatically when Real_Time_Refresh occurs
3. THE counter SHALL display the count in a prominent, easy-to-read format with thousands separators
4. THE Map_System SHALL show a trend indicator (up/down arrow) comparing current count to previous refresh
5. WHEN a user clicks on the counter, THE Map_System SHALL display a breakdown by year showing observation trends
6. THE counter SHALL include a tooltip showing the last update timestamp

## Special Requirements Guidance

### Parser and Serializer Requirements

This feature does not require custom parsers or serializers. GeoJSON parsing is handled by the browser's native JSON.parse() function, and GBIF API responses are standard JSON. No round-trip testing is needed for this feature.

### Data Source Requirements

1. **GBIF API**: All GBIF occurrence data SHALL be fetched from https://api.gbif.org/v1 using the existing useGBIF hook
2. **Local GeoJSON Files**: Protected areas and river network data SHALL be stored as static GeoJSON files in the public/ directory
3. **Supabase Database**: District data, indicator data, and risk data SHALL be fetched from existing Supabase tables using dataService.ts
4. **No CORS Issues**: All data sources SHALL be configured to avoid CORS errors (local files, public APIs, authenticated Supabase)

### Performance Requirements

1. **Initial Load Time**: THE Map_System SHALL render the initial map view within 2 seconds on a standard broadband connection
2. **Layer Switch Time**: THE Map_System SHALL switch between layers within 500ms
3. **Overlay Toggle Time**: THE Map_System SHALL enable/disable overlays within 300ms
4. **GBIF Data Fetch**: THE GBIF_Service SHALL complete data fetch within 5 seconds or display a timeout warning

### Accessibility Requirements

1. THE Map_System SHALL provide keyboard navigation for layer switcher and overlay toggles
2. THE Map_System SHALL include ARIA labels for all interactive map controls
3. THE Map_System SHALL provide text alternatives for color-coded visualizations in tooltips
4. THE Map_System SHALL maintain sufficient color contrast (WCAG AA) for all text overlays

### Security Requirements

1. THE Map_System SHALL NOT expose sensitive species location data for endangered species
2. THE Map_System SHALL respect existing Supabase RLS policies when fetching district and indicator data
3. THE Map_System SHALL sanitize all user inputs in search and filter controls to prevent XSS attacks
4. THE Map_System SHALL log all data export actions to the audit_log table for compliance tracking
