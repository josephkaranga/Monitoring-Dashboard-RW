// ══════════════════════════════════════════════════════════════════════════════
// LoadingSpinner Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays animated spinner with optional loading message
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';

interface LoadingSpinnerProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Optional loading message */
  message?: string;
  /** Center the spinner */
  centered?: boolean;
}

/**
 * LoadingSpinner component displays animated loading indicator
 * 
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="small" message="Loading data..." />
 * <LoadingSpinner size="large" centered />
 * ```
 */
export function LoadingSpinner({ size = 'medium', message, centered = false }: LoadingSpinnerProps) {
  const sizeConfig = {
    small: { spinnerSize: 20, borderWidth: 2, fontSize: '0.7rem' },
    medium: { spinnerSize: 32, borderWidth: 3, fontSize: '0.8rem' },
    large: { spinnerSize: 48, borderWidth: 4, fontSize: '0.9rem' },
  };

  const { spinnerSize, borderWidth, fontSize } = sizeConfig[size];

  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `${borderWidth}px solid #e5e7eb`,
          borderTop: `${borderWidth}px solid #0ea5e9`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />

      {/* Message */}
      {message && (
        <p
          style={{
            fontSize,
            color: '#6b7280',
            fontWeight: 500,
            margin: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {message}
        </p>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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
