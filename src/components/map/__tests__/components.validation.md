# Map Components Validation Checklist

This document provides a manual testing checklist for the map control components.

## LayerSwitcher Component

### Functional Tests
- [ ] Component renders without errors
- [ ] Displays all 9 layer options
- [ ] Active layer is correctly highlighted
- [ ] Changing layer triggers onLayerChange callback
- [ ] Callback receives correct MapLayer value

### Keyboard Navigation Tests
- [ ] Tab key focuses the select element
- [ ] Arrow keys navigate through options
- [ ] Enter key opens dropdown
- [ ] Space key opens dropdown
- [ ] Escape key closes dropdown

### Accessibility Tests
- [ ] Has proper aria-label attribute
- [ ] Has aria-describedby pointing to description
- [ ] Focus indicator is visible (2px outline)
- [ ] Screen reader announces current selection
- [ ] Screen reader announces available options

### Visual Tests
- [ ] Matches MapPage styling (dark theme)
- [ ] Border color changes on focus
- [ ] Box shadow appears on focus
- [ ] Font family is 'DM Sans'
- [ ] Font size is 0.72rem

---

## OverlayToggles Component

### Functional Tests
- [ ] Component renders without errors
- [ ] Displays all 3 overlay options
- [ ] Checkboxes reflect enabled state
- [ ] Toggling checkbox triggers onToggle callback
- [ ] Callback receives correct MapOverlay id
- [ ] Multiple overlays can be enabled simultaneously

### Loading State Tests
- [ ] Loading spinner appears when loading=true
- [ ] Spinner has correct color (var(--sky-dim))
- [ ] Spinner has aria-label "Loading overlay data"

### Error State Tests
- [ ] Error icon appears when error is set
- [ ] Checkbox is disabled when error is set
- [ ] Cursor changes to not-allowed
- [ ] Error message is in aria-describedby
- [ ] Text color changes to var(--text-3)

### Keyboard Navigation Tests
- [ ] Tab key focuses each label
- [ ] Space key toggles checkbox
- [ ] Enter key toggles checkbox
- [ ] Focus indicator is visible (2px outline)

### Accessibility Tests
- [ ] Has role="group" with aria-label
- [ ] Each checkbox has proper aria-label
- [ ] Error state has aria-describedby
- [ ] Screen reader announces state changes

### Visual Tests
- [ ] Hover effect changes background color
- [ ] Focus outline is 2px solid var(--sky-dim)
- [ ] Checkbox accent color is var(--sky-dim)
- [ ] Font family is 'DM Sans'
- [ ] Font size is 0.72rem

---

## RefreshButton Component

### Functional Tests
- [ ] Component renders without errors
- [ ] Clicking button triggers onRefresh callback
- [ ] Button is disabled when loading=true
- [ ] Button is disabled when disabled=true
- [ ] Last updated timestamp displays correctly

### Loading State Tests
- [ ] Spinner icon appears when loading=true
- [ ] Button text changes to "Refreshing..."
- [ ] Button has aria-busy=true when loading
- [ ] Button cursor changes to not-allowed
- [ ] Button opacity reduces to 0.6

### Time Formatting Tests
- [ ] "Just now" for <1 minute ago
- [ ] "Xm ago" for <60 minutes ago
- [ ] "Xh ago" for <24 hours ago
- [ ] "Xd ago" for ≥24 hours ago
- [ ] "Never" when lastUpdated is null

### Keyboard Navigation Tests
- [ ] Tab key focuses the button
- [ ] Enter key triggers refresh
- [ ] Space key triggers refresh
- [ ] Focus indicator is visible (2px outline)

### Accessibility Tests
- [ ] Has proper aria-label
- [ ] aria-label changes when loading
- [ ] aria-busy attribute reflects loading state
- [ ] Screen reader announces state changes

### Visual Tests
- [ ] Background color is var(--sky-dim) when enabled
- [ ] Background color is var(--surface-2) when disabled
- [ ] Hover effect darkens background (#0284c7)
- [ ] Hover effect adds translateY(-1px)
- [ ] Hover effect adds box shadow
- [ ] Font family is 'DM Sans'
- [ ] Font size is 0.72rem

---

## MapLegend Component

### Functional Tests
- [ ] Component renders without errors
- [ ] Legend content updates when activeLayer changes
- [ ] Correct title displays for each layer
- [ ] Correct color stops display for each layer
- [ ] Correct data source displays for each layer

### Layer-Specific Tests

#### Biodiversity Layer
- [ ] Title: "BIODIVERSITY INDEX"
- [ ] 6 color stops (90-100, 80-89, 60-79, 40-59, 20-39, 0-19)
- [ ] Colors: #16a34a, #22c55e, #4ade80, #86efac, #bbf7d0, #f0fdf4
- [ ] Source: "GBIF"

#### Forest Layer
- [ ] Title: "FOREST COVER"
- [ ] 4 color stops (≥35%, 25-34%, 18-24%, <18%)
- [ ] Colors: #064e3b, #059669, #10b981, #6ee7b7
- [ ] Source: "geoBoundaries"

#### Species Richness Layer
- [ ] Title: "SPECIES RICHNESS"
- [ ] 5 color stops (≥100, 50-99, 25-49, 10-24, <10)
- [ ] Colors: #16a34a, #22c55e, #4ade80, #86efac, #bbf7d0
- [ ] Source: "GBIF"

#### Threat Level Layer
- [ ] Title: "THREAT LEVEL"
- [ ] 3 color stops (High ≥60, Medium 30-59, Low <30)
- [ ] Colors: #ef4444, #f59e0b, #10b981
- [ ] Source: "geoBoundaries"

#### NBSAP Progress Layer
- [ ] Title: "NBSAP PROGRESS"
- [ ] 5 color stops (90-100%, 75-89%, 50-74%, 25-49%, 0-24%)
- [ ] Colors: #86efac, #d9f99d, #fef3c7, #fed7aa, #fee2e2
- [ ] Source: "geoBoundaries"

#### Submission Layer
- [ ] Title: "SUBMISSION STATUS"
- [ ] 3 color stops (Submitted, Pending, Missing)
- [ ] Colors: #10b981, #f59e0b, #f43f5e
- [ ] Source: "geoBoundaries"

#### Compliance Layer
- [ ] Title: "COMPLIANCE SCORE"
- [ ] 4 color stops (≥85%, 75-84%, 65-74%, <65%)
- [ ] Colors: #10b981, #0ea5e9, #f59e0b, #f43f5e
- [ ] Source: "geoBoundaries"

### Position Tests
- [ ] bottom-right: bottom: 12px, right: 12px
- [ ] bottom-left: bottom: 12px, left: 12px
- [ ] top-right: top: 12px, right: 12px
- [ ] top-left: top: 12px, left: 12px

### Accessibility Tests
- [ ] Has role="region" with aria-label="Map legend"
- [ ] Color boxes have aria-hidden="true"
- [ ] Text has sufficient contrast

### Visual Tests
- [ ] Background: rgba(255, 255, 255, 0.92)
- [ ] Backdrop filter: blur(4px)
- [ ] Border radius: 8px
- [ ] Box shadow present
- [ ] Title font: 'DM Mono', 0.65rem, weight 700
- [ ] Label font: 'DM Sans', 0.65rem
- [ ] Color boxes: 12x12px with 2px border radius
- [ ] Source text: 0.6rem, color var(--text-3)

---

## Integration Tests

### State Management
- [ ] Layer changes update legend
- [ ] Overlay toggles update map
- [ ] Refresh updates lastUpdated timestamp
- [ ] Multiple overlays can be enabled together

### Event Flow
- [ ] LayerSwitcher → onLayerChange → state update → MapLegend update
- [ ] OverlayToggles → onToggle → state update → map overlay render
- [ ] RefreshButton → onRefresh → loading state → data fetch → state update

### Error Handling
- [ ] Overlay errors disable checkbox
- [ ] Overlay errors show error icon
- [ ] Refresh errors don't break UI
- [ ] Missing data shows "No data" state

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
- [ ] Touch targets are ≥44x44px
- [ ] Controls stack vertically on small screens
- [ ] Text remains readable
- [ ] No horizontal scrolling

---

## Performance Tests

- [ ] Components render in <100ms
- [ ] No memory leaks on repeated renders
- [ ] No unnecessary re-renders
- [ ] Smooth animations (60fps)

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
