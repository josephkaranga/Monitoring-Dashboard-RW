# Task 13: Data Export Functionality - Testing Checklist

## Overview
This checklist provides step-by-step instructions for testing the newly implemented data export functionality in the GIS-Based Biodiversity Visualization Enhancement.

## Prerequisites
- ✅ Build completed successfully
- ✅ Dev server starts without errors
- ✅ No TypeScript compilation errors
- ✅ All files properly integrated

## Test Environment Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the Map page:**
   - Open browser to `http://localhost:3000`
   - Log in if required
   - Navigate to the Map/GIS page

## Functional Testing

### Test 1: Export Button Visibility and Interaction

#### Desktop View
- [ ] Export button is visible next to Layer Switcher and Overlay Toggles
- [ ] Button shows download icon and "Export" text
- [ ] Button has chevron-down icon indicating dropdown
- [ ] Hover effect works (background changes)
- [ ] Button is disabled when map is loading
- [ ] Button is disabled when map has errors

#### Mobile View (< 768px)
- [ ] Export button is inside collapsible controls panel
- [ ] Button has minimum 44x44px tap target
- [ ] Button is accessible when controls are expanded
- [ ] Touch interactions work smoothly

### Test 2: Export Dropdown Menu

- [ ] Click Export button → Dropdown opens
- [ ] Dropdown shows two options: "Export as PNG" and "Export as CSV"
- [ ] Each option has an icon (image for PNG, table for CSV)
- [ ] Each option has descriptive subtitle
- [ ] Hover effect works on dropdown items
- [ ] Click outside dropdown → Dropdown closes
- [ ] Press Escape key → Dropdown closes
- [ ] Dropdown closes when export option is selected

### Test 3: PNG Export Functionality

Test PNG export on each layer:

#### Layer: Submission
- [ ] Click Export → Select "Export as PNG"
- [ ] Loading state appears (spinner + "Exporting PNG..." text)
- [ ] File downloads with name: `rwanda-biodiversity-submission-YYYY-MM-DD.png`
- [ ] Open PNG file → Map visualization is visible
- [ ] Image quality is good (high resolution)
- [ ] Colors match the map display
- [ ] District boundaries are visible
- [ ] No errors in console

#### Layer: Compliance
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-compliance-YYYY-MM-DD.png`
- [ ] Image shows compliance color scale correctly

#### Layer: Forest Cover
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-forest-YYYY-MM-DD.png`
- [ ] Green color scale is visible

#### Layer: Biodiversity Index
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-biodiversity-YYYY-MM-DD.png`
- [ ] Biodiversity colors are correct

#### Layer: Species Richness
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-species_richness-YYYY-MM-DD.png`
- [ ] Species richness visualization is correct

#### Layer: NBSAP Progress
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-nbsap_progress-YYYY-MM-DD.png`
- [ ] Progress colors are visible

#### Layer: Threat Level
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-threat_level-YYYY-MM-DD.png`
- [ ] Red/yellow/green threat colors are correct

#### Layer: Protected Areas
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-protected_areas-YYYY-MM-DD.png`
- [ ] Protected area coverage is visible

#### Layer: Wetlands
- [ ] Export as PNG
- [ ] Filename: `rwanda-biodiversity-wetlands-YYYY-MM-DD.png`
- [ ] Wetland coverage is visible

### Test 4: PNG Export with Overlays

- [ ] Enable GBIF Occurrences overlay
- [ ] Export as PNG → GBIF points are visible in image
- [ ] Enable Protected Areas overlay
- [ ] Export as PNG → Protected area borders are visible
- [ ] Enable River Network overlay
- [ ] Export as PNG → Rivers are visible
- [ ] Enable all overlays
- [ ] Export as PNG → All overlays are visible

### Test 5: CSV Export Functionality

Test CSV export on each layer:

#### Layer: Submission
- [ ] Click Export → Select "Export as CSV"
- [ ] Loading state appears (spinner + "Exporting CSV..." text)
- [ ] File downloads with name: `rwanda-biodiversity-submission-YYYY-MM-DD.csv`
- [ ] Open CSV in Excel/Google Sheets
- [ ] Metadata header is present (title, layer, date, district count)
- [ ] Column headers are correct
- [ ] All 30 districts are listed
- [ ] District names are correct
- [ ] Province names are correct
- [ ] Layer Value column shows submission status
- [ ] Biodiversity Index column has values (or N/A)
- [ ] Species Richness column has values (or N/A)
- [ ] Forest Cover column has percentages
- [ ] Compliance column has percentages
- [ ] Status column shows submission status
- [ ] No formatting issues (commas, quotes handled correctly)

#### Layer: Compliance
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-compliance-YYYY-MM-DD.csv`
- [ ] Layer Value column shows compliance percentages

#### Layer: Forest Cover
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-forest-YYYY-MM-DD.csv`
- [ ] Layer Value column shows forest cover percentages

#### Layer: Biodiversity Index
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-biodiversity-YYYY-MM-DD.csv`
- [ ] Layer Value column shows biodiversity index (0-100)

#### Layer: Species Richness
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-species_richness-YYYY-MM-DD.csv`
- [ ] Layer Value column shows species counts

#### Layer: NBSAP Progress
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-nbsap_progress-YYYY-MM-DD.csv`
- [ ] Layer Value column shows progress percentages

#### Layer: Threat Level
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-threat_level-YYYY-MM-DD.csv`
- [ ] Layer Value column shows threat levels (high/medium/low)

#### Layer: Protected Areas
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-protected_areas-YYYY-MM-DD.csv`
- [ ] Layer Value column shows coverage percentages

#### Layer: Wetlands
- [ ] Export as CSV
- [ ] Filename: `rwanda-biodiversity-wetlands-YYYY-MM-DD.csv`
- [ ] Layer Value column shows coverage percentages

### Test 6: Loading States

- [ ] Click Export PNG → Button shows spinner immediately
- [ ] Button text changes to "Exporting PNG..."
- [ ] Button is disabled during export
- [ ] Cannot click button again while exporting
- [ ] Loading state clears after export completes
- [ ] Same behavior for CSV export

### Test 7: Error Handling

#### Test Error Scenarios:

1. **No SVG Element (simulated):**
   - [ ] Open browser console
   - [ ] Temporarily hide SVG element: `document.querySelector('svg').style.display = 'none'`
   - [ ] Try to export PNG
   - [ ] Error notification appears at top of map
   - [ ] Error message: "Map SVG not found" or similar
   - [ ] Error auto-dismisses after 5 seconds
   - [ ] Can manually dismiss with X button
   - [ ] Restore SVG: `document.querySelector('svg').style.display = ''`

2. **No District Data:**
   - [ ] This is harder to simulate, but error handling is in place
   - [ ] Error would show: "No district data available"

3. **Network Issues:**
   - [ ] Open DevTools → Network tab
   - [ ] Set throttling to "Offline"
   - [ ] Try to export (should still work as it's client-side)
   - [ ] Audit logging may fail silently (check console)

### Test 8: Audit Logging

1. **Check Supabase Audit Log:**
   - [ ] Open Supabase dashboard
   - [ ] Navigate to Table Editor → audit_log table
   - [ ] Export a PNG
   - [ ] New row appears with:
     - action_type: "map_action"
     - action: "export_map_png"
     - detail: JSON with layer, filename, timestamp
     - user_id: Current user ID (or "anonymous")
     - role: User role (if authenticated)
   - [ ] Export a CSV
   - [ ] New row appears with:
     - action: "export_data_csv"
     - detail: JSON with layer, filename, rowCount, timestamp

2. **Check Console Logs:**
   - [ ] Open browser console
   - [ ] Export PNG → No errors logged
   - [ ] Export CSV → No errors logged
   - [ ] If audit logging fails, error is logged but doesn't interrupt export

### Test 9: Accessibility

#### Keyboard Navigation:
- [ ] Tab to Export button → Button receives focus
- [ ] Press Enter → Dropdown opens
- [ ] Tab through dropdown options → Options receive focus
- [ ] Press Enter on option → Export starts
- [ ] Press Escape → Dropdown closes

#### Screen Reader:
- [ ] Export button has aria-label: "Export map data"
- [ ] Export button has aria-expanded attribute
- [ ] Export button has aria-haspopup="true"
- [ ] Dropdown has role="menu"
- [ ] Dropdown has aria-label: "Export options"
- [ ] Dropdown items have role="menuitem"

#### Visual:
- [ ] Color contrast is sufficient for error messages
- [ ] Icons are visible and clear
- [ ] Text is readable at all sizes
- [ ] Focus indicators are visible

### Test 10: Mobile Responsiveness

#### Test on Mobile Device or Emulator (< 768px):

- [ ] Export button is in collapsible controls panel
- [ ] Button has minimum 44x44px tap target
- [ ] Dropdown is properly sized for mobile
- [ ] Dropdown items have 44x44px tap targets
- [ ] Error notification is properly sized
- [ ] Error notification doesn't overflow screen
- [ ] Loading state is visible on mobile
- [ ] File downloads work on mobile browser

### Test 11: Performance

- [ ] PNG export completes in < 3 seconds
- [ ] CSV export completes in < 1 second
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] No console warnings or errors
- [ ] UI remains responsive during export
- [ ] Multiple exports in succession work correctly

### Test 12: Cross-Browser Testing

Test in multiple browsers:

#### Chrome/Edge:
- [ ] PNG export works
- [ ] CSV export works
- [ ] File downloads correctly
- [ ] No console errors

#### Firefox:
- [ ] PNG export works
- [ ] CSV export works
- [ ] File downloads correctly
- [ ] No console errors

#### Safari (if available):
- [ ] PNG export works
- [ ] CSV export works
- [ ] File downloads correctly
- [ ] No console errors

## Regression Testing

Ensure existing functionality still works:

- [ ] Layer switching works correctly
- [ ] Overlay toggles work correctly
- [ ] Map tooltips work correctly
- [ ] District list updates correctly
- [ ] Province chart displays correctly
- [ ] Mobile controls expand/collapse correctly
- [ ] Touch gestures work on mobile (pan, zoom)

## Known Issues to Watch For

1. **SVG External Resources:**
   - Custom fonts may not render in PNG export
   - External images may not be included

2. **Browser Differences:**
   - File download behavior may vary
   - Some browsers may block automatic downloads

3. **Mobile Browsers:**
   - Some mobile browsers may handle downloads differently
   - May prompt user for download location

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ No runtime exceptions
- ✅ Files download correctly
- ✅ Filenames are descriptive and correct
- ✅ Data is accurate in exports
- ✅ Error handling works gracefully
- ✅ Loading states are clear
- ✅ Audit logging captures events
- ✅ Accessibility requirements met
- ✅ Mobile responsiveness works

## Reporting Issues

If any tests fail, report with:
1. Test number and description
2. Expected behavior
3. Actual behavior
4. Browser and version
5. Console errors (if any)
6. Screenshots (if applicable)

## Next Steps After Testing

Once all tests pass:
1. Mark Task 13 as complete in tasks.md
2. Update IMPLEMENTATION_SUMMARY.md
3. Commit changes with descriptive message
4. Move to Task 14 (Real-Time GBIF Refresh)
