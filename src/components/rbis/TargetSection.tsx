// ══════════════════════════════════════════════════════════════════════════════
// TargetSection Component
// ══════════════════════════════════════════════════════════════════════════════
// Collapsible section displaying a national target with its indicators
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { NBSAPTarget } from '../../types/rbis';
import { IndicatorRow } from './IndicatorRow';
import { ProgressBar } from './shared/ProgressBar';

interface TargetSectionProps {
  /** Target data with nested indicators */
  target: NBSAPTarget;
  /** Whether this section is expanded */
  expanded: boolean;
  /** Toggle expansion callback */
  onToggle: () => void;
  /** Optional click handler for target navigation */
  onTargetClick?: (targetId: number) => void;
}

/**
 * TargetSection displays a collapsible national target with indicators
 */
export function TargetSection({ target, expanded, onToggle, onTargetClick }: TargetSectionProps) {
  return (
    <div
      data-target-id={target.id}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Target header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: expanded ? 'var(--surface-2)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = 'var(--surface-2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0ea5e9',
                fontFamily: "'DM Mono', monospace",
                background: '#e0f2fe',
                padding: '3px 10px',
                borderRadius: 6,
              }}
            >
              {target.number}
            </span>
            <h4
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-1)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {target.title}
            </h4>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-3)',
                fontFamily: "'DM Mono', monospace",
                background: 'var(--surface-3)',
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {target.indicators.length} indicators
            </span>
          </div>
          {!expanded && (
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-3)',
                margin: 0,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {target.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16 }}>
          {/* Average progress */}
          <div style={{ width: 120 }}>
            <ProgressBar progress={target.averageProgress} height="small" showLabel={true} />
          </div>

          {/* Expand/collapse icon */}
          <i
            className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`}
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-3)',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </button>

      {/* Indicators list */}
      {expanded && (
        <div
          style={{
            padding: '0 20px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animation: 'slideDown 0.3s ease',
          }}
        >
          {/* Description */}
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-2)',
              margin: '0 0 12px 0',
              lineHeight: 1.5,
              padding: '12px 16px',
              background: 'var(--surface-2)',
              borderRadius: 8,
              borderLeft: '3px solid #0ea5e9',
            }}
          >
            {target.description}
          </p>

          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
              gap: 16,
              padding: '8px 18px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--text-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>Indicator</div>
            <div>Status</div>
            <div>RBIS Link</div>
            <div>Progress</div>
          </div>

          {/* Indicator rows */}
          {target.indicators.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: '0.8rem',
                background: 'var(--surface-2)',
                borderRadius: 8,
              }}
            >
              No indicators for this target
            </div>
          ) : (
            target.indicators.map((indicator) => (
              <IndicatorRow
                key={indicator.id}
                indicator={indicator}
                onTargetClick={onTargetClick}
              />
            ))
          )}
        </div>
      )}

      {/* Slide down animation */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
