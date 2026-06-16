# Implementation Plan: RBIS Comprehensive Dashboard

## Overview

This implementation plan transforms the current RBIS page into a comprehensive monitoring dashboard with live connection management, real-time metrics, a complete indicators-targets-RBIS matrix, and live biodiversity data signal feeds. The implementation follows a 4-phase approach: Foundation → Core Components → Features → Polish.

**Technology Stack**: React, TypeScript, Supabase, GBIF API, Vite

**Key Integration Points**:
- Existing patterns from `useData.ts` and `dataService.ts`
- Supabase database with new tables for RBIS linkages and data streams
- GBIF API for biodiversity occurrence data
- RBIS API at rbis.ur.ac.rw

## Tasks

### Phase 1: Foundation (Database, Services, Hooks, Types)

- [ ] 1. Set up database schema and seed data
  - [x] 1.1 Create database migration for RBIS tables
    - Create `rbis_linkages` table with indicator_id, data_stream_id, linkage_status, last_sync
    - Create `rbis_data_streams` table with id, name, description, target_numbers, occurrence_count, status
    - Create `rbis_connection_log` table for connection event tracking
    - Add indexes for performance optimization
    - Enable Row Level Security (RLS) policies for authenticated users
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 7.1, 7.2_
  
  - [x] 1.2 Seed RBIS data streams
    - Insert 8 predefined data streams (Protected Areas, Threatened Species, Forest Cover, Wetland Extent, Species Distribution, Invasive Species, Ecosystem Restoration, Sustainable Use)
    - Map each data stream to target numbers
    - Set initial status to 'active' with appropriate icons and colors
    - _Requirements: 7.3, 8.1, 8.2, 8.3_

- [x] 2. Create TypeScript type definitions
  - [x] 2.1 Create `src/types/rbis.ts` with all RBIS interfaces
    - Define `RBISConnection`, `RBISConnectionStatus`, `RBISMetrics`, `RBISOccurrence` types
    - Define `GBFGoal`, `NBSAPTarget`, `Indicator`, `IndicatorStatus` types
    - Define `RBISLinkage`, `RBISLinkageStatus`, `RBISDataStream`, `DataStreamStatus` types
    - Define `GBFGoalFilter`, `SearchFilters`, `RBISDashboardSummary` types
    - Export all types for use across the application
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 7.1_

- [x] 3. Implement RBIS service layer
  - [x] 3.1 Create `src/services/rbisService.ts` with API integration functions
    - Implement `connectToRBIS()` and `disconnectFromRBIS()` for connection management
    - Implement `logRBISConnection()` for connection event logging
    - Implement `fetchRBISMetrics()` to fetch occurrence counts from GBIF API
    - Implement `fetchRecentOccurrences()` to fetch latest 5 occurrence records
    - Implement `fetchIndicatorsWithLinkages()` to query indicators with RBIS linkage data
    - Implement `fetchTargetsWithIndicators()` to query targets with nested indicators
    - Implement `fetchGBFGoals()` to organize targets by GBF goals with progress calculations
    - Implement `fetchRBISDataStreams()` to query data streams from database
    - Implement `updateDataStreamCount()` to update occurrence counts
    - Implement `fetchRBISDashboardSummary()` to calculate dashboard-wide statistics
    - Add error handling with try-catch blocks and user-friendly error messages
    - Add rate limiting for GBIF API calls (max 1 request per second)
    - _Requirements: 1.1, 1.2, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.5, 7.1, 7.4, 7.9, 8.1, 8.6, 10.2, 10.3_

- [x] 4. Implement custom React hooks
  - [x] 4.1 Create `src/hooks/useRBIS.ts` with data fetching hooks
    - Implement `useRBISConnection()` hook with connect/disconnect functions and loading state
    - Implement `useRBISMetrics()` hook with auto-refresh every 30 seconds
    - Implement `useIndicatorsMatrix()` hook for fetching goals, targets, and indicators
    - Implement `useRBISSignalFeed()` hook with auto-refresh every 60 seconds
    - Implement `useRBISDashboardSummary()` hook for dashboard statistics
    - Add cleanup logic with `useRef` to prevent state updates on unmounted components
    - Add error handling and retry logic for all hooks
    - _Requirements: 1.6, 1.7, 2.6, 7.9, 10.1, 10.3, 10.4, 10.5, 10.6_

- [x] 5. Checkpoint - Verify foundation layer
  - Ensure all database tables are created successfully
  - Verify data streams are seeded correctly
  - Test RBIS service functions with console logs
  - Test custom hooks in a simple test component
  - Ensure all TypeScript types compile without errors
  - Ask the user if questions arise

### Phase 2: Core Components (ConnectionBar, MetricsPanel, IndicatorsMatrix, SignalFeed)

- [x] 6. Create shared UI components
  - [x] 6.1 Create `src/components/rbis/shared/StatusBadge.tsx`
    - Accept `status` prop ('on-track' | 'at-risk' | 'off-track')
    - Display color-coded badge with appropriate text and background
    - Use green for on-track, yellow for at-risk, red for off-track
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 9.3_
  
  - [x] 6.2 Create `src/components/rbis/shared/RBISLinkageBadge.tsx`
    - Accept `linkage` prop with status and dataStreams array
    - Display 'Linked' (green), 'Not Linked' (gray), or 'Partial' (yellow) badge
    - Show tooltip with connected data stream names on hover
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.3_
  
  - [x] 6.3 Create `src/components/rbis/shared/ProgressBar.tsx`
    - Accept `progress` prop (0-100)
    - Display horizontal progress bar with percentage label
    - Use color gradient based on progress value
    - _Requirements: 5.1, 5.6, 9.3_
  
  - [x] 6.4 Create `src/components/rbis/shared/LoadingSpinner.tsx`
    - Accept `size` ('small' | 'medium' | 'large') and optional `message` props
    - Display animated spinner with optional loading message
    - Use consistent styling with existing components
    - _Requirements: 10.1_
  
  - [x] 6.5 Create `src/components/rbis/shared/ErrorDisplay.tsx`
    - Accept `message`, `onRetry`, and `type` ('error' | 'warning' | 'info') props
    - Display color-coded error message with optional retry button
    - Use appropriate icons for each error type
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 7. Implement ConnectionBar component
  - [x] 7.1 Create `src/components/rbis/ConnectionBar.tsx`
    - Accept `status`, `serverUrl`, `onConnect`, `onDisconnect`, `lastSync` props
    - Display connection status indicator with color coding (green=connected, red=disconnected, yellow=connecting)
    - Display server URL (rbis.ur.ac.rw)
    - Render Connect/Disconnect button based on current status
    - Display last sync timestamp when connected
    - Show error message when status is 'error'
    - Add loading state during connection attempts
    - Style as a card with consistent spacing and borders
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 9.1, 9.2, 9.3, 9.8, 10.2_

- [x] 8. Implement MetricsPanel component
  - [x] 8.1 Create `src/components/rbis/MetricsPanel.tsx`
    - Accept `metrics`, `recentOccurrences`, `loading`, `lastUpdate` props
    - Display 5 metric cards: Total Occurrences, Last 24 Hours, Last 7 Days, Active Data Streams, Last Update
    - Use icons from FontAwesome for each metric type
    - Display loading spinner when `loading` is true
    - Format large numbers with locale string (e.g., 1,234,567)
    - Display last update timestamp
    - Style as a card with grid layout for metrics
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.2, 9.3, 9.4, 10.1_
  
  - [x] 8.2 Add recent occurrences list to MetricsPanel
    - Display list of 5 most recent occurrence records below metrics
    - For each record, show species name, location, and timestamp
    - Format timestamps as relative time (e.g., "2 hours ago")
    - Show empty state message when no records available
    - Add subtle hover effect on list items
    - _Requirements: 2.7, 2.8_

- [x] 9. Implement IndicatorsMatrix component structure
  - [x] 9.1 Create `src/components/rbis/IndicatorsMatrix.tsx` with search and filter UI
    - Accept `goals`, `searchTerm`, `activeFilter`, `onSearchChange`, `onFilterChange`, `onTargetClick` props
    - Render search input field in header with placeholder text
    - Render filter buttons for each GBF goal (A, B, C, D, All)
    - Highlight active filter button
    - Display summary statistics: total targets, total indicators, linked indicators, linkage percentage
    - Show "No results found" message when filtered data is empty
    - Style as a card with header section and content section
    - _Requirements: 3.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 9.1, 9.2, 9.3, 9.8_
  
  - [x] 9.2 Create `src/components/rbis/GBFGoalSection.tsx` for collapsible goal sections
    - Accept `goal`, `expanded`, `onToggle`, `onTargetClick` props
    - Render goal header with title, description, and average progress
    - Add expand/collapse button with chevron icon
    - Render nested TargetSection components when expanded
    - Add smooth expand/collapse animation
    - Use color coding for each GBF goal (A=blue, B=green, C=yellow, D=purple)
    - _Requirements: 3.1, 3.3, 3.8, 5.8, 9.3_
  
  - [x] 9.3 Create `src/components/rbis/TargetSection.tsx` for collapsible target sections
    - Accept `target`, `expanded`, `onToggle`, `onTargetClick` props
    - Render target header with number, title, and average progress
    - Add expand/collapse button with chevron icon
    - Render nested IndicatorRow components when expanded
    - Add smooth expand/collapse animation
    - Display target description in collapsed state
    - _Requirements: 3.2, 3.4, 3.5, 3.9, 5.7_
  
  - [x] 9.4 Create `src/components/rbis/IndicatorRow.tsx` for individual indicators
    - Accept `indicator`, `onTargetClick` props
    - Display indicator number, title, and measurement unit
    - Render StatusBadge component with indicator status
    - Render RBISLinkageBadge component with linkage information
    - Render ProgressBar component with progress percentage
    - Display baseline, current value, and 2030 target in tooltip or expandable section
    - Use React.memo for performance optimization
    - _Requirements: 3.6, 4.1, 4.5, 5.1, 5.2, 5.6_

- [x] 10. Implement SignalFeed component
  - [x] 10.1 Create `src/components/rbis/SignalFeed.tsx`
    - Accept `dataStreams`, `loading`, `onTargetClick` props
    - Display header with total active streams and total occurrence records
    - Render list of DataStreamCard components
    - Display loading spinner when `loading` is true
    - Show error display when data fails to load
    - Style as a card with consistent spacing
    - _Requirements: 7.1, 8.5, 8.6, 9.1, 9.2, 10.1, 10.5_
  
  - [x] 10.2 Create `src/components/rbis/DataStreamCard.tsx`
    - Accept `dataStream`, `onTargetClick` props
    - Display data stream name, description, and icon
    - Display occurrence count with formatted number
    - Display status indicator (green=active, gray=inactive, red=error)
    - Display error message when status is 'error'
    - Display last update timestamp
    - Render clickable target number badges that trigger `onTargetClick`
    - Add hover effect on target badges
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.10, 8.1, 8.2, 8.4_

- [~] 11. Checkpoint - Verify core components
  - Test each component in isolation with mock data
  - Verify all props are correctly typed
  - Ensure loading and error states display correctly
  - Test collapsible sections expand/collapse smoothly
  - Verify color coding matches design specifications
  - Ask the user if questions arise

### Phase 3: Features (Search, Filter, Collapsible sections, Auto-refresh, Error handling)

- [x] 12. Implement search and filter logic
  - [x] 12.1 Create `src/utils/rbisFilters.ts` with filter functions
    - Implement `filterBySearch()` function to filter goals/targets/indicators by search term
    - Implement `filterByGoal()` function to filter by GBF goal
    - Implement `applyFilters()` function to combine search and goal filters
    - Add optional status filter (on-track, at-risk, off-track)
    - Add optional linkage filter (linked, not-linked, partial)
    - Optimize for performance with early returns and efficient array operations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_
  
  - [x] 12.2 Integrate search functionality into IndicatorsMatrix
    - Add debounced search input with 300ms delay using custom `useDebounce` hook
    - Update filtered data when search term changes
    - Highlight search matches in indicator/target titles (optional enhancement)
    - Preserve expanded/collapsed state during search
    - _Requirements: 6.1, 6.2, 6.3, 6.8_
  
  - [x] 12.3 Integrate filter functionality into IndicatorsMatrix
    - Update filtered data when goal filter changes
    - Highlight active filter button
    - Reset search term when filter changes (optional)
    - Update summary statistics based on filtered data
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

- [x] 13. Implement collapsible sections state management
  - [x] 13.1 Add expand/collapse state management to IndicatorsMatrix
    - Use `useState` with `Set<string>` for expanded goals
    - Use `useState` with `Set<number>` for expanded targets
    - Implement `toggleGoal()` and `toggleTarget()` functions
    - Persist expanded state during search/filter operations
    - Add "Expand All" / "Collapse All" buttons in header (optional enhancement)
    - _Requirements: 3.8, 3.9_

- [ ] 14. Implement scroll-to-target feature
  - [~] 14.1 Add scroll and highlight functionality
    - Create `scrollToTarget()` function that accepts target ID
    - Use `useRef` to store references to target elements
    - Implement smooth scroll behavior with `scrollIntoView()`
    - Add temporary highlight effect (e.g., yellow background fade)
    - Auto-expand goal and target sections when scrolling to target
    - Connect SignalFeed target badges to scroll functionality
    - _Requirements: 8.4_

- [x] 15. Implement auto-refresh logic
  - [x] 15.1 Add auto-refresh to MetricsPanel
    - Use `useEffect` with `setInterval` for 30-second refresh
    - Only refresh when RBIS connection is active
    - Clear interval on component unmount
    - Show subtle loading indicator during refresh (optional)
    - _Requirements: 2.6_
  
  - [x] 15.2 Add auto-refresh to SignalFeed
    - Use `useEffect` with `setInterval` for 60-second refresh
    - Update occurrence counts for each data stream
    - Clear interval on component unmount
    - Show last update timestamp
    - _Requirements: 7.9, 7.10_

- [ ] 16. Implement comprehensive error handling
  - [~] 16.1 Add error boundaries to main components
    - Create `RBISErrorBoundary` component wrapping the entire dashboard
    - Catch and display component-level errors
    - Provide "Reset" button to recover from errors
    - Log errors to console for debugging
    - _Requirements: 10.8_
  
  - [~] 16.2 Add retry logic to data fetching hooks
    - Implement exponential backoff for failed API requests
    - Add manual retry buttons in error displays
    - Show user-friendly error messages for different error types (network, timeout, API error)
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [~] 16.3 Add timeout handling to API calls
    - Implement `fetchWithTimeout()` utility function with 30-second timeout
    - Display timeout error message when requests exceed limit
    - Provide retry option for timed-out requests
    - _Requirements: 10.7_

- [ ] 17. Integrate all components into RBISPage
  - [~] 17.1 Create main `src/pages/RBISPage.tsx` container
    - Import and use all custom hooks (useRBISConnection, useRBISMetrics, useIndicatorsMatrix, useRBISSignalFeed)
    - Manage search term and filter state at page level
    - Implement scroll-to-target handler
    - Render components in order: ConnectionBar, MetricsPanel, IndicatorsMatrix, SignalFeed
    - Apply responsive layout with CSS Grid or Flexbox
    - Add page header with title and description
    - _Requirements: 9.1, 9.5, 9.6_
  
  - [~] 17.2 Add responsive layout styling
    - Stack components vertically on mobile (<768px)
    - Display Matrix and SignalFeed side-by-side on desktop (≥768px)
    - Use consistent card styling with borders and shadows
    - Apply consistent spacing between components
    - Ensure all components are scrollable independently if needed
    - _Requirements: 9.2, 9.5, 9.6, 9.7_

- [~] 18. Checkpoint - Verify features integration
  - Test search functionality with various search terms
  - Test filter functionality with each GBF goal
  - Test collapsible sections expand/collapse correctly
  - Test scroll-to-target from SignalFeed to Matrix
  - Verify auto-refresh updates data correctly
  - Test error handling with network disconnection
  - Test responsive layout on different screen sizes
  - Ask the user if questions arise

### Phase 4: Polish (Testing, Performance, Accessibility, Documentation)

- [ ] 19. Implement progress calculation logic
  - [~] 19.1 Create `src/utils/rbisCalculations.ts` with calculation functions
    - Implement `calculateIndicatorStatus()` to determine on-track/at-risk/off-track status
    - Implement `calculateExpectedProgress()` based on NBSAP timeline (2025-2030)
    - Implement `calculateTargetProgress()` to average indicator progress
    - Implement `calculateGoalProgress()` to average target progress
    - Implement `calculateLinkagePercentage()` to calculate percentage of linked indicators
    - Add unit tests for each calculation function
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8_

- [ ]* 19.2 Write unit tests for calculation functions
  - Test `calculateIndicatorStatus()` with various progress ratios
  - Test `calculateExpectedProgress()` with different dates
  - Test `calculateTargetProgress()` with empty and populated indicator arrays
  - Test `calculateGoalProgress()` with empty and populated target arrays
  - Test `calculateLinkagePercentage()` with various linkage statuses
  - Achieve >90% code coverage for calculation utilities

- [ ]* 20. Write unit tests for filter functions
  - [ ]* 20.1 Test search functionality
    - Test filtering by indicator title
    - Test filtering by target title and description
    - Test filtering by indicator number
    - Test case-insensitive search
    - Test empty search term returns all data
    - Test search with no matches returns empty array
  
  - [ ]* 20.2 Test filter functionality
    - Test filtering by each GBF goal (A, B, C, D)
    - Test 'all' filter returns all goals
    - Test combined search and goal filter
    - Test status filter (on-track, at-risk, off-track)
    - Test linkage filter (linked, not-linked, partial)

- [ ]* 21. Write integration tests for RBIS service
  - [ ]* 21.1 Test RBIS connection flow
    - Test successful connection to RBIS
    - Test connection failure handling
    - Test connection logging to database
    - Test disconnect functionality
  
  - [ ]* 21.2 Test data fetching functions
    - Test `fetchRBISMetrics()` returns valid metrics
    - Test `fetchRecentOccurrences()` returns 5 records
    - Test `fetchIndicatorsWithLinkages()` includes linkage data
    - Test `fetchTargetsWithIndicators()` includes nested indicators
    - Test `fetchGBFGoals()` organizes data correctly
    - Test `fetchRBISDataStreams()` returns all streams
    - Test `fetchRBISDashboardSummary()` calculates statistics correctly

- [ ]* 22. Write component tests
  - [ ]* 22.1 Test ConnectionBar component
    - Test displays correct status indicator for each status
    - Test Connect button calls onConnect handler
    - Test Disconnect button calls onDisconnect handler
    - Test displays error message when status is 'error'
    - Test displays last sync timestamp when connected
  
  - [ ]* 22.2 Test MetricsPanel component
    - Test displays all 5 metrics correctly
    - Test displays loading spinner when loading
    - Test displays recent occurrences list
    - Test formats numbers with locale string
    - Test displays error state when data fails to load
  
  - [ ]* 22.3 Test IndicatorsMatrix component
    - Test search input filters indicators
    - Test filter buttons filter by goal
    - Test displays summary statistics
    - Test displays "No results found" when no matches
    - Test expand/collapse functionality
  
  - [ ]* 22.4 Test SignalFeed component
    - Test displays all data streams
    - Test displays loading spinner when loading
    - Test target badges trigger onTargetClick
    - Test displays error state when data fails to load

- [ ] 23. Optimize performance
  - [~] 23.1 Add React.memo to expensive components
    - Wrap IndicatorRow with React.memo and custom comparison function
    - Wrap DataStreamCard with React.memo
    - Wrap StatusBadge, RBISLinkageBadge, ProgressBar with React.memo
    - Measure render performance with React DevTools Profiler
  
  - [~] 23.2 Implement useCallback and useMemo optimizations
    - Wrap event handlers with useCallback in parent components
    - Wrap expensive calculations with useMemo (e.g., filtered data, summary statistics)
    - Optimize filter and search functions to avoid unnecessary re-renders
  
  - [~] 23.3 Add data caching
    - Cache GBIF API responses for 30 seconds
    - Cache Supabase queries for 60 seconds
    - Implement cache invalidation on manual refresh
    - Use localStorage for persistent caching (optional)

- [ ] 24. Implement accessibility features
  - [~] 24.1 Add ARIA labels and roles
    - Add `aria-label` to icon-only buttons
    - Add `aria-expanded` to collapsible sections
    - Add `aria-controls` to buttons that control other elements
    - Add `aria-live="polite"` to auto-updating metrics
    - Add `role="region"` to major sections
    - _Requirements: 9.8_
  
  - [~] 24.2 Ensure keyboard navigation
    - Test all interactive elements are keyboard accessible
    - Ensure logical tab order throughout the dashboard
    - Add keyboard shortcuts for expand/collapse (Enter/Space)
    - Add Escape key to close expanded sections
    - Test with keyboard-only navigation
    - _Requirements: 9.8_
  
  - [~] 24.3 Verify color contrast and focus indicators
    - Ensure all text meets WCAG 2.1 AA contrast ratio (4.5:1)
    - Add visible focus indicators to all interactive elements
    - Test status indicators are distinguishable without color (use icons + text)
    - Test with browser accessibility tools
    - _Requirements: 9.3, 9.8_

- [ ] 25. Add documentation
  - [~] 25.1 Add JSDoc comments to all functions
    - Document all service functions with parameters, return types, and examples
    - Document all custom hooks with usage examples
    - Document all utility functions with edge cases
    - Document all component props with descriptions
  
  - [~] 25.2 Create README for RBIS dashboard
    - Document component architecture and data flow
    - Document API integration points (RBIS, GBIF, Supabase)
    - Document environment variables required
    - Document database schema and migrations
    - Add troubleshooting guide for common issues
    - Add screenshots of the dashboard

- [~] 26. Final checkpoint - End-to-end testing
  - Test complete user workflow: connect → view metrics → search indicators → filter by goal → click target in signal feed → scroll to matrix
  - Test auto-refresh behavior over 5 minutes
  - Test error recovery: disconnect network → reconnect → verify data reloads
  - Test responsive layout on mobile, tablet, and desktop
  - Test accessibility with screen reader (NVDA or JAWS)
  - Test performance with React DevTools Profiler
  - Verify all requirements are met
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows the existing project patterns (React, TypeScript, Supabase, Vite)
- Auto-refresh intervals: MetricsPanel (30s), SignalFeed (60s)
- Color coding: green (positive/active), yellow (warning/at-risk), red (error/off-track), gray (inactive/not-linked)
- Database migrations should be run before implementing service layer
- GBIF API rate limit: max 1 request per second
- All components use TypeScript for type safety
- Accessibility compliance target: WCAG 2.1 AA

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "3.1", "4.1"] },
    { "id": 2, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 3, "tasks": ["7.1", "8.1", "9.1", "10.1"] },
    { "id": 4, "tasks": ["8.2", "9.2", "10.2"] },
    { "id": 5, "tasks": ["9.3"] },
    { "id": 6, "tasks": ["9.4"] },
    { "id": 7, "tasks": ["12.1"] },
    { "id": 8, "tasks": ["12.2", "12.3", "13.1", "14.1", "15.1", "15.2", "16.1"] },
    { "id": 9, "tasks": ["16.2", "16.3", "17.1"] },
    { "id": 10, "tasks": ["17.2"] },
    { "id": 11, "tasks": ["19.1"] },
    { "id": 12, "tasks": ["19.2", "20.1", "20.2", "21.1", "21.2", "22.1", "22.2", "22.3", "22.4", "23.1"] },
    { "id": 13, "tasks": ["23.2", "23.3", "24.1", "24.2", "24.3", "25.1", "25.2"] }
  ]
}
```
