// ══════════════════════════════════════════════════════════════════════════════
// SignalFeed Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays live RBIS data streams mapped to national targets with occurrence counts
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { RBISDataStream } from '../../types/rbis';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorDisplay } from './shared/ErrorDisplay';
import { DataStreamCard } from './DataStreamCard';

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

/**
 * SignalFeed displays live biodiversity data streams mapped to specific targets
 * 
 * @example
 * ```tsx
 * <SignalFeed
 *   dataStreams={dataStreams}
 *   loading={loading}
 *   error={error}
 *   onTargetClick={handleTargetClick}
 *   onRefetch={refetch}
 * />
 * ```
 */
export function SignalFeed({ dataStreams, loading, error, onTargetClick, onRefetch }: SignalFeedProps) {
  // Calculate summary statistics
  const activeStreams = dataStreams.filter(s => s.status === 'active').length;
  const totalOccurrences = dataStreams.reduce((sum, s) => sum + s.occurrenceCount, 0);

  // Loading state
  if (loading && dataStreams.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 40,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <LoadingSpinner size="medium" message="Loading data streams..." centered />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <ErrorDisplay
          message={error}
          onRetry={onRefetch}
          type="error"
          centered
        />
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 24,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Live Signal Feed
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 2s infinite',
              }}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
              Auto-refresh: 60s
            </span>
          </div>
        </div>

        {/* Summary statistics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: '#d1fae5',
              borderRadius: 8,
              border: '1px solid #10b98120',
            }}
          >
            <i className="fa-solid fa-stream" style={{ fontSize: '0.8rem', color: '#10b981' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46' }}>
              {activeStreams} Active Stream{activeStreams !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: '#e0f2fe',
              borderRadius: 8,
              border: '1px solid #0ea5e920',
            }}
          >
            <i className="fa-solid fa-database" style={{ fontSize: '0.8rem', color: '#0ea5e9' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#075985' }}>
              {totalOccurrences.toLocaleString()} Total Records
            </span>
          </div>
        </div>
      </div>

      {/* Data streams list */}
      {dataStreams.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--text-3)',
            background: 'var(--surface-2)',
            borderRadius: 10,
          }}
        >
          <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', color: 'var(--text-4)', marginBottom: 12 }} />
          <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>
            No data streams available
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dataStreams.map((stream) => (
            <DataStreamCard
              key={stream.id}
              dataStream={stream}
              onTargetClick={onTargetClick}
            />
          ))}
        </div>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
