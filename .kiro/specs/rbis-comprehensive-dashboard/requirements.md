# Requirements Document

## Introduction

This document specifies the requirements for redesigning the RBIS (Rwanda Biodiversity Information System) page into a comprehensive dashboard that provides live connection status, real-time metrics, a complete indicators-targets-RBIS connection matrix, and live biodiversity data signal feeds. The new design replaces the current technical architecture-focused page with a monitoring and tracking interface that emphasizes the connection between RBIS data streams and NBSAP (National Biodiversity Strategy and Action Plan) targets and indicators.

## Glossary

- **RBIS**: Rwanda Biodiversity Information System - the core biodiversity data repository
- **GBIF**: Global Biodiversity Information Facility - international biodiversity data platform
- **NBSAP**: National Biodiversity Strategy and Action Plan
- **GBF**: Global Biodiversity Framework - international biodiversity goals framework
- **Dashboard**: The RBIS Comprehensive Dashboard user interface
- **Connection_Bar**: UI component displaying RBIS connection status and controls
- **Metrics_Panel**: UI component displaying real-time RBIS statistics
- **Matrix**: The indicators × targets × RBIS connection registry component
- **Signal_Feed**: UI component displaying live biodiversity data streams
- **Indicator**: A measurable metric tracking progress toward a national target
- **Target**: A specific national biodiversity goal aligned with GBF goals
- **Data_Stream**: A source of biodiversity data (e.g., Protected Areas, Threatened Species)

## Requirements

### Requirement 1: RBIS Connection Management

**User Story:** As a biodiversity data manager, I want to see the live connection status to RBIS and control the connection, so that I can monitor system availability and troubleshoot connectivity issues.

#### Acceptance Criteria

1. THE Connection_Bar SHALL display the current RBIS connection status (Connected, Disconnected, Connecting, Error)
2. WHEN the connection status is "Connected", THE Connection_Bar SHALL display a green indicator with the text "Connected to RBIS"
3. WHEN the connection status is "Disconnected", THE Connection_Bar SHALL display a red indicator with the text "Disconnected"
4. WHEN the connection status is "Connecting", THE Connection_Bar SHALL display a yellow indicator with the text "Connecting..."
5. WHEN the connection status is "Error", THE Connection_Bar SHALL display a red indicator with an error message
6. THE Connection_Bar SHALL provide a "Connect" button to initiate RBIS connection
7. WHEN the user clicks the "Connect" button, THE Dashboard SHALL attempt to establish connection to RBIS
8. THE Connection_Bar SHALL display the RBIS server URL (rbis.ur.ac.rw)

### Requirement 2: Real-Time RBIS Metrics Display

**User Story:** As a policy maker, I want to view live RBIS metrics and recent records, so that I can understand the current state of biodiversity data collection.

#### Acceptance Criteria

1. THE Metrics_Panel SHALL display the total number of occurrence records in RBIS
2. THE Metrics_Panel SHALL display the number of records added in the last 24 hours
3. THE Metrics_Panel SHALL display the number of records added in the last 7 days
4. THE Metrics_Panel SHALL display the number of active data streams
5. THE Metrics_Panel SHALL display the timestamp of the last data update
6. WHEN RBIS connection is active, THE Metrics_Panel SHALL refresh metrics every 30 seconds
7. THE Metrics_Panel SHALL display a list of the 5 most recent occurrence records
8. FOR EACH recent record, THE Metrics_Panel SHALL display the species name, location, and timestamp

### Requirement 3: Indicators and Targets Registry Display

**User Story:** As an NBSAP coordinator, I want to view the complete registry of all 79 indicators across 22 national targets organized by 4 GBF goals, so that I can understand the full scope of biodiversity monitoring requirements.

#### Acceptance Criteria

1. THE Matrix SHALL display all 22 national targets organized under 4 GBF goals (Goal A, Goal B, Goal C, Goal D)
2. THE Matrix SHALL display all 79 indicators associated with the 22 national targets
3. FOR EACH GBF goal, THE Matrix SHALL display a collapsible section containing its associated targets
4. FOR EACH target, THE Matrix SHALL display a collapsible section containing its associated indicators
5. FOR EACH target, THE Matrix SHALL display the target number, title, and description
6. FOR EACH indicator, THE Matrix SHALL display the indicator number, title, and measurement unit
7. THE Matrix SHALL display the total count of targets and indicators in the header
8. WHEN a user clicks a GBF goal header, THE Matrix SHALL expand or collapse that goal's targets
9. WHEN a user clicks a target header, THE Matrix SHALL expand or collapse that target's indicators

### Requirement 4: RBIS Linkage Status Tracking

**User Story:** As a data integration specialist, I want to see which indicators are linked to RBIS data streams, so that I can identify gaps in automated data collection.

#### Acceptance Criteria

1. FOR EACH indicator, THE Matrix SHALL display the RBIS linkage status (Linked, Not Linked, Partial)
2. WHEN an indicator is linked to RBIS, THE Matrix SHALL display a green "Linked" badge
3. WHEN an indicator is not linked to RBIS, THE Matrix SHALL display a gray "Not Linked" badge
4. WHEN an indicator is partially linked to RBIS, THE Matrix SHALL display a yellow "Partial" badge
5. FOR EACH linked indicator, THE Matrix SHALL display the names of connected RBIS data streams
6. THE Matrix SHALL display the total count of linked indicators in the header
7. THE Matrix SHALL display the total count of not linked indicators in the header
8. THE Matrix SHALL calculate and display the percentage of indicators linked to RBIS

### Requirement 5: Progress and On-Track Status Monitoring

**User Story:** As an NBSAP implementation officer, I want to see progress percentages and on-track status for each indicator, so that I can identify which targets need attention.

#### Acceptance Criteria

1. FOR EACH indicator, THE Matrix SHALL display the current progress percentage (0-100%)
2. FOR EACH indicator, THE Matrix SHALL display an on-track status (On Track, At Risk, Off Track)
3. WHEN an indicator progress is ≥80% of expected progress, THE Matrix SHALL display "On Track" status in green
4. WHEN an indicator progress is between 50% and 80% of expected progress, THE Matrix SHALL display "At Risk" status in yellow
5. WHEN an indicator progress is <50% of expected progress, THE Matrix SHALL display "Off Track" status in red
6. FOR EACH indicator, THE Matrix SHALL display a visual progress bar showing the progress percentage
7. FOR EACH target, THE Matrix SHALL calculate and display the average progress of all its indicators
8. FOR EACH GBF goal, THE Matrix SHALL calculate and display the average progress of all its targets

### Requirement 6: Search and Filter Functionality

**User Story:** As a user, I want to search and filter the indicators and targets registry, so that I can quickly find specific information.

#### Acceptance Criteria

1. THE Matrix SHALL provide a search input field in the header
2. WHEN a user enters text in the search field, THE Matrix SHALL filter indicators and targets to show only those matching the search term
3. THE Matrix SHALL match search terms against target titles, target descriptions, indicator titles, and indicator numbers
4. THE Matrix SHALL provide filter buttons for each GBF goal (Goal A, Goal B, Goal C, Goal D, All)
5. WHEN a user clicks a GBF goal filter button, THE Matrix SHALL display only targets and indicators belonging to that goal
6. WHEN a user clicks the "All" filter button, THE Matrix SHALL display all targets and indicators
7. THE Matrix SHALL highlight the active filter button
8. WHEN search or filter results in zero matches, THE Matrix SHALL display a "No results found" message

### Requirement 7: Live RBIS Signal Feed Display

**User Story:** As a biodiversity monitoring officer, I want to view live data signals from RBIS mapped to specific targets, so that I can see real-time biodiversity data collection activity.

#### Acceptance Criteria

1. THE Signal_Feed SHALL display a list of target-specific data streams
2. FOR EACH data stream, THE Signal_Feed SHALL display the target number it supports
3. FOR EACH data stream, THE Signal_Feed SHALL display the data stream name (e.g., "Protected Areas Coverage", "Threatened Species Monitoring")
4. FOR EACH data stream, THE Signal_Feed SHALL display the live occurrence record count from GBIF
5. FOR EACH data stream, THE Signal_Feed SHALL display the connection status (Active, Inactive, Error)
6. WHEN a data stream is active, THE Signal_Feed SHALL display a green "Active" indicator
7. WHEN a data stream is inactive, THE Signal_Feed SHALL display a gray "Inactive" indicator
8. WHEN a data stream has an error, THE Signal_Feed SHALL display a red "Error" indicator with error details
9. THE Signal_Feed SHALL refresh occurrence counts every 60 seconds
10. THE Signal_Feed SHALL display the timestamp of the last update for each data stream

### Requirement 8: Data Stream to Target Mapping

**User Story:** As an NBSAP coordinator, I want to understand which RBIS data streams support which national targets, so that I can assess data coverage for each target.

#### Acceptance Criteria

1. THE Signal_Feed SHALL map each data stream to one or more national targets
2. FOR EACH data stream, THE Signal_Feed SHALL display all target numbers it supports
3. THE Signal_Feed SHALL support the following data streams: Protected Areas Coverage, Threatened Species Monitoring, Forest Cover Change, Wetland Extent, Species Distribution, Invasive Species Tracking, Ecosystem Restoration, Sustainable Use Indicators
4. WHEN a user clicks a target number in the Signal_Feed, THE Dashboard SHALL scroll to and highlight that target in the Matrix
5. THE Signal_Feed SHALL display the total number of active data streams
6. THE Signal_Feed SHALL display the total number of occurrence records across all data streams

### Requirement 9: Responsive Layout and Visual Design

**User Story:** As a user, I want the dashboard to be visually clear and work on different screen sizes, so that I can access it from various devices.

#### Acceptance Criteria

1. THE Dashboard SHALL organize components in the following order: Connection_Bar, Metrics_Panel, Matrix, Signal_Feed
2. THE Dashboard SHALL use a card-based layout with consistent spacing and borders
3. THE Dashboard SHALL use color coding: green for positive/active states, yellow for warning/at-risk states, red for error/off-track states, gray for inactive/not-linked states
4. THE Dashboard SHALL use icons to represent different data types and statuses
5. WHEN the viewport width is less than 768px, THE Dashboard SHALL stack components vertically
6. WHEN the viewport width is greater than 768px, THE Dashboard SHALL display the Matrix and Signal_Feed side by side
7. THE Dashboard SHALL use consistent typography with clear hierarchy (headers, subheaders, body text)
8. THE Dashboard SHALL provide visual feedback for interactive elements (hover states, active states)

### Requirement 10: Error Handling and Loading States

**User Story:** As a user, I want clear feedback when data is loading or when errors occur, so that I understand the system state.

#### Acceptance Criteria

1. WHEN the Dashboard is loading initial data, THE Dashboard SHALL display loading indicators for each component
2. WHEN RBIS connection fails, THE Connection_Bar SHALL display an error message with retry instructions
3. WHEN metrics data fails to load, THE Metrics_Panel SHALL display an error message with a retry button
4. WHEN the Matrix data fails to load, THE Matrix SHALL display an error message with a retry button
5. WHEN the Signal_Feed data fails to load, THE Signal_Feed SHALL display an error message with a retry button
6. WHEN a user clicks a retry button, THE Dashboard SHALL attempt to reload the failed component's data
7. THE Dashboard SHALL display a timeout error message if data loading exceeds 30 seconds
8. THE Dashboard SHALL log all errors to the browser console for debugging purposes
