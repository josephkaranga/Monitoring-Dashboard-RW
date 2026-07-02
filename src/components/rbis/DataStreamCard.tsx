// ══════════════════════════════════════════════════════════════════════════════
// DataStreamCard Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays individual RBIS data stream with status, occurrence count, and targets
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { RBISDataStream } from '../../types/rbis';

interface DataStreamCardProps {
  /** Data stream to display */
  dataStream: RBISDataStream;
  /** Callback when target is clicked */
  onTargetClick: (targetId: number) => void;
}

/**
 * DataStreamCard displays individual data stream information including:
 * - Data stream name, description, and icon (Req 7.3)
 * - Occurrence count with formatted number (Req 7.4)
 * - Status indicator: green=active, gray=inactive, red=error (Req 7.5, 7.6, 7.7, 7.8)
 * - Error message when status is 'error' (Req 7.8)
 * - Last update timestamp (Req 7.10)
 * - Clickable target number badges (Req 8.1, 8.2, 8.4)
 * - Hover effect on target badges (Req 9.8)
 *
 * @example
 * ```tsx
 * <DataStreamCard
 *   dataStream={stream}
 *   onTargetClick={handleTargetClick}
 * />
 * ```
 */
export function DataStreamCard({ dataStream, onTargetClick }: DataStreamCardProps) {
  const {
    name,
    description,
    targetNumbers,
    occurrenceCount,
    status,
    errorMessage,
    lastUpdate,
    icon,
    color,
  } = dataStream;

  // Status configuration (Req 7.5, 7.6, 7.7, 7.8, 9.3)
  const statusConfig = {
    active: {
      color: '#10b981',
      bgColor: '#d1fae5',
      textColor: '#065f46',
      label: 'Active',
      icon: 'fa-circle-check',
    },
    inactive: {
      color: '#6b7280',
      bgColor: '#f3f4f6',
      textColor: '#374151',
      label: 'Inactive',
      icon: 'fa-circle-pause',
    },
    error: {
      color: '#ef4444',
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      label: 'Error',
      icon: 'fa-circle-exclamation',
    },
  };

  const statusStyle = statusConfig[status];
  const streamColor = color || '#0ea5e9';
  const streamIcon = icon || 'fa-satellite-dish';

  return (
    <div
      style={{
        padding: 18,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--surface-3)';
        e.currentTarget.style.borderColor = 'var(--sky-dim)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--surface-2)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Header row - Name, description, and icon (Req 7.3, 9.4) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${streamColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <i
            className={`fa-solid ${streamIcon}`}
            style={{ fontSize: '1rem', color: streamColor }}
          />
        </div>

        {/* Title and status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-1)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </h4>
            {/* Status indicator (Req 7.5, 7.6, 7.7, 7.8) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: statusStyle.bgColor,
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: statusStyle.color,
                }}
              />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: statusStyle.textColor }}>
                {statusStyle.label}
              </span>
            </div>
          </div>
          {description && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Occurrence count with formatted number (Req 7.4) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: '#e0f2fe',
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <i className="fa-solid fa-chart-line" style={{ fontSize: '0.85rem', color: '#0ea5e9' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#075985' }}>
          {occurrenceCount.toLocaleString()} occurrence{occurrenceCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Target badges - Clickable with hover effect (Req 7.2, 8.1, 8.2, 8.4, 9.8) */}
      {targetNumbers.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-3)',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Supports Targets
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {targetNumbers.map(targetId => (
              <button
                key={targetId}
                onClick={() => onTargetClick(targetId)}
                style={{
                  padding: '6px 12px',
                  background: '#dbeafe',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  color: '#1e40af',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#bfdbfe';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#dbeafe';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Target {targetId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message when status is 'error' (Req 7.8) */}
      {status === 'error' && errorMessage && (
        <div
          style={{
            padding: '10px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <i
              className="fa-solid fa-circle-exclamation"
              style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 2 }}
            />
            <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: 0, lineHeight: 1.4 }}>
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Last update timestamp (Req 7.10) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
        }}
      >
        <i className="fa-solid fa-clock" style={{ fontSize: '0.65rem', color: 'var(--text-4)' }} />
        <span
          style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}
        >
          Last updated: {new Date(lastUpdate).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
