// ══════════════════════════════════════════════════════════════════════════════
// ErrorDisplay Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays error messages with optional retry button and type-based styling
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';

interface ErrorDisplayProps {
  /** Error message to display */
  message: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Error type for styling */
  type?: 'error' | 'warning' | 'info';
  /** Center the error display */
  centered?: boolean;
}

/**
 * ErrorDisplay component shows error states with retry functionality
 *
 * @example
 * ```tsx
 * <ErrorDisplay message="Failed to load data" onRetry={refetch} />
 * <ErrorDisplay message="No data available" type="info" />
 * <ErrorDisplay message="Connection timeout" type="warning" centered />
 * ```
 */
export function ErrorDisplay({
  message,
  onRetry,
  type = 'error',
  centered = false,
}: ErrorDisplayProps) {
  const config = {
    error: {
      background: '#fef2f2',
      border: '#fecaca',
      color: '#991b1b',
      icon: 'fa-circle-exclamation',
      iconBg: '#fee2e2',
    },
    warning: {
      background: '#fffbeb',
      border: '#fde68a',
      color: '#92400e',
      icon: 'fa-triangle-exclamation',
      iconBg: '#fef3c7',
    },
    info: {
      background: '#eff6ff',
      border: '#bfdbfe',
      color: '#1e40af',
      icon: 'fa-circle-info',
      iconBg: '#dbeafe',
    },
  };

  const { background, border, color, icon, iconBg } = config[type];

  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        background,
        border: `1px solid ${border}`,
        borderRadius: 12,
        maxWidth: 600,
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <i className={`fa-solid ${icon}`} style={{ fontSize: '0.95rem', color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color,
            margin: 0,
            marginBottom: onRetry ? 8 : 0,
            lineHeight: 1.5,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {message}
        </p>

        {/* Retry button */}
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#fff',
              border: `1px solid ${border}`,
              borderRadius: 8,
              color,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = iconBg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            <i className="fa-solid fa-rotate-right" style={{ fontSize: '0.75rem' }} />
            Try Again
          </button>
        )}
      </div>
    </div>
  );

  if (centered) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          width: '100%',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
