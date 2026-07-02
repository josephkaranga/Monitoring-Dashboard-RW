// ══════════════════════════════════════════════════════════════════════════════
// IndicatorRow Component
// ══════════════════════════════════════════════════════════════════════════════
// Displays individual indicator with status, linkage, and progress information
// ══════════════════════════════════════════════════════════════════════════════

import React, { memo, useState } from 'react';
import type { Indicator } from '../../types/rbis';
import { StatusBadge } from './shared/StatusBadge';
import { RBISLinkageBadge } from './shared/RBISLinkageBadge';
import { ProgressBar } from './shared/ProgressBar';

interface IndicatorRowProps {
  /** Indicator data */
  indicator: Indicator;
  /** Optional click handler for target navigation */
  onTargetClick?: (targetId: number) => void;
}

/**
 * IndicatorRow displays a single indicator with all its metrics
 * Optimized with React.memo for performance
 */
export const IndicatorRow = memo(function IndicatorRow({
  indicator,
  onTargetClick,
}: IndicatorRowProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 8,
        border: '1px solid var(--border)',
        transition: 'all 0.2s',
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
          gap: 16,
          padding: '14px 18px',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setShowDetails(!showDetails)}
        onMouseEnter={e => {
          e.currentTarget.parentElement!.style.background = 'var(--surface-3)';
          e.currentTarget.parentElement!.style.borderColor = 'var(--sky-dim)';
        }}
        onMouseLeave={e => {
          e.currentTarget.parentElement!.style.background = 'var(--surface-2)';
          e.currentTarget.parentElement!.style.borderColor = 'var(--border)';
        }}
      >
        {/* Indicator info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--sky-dim)',
                fontFamily: "'DM Mono', monospace",
                background: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {indicator.number}
            </span>
            <h5
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-1)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {indicator.title}
            </h5>
          </div>
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-3)',
              margin: 0,
              lineHeight: 1.4,
            }}
            title={indicator.definition}
          >
            {indicator.measurementUnit}
          </p>
        </div>

        {/* Status badge */}
        <div>
          <StatusBadge status={indicator.status} size="small" />
        </div>

        {/* RBIS linkage */}
        <div>
          <RBISLinkageBadge linkage={indicator.rbisLinkage} size="small" />
        </div>

        {/* Progress bar */}
        <div>
          <ProgressBar progress={indicator.progress} height="small" />
        </div>
      </div>

      {/* Expandable details section */}
      {showDetails && (
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface-1)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {/* Baseline */}
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-3)',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Baseline
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-1)',
              }}
            >
              {indicator.baseline || 'N/A'}
            </div>
          </div>

          {/* Current Value */}
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-3)',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Current Value
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--sky-dim)',
              }}
            >
              {indicator.currentValue || 'N/A'}
            </div>
          </div>

          {/* 2030 Target */}
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-3)',
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              2030 Target
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--green-dim)',
              }}
            >
              {indicator.target2030 || 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
