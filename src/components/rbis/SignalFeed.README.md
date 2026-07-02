# SignalFeed Component

## Overview

The `SignalFeed` component displays live RBIS (Rwanda Biodiversity Information System) data streams mapped to national targets with real-time occurrence counts. It provides a comprehensive view of biodiversity data collection activity across multiple data sources.

## Features

- **Live Data Streams**: Displays all active, inactive, and error data streams
- **Summary Statistics**: Shows total active streams and total occurrence records
- **Target Mapping**: Each data stream shows which national targets it supports
- **Status Indicators**: Color-coded status badges (active, inactive, error)
- **Clickable Targets**: Target badges trigger scroll-to-target functionality
- **Auto-refresh**: Updates every 60 seconds (indicated by pulsing indicator)
- **Error Handling**: Displays error messages with retry functionality
- **Loading States**: Shows loading spinner during data fetch
- **Empty States**: Graceful handling when no data streams are available

## Component Structure

```
SignalFeed (Main Container)
├── Header
│   ├── Title with auto-refresh indicator
│   └── Summary statistics (active streams, total records)
├── Data Streams List
│   └── DataStreamCard (for each stream)
│       ├── Icon and name
│       ├── Status badge
│       ├── Description
│       ├── Occurrence count
│       ├── Target badges (clickable)
│       ├── Error message (if status is 'error')
│       └── Last update timestamp
└── Loading/Error/Empty states
```

## Props Interface

```typescript
interface SignalFeedProps {
  /** Data streams to display */
  dataStreams: RBISDataStream[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error?: string | null;
  /** Callback when target is clicked */
  onTargetClick: (targetId: number) => void;
  /** Optional refetch callback */
  onRefetch?: () => void;
}
```

## Data Stream Interface

```typescript
interface RBISDataStream {
  id: string;
  name: string;
  description: string;
  targetNumbers: number[];
  occurrenceCount: number;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  lastUpdate: string;
  icon?: string;
  color?: string;
}
```

## Usage Example

```tsx
import { SignalFeed } from './components/rbis/SignalFeed';
import { useRBISSignalFeed } from './hooks/useRBIS';

function RBISPage() {
  const { dataStreams, loading, error, refetch } = useRBISSignalFeed();

  const handleTargetClick = (targetId: number) => {
    // Scroll to target in IndicatorsMatrix
    scrollToTarget(targetId);
  };

  return (
    <SignalFeed
      dataStreams={dataStreams}
      loading={loading}
      error={error}
      onTargetClick={handleTargetClick}
      onRefetch={refetch}
    />
  );
}
```

## Styling

The component follows the established RBIS dashboard design patterns:

- **Card-based layout**: Uses `var(--surface)`, `var(--border)`, `var(--radius)` CSS variables
- **Color coding**:
  - Green (#10b981): Active status
  - Gray (#6b7280): Inactive status
  - Red (#ef4444): Error status
  - Blue (#0ea5e9): Occurrence counts and data metrics
- **Typography**: Uses 'DM Sans' for text and 'DM Mono' for timestamps
- **Hover effects**: Interactive elements have smooth transitions
- **Responsive**: Adapts to different screen sizes

## Status Indicators

### Active

- **Color**: Green (#10b981)
- **Background**: Light green (#d1fae5)
- **Icon**: fa-circle-check
- **Meaning**: Data stream is operational and providing data

### Inactive

- **Color**: Gray (#6b7280)
- **Background**: Light gray (#f3f4f6)
- **Icon**: fa-circle-pause
- **Meaning**: Data stream is not currently providing data

### Error

- **Color**: Red (#ef4444)
- **Background**: Light red (#fee2e2)
- **Icon**: fa-circle-exclamation
- **Meaning**: Data stream encountered an error
- **Additional**: Displays error message below the card

## Target Click Behavior

When a user clicks a target badge:

1. The `onTargetClick` callback is triggered with the target ID
2. The parent component (typically RBISPage) handles scrolling to the target in the IndicatorsMatrix
3. The target section is highlighted and expanded

## Auto-refresh

The component displays a pulsing green indicator with "Auto-refresh: 60s" text to indicate that data is automatically refreshed every 60 seconds. This is handled by the parent component's data fetching hook.

## Error Handling

The component handles three types of errors:

1. **Loading Error**: Displayed when initial data fetch fails
   - Shows ErrorDisplay component with retry button
   - Centered in the card

2. **Stream Error**: Displayed when individual stream has error status
   - Shows error message below the stream card
   - Stream remains visible with error badge

3. **Empty State**: Displayed when no data streams are available
   - Shows inbox icon with "No data streams available" message

## Accessibility

- All interactive elements are keyboard accessible
- Target badges have hover states for visual feedback
- Status indicators use both color and text for accessibility
- Icons are decorative and don't require alt text

## Performance

- Uses React functional components
- Can be wrapped with React.memo for optimization
- Efficient rendering with key props on list items
- Smooth transitions with CSS

## Testing

A test file is provided at `SignalFeed.test.tsx` with:

- Mock data streams
- Test scenarios for all states (normal, loading, error, empty)
- Visual test component for manual verification

## Requirements Mapping

This component satisfies the following requirements from the spec:

- **7.1**: Display list of target-specific data streams
- **7.2**: Display target number for each stream
- **7.3**: Display data stream name
- **7.4**: Display live occurrence record count
- **7.5**: Display connection status
- **7.6**: Green "Active" indicator for active streams
- **7.7**: Gray "Inactive" indicator for inactive streams
- **7.8**: Red "Error" indicator with error details
- **7.9**: Auto-refresh occurrence counts every 60 seconds
- **7.10**: Display timestamp of last update
- **8.4**: Clickable target numbers that trigger scroll
- **8.5**: Display total number of active data streams
- **8.6**: Display total occurrence records across all streams
- **9.1**: Card-based layout with consistent spacing
- **9.2**: Consistent borders and styling
- **10.1**: Loading indicators
- **10.5**: Error display with retry button

## Integration

The SignalFeed component integrates with:

1. **useRBISSignalFeed hook**: Provides data streams with auto-refresh
2. **IndicatorsMatrix component**: Target click scrolls to matrix
3. **RBISPage container**: Orchestrates all RBIS components
4. **Supabase database**: Data streams stored in `rbis_data_streams` table
5. **GBIF API**: Occurrence counts fetched from GBIF

## Future Enhancements

Potential improvements for future iterations:

- Filter data streams by status (active/inactive/error)
- Search data streams by name
- Sort data streams by occurrence count or name
- Expand/collapse individual stream cards
- Display trend charts for occurrence counts
- Export data stream information
- Real-time WebSocket updates instead of polling
