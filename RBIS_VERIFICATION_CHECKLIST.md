# RBIS Dashboard - Verification Checklist

## Quick Start Guide

### 1. Database Setup
- [ ] Run migration `004_rbis_tables.sql` in Supabase Dashboard
- [ ] Run seed script `005_seed_rbis_data_streams.sql` in Supabase Dashboard
- [ ] Verify tables created: `rbis_linkages`, `rbis_data_streams`, `rbis_connection_log`
- [ ] Verify 8 data streams seeded

### 2. Build Verification
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] RBISPage bundle created (~48 KB)

### 3. Development Server
```bash
npm run dev
```
- [ ] Server starts on http://localhost:5173
- [ ] Navigate to `/rbis` route
- [ ] Dashboard loads without errors

---

## Component Verification

### ConnectionBar
- [ ] Displays "Disconnected" status initially
- [ ] "Connect" button visible
- [ ] Server URL shows "rbis.ur.ac.rw"
- [ ] Click "Connect" → status changes to "Connecting..."
- [ ] After connection → status shows "Connected" with green indicator
- [ ] "Disconnect" button appears when connected
- [ ] Last sync timestamp displays when connected
- [ ] Error message displays if connection fails

### MetricsPanel
- [ ] Displays 5 metric cards:
  - [ ] Total Occurrences
  - [ ] Last 24 Hours
  - [ ] Last 7 Days
  - [ ] Active Data Streams
  - [ ] Last Update
- [ ] Numbers format with locale string (e.g., "1,234,567")
- [ ] Loading spinner shows while fetching
- [ ] Recent occurrences list displays (5 records)
- [ ] Each occurrence shows: species name, location, timestamp
- [ ] Auto-refreshes every 30 seconds
- [ ] Error display shows if fetch fails

### IndicatorsMatrix
- [ ] Search input field visible
- [ ] Filter buttons visible: All Goals, Goal A, Goal B, Goal C, Goal D
- [ ] Summary statistics display:
  - [ ] Total Targets
  - [ ] Total Indicators
  - [ ] Linked to RBIS
  - [ ] Linkage %
- [ ] "Expand All" and "Collapse All" buttons work
- [ ] Goals display with color coding:
  - [ ] Goal A: Blue
  - [ ] Goal B: Green
  - [ ] Goal C: Yellow/Orange
  - [ ] Goal D: Purple
- [ ] Click goal header → expands/collapses targets
- [ ] Click target header → expands/collapses indicators
- [ ] Indicators display with:
  - [ ] Status badge (on-track/at-risk/off-track)
  - [ ] RBIS linkage badge (linked/not-linked/partial)
  - [ ] Progress bar with percentage
- [ ] Search filters indicators in real-time
- [ ] Filter buttons filter by goal
- [ ] "No results found" message when no matches

### SignalFeed
- [ ] Header shows "Live Signal Feed"
- [ ] Auto-refresh indicator (pulsing green dot)
- [ ] Summary statistics display:
  - [ ] Active Streams count
  - [ ] Total Records count
- [ ] 8 data stream cards display:
  - [ ] Protected Areas Coverage
  - [ ] Threatened Species Monitoring
  - [ ] Forest Cover Change
  - [ ] Wetland Extent
  - [ ] Species Distribution
  - [ ] Invasive Species Tracking
  - [ ] Ecosystem Restoration
  - [ ] Sustainable Use Indicators
- [ ] Each card shows:
  - [ ] Icon and name
  - [ ] Description
  - [ ] Occurrence count
  - [ ] Status indicator (active/inactive/error)
  - [ ] Target number badges
  - [ ] Last update timestamp
- [ ] Auto-refreshes every 60 seconds
- [ ] Error display shows if fetch fails

---

## Feature Verification

### Scroll-to-Target
- [ ] Click target badge in SignalFeed
- [ ] Page smoothly scrolls to target in IndicatorsMatrix
- [ ] Target highlights with yellow background
- [ ] Highlight fades after 2 seconds
- [ ] Works for all target numbers

### Search Functionality
- [ ] Type in search box → filters indicators
- [ ] Search is case-insensitive
- [ ] Searches across:
  - [ ] Indicator titles
  - [ ] Indicator numbers
  - [ ] Target titles
  - [ ] Target descriptions
- [ ] Clear search → shows all results
- [ ] "No results found" when no matches

### Filter Functionality
- [ ] Click "All Goals" → shows all goals
- [ ] Click "Goal A" → shows only Goal A targets
- [ ] Click "Goal B" → shows only Goal B targets
- [ ] Click "Goal C" → shows only Goal C targets
- [ ] Click "Goal D" → shows only Goal D targets
- [ ] Active filter button highlighted
- [ ] Summary statistics update based on filter

### Auto-Refresh
- [ ] MetricsPanel refreshes every 30 seconds
- [ ] SignalFeed refreshes every 60 seconds
- [ ] Last update timestamp updates
- [ ] No page flicker during refresh
- [ ] Loading state shows during refresh (optional)

### Error Handling
- [ ] Disconnect network → error displays
- [ ] Click "Retry" → attempts to reload
- [ ] Error boundary catches component errors
- [ ] "Reset Dashboard" button works
- [ ] "Refresh Page" button works
- [ ] User-friendly error messages

---

## Responsive Layout

### Desktop (≥768px)
- [ ] Matrix and SignalFeed side-by-side
- [ ] Both components visible simultaneously
- [ ] Proper spacing between components
- [ ] No horizontal scroll

### Tablet (768px)
- [ ] Layout transitions smoothly
- [ ] Components stack vertically
- [ ] All content readable

### Mobile (<768px)
- [ ] Components stack vertically
- [ ] Matrix displays first
- [ ] SignalFeed displays below
- [ ] Touch targets large enough
- [ ] No horizontal scroll
- [ ] Text readable without zoom

---

## Performance Checks

### Initial Load
- [ ] Page loads in < 3 seconds
- [ ] No console errors
- [ ] No console warnings (except expected)
- [ ] Smooth animations

### Interactions
- [ ] Expand/collapse smooth (no lag)
- [ ] Search responsive (< 300ms)
- [ ] Filter instant
- [ ] Scroll smooth
- [ ] No memory leaks (check DevTools)

### Network
- [ ] Works with slow 3G
- [ ] Handles network errors gracefully
- [ ] Retry logic works
- [ ] Timeout after 30 seconds

---

## Browser Compatibility

### Chrome/Edge
- [ ] All features work
- [ ] Layout correct
- [ ] Animations smooth

### Firefox
- [ ] All features work
- [ ] Layout correct
- [ ] Animations smooth

### Safari
- [ ] All features work
- [ ] Layout correct
- [ ] Animations smooth

---

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Logical tab order
- [ ] Enter/Space activates buttons
- [ ] Escape closes expanded sections (future)
- [ ] Focus indicators visible

### Screen Reader
- [ ] Page title announced
- [ ] Headings announced
- [ ] Buttons have labels
- [ ] Status changes announced
- [ ] Error messages announced

### Color Contrast
- [ ] All text meets 4.5:1 ratio
- [ ] Status indicators distinguishable
- [ ] Focus indicators visible
- [ ] Works in high contrast mode

---

## Data Verification

### GBIF API Integration
- [ ] Fetches Rwanda occurrence data
- [ ] Displays correct counts
- [ ] Recent occurrences show real data
- [ ] Handles API errors gracefully
- [ ] Rate limiting respected (1 req/sec)

### Supabase Integration
- [ ] Fetches indicators from database
- [ ] Fetches targets from database
- [ ] Fetches data streams from database
- [ ] RBIS linkages display correctly
- [ ] Connection logging works

### Data Accuracy
- [ ] Indicator counts match database
- [ ] Target counts match database
- [ ] Linkage percentages calculated correctly
- [ ] Progress percentages display correctly
- [ ] Status badges match indicator status

---

## Security Checks

### Authentication
- [ ] Requires login to access
- [ ] Redirects to /auth if not logged in
- [ ] Session persists across refreshes
- [ ] Logout works correctly

### Data Access
- [ ] RLS policies enforced
- [ ] Only authenticated users can access
- [ ] No sensitive data exposed in console
- [ ] API keys not exposed in client

---

## Known Issues to Document

### Current Limitations
1. Auto-expand on scroll not implemented
2. Error boundary only wraps RBISPage route
3. Retry logic not integrated into service calls
4. No cache invalidation strategy

### Future Enhancements
1. Add loading skeletons
2. Add toast notifications
3. Implement offline mode
4. Add data export functionality

---

## Sign-Off

### Developer Verification
- [ ] All components implemented
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] Code follows project patterns
- [ ] Documentation complete

**Developer**: _________________  
**Date**: _________________

### QA Verification
- [ ] All features tested
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Responsive layout works
- [ ] Accessibility checked

**QA Engineer**: _________________  
**Date**: _________________

### Product Owner Approval
- [ ] Meets requirements
- [ ] User experience acceptable
- [ ] Ready for deployment

**Product Owner**: _________________  
**Date**: _________________

---

## Deployment Checklist

### Pre-Deployment
- [ ] Run database migrations
- [ ] Seed RBIS data streams
- [ ] Update environment variables
- [ ] Test on staging environment
- [ ] Backup database

### Deployment
- [ ] Deploy to production
- [ ] Verify build deployed correctly
- [ ] Test critical paths
- [ ] Monitor error logs
- [ ] Check performance metrics

### Post-Deployment
- [ ] Verify all features work
- [ ] Monitor user feedback
- [ ] Check error rates
- [ ] Review performance metrics
- [ ] Document any issues

---

## Support Information

### Troubleshooting

**Issue**: Dashboard not loading  
**Solution**: Check browser console for errors, verify authentication, check network tab

**Issue**: Data not displaying  
**Solution**: Verify database migrations run, check Supabase connection, verify RLS policies

**Issue**: Scroll-to-target not working  
**Solution**: Check data-target-id attributes present, verify console for errors

**Issue**: Auto-refresh not working  
**Solution**: Check browser console, verify intervals not cleared, check network requests

### Contact
- **Technical Support**: [Your Email]
- **Bug Reports**: [GitHub Issues URL]
- **Documentation**: `.kiro/specs/rbis-comprehensive-dashboard/`
