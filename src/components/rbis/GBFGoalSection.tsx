// ══════════════════════════════════════════════════════════════════════════════
// GBFGoalSection Component
// ══════════════════════════════════════════════════════════════════════════════
// Collapsible section displaying a GBF goal with its national targets
// ══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { GBFGoal } from '../../types/rbis';
import { TargetSection } from './TargetSection';
import { ProgressBar } from './shared/ProgressBar';

interface GBFGoalSectionProps {
  /** GBF goal data with nested targets */
  goal: GBFGoal;
  /** Whether this section is expanded */
  expanded: boolean;
  /** Toggle expansion callback */
  onToggle: () => void;
  /** Expanded targets set */
  expandedTargets: Set<number>;
  /** Toggle target expansion callback */
  onToggleTarget: (targetId: number) => void;
  /** Optional click handler for target navigation */
  onTargetClick?: (targetId: number) => void;
}

/**
 * GBFGoalSection displays a collapsible GBF goal with targets
 */
export function GBFGoalSection({
  goal,
  expanded,
  onToggle,
  expandedTargets,
  onToggleTarget,
  onTargetClick,
}: GBFGoalSectionProps) {
  // Goal color coding
  const goalColors = {
    A: { primary: '#3b82f6', light: '#dbeafe', bg: '#eff6ff' },
    B: { primary: '#10b981', light: '#d1fae5', bg: '#ecfdf5' },
    C: { primary: '#f59e0b', light: '#fef3c7', bg: '#fffbeb' },
    D: { primary: '#8b5cf6', light: '#ede9fe', bg: '#f5f3ff' },
  };

  const colors = goalColors[goal.id];

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `2px solid ${colors.light}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Goal header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          background: expanded ? colors.bg : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = colors.bg;
          }
        }}
        onMouseLeave={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {/* Goal badge */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1.1rem',
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
                flexShrink: 0,
              }}
            >
              {goal.id}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-1)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {goal.title}
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-3)',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {goal.targets.length} targets • {goal.targets.reduce((sum, t) => sum + t.indicators.length, 0)} indicators
              </span>
            </div>
          </div>

          {!expanded && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-2)',
                margin: 0,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {goal.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16 }}>
          {/* Average progress */}
          <div style={{ width: 140 }}>
            <ProgressBar progress={goal.averageProgress} height="medium" showLabel={true} />
          </div>

          {/* Expand/collapse icon */}
          <i
            className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`}
            style={{
              fontSize: '0.9rem',
              color: colors.primary,
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </button>

      {/* Targets list */}
      {expanded && (
        <div
          style={{
            padding: '0 24px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: 'slideDown 0.3s ease',
          }}
        >
          {/* Description */}
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-2)',
              margin: '0 0 12px 0',
              lineHeight: 1.5,
              padding: '14px 18px',
              background: colors.bg,
              borderRadius: 10,
              borderLeft: `4px solid ${colors.primary}`,
            }}
          >
            {goal.description}
          </p>

          {/* Target sections */}
          {goal.targets.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: 'var(--text-3)',
                fontSize: '0.85rem',
                background: 'var(--surface-2)',
                borderRadius: 10,
              }}
            >
              No targets for this goal
            </div>
          ) : (
            goal.targets.map((target) => (
              <TargetSection
                key={target.id}
                target={target}
                expanded={expandedTargets.has(target.id)}
                onToggle={() => onToggleTarget(target.id)}
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
