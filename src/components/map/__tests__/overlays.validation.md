# Map Overlay Components Validation Checklist

This document provides a manual testing checklist for the map overlay components.

## GBIFOccurrencesOverlay Component

### Functional Tests
- [ ] Component renders without errors with valid occurrence data
- [ ] Renders correct number of circles for small datasets (<500 occurrences)
- [ ] Applies clustering for large datasets (>500 occurrences)
- [ ] Circles are positioned correctly based on lat/lon coordinates
- [ ] onHover callback is triggered on mouse enter/leave

### Kingdom-Based Color Coding Tests
- [ ] Animalia occurrences render in blue (#3b82f6)
- [ ] Plantae occurrences render in green (#10b981)
- [ ] Fungi occurrences render in orange (#f59e0b)
- [ ] Chromista occurrences render in purple (#8b5cf6)
- [ ] Bacteria occurrences render in red (#ef4444)
- [ ] Unknown kingdoms render in default gray (#9ca3af)

### Clustering Tests (>500 occurrences)
- [ ] Clusters are created using grid-based algorithm (0.1° grid)
- [ ] Cluster circles are larger than individual occurrence circles
- [ ] Cluster size scales logarithmically with occurrence count
- [ ] Cluster tooltips show count and species count
- [ ] Clustering reduces render count to improve performance

### Hover Interaction Tests
- [ ] Circle opacity increases from 0.7 to 1.0 on hover
- [ ] Circle radius increases by 30% on hover
- [ ] onHover callback receives occurrence data on mouse enter
- [ ] onHover callback receives null on mouse leave
- [ ] Tooltip shows scientific name, kingdom, and location
- [ ] Smooth transition animations (0.2s)

### Loading State Tests
- [ ] Loading text appears when loading=true
- [ ] Loading text is positioned correctly in SVG
- [ ] Loading text uses correct font and color

### Error State Tests
- [ ] Error text appears when error prop is set
- [ ] Error text is red (#f43f5e)
- [ ] Error text is positioned correctly in SVG

### Empty Data Tests
- [ ] Component returns null when occurrences array is empty
- [ ] No errors thrown with empty data

### Accessibility Tests
- [ ] Overlay group has aria-label "GBIF species occurrences"
- [ ] Each circle has descriptive aria-label
- [ ] SVG title elements provide detailed information
- [ ] Keyboard navigation works (if implemented)

---

## ProtectedAreasOverlay Component

### Functional Tests
- [ ] Component renders without errors with valid GeoJSON data
- [ ] Renders correct number of polygons
- [ ] Polygons are positioned correctly based on coordinates
- [ ] onHover callback is triggered on mouse enter/leave

### Polygon Rendering Tests
- [ ] Polygon type geometries render correctly
- [ ] MultiPolygon type geometries render correctly
- [ ] Exterior rings render as filled polygons
- [ ] Coordinates are converted correctly (negative latitude for SVG)
- [ ] Path data is generated correctly from GeoJSON

### Designation Type Color Coding Tests
- [ ] National Parks render in green (#16a34a)
- [ ] Reserves render in cyan (#0891b2)
- [ ] Wetlands render in blue (#0ea5e9)
- [ ] Forest Reserves render in emerald (#059669)
- [ ] Unknown types render in default green (#10b981)

### Visual Style Tests
- [ ] Fill opacity is 0.2 (semi-transparent)
- [ ] Stroke opacity is 0.8
- [ ] Stroke width is 0.008
- [ ] Stroke color matches fill color
- [ ] White stroke for visibility

### Hover Interaction Tests
- [ ] Fill opacity increases from 0.2 to 0.35 on hover
- [ ] Stroke width increases from 0.008 to 0.012 on hover
- [ ] onHover callback receives area data on mouse enter
- [ ] onHover callback receives null on mouse leave
- [ ] Tooltip shows name, type, area, and establishment date
- [ ] Smooth transition animations (0.2s)

### Loading State Tests
- [ ] Loading text appears when loading=true
- [ ] Loading text is positioned correctly in SVG
- [ ] Loading text uses correct font and color

### Error State Tests
- [ ] Error text appears when error prop is set
- [ ] Error text is red (#f43f5e)
- [ ] Error text is positioned correctly in SVG

### Empty Data Tests
- [ ] Component returns null when areas is null
- [ ] Component returns null when features array is empty
- [ ] No errors thrown with empty data

### Accessibility Tests
- [ ] Overlay group has aria-label "Protected areas"
- [ ] Each path has descriptive aria-label
- [ ] SVG title elements provide detailed information

---

## RiverNetworkOverlay Component

### Functional Tests
- [ ] Component renders without errors with valid GeoJSON data
- [ ] Renders correct number of line paths
- [ ] Lines are positioned correctly based on coordinates
- [ ] onHover callback is triggered on mouse enter/leave

### Line Rendering Tests
- [ ] LineString type geometries render correctly
- [ ] MultiLineString type geometries render correctly
- [ ] Coordinates are converted correctly (negative latitude for SVG)
- [ ] Path data is generated correctly from GeoJSON
- [ ] Lines have no fill (fill="none")

### Stroke Width Variation Tests
- [ ] Major rivers (>100km) have stroke width 0.012
- [ ] Medium rivers (50-100km) have stroke width 0.008
- [ ] Small rivers (<50km) have stroke width 0.005
- [ ] Stroke width scales appropriately with river length

### Visual Style Tests
- [ ] Stroke color is blue (#0ea5e9)
- [ ] Stroke opacity is 0.6
- [ ] Stroke linecap is "round"
- [ ] Stroke linejoin is "round"
- [ ] Lines appear smooth and natural

### Hover Interaction Tests
- [ ] Stroke opacity increases from 0.6 to 0.9 on hover
- [ ] Stroke width increases by 50% on hover
- [ ] onHover callback receives river data on mouse enter
- [ ] onHover callback receives null on mouse leave
- [ ] Tooltip shows river name and length
- [ ] Smooth transition animations (0.2s)

### Loading State Tests
- [ ] Loading text appears when loading=true
- [ ] Loading text is positioned correctly in SVG
- [ ] Loading text uses correct font and color

### Error State Tests
- [ ] Error text appears when error prop is set
- [ ] Error text is red (#f43f5e)
- [ ] Error text is positioned correctly in SVG

### Empty Data Tests
- [ ] Component returns null when rivers is null
- [ ] Component returns null when features array is empty
- [ ] No errors thrown with empty data

### Accessibility Tests
- [ ] Overlay group has aria-label "River network"
- [ ] Each path has descriptive aria-label
- [ ] SVG title elements provide detailed information

---

## Integration Tests

### Multiple Overlays
- [ ] All three overlays can render simultaneously
- [ ] Overlays don't interfere with each other
- [ ] Correct z-order (rivers → protected areas → GBIF points)
- [ ] Performance is acceptable with all overlays enabled

### Coordinate System
- [ ] All overlays use same coordinate system as base map
- [ ] Longitude values are positive (East)
- [ ] Latitude values are negative in SVG (Y increases downward)
- [ ] Overlays align correctly with district boundaries

### Hover Interactions
- [ ] Only one overlay element can be hovered at a time
- [ ] Hover state resets when moving between elements
- [ ] onHover callbacks work correctly for all overlay types
- [ ] No z-index conflicts during hover

### Performance Tests
- [ ] GBIF overlay with 500 occurrences renders in <100ms
- [ ] GBIF overlay with 5000 occurrences (clustered) renders in <200ms
- [ ] Protected areas overlay with 10 polygons renders in <100ms
- [ ] River network overlay with 50 rivers renders in <100ms
- [ ] All overlays together render in <500ms
- [ ] No memory leaks on repeated renders
- [ ] Smooth hover animations (60fps)

---

## Browser Compatibility

Test in the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

## Mobile Responsiveness

Test on the following screen sizes:
- [ ] Desktop (≥1024px)
- [ ] Tablet (768px - 1023px)
- [ ] Mobile (≤767px)

Mobile-specific tests:
- [ ] Touch interactions work correctly
- [ ] Hover states work with touch (tap to activate)
- [ ] Overlays remain visible and interactive
- [ ] Performance is acceptable on mobile devices

---

## Validation Results

**Date:** _____________
**Tester:** _____________
**Browser:** _____________
**Screen Size:** _____________

**Overall Status:** ☐ Pass ☐ Fail

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

