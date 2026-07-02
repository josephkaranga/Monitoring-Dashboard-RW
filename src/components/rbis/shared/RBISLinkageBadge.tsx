// ══════════════════════════════════════════════════════════════════════════════
// RBISLinkageBadge Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays RBIS linkage status with tooltips showing connected data streams
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import type { RBISLinkage } from '../../../types/rbis';

interface RBISLinkageBadgeProps {
  /** RBIS linkage information */
  linkage: RBISLinkage;
  /** Optional size variant */
  size?: 'small' | 'medium' | 'large';
}

/**
 * RBISLinkageBadge component displays RBIS linkage status with tooltip
 *
 * @example
 * ```tsx
 * <RBISLinkageBadge linkage={{ status: 'linked', dataStreams: ['protected-areas'] }} />
 * <RBISLinkageBadge linkage={{ status: 'not-linked', dataStreams: [] }} size="small" />
 * ```
 */
export function RBISLinkageBadge({ linkage, size = 'medium' }: RBISLinkageBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const config = {
    linked: {
      label: 'Linked',
      background: '#d1fae5',
      color: '#065f46',
      icon: 'fa-link',
    },
    'not-linked': {
      label: 'Not Linked',
      background: '#f3f4f6',
      color: '#4b5563',
      icon: 'fa-link-slash',
    },
    partial: {
      label: 'Partial',
      background: '#fef3c7',
      color: '#92400e',
      icon: 'fa-link',
    },
  };

  const sizeConfig = {
    small: { fontSize: '0.65rem', padding: '2px 8px', iconSize: '0.7rem' },
    medium: { fontSize: '0.72rem', padding: '4px 10px', iconSize: '0.75rem' },
    large: { fontSize: '0.8rem', padding: '6px 12px', iconSize: '0.85rem' },
  };

  const { label, background, color, icon } = config[linkage.status];
  const { fontSize, padding, iconSize } = sizeConfig[size];

  const hasDataStreams = linkage.dataStreams.length > 0;

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => hasDataStreams && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
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
          cursor: hasDataStreams ? 'help' : 'default',
        }}
      >
        <i className={`fa-solid ${icon}`} style={{ fontSize: iconSize }} />
        {label}
        {linkage.dataStreams.length > 0 && (
          <span
            style={{
              marginLeft: 2,
              fontSize: '0.65rem',
              opacity: 0.7,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ({linkage.dataStreams.length})
          </span>
        )}
      </span>

      {/* Tooltip */}
      {showTooltip && hasDataStreams && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 8,
            padding: '8px 12px',
            background: '#1f2937',
            color: '#fff',
            borderRadius: 8,
            fontSize: '0.7rem',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#d1d5db' }}>
            Connected Data Streams:
          </div>
          {linkage.dataStreams.map((stream, idx) => (
            <div key={idx} style={{ color: '#9ca3af', fontSize: '0.68rem' }}>
              • {stream}
            </div>
          ))}
          {linkage.lastSync && (
            <div
              style={{
                marginTop: 6,
                paddingTop: 6,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                color: '#6b7280',
                fontSize: '0.65rem',
              }}
            >
              Last sync: {new Date(linkage.lastSync).toLocaleString()}
            </div>
          )}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1f2937',
            }}
          />
        </div>
      )}
    </div>
  );
}
