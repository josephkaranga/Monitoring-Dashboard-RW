// ══════════════════════════════════════════════════════════════════════════════
// SignalFeed Component Test
// ══════════════════════════════════════════════════════════════════════════════
// Basic test to verify SignalFeed component renders correctly
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { RBISDataStream } from '../../types/rbis';

// Mock data for testing
const mockDataStreams: RBISDataStream[] = [
  {
    id: 'protected-areas',
    name: 'Protected Areas Coverage',
    description: 'Monitoring of protected area extent and biodiversity within conservation zones',
    targetNumbers: [1, 2, 3],
    occurrenceCount: 15234,
    status: 'active',
    lastUpdate: new Date().toISOString(),
    icon: 'fa-shield-halved',
    color: '#059669',
  },
  {
    id: 'threatened-species',
    name: 'Threatened Species Monitoring',
    description: 'Tracking populations of endangered and vulnerable species',
    targetNumbers: [4, 5],
    occurrenceCount: 8921,
    status: 'active',
    lastUpdate: new Date().toISOString(),
    icon: 'fa-triangle-exclamation',
    color: '#dc2626',
  },
  {
    id: 'forest-cover',
    name: 'Forest Cover Change',
    description: 'Satellite-based monitoring of forest extent and deforestation',
    targetNumbers: [6, 7],
    occurrenceCount: 0,
    status: 'inactive',
    lastUpdate: new Date().toISOString(),
    icon: 'fa-tree',
    color: '#16a34a',
  },
  {
    id: 'invasive-species',
    name: 'Invasive Species Tracking',
    description: 'Detection and monitoring of invasive alien species',
    targetNumbers: [8],
    occurrenceCount: 0,
    status: 'error',
    errorMessage: 'Connection timeout to data source',
    lastUpdate: new Date().toISOString(),
    icon: 'fa-bug',
    color: '#d97706',
  },
];

/**
 * Test component to verify SignalFeed renders correctly
 * This is a visual test - run the app and check the component displays properly
 */
export function TestSignalFeed() {
  const handleTargetClick = (targetId: number) => {
    console.log('Target clicked:', targetId);
    alert(`Clicked Target ${targetId}`);
  };

  const handleRefetch = () => {
    console.log('Refetch requested');
    alert('Refetch requested');
  };

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 700 }}>
        SignalFeed Component Test
      </h1>

      {/* Test 1: Normal state with data */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
          Test 1: Normal State (with data)
        </h2>
        <div style={{ maxWidth: 800 }}>
          {/* Import and use SignalFeed here when testing */}
          {/* <SignalFeed
            dataStreams={mockDataStreams}
            loading={false}
            onTargetClick={handleTargetClick}
            onRefetch={handleRefetch}
          /> */}
        </div>
      </div>

      {/* Test 2: Loading state */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
          Test 2: Loading State
        </h2>
        <div style={{ maxWidth: 800 }}>
          {/* <SignalFeed
            dataStreams={[]}
            loading={true}
            onTargetClick={handleTargetClick}
          /> */}
        </div>
      </div>

      {/* Test 3: Error state */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Test 3: Error State</h2>
        <div style={{ maxWidth: 800 }}>
          {/* <SignalFeed
            dataStreams={[]}
            loading={false}
            error="Failed to load data streams from server"
            onTargetClick={handleTargetClick}
            onRefetch={handleRefetch}
          /> */}
        </div>
      </div>

      {/* Test 4: Empty state */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
          Test 4: Empty State (no data streams)
        </h2>
        <div style={{ maxWidth: 800 }}>
          {/* <SignalFeed
            dataStreams={[]}
            loading={false}
            onTargetClick={handleTargetClick}
          /> */}
        </div>
      </div>

      {/* Mock data display */}
      <div
        style={{
          marginTop: 48,
          padding: 20,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Mock Data Streams</h3>
        <pre
          style={{
            fontSize: '0.75rem',
            overflow: 'auto',
            background: '#f8fafc',
            padding: 12,
            borderRadius: 8,
          }}
        >
          {JSON.stringify(mockDataStreams, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export { mockDataStreams };
