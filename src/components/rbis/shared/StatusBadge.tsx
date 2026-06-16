// ══════════════════════════════════════════════════════════════════════════════
// StatusBadge Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays color-coded indicator status badges
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { IndicatorStatus } from '../../../types/rbis';

interface StatusBadgeProps {
  /** Indicator status: on-track, at-risk, or off-track */
  status: IndicatorStatus;
  /** Optional size variant */
  size?: 'small' | 'medium' | 'large';
}

/**
 * StatusBadge component displays color-coded indicator status
 * 
 * @example
 * ```tsx
 * <StatusBadge status="on-track" />
 * <StatusBadge status="at-risk" size="small" />
 * ```
 */
export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const config = {
    'on-track': {
      label: 'On Track',
      background: '#d1fae5',
      color: '#065f46',
      icon: 'fa-circle-check',
    },
    'at-risk': {
      label: 'At Risk',
      background: '#fef3c7',
      color: '#92400e',
      icon: 'fa-triangle-exclamation',
    },
    'off-track': {
      label: 'Off Track',
      background: '#fee2e2',
      color: '#991b1b',
      icon: 'fa-circle-xmark',
    },
  };

  const sizeConfig = {
    small: { fontSize: '0.65rem', padding: '2px 8px', iconSize: '0.7rem' },
    medium: { fontSize: '0.72rem', padding: '4px 10px', iconSize: '0.75rem' },
    large: { fontSize: '0.8rem', padding: '6px 12px', iconSize: '0.85rem' },
  };

  const { label, background, color, icon } = config[status];
  const { fontSize, padding, iconSize } = sizeConfig[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding,
        borderRadius: 8,
        background,
        color,
        fontSize,
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: 'nowrap',
      }}
    >
      <i className={`fa-solid ${icon}`} style={{ fontSize: iconSize }} />
      {label}
    </span>
  );
}
