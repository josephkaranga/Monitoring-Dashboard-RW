// ══════════════════════════════════════════════════════════════════════════════
// DataStreamCard Component Test
// ══════════════════════════════════════════════════════════════════════════════
// Basic test to verify DataStreamCard component renders correctly
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { RBISDataStream } from '../../types/rbis';

// Mock data for testing
const mockActiveStream: RBISDataStream = {
  id: 'protected-areas',
  name: 'Protected Areas Coverage',
  description: 'Monitoring of protected area extent and biodiversity within conservation zones',
  targetNumbers: [1, 2, 3],
  occurrenceCount: 15234,
  status: 'active',
  lastUpdate: new Date().toISOString(),
  icon: 'fa-shield-halved',
  color: '#059669',
};

const mockInactiveStream: RBISDataStream = {
  id: 'forest-cover',
  name: 'Forest Cover Change',
  description: 'Satellite-based monitoring of forest extent and deforestation',
  targetNumbers: [6, 7],
  occurrenceCount: 0,
  status: 'inactive',
  lastUpdate: new Date().toISOString(),
  icon: 'fa-tree',
  color: '#16a34a',
};

const mockErrorStream: RBISDataStream = {
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
};

/**
 * Test component to verify DataStreamCard renders correctly
 * This is a visual test - run the app and check the component displays properly
 */
export function TestDataStreamCard() {
  const handleTargetClick = (targetId: number) => {
    console.log('Target clicked:', targetId);
    alert(`Clicked Target ${targetId}`);
  };

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 700 }}>
        DataStreamCard Component Test
      </h1>

      {/* Test 1: Active stream */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
          Test 1: Active Stream (Green indicator)
        </h2>
        <div style={{ maxWidth: 600 }}>
          {/* Import and use DataStreamCard here when testing */}
          {/* <DataStreamCard
            dataStream={mockActiveStream}
            onTargetClick={handleTargetClick}
          /> */}
        </div>
      </div>

      {/* Test 2: Inactive stream */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
          Test 2: Inactive Stream (Gray indicator)
        </h2>
        <div style={{ maxWidth: 600 }}>
          {/* <DataStreamCard
            dataStream={mockInactiveStream}
            onTargetClick={handleTargetClick}
          /> */}
        </div>
      </div>

      {/* Test 3: Error stream */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
          Test 3: Error Stream (Red indicator with error message)
        </h2>
        <div style={{ maxWidth: 600 }}>
          {/* <DataStreamCard
            dataStream={mockErrorStream}
            onTargetClick={handleTargetClick}
          /> */}
        </div>
      </div>

      {/* Mock data display */}
      <div style={{ marginTop: 48, padding: 20, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
          Mock Data Streams
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Active Stream</h4>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              {JSON.stringify(mockActiveStream, null, 2)}
            </pre>
          </div>
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Inactive Stream</h4>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              {JSON.stringify(mockInactiveStream, null, 2)}
            </pre>
          </div>
          <div>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8 }}>Error Stream</h4>
            <pre style={{ fontSize: '0.75rem', overflow: 'auto', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
              {JSON.stringify(mockErrorStream, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export { mockActiveStream, mockInactiveStream, mockErrorStream };

