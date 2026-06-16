// ══════════════════════════════════════════════════════════════════════════════
// ProgressBar Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays horizontal progress bar with percentage label and color gradient
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';

interface ProgressBarProps {
  /** Progress value (0-100) */
  progress: number;
  /** Optional height variant */
  height?: 'small' | 'medium' | 'large';
  /** Optional: show percentage label */
  showLabel?: boolean;
}

/**
 * ProgressBar component displays progress with color gradient
 * 
 * @example
 * ```tsx
 * <ProgressBar progress={75} />
 * <ProgressBar progress={45} height="small" showLabel={false} />
 * ```
 */
export function ProgressBar({ progress, height = 'medium', showLabel = true }: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Determine color based on progress
  const getColor = (value: number): string => {
    if (value >= 70) return '#10b981'; // Green
    if (value >= 40) return '#f59e0b'; // Yellow/Orange
    return '#ef4444'; // Red
  };

  const heightConfig = {
    small: { barHeight: 6, fontSize: '0.65rem' },
    medium: { barHeight: 8, fontSize: '0.72rem' },
    large: { barHeight: 10, fontSize: '0.8rem' },
  };

  const { barHeight, fontSize } = heightConfig[height];
  const color = getColor(clampedProgress);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
      {/* Progress bar */}
      <div
        style={{
          flex: 1,
          height: barHeight,
          background: '#e5e7eb',
          borderRadius: barHeight / 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clampedProgress}%`,
            background: color,
            borderRadius: barHeight / 2,
            transition: 'width 0.3s ease, background 0.3s ease',
            position: 'relative',
          }}
        >
          {/* Shine effect */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
              borderRadius: barHeight / 2,
            }}
          />
        </div>
      </div>

      {/* Percentage label */}
      {showLabel && (
        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: color,
            fontFamily: "'DM Mono', monospace",
            minWidth: 42,
            textAlign: 'right',
          }}
        >
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}
