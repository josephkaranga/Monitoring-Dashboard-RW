// ══════════════════════════════════════════════════════════════════════════════
// MetricsPanel Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays real-time RBIS metrics and recent occurrence records
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { RBISMetrics, RBISOccurrence } from '../../types/rbis';
import { LoadingSpinner } from './shared/LoadingSpinner';

interface MetricsPanelProps {
  /** Metrics data */
  metrics: RBISMetrics | null;
  /** Recent occurrence records */
  recentOccurrences: RBISOccurrence[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Refetch callback */
  onRefetch?: () => void;
}

/**
 * MetricsPanel displays real-time RBIS metrics and recent occurrences
 * 
 * @example
 * ```tsx
 * <MetricsPanel
 *   metrics={metrics}
 *   recentOccurrences={recentOccurrences}
 *   loading={loading}
 *   error={error}
 *   onRefetch={refetch}
 * />
 * ```
 */
export function MetricsPanel({ metrics, recentOccurrences, loading, error, onRefetch }: MetricsPanelProps) {
  if (loading && !metrics) {
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
        <LoadingSpinner size="medium" message="Loading metrics..." centered />
      </div>
    );
  }

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
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: 12 }} />
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)', margin: '0 0 8px 0' }}>
            Failed to load metrics
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: '0 0 16px 0' }}>
            {error}
          </p>
          {onRefetch && (
            <button
              onClick={onRefetch}
              style={{
                padding: '8px 16px',
                background: '#dbeafe',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                color: '#1e40af',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-rotate-right" style={{ marginRight: 6 }} />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const metricCards = [
    {
      label: 'Total Occurrences',
      value: metrics.totalOccurrences.toLocaleString(),
      icon: 'fa-database',
      color: '#0ea5e9',
      bgColor: '#e0f2fe',
    },
    {
      label: 'Last 24 Hours',
      value: metrics.last24Hours.toLocaleString(),
      icon: 'fa-clock',
      color: '#10b981',
      bgColor: '#d1fae5',
    },
    {
      label: 'Last 7 Days',
      value: metrics.last7Days.toLocaleString(),
      icon: 'fa-calendar-week',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
    },
    {
      label: 'Active Data Streams',
      value: metrics.activeDataStreams.toString(),
      icon: 'fa-stream',
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
  ];

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
          Real-Time Metrics
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
            Auto-refresh: 30s
          </span>
        </div>
      </div>

      {/* Metric cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {metricCards.map((metric, idx) => (
          <div
            key={idx}
            style={{
              padding: '16px 18px',
              background: metric.bgColor,
              borderRadius: 10,
              border: `1px solid ${metric.color}20`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {metric.label}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${metric.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className={`fa-solid ${metric.icon}`} style={{ fontSize: '0.9rem', color: metric.color }} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: metric.color, fontFamily: "'DM Mono', monospace" }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent occurrences */}
      <div>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-2)', margin: '0 0 12px 0' }}>
          Recent Occurrences
        </h4>
        {recentOccurrences.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem', background: 'var(--surface-2)', borderRadius: 8 }}>
            No recent occurrences
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentOccurrences.map((occurrence) => (
              <div
                key={occurrence.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'var(--surface-2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-3)';
                  e.currentTarget.style.borderColor = 'var(--sky-dim)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className="fa-solid fa-leaf" style={{ fontSize: '0.9rem', color: '#0ea5e9' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {occurrence.scientificName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      <i className="fa-solid fa-location-dot" style={{ marginRight: 4, fontSize: '0.65rem' }} />
                      {occurrence.location}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-4)' }}>•</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      {getRelativeTime(occurrence.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last update */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-4)', fontFamily: "'DM Mono', monospace" }}>
          Last updated: {new Date(metrics.lastDataUpdate).toLocaleString()}
        </span>
      </div>

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

/**
 * Converts timestamp to relative time string
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}
