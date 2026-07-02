# DataStreamCard Component

## Overview

The `DataStreamCard` component displays individual RBIS (Rwanda Biodiversity Information System) data stream information with status indicators, occurrence counts, and target mappings.

## Features

- **Data Stream Information**: Displays name, description, and custom icon
- **Status Indicators**: Color-coded status (Active=green, Inactive=gray, Error=red)
- **Occurrence Count**: Formatted number display with proper pluralization
- **Target Mapping**: Clickable badges for associated national targets
- **Error Handling**: Displays error messages when status is 'error'
- **Last Update**: Timestamp of the most recent data update
- **Hover Effects**: Interactive hover states on target badges

## Requirements Satisfied

This component satisfies the following requirements from the RBIS Comprehensive Dashboard specification:

- **Req 7.2**: Display target number it supports
- **Req 7.3**: Display data stream name
- **Req 7.4**: Display live occurrence record count from GBIF
- **Req 7.5**: Display connection status (Active, Inactive, Error)
- **Req 7.6**: Green "Active" indicator
- **Req 7.7**: Gray "Inactive" indicator
- **Req 7.8**: Red "Error" indicator with error details
- **Req 7.10**: Display timestamp of last update
- **Req 8.1**: Map to one or more national targets
- **Req 8.2**: Display all target numbers it supports
- **Req 8.4**: Clickable target numbers that trigger callback
- **Req 9.3**: Color coding for states
- **Req 9.4**: Icons for data types
- **Req 9.8**: Visual feedback for interactive elements (hover states)

## Props

```typescript
interface DataStreamCardProps {
  /** Data stream to display */
  dataStream: RBISDataStream;
  /** Callback when target is clicked */
  onTargetClick: (targetId: number) => void;
}
```

### RBISDataStream Type

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

## Usage

```tsx
import { DataStreamCard } from './DataStreamCard';

function MyComponent() {
  const dataStream = {
    id: 'protected-areas',
    name: 'Protected Areas Coverage',
    description: 'Monitoring of protected area extent and biodiversity',
    targetNumbers: [1, 2, 3],
    occurrenceCount: 15234,
    status: 'active',
    lastUpdate: new Date().toISOString(),
    icon: 'fa-shield-halved',
    color: '#059669',
  };

  const handleTargetClick = (targetId: number) => {
    console.log('Target clicked:', targetId);
    // Scroll to target in matrix, etc.
  };

  return <DataStreamCard dataStream={dataStream} onTargetClick={handleTargetClick} />;
}
```

## Visual Structure

```
┌─────────────────────────────────────────────────────────┐
│ [Icon] Protected Areas Coverage        [● Active]       │
│        Monitoring of protected area extent...           │
├─────────────────────────────────────────────────────────┤
│ 📊 15,234 occurrences                                   │
├─────────────────────────────────────────────────────────┤
│ SUPPORTS TARGETS                                        │
│ [Target 1] [Target 2] [Target 3]                        │
├─────────────────────────────────────────────────────────┤
│ 🕐 Last updated: 12/15/2024, 3:45:23 PM                │
└─────────────────────────────────────────────────────────┘
```

## Status Indicators

### Active (Green)

- Color: `#10b981`
- Background: `#d1fae5`
- Text: `#065f46`
- Icon: `fa-circle-check`

### Inactive (Gray)

- Color: `#6b7280`
- Background: `#f3f4f6`
- Text: `#374151`
- Icon: `fa-circle-pause`

### Error (Red)

- Color: `#ef4444`
- Background: `#fee2e2`
- Text: `#991b1b`
- Icon: `fa-circle-exclamation`
- Shows error message below occurrence count

## Styling

The component uses inline styles with CSS custom properties for theming:

- `--surface-2`: Card background
- `--surface-3`: Hover background
- `--border`: Border color
- `--sky-dim`: Hover border color
- `--text-1`: Primary text
- `--text-3`: Secondary text
- `--text-4`: Tertiary text

## Interactions

### Target Badge Click

When a user clicks a target badge, the `onTargetClick` callback is triggered with the target ID. This typically scrolls to and highlights the target in the Indicators Matrix.

### Hover Effects

- **Card**: Background changes to `--surface-3`, border changes to `--sky-dim`
- **Target Badges**: Background darkens, slight upward translation

## Testing

See `DataStreamCard.test.tsx` for test cases covering:

- Active stream display
- Inactive stream display
- Error stream with error message
- Target badge interactions
- Hover states

## Performance Considerations

This component is designed to be wrapped with `React.memo` for performance optimization (see Task 23.1 in the spec). The component only re-renders when props change.

## Related Components

- **SignalFeed**: Parent component that renders multiple DataStreamCard instances
- **IndicatorsMatrix**: Target component for scroll-to-target functionality

## Future Enhancements

Potential improvements for future iterations:

- Real-time occurrence count updates with animation
- Expandable details section with more stream information
- Filtering by target number
- Export stream data functionality
