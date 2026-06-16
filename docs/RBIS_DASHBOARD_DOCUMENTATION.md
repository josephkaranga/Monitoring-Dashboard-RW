# RBIS Comprehensive Dashboard - Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features](#features)
4. [Database Schema](#database-schema)
5. [API Integration](#api-integration)
6. [Component Structure](#component-structure)
7. [Data Flow](#data-flow)
8. [Implementation Details](#implementation-details)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The RBIS (Rwanda Biodiversity Information System) Comprehensive Dashboard is a real-time monitoring interface that provides:

- **Live Connection Management**: Real-time RBIS connection status and controls
- **Real-Time Metrics**: Live biodiversity data statistics from RBIS and GBIF
- **Indicators-Targets Matrix**: Complete registry of 79 indicators across 22 national targets organized by 4 GBF goals
- **RBIS Linkage Tracking**: Visual mapping of which indicators are connected to RBIS data streams
- **Progress Monitoring**: Progress percentages and on-track status for each indicator
- **Live Signal Feed**: Real-time biodiversity data streams mapped to specific targets
- **Search and Filter**: Comprehensive search and filtering capabilities

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL)
- **APIs**: GBIF API (Global Biodiversity Information Facility), RBIS API
- **Styling**: CSS Modules, Tailwind CSS (if applicable)
- **State Management**: React Hooks (useState, useEffect, useCallback, useMemo)

### Key Metrics

- **22 National Targets** aligned with Global Biodiversity Framework
- **79 Indicators** tracking biodiversity progress
- **8 Data Streams** from RBIS providing real-time biodiversity data
- **Auto-refresh**: Metrics (30s), Data Streams (60s)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RBIS Dashboard                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Connection   │  │   Metrics    │  │  Indicators  │     │
│  │     Bar      │  │    Panel     │  │    Matrix    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────────────────────────────────────────┐     │
│  │              Signal Feed                          │     │
│  └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
   │ RBIS API│         │GBIF API │        │Supabase │
   │rbis.ur. │         │api.gbif.│        │Database │
   │ac.rw    │         │org      │        │         │
   └─────────┘         └─────────┘        └─────────┘
```


### Component Hierarchy

```
RBISPage (Container)
├── ConnectionBar
│   └── Connection status, controls, server URL
├── MetricsPanel
│   ├── Metric cards (5 metrics)
│   └── Recent occurrences list
├── IndicatorsMatrix
│   ├── SearchBar (search & filter controls)
│   └── GBFGoalSection (4 goals)
│       └── TargetSection (22 targets)
│           └── IndicatorRow (79 indicators)
│               ├── ProgressBar
│               ├── StatusBadge
│               └── RBISLinkageBadge
└── SignalFeed
    └── DataStreamCard (8 data streams)
```

---

## Features

### 1. Connection Management

**Purpose**: Monitor and control RBIS connection status

**Features**:
- Real-time connection status (Connected, Disconnected, Connecting, Error)
- Color-coded indicators (Green=Connected, Red=Disconnected, Yellow=Connecting)
- Connect/Disconnect controls
- Server URL display (rbis.ur.ac.rw)
- Last sync timestamp
- Error message display

### 2. Real-Time Metrics

**Purpose**: Display live biodiversity data statistics

**Metrics Displayed**:
- Total occurrence records in RBIS
- Records added in last 24 hours
- Records added in last 7 days
- Number of active data streams
- Last data update timestamp
- 5 most recent occurrence records (species, location, timestamp)

**Auto-refresh**: Every 30 seconds when connected


### 3. Indicators and Targets Registry

**Purpose**: Complete registry of all biodiversity indicators and targets

**Structure**:
- **4 GBF Goals** (Global Biodiversity Framework)
  - Goal A: Ecosystem Integrity
  - Goal B: Sustainable Use
  - Goal C: Benefit Sharing
  - Goal D: Implementation
- **22 National Targets** aligned with GBF goals
- **79 Indicators** measuring progress toward targets

**Features**:
- Collapsible goal and target sections
- Progress bars for each indicator
- Status badges (On Track, At Risk, Off Track)
- RBIS linkage badges (Linked, Not Linked, Partial)
- Average progress calculation for targets and goals
- Search functionality (by title, description, indicator number)
- Filter by GBF goal (A, B, C, D, All)

### 4. RBIS Linkage Tracking

**Purpose**: Visualize which indicators are connected to RBIS data streams

**Linkage Status**:
- **Linked** (Green): Indicator receives automated data from RBIS
- **Not Linked** (Gray): Indicator requires manual data entry
- **Partial** (Yellow): Indicator partially automated

**Display**:
- Linkage badge on each indicator
- Connected data stream names
- Linkage percentage in summary statistics

### 5. Progress Monitoring

**Purpose**: Track progress toward 2030 biodiversity targets

**Status Calculation**:
- **On Track** (Green): Progress ≥80% of expected progress
- **At Risk** (Yellow): Progress 50-80% of expected progress
- **Off Track** (Red): Progress <50% of expected progress

**Display**:
- Visual progress bars (0-100%)
- Color-coded status badges
- Baseline, current value, and 2030 target values


### 6. Live Signal Feed

**Purpose**: Display real-time biodiversity data streams

**8 Data Streams**:
1. Protected Areas Coverage
2. Threatened Species Monitoring
3. Forest Cover Change
4. Wetland Extent
5. Species Distribution
6. Invasive Species Tracking
7. Ecosystem Restoration
8. Sustainable Use Indicators

**Features**:
- Live occurrence counts from GBIF
- Status indicators (Active, Inactive, Error)
- Target mapping (which targets each stream supports)
- Clickable target badges (scroll to target in matrix)
- Last update timestamp
- Auto-refresh every 60 seconds

---

## Database Schema

### New Tables

#### 1. `rbis_linkages`

Stores the connection between indicators and RBIS data streams.

```sql
CREATE TABLE rbis_linkages (
  id SERIAL PRIMARY KEY,
  indicator_id INTEGER NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  data_stream_id VARCHAR(100) NOT NULL,
  linkage_status VARCHAR(20) NOT NULL CHECK (linkage_status IN ('linked', 'not-linked', 'partial')),
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rbis_linkages_indicator ON rbis_linkages(indicator_id);
CREATE INDEX idx_rbis_linkages_stream ON rbis_linkages(data_stream_id);
```

**Columns**:
- `indicator_id`: Foreign key to indicators table
- `data_stream_id`: ID of the RBIS data stream
- `linkage_status`: 'linked', 'not-linked', or 'partial'
- `last_sync`: Timestamp of last data synchronization


#### 2. `rbis_data_streams`

Stores RBIS data stream definitions and metadata.

```sql
CREATE TABLE rbis_data_streams (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_numbers INTEGER[] NOT NULL,
  occurrence_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'error')),
  error_message TEXT,
  last_update TIMESTAMPTZ,
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rbis_streams_status ON rbis_data_streams(status);
```

**Columns**:
- `id`: Unique identifier (e.g., 'protected-areas')
- `name`: Display name (e.g., 'Protected Areas Coverage')
- `description`: Detailed description of the data stream
- `target_numbers`: Array of national target IDs this stream supports
- `occurrence_count`: Current count of occurrence records
- `status`: 'active', 'inactive', or 'error'
- `error_message`: Error details if status is 'error'
- `last_update`: Timestamp of last data update
- `icon`: Icon identifier for UI display
- `color`: Color code for UI display

#### 3. `rbis_connection_log`

Logs RBIS connection events for monitoring and debugging.

```sql
CREATE TABLE rbis_connection_log (
  id SERIAL PRIMARY KEY,
  status VARCHAR(20) NOT NULL,
  server_url VARCHAR(255) NOT NULL,
  error_message TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rbis_connection_log_created ON rbis_connection_log(created_at DESC);
```

**Columns**:
- `status`: Connection status ('connected', 'disconnected', 'error')
- `server_url`: RBIS server URL (rbis.ur.ac.rw)
- `error_message`: Error details if status is 'error'
- `user_id`: User who initiated the connection (nullable)
- `created_at`: Timestamp of the connection event


### Existing Tables Used

#### `indicators`

Existing table storing biodiversity indicators.

**Key Columns**:
- `id`: Indicator ID
- `nbsap_target_id`: Foreign key to nbsap_targets
- `name`: Indicator title
- `definition`: Detailed description
- `progress`: Current progress (0-100)
- `status`: 'on-track', 'at-risk', or 'off-track'
- `baseline`: Baseline value
- `current_value`: Current measured value
- `final_target`: 2030 target value
- `periodicity`: Measurement frequency

#### `nbsap_targets`

Existing table storing national biodiversity targets.

**Key Columns**:
- `id`: Target ID (1-22)
- `goal`: GBF goal ('A', 'B', 'C', 'D')
- `title`: Target title
- `description`: Detailed description

---

## API Integration

### 1. RBIS API

**Base URL**: `https://rbis.ur.ac.rw/api`

**Endpoints Used**:
- `GET /health` - Check RBIS connection status

**Authentication**: None (public health endpoint)

**Rate Limiting**: No specific limit

### 2. GBIF API

**Base URL**: `https://api.gbif.org/v1`

**Endpoints Used**:
- `GET /occurrence/search` - Search occurrence records

**Query Parameters**:
- `country=RW` - Filter by Rwanda
- `limit` - Number of results (0 for count only, 5 for recent records)
- `eventDate` - Date range filter (format: YYYY-MM-DD,YYYY-MM-DD)
- `hasCoordinate=true` - Only records with coordinates

**Rate Limiting**: Maximum 1 request per second (enforced client-side)

**Response Format**:
```json
{
  "count": 123456,
  "results": [
    {
      "key": "occurrence-id",
      "scientificName": "Species name",
      "stateProvince": "Province",
      "locality": "Location",
      "eventDate": "2024-01-01",
      "decimalLatitude": -1.9403,
      "decimalLongitude": 29.8739
    }
  ]
}
```


### 3. Supabase API

**Client**: `@supabase/supabase-js`

**Tables Queried**:
- `indicators` - Biodiversity indicators
- `nbsap_targets` - National targets
- `rbis_linkages` - Indicator-to-stream mappings
- `rbis_data_streams` - Data stream definitions
- `rbis_connection_log` - Connection event logs

**Authentication**: Supabase session-based authentication

---

## Component Structure

### Core Components

#### 1. RBISPage (`src/pages/RBISPage.tsx`)

**Purpose**: Main container component

**Responsibilities**:
- Manage overall page state
- Coordinate data fetching with custom hooks
- Handle search and filter state
- Implement scroll-to-target functionality
- Render child components in correct order

**Hooks Used**:
- `useRBISConnection()` - Connection management
- `useRBISMetrics()` - Metrics and recent occurrences
- `useIndicatorsMatrix()` - Goals, targets, indicators
- `useRBISSignalFeed()` - Data streams

**State**:
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [activeFilter, setActiveFilter] = useState<GBFGoalFilter>('all');
const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
const [expandedTargets, setExpandedTargets] = useState<Set<number>>(new Set());
```

#### 2. ConnectionBar (`src/components/rbis/ConnectionBar.tsx`)

**Purpose**: Display and control RBIS connection

**Props**:
```typescript
interface ConnectionBarProps {
  connection: RBISConnection;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}
```

**Features**:
- Color-coded status indicator
- Connect/Disconnect button
- Server URL display
- Last sync timestamp
- Error message display


#### 3. MetricsPanel (`src/components/rbis/MetricsPanel.tsx`)

**Purpose**: Display real-time RBIS metrics

**Props**:
```typescript
interface MetricsPanelProps {
  metrics: RBISMetrics | null;
  recentOccurrences: RBISOccurrence[];
  loading: boolean;
  lastUpdate: string;
}
```

**Features**:
- 5 metric cards with icons
- Recent occurrences list
- Auto-refresh every 30 seconds
- Loading states
- Number formatting (locale string)

#### 4. IndicatorsMatrix (`src/components/rbis/IndicatorsMatrix.tsx`)

**Purpose**: Display searchable/filterable indicators registry

**Props**:
```typescript
interface IndicatorsMatrixProps {
  goals: GBFGoal[];
  searchTerm: string;
  activeFilter: GBFGoalFilter;
  onSearchChange: (term: string) => void;
  onFilterChange: (filter: GBFGoalFilter) => void;
  onTargetClick: (targetId: number) => void;
}
```

**Features**:
- Search input with debouncing (300ms)
- Filter buttons (Goal A, B, C, D, All)
- Summary statistics
- Expand/collapse all functionality
- "No results found" message

#### 5. GBFGoalSection (`src/components/rbis/GBFGoalSection.tsx`)

**Purpose**: Collapsible goal container

**Props**:
```typescript
interface GBFGoalSectionProps {
  goal: GBFGoal;
  expanded: boolean;
  onToggle: () => void;
  onTargetClick: (targetId: number) => void;
}
```

**Features**:
- Goal header with title and description
- Average progress display
- Expand/collapse animation
- Color coding by goal (A=blue, B=green, C=yellow, D=purple)


#### 6. TargetSection (`src/components/rbis/TargetSection.tsx`)

**Purpose**: Collapsible target container

**Props**:
```typescript
interface TargetSectionProps {
  target: NBSAPTarget;
  expanded: boolean;
  onToggle: () => void;
  onTargetClick: (targetId: number) => void;
}
```

**Features**:
- Target header with number and title
- Average progress display
- Expand/collapse animation
- Target description display

#### 7. IndicatorRow (`src/components/rbis/IndicatorRow.tsx`)

**Purpose**: Display individual indicator

**Props**:
```typescript
interface IndicatorRowProps {
  indicator: Indicator;
  onTargetClick: (targetId: number) => void;
}
```

**Features**:
- Indicator number, title, measurement unit
- Progress bar
- Status badge (On Track, At Risk, Off Track)
- RBIS linkage badge
- Baseline, current value, 2030 target (tooltip)
- React.memo optimization

#### 8. SignalFeed (`src/components/rbis/SignalFeed.tsx`)

**Purpose**: Display live data streams

**Props**:
```typescript
interface SignalFeedProps {
  dataStreams: RBISDataStream[];
  loading: boolean;
  onTargetClick: (targetId: number) => void;
}
```

**Features**:
- Summary statistics (active streams, total occurrences)
- List of data stream cards
- Auto-refresh every 60 seconds
- Loading and error states


#### 9. DataStreamCard (`src/components/rbis/DataStreamCard.tsx`)

**Purpose**: Display individual data stream

**Props**:
```typescript
interface DataStreamCardProps {
  dataStream: RBISDataStream;
  onTargetClick: (targetId: number) => void;
}
```

**Features**:
- Stream name, description, icon
- Occurrence count (formatted)
- Status indicator (Active, Inactive, Error)
- Error message display
- Clickable target badges
- Last update timestamp
- React.memo optimization

### Shared Components

#### StatusBadge (`src/components/rbis/shared/StatusBadge.tsx`)

Color-coded badge for indicator status (On Track, At Risk, Off Track)

#### RBISLinkageBadge (`src/components/rbis/shared/RBISLinkageBadge.tsx`)

Badge showing RBIS linkage status with tooltip for connected streams

#### ProgressBar (`src/components/rbis/shared/ProgressBar.tsx`)

Horizontal progress bar with percentage label

#### LoadingSpinner (`src/components/rbis/shared/LoadingSpinner.tsx`)

Animated loading spinner with optional message

#### ErrorDisplay (`src/components/rbis/shared/ErrorDisplay.tsx`)

Error message display with retry button

---

## Data Flow

### 1. Initial Page Load

```
User navigates to /rbis
    ↓
RBISPage component mounts
    ↓
Custom hooks initialize
    ↓
┌─────────────────────────────────────────┐
│ useRBISConnection()                     │
│ - Initial status: 'disconnected'       │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ useRBISMetrics()                        │
│ - Fetch GBIF occurrence counts          │
│ - Fetch recent occurrences              │
│ - Fetch active streams count            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ useIndicatorsMatrix()                   │
│ - Fetch indicators with linkages        │
│ - Fetch targets with indicators         │
│ - Organize by GBF goals                 │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ useRBISSignalFeed()                     │
│ - Fetch data streams from database      │
└─────────────────────────────────────────┘
    ↓
Components render with data
```


### 2. Auto-Refresh Flow

```
MetricsPanel mounted
    ↓
useRBISMetrics() hook with autoRefresh=true
    ↓
setInterval(30000ms)
    ↓
Every 30 seconds:
    - Fetch GBIF counts
    - Fetch recent occurrences
    - Update component state
    ↓
Component re-renders with new data

SignalFeed mounted
    ↓
useRBISSignalFeed() hook with autoRefresh=true
    ↓
setInterval(60000ms)
    ↓
Every 60 seconds:
    - Fetch data streams
    - Update occurrence counts
    - Update component state
    ↓
Component re-renders with new data
```

### 3. Search and Filter Flow

```
User types in search input
    ↓
Debounce 300ms
    ↓
onSearchChange(searchTerm)
    ↓
RBISPage updates searchTerm state
    ↓
filterBySearch(goals, searchTerm)
    ↓
Filtered data passed to IndicatorsMatrix
    ↓
Component re-renders with filtered results

User clicks filter button (e.g., "Goal A")
    ↓
onFilterChange('A')
    ↓
RBISPage updates activeFilter state
    ↓
filterByGoal(goals, 'A')
    ↓
Filtered data passed to IndicatorsMatrix
    ↓
Component re-renders with filtered results
```

### 4. Scroll-to-Target Flow

```
User clicks target badge in SignalFeed
    ↓
onTargetClick(targetId)
    ↓
RBISPage scrollToTarget(targetId)
    ↓
Find target element by ref
    ↓
Auto-expand goal and target sections
    ↓
element.scrollIntoView({ behavior: 'smooth' })
    ↓
Add temporary highlight effect
    ↓
Remove highlight after 2 seconds
```


---

## Implementation Details

### TypeScript Interfaces

#### Core Types (`src/types/rbis.ts`)

```typescript
// Connection
export interface RBISConnection {
  status: RBISConnectionStatus;
  serverUrl: string;
  lastSync: string | null;
  error: string | null;
}

export type RBISConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Metrics
export interface RBISMetrics {
  totalOccurrences: number;
  last24Hours: number;
  last7Days: number;
  activeDataStreams: number;
  lastDataUpdate: string;
}

export interface RBISOccurrence {
  id: string;
  scientificName: string;
  location: string;
  timestamp: string;
  dataStream: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Indicators and Targets
export interface GBFGoal {
  id: 'A' | 'B' | 'C' | 'D';
  title: string;
  description: string;
  targets: NBSAPTarget[];
  averageProgress: number;
}

export interface NBSAPTarget {
  id: number;
  goalId: 'A' | 'B' | 'C' | 'D';
  number: string;
  title: string;
  description: string;
  indicators: Indicator[];
  averageProgress: number;
}

export interface Indicator {
  id: number;
  targetId: number;
  number: string;
  title: string;
  definition: string;
  measurementUnit: string;
  progress: number;
  status: IndicatorStatus;
  rbisLinkage: RBISLinkage;
  baseline: string;
  target2030: string;
  currentValue: string;
}

export type IndicatorStatus = 'on-track' | 'at-risk' | 'off-track';

export interface RBISLinkage {
  status: RBISLinkageStatus;
  dataStreams: string[];
  lastSync?: string;
}

export type RBISLinkageStatus = 'linked' | 'not-linked' | 'partial';
```


```typescript
// Data Streams
export interface RBISDataStream {
  id: string;
  name: string;
  description: string;
  targetNumbers: number[];
  occurrenceCount: number;
  status: DataStreamStatus;
  errorMessage?: string;
  lastUpdate: string;
  icon?: string;
  color?: string;
}

export type DataStreamStatus = 'active' | 'inactive' | 'error';

// Filters
export type GBFGoalFilter = 'all' | 'A' | 'B' | 'C' | 'D';

export interface SearchFilters {
  searchTerm: string;
  goalFilter: GBFGoalFilter;
  statusFilter?: IndicatorStatus | 'all';
  linkageFilter?: RBISLinkageStatus | 'all';
}

// Dashboard Summary
export interface RBISDashboardSummary {
  totalTargets: number;
  totalIndicators: number;
  linkedIndicators: number;
  linkagePercentage: number;
  onTrackIndicators: number;
  atRiskIndicators: number;
  offTrackIndicators: number;
  activeDataStreams: number;
  totalOccurrences: number;
}
```

### Service Functions (`src/services/rbisService.ts`)

#### Connection Management

```typescript
export async function connectToRBIS(): Promise<RBISConnection>
export async function disconnectFromRBIS(): Promise<void>
```

#### Data Fetching

```typescript
export async function fetchRBISMetrics(): Promise<RBISMetrics>
export async function fetchRecentOccurrences(limit?: number): Promise<RBISOccurrence[]>
export async function fetchIndicatorsWithLinkages(): Promise<Indicator[]>
export async function fetchTargetsWithIndicators(): Promise<NBSAPTarget[]>
export async function fetchGBFGoals(): Promise<GBFGoal[]>
export async function fetchRBISDataStreams(): Promise<RBISDataStream[]>
export async function fetchRBISDashboardSummary(): Promise<RBISDashboardSummary>
```

#### Data Updates

```typescript
export async function updateDataStreamCount(streamId: string, count: number): Promise<void>
```


### Custom Hooks (`src/hooks/useRBIS.ts`)

```typescript
// Connection hook
export function useRBISConnection(): {
  connection: RBISConnection;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// Metrics hook with auto-refresh
export function useRBISMetrics(
  autoRefresh?: boolean,
  refreshInterval?: number
): {
  metrics: RBISMetrics | null;
  recentOccurrences: RBISOccurrence[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Indicators matrix hook
export function useIndicatorsMatrix(): {
  goals: GBFGoal[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Signal feed hook with auto-refresh
export function useRBISSignalFeed(
  autoRefresh?: boolean,
  refreshInterval?: number
): {
  dataStreams: RBISDataStream[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Dashboard summary hook
export function useRBISDashboardSummary(): {
  summary: RBISDashboardSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

### Filter Utilities (`src/utils/rbisFilters.ts`)

```typescript
export function filterBySearch(goals: GBFGoal[], searchTerm: string): GBFGoal[]
export function filterByGoal(goals: GBFGoal[], goalFilter: GBFGoalFilter): GBFGoal[]
export function applyFilters(goals: GBFGoal[], filters: SearchFilters): GBFGoal[]
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# RBIS Configuration (optional - defaults to rbis.ur.ac.rw)
VITE_RBIS_API_URL=https://rbis.ur.ac.rw/api

# GBIF Configuration (optional - defaults to api.gbif.org)
VITE_GBIF_API_URL=https://api.gbif.org/v1
```


### Database Setup

1. **Run migrations** in Supabase Dashboard:
   - Execute `004_rbis_tables.sql` to create tables
   - Execute `005_seed_rbis_data_streams.sql` to seed data streams

2. **Enable Row Level Security (RLS)**:
   - RLS policies are included in the migration files
   - Authenticated users have read access to all RBIS tables
   - Only authenticated users can insert connection logs

3. **Verify tables**:
   ```sql
   SELECT * FROM rbis_data_streams;
   SELECT * FROM rbis_linkages;
   SELECT * FROM rbis_connection_log;
   ```

### GBIF Proxy Setup (Optional but Recommended)

To avoid CORS issues and improve reliability, deploy the GBIF proxy Edge Function:

1. **Deploy the function**:
   ```bash
   supabase functions deploy gbif-proxy
   ```

2. **Update service to use proxy**:
   - The `rbisService.ts` already includes proxy support
   - Set `USE_GBIF_PROXY=true` in environment variables

3. **Verify deployment**:
   ```bash
   curl https://your-project.supabase.co/functions/v1/gbif-proxy?endpoint=occurrence/search&country=RW&limit=1
   ```

---

## Troubleshooting

### Common Issues

#### 1. RBIS Connection Fails

**Symptoms**: ConnectionBar shows "Error" status

**Possible Causes**:
- RBIS server is down
- Network connectivity issues
- CORS policy blocking request

**Solutions**:
- Check RBIS server status at https://rbis.ur.ac.rw
- Verify network connection
- Check browser console for CORS errors
- Add RBIS URL to Content Security Policy in `index.html`

#### 2. GBIF API Requests Fail

**Symptoms**: Metrics show 0 or error messages

**Possible Causes**:
- GBIF API rate limit exceeded
- Network timeout
- CORS policy blocking request

**Solutions**:
- Deploy GBIF proxy Edge Function (recommended)
- Reduce auto-refresh frequency
- Check browser console for errors
- Verify GBIF API status at https://www.gbif.org


#### 3. Indicators Not Loading

**Symptoms**: IndicatorsMatrix shows loading spinner indefinitely

**Possible Causes**:
- Supabase connection error
- Missing database tables
- RLS policy blocking access

**Solutions**:
- Verify Supabase credentials in `.env`
- Check database tables exist
- Verify RLS policies allow authenticated access
- Check browser console for Supabase errors

#### 4. Data Streams Show "Inactive" Status

**Symptoms**: All data streams show gray "Inactive" indicator

**Possible Causes**:
- Data streams not seeded in database
- Status field set to 'inactive'

**Solutions**:
- Run `005_seed_rbis_data_streams.sql` migration
- Update status to 'active' in database:
  ```sql
  UPDATE rbis_data_streams SET status = 'active';
  ```

#### 5. Search/Filter Not Working

**Symptoms**: Search input or filter buttons don't filter results

**Possible Causes**:
- JavaScript error in filter functions
- State not updating correctly

**Solutions**:
- Check browser console for errors
- Verify `rbisFilters.ts` is imported correctly
- Check React DevTools for state updates

#### 6. Auto-Refresh Not Working

**Symptoms**: Metrics or data streams don't update automatically

**Possible Causes**:
- Component unmounted before interval set
- Interval not cleared on unmount
- Auto-refresh disabled

**Solutions**:
- Verify `autoRefresh` prop is `true`
- Check `useEffect` cleanup functions
- Verify intervals are set correctly in hooks

### Performance Issues

#### Slow Initial Load

**Solutions**:
- Implement data caching in service layer
- Use React.memo on expensive components
- Lazy load components with React.lazy()
- Optimize database queries with indexes

#### Slow Search/Filter

**Solutions**:
- Increase debounce delay (currently 300ms)
- Optimize filter functions with early returns
- Use useMemo for filtered data
- Implement virtual scrolling for large lists


### Debugging Tips

#### Enable Verbose Logging

Add console logs to service functions:

```typescript
// In rbisService.ts
export async function fetchRBISMetrics(): Promise<RBISMetrics> {
  console.log('[RBIS] Fetching metrics...');
  const metrics = await /* ... */;
  console.log('[RBIS] Metrics fetched:', metrics);
  return metrics;
}
```

#### Check Network Requests

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for failed requests (red)
5. Check request/response details

#### Inspect Component State

1. Install React DevTools browser extension
2. Open React DevTools
3. Select component in tree
4. View props and state in right panel
5. Check hooks values

#### Database Queries

Test queries directly in Supabase Dashboard:

```sql
-- Check indicators with linkages
SELECT i.*, l.linkage_status, l.data_stream_id
FROM indicators i
LEFT JOIN rbis_linkages l ON i.id = l.indicator_id;

-- Check data streams
SELECT * FROM rbis_data_streams WHERE status = 'active';

-- Check connection logs
SELECT * FROM rbis_connection_log ORDER BY created_at DESC LIMIT 10;
```

---

## File Structure

```
src/
├── components/
│   └── rbis/
│       ├── shared/
│       │   ├── StatusBadge.tsx
│       │   ├── RBISLinkageBadge.tsx
│       │   ├── ProgressBar.tsx
│       │   ├── LoadingSpinner.tsx
│       │   └── ErrorDisplay.tsx
│       ├── ConnectionBar.tsx
│       ├── MetricsPanel.tsx
│       ├── IndicatorsMatrix.tsx
│       ├── GBFGoalSection.tsx
│       ├── TargetSection.tsx
│       ├── IndicatorRow.tsx
│       ├── SignalFeed.tsx
│       ├── DataStreamCard.tsx
│       └── RBISErrorBoundary.tsx
├── hooks/
│   └── useRBIS.ts
├── pages/
│   └── RBISPage.tsx
├── services/
│   └── rbisService.ts
├── types/
│   └── rbis.ts
└── utils/
    ├── rbisFilters.ts
    └── fetchWithTimeout.ts

supabase/
└── functions/
    └── gbif-proxy/
        ├── index.ts
        ├── deno.json
        └── README.md

docs/
└── RBIS_DASHBOARD_DOCUMENTATION.md

Database migrations:
├── 004_rbis_tables.sql
└── 005_seed_rbis_data_streams.sql
```


---

## Key Features Summary

### ✅ Implemented Features

1. **Live Connection Management**
   - Real-time RBIS connection status
   - Connect/Disconnect controls
   - Connection event logging

2. **Real-Time Metrics**
   - Total occurrence records
   - Records added (24h, 7d)
   - Active data streams count
   - 5 most recent occurrences
   - Auto-refresh every 30 seconds

3. **Indicators-Targets Matrix**
   - 4 GBF Goals
   - 22 National Targets
   - 79 Indicators
   - Collapsible sections
   - Progress tracking
   - Status monitoring

4. **RBIS Linkage Tracking**
   - Visual linkage status
   - Connected data streams display
   - Linkage percentage calculation

5. **Search and Filter**
   - Search by title, description, number
   - Filter by GBF goal
   - Debounced search (300ms)
   - Real-time filtering

6. **Live Signal Feed**
   - 8 predefined data streams
   - Live occurrence counts
   - Status indicators
   - Target mapping
   - Auto-refresh every 60 seconds

7. **Scroll-to-Target**
   - Click target badge in Signal Feed
   - Auto-scroll to target in Matrix
   - Auto-expand sections
   - Temporary highlight effect

8. **Error Handling**
   - Error boundaries
   - Retry functionality
   - Timeout handling (30s)
   - User-friendly error messages

9. **Responsive Design**
   - Mobile-first approach
   - Stacked layout on mobile (<768px)
   - Side-by-side layout on desktop (≥768px)
   - Consistent card-based design

10. **Performance Optimizations**
    - React.memo on expensive components
    - useCallback for event handlers
    - useMemo for filtered data
    - Efficient re-rendering


---

## Color Coding Reference

### Status Colors

| Status | Color | Hex Code | Usage |
|--------|-------|----------|-------|
| On Track | Green | `#10b981` | Indicators meeting targets |
| At Risk | Yellow | `#f59e0b` | Indicators behind schedule |
| Off Track | Red | `#ef4444` | Indicators significantly behind |
| Connected | Green | `#10b981` | Active RBIS connection |
| Disconnected | Red | `#ef4444` | No RBIS connection |
| Connecting | Yellow | `#f59e0b` | Connection in progress |
| Linked | Green | `#10b981` | Indicator linked to RBIS |
| Not Linked | Gray | `#6b7280` | Manual data entry required |
| Partial | Yellow | `#f59e0b` | Partially automated |
| Active | Green | `#10b981` | Data stream operational |
| Inactive | Gray | `#6b7280` | Data stream not operational |
| Error | Red | `#ef4444` | Data stream error |

### GBF Goal Colors

| Goal | Color | Hex Code |
|------|-------|----------|
| Goal A | Blue | `#3b82f6` |
| Goal B | Green | `#10b981` |
| Goal C | Yellow | `#f59e0b` |
| Goal D | Purple | `#8b5cf6` |

---

## API Rate Limits

| API | Rate Limit | Enforcement | Notes |
|-----|------------|-------------|-------|
| RBIS API | None specified | N/A | Health endpoint only |
| GBIF API | 1 req/sec | Client-side | Enforced in rbisService.ts |
| Supabase | Per plan | Server-side | Check Supabase dashboard |

---

## Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Recommended |
| Firefox | 88+ | Fully supported |
| Safari | 14+ | Fully supported |
| Edge | 90+ | Fully supported |
| Mobile Safari | 14+ | Responsive design |
| Chrome Mobile | 90+ | Responsive design |

---

## Accessibility Features

- **ARIA Labels**: All interactive elements have descriptive labels
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Space, Escape)
- **Focus Indicators**: Visible focus outlines on all interactive elements
- **Color Contrast**: WCAG 2.1 AA compliant (4.5:1 minimum)
- **Screen Reader Support**: Semantic HTML and ARIA attributes
- **Auto-refresh Announcements**: `aria-live="polite"` for metrics updates


---

## Future Enhancements

### Planned Features

1. **Advanced Filtering**
   - Filter by indicator status (On Track, At Risk, Off Track)
   - Filter by linkage status (Linked, Not Linked, Partial)
   - Combined filters (Goal + Status + Linkage)

2. **Data Visualization**
   - Progress charts for each goal
   - Linkage coverage pie chart
   - Trend graphs for occurrence counts
   - Geographic distribution map

3. **Export Functionality**
   - Export indicators to CSV/Excel
   - Export metrics report to PDF
   - Export data streams summary

4. **Notifications**
   - Alert when indicator goes off-track
   - Notify when data stream errors occur
   - Email digest of weekly progress

5. **User Preferences**
   - Save expanded/collapsed state
   - Customize auto-refresh intervals
   - Theme selection (light/dark mode)

6. **Advanced Search**
   - Full-text search across all fields
   - Search history
   - Saved searches

7. **Collaboration Features**
   - Comments on indicators
   - Task assignments
   - Progress notes

8. **Mobile App**
   - Native iOS/Android app
   - Offline support
   - Push notifications

---

## Maintenance

### Regular Tasks

#### Daily
- Monitor connection logs for errors
- Check data stream status
- Verify auto-refresh functionality

#### Weekly
- Review indicator progress updates
- Check GBIF API usage
- Update occurrence counts manually if needed

#### Monthly
- Review and update RBIS linkages
- Audit data stream configurations
- Performance optimization review

#### Quarterly
- Update indicator targets and baselines
- Review and update GBF goal descriptions
- Database maintenance (vacuum, analyze)

### Backup and Recovery

1. **Database Backups**
   - Supabase automatic daily backups
   - Manual backups before major changes
   - Test restore procedures quarterly

2. **Configuration Backups**
   - Version control for all code
   - Document environment variables
   - Backup Supabase project settings

---

## Support and Contact

For technical support or questions about the RBIS Dashboard:

- **Documentation**: This file and inline code comments
- **Issue Tracking**: GitHub Issues (if applicable)
- **Database Issues**: Supabase Dashboard → Support
- **GBIF API Issues**: https://www.gbif.org/contact
- **RBIS API Issues**: Contact RBIS administrators at rbis.ur.ac.rw

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial implementation with all core features |

---

## License

This documentation is part of the NBSAP Monitoring Dashboard project.

---

**Last Updated**: 2024  
**Document Version**: 1.0.0  
**Author**: Development Team
