// ══════════════════════════════════════════════════════════════════════════════
// IndicatorsMatrix Component
// ══════════════════════════════════════════════════════════════════════════════
// Main component displaying the complete indicators-targets-RBIS matrix
// with search, filter, and collapsible sections
// ══════════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import type { GBFGoal, GBFGoalFilter } from '../../types/rbis';
import { GBFGoalSection } from './GBFGoalSection';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { ErrorDisplay } from './shared/ErrorDisplay';
import { filterGoals } from '../../utils/rbisFilters';

interface IndicatorsMatrixProps {
  /** GBF goals data with nested targets and indicators */
  goals: GBFGoal[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Refetch callback */
  onRefetch?: () => void;
  /** Optional click handler for target navigation */
  onTargetClick?: (targetId: number) => void;
}

/**
 * IndicatorsMatrix displays the complete indicators-targets-RBIS matrix
 * with search, filter, and collapsible sections
 */
export function IndicatorsMatrix({ goals, loading, error, onRefetch, onTargetClick }: IndicatorsMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [goalFilter, setGoalFilter] = useState<GBFGoalFilter>('all');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [expandedTargets, setExpandedTargets] = useState<Set<number>>(new Set());

  // Filter goals based on search and filter
  const filteredGoals = useMemo(() => {
    return filterGoals(goals, {
      searchTerm,
      goalFilter,
    });
  }, [goals, searchTerm, goalFilter]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const allIndicators = filteredGoals.flatMap(g => g.targets.flatMap(t => t.indicators));
    const linkedIndicators = allIndicators.filter(i => i.rbisLinkage.status === 'linked');
    
    return {
      totalTargets: filteredGoals.flatMap(g => g.targets).length,
      totalIndicators: allIndicators.length,
      linkedIndicators: linkedIndicators.length,
      linkagePercentage: allIndicators.length > 0
        ? Math.round((linkedIndicators.length / allIndicators.length) * 100)
        : 0,
    };
  }, [filteredGoals]);

  // Toggle goal expansion
  const toggleGoal = (goalId: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  // Toggle target expansion
  const toggleTarget = (targetId: number) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => {
    setExpandedGoals(new Set(filteredGoals.map(g => g.id)));
    setExpandedTargets(new Set(filteredGoals.flatMap(g => g.targets.map(t => t.id))));
  };

  const collapseAll = () => {
    setExpandedGoals(new Set());
    setExpandedTargets(new Set());
  };

  if (loading && goals.length === 0) {
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
        <LoadingSpinner size="large" message="Loading indicators matrix..." centered />
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
        <ErrorDisplay message={error} onRetry={onRefetch} centered />
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Indicators & Targets Matrix
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={expandAll}
              style={{
                padding: '6px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-2)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-angles-down" style={{ marginRight: 6 }} />
              Expand All
            </button>
            <button
              onClick={collapseAll}
              style={{
                padding: '6px 12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-2)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <i className="fa-solid fa-angles-up" style={{ marginRight: 6 }} />
              Collapse All
            </button>
          </div>
        </div>

        {/* Search and filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {/* Search input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.85rem',
                color: 'var(--text-3)',
              }}
            />
            <input
              type="text"
              placeholder="Search indicators, targets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                border: '1px solid var(--border)',
                borderRadius: 9,
                fontSize: '0.85rem',
                fontFamily: "'DM Sans', sans-serif",
                background: 'var(--surface-2)',
                color: 'var(--text-1)',
              }}
            />
          </div>

          {/* Goal filter buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'A', 'B', 'C', 'D'] as GBFGoalFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setGoalFilter(filter)}
                style={{
                  padding: '10px 16px',
                  background: goalFilter === filter ? '#dbeafe' : 'var(--surface-2)',
                  border: goalFilter === filter ? '1px solid #0ea5e9' : '1px solid var(--border)',
                  borderRadius: 9,
                  color: goalFilter === filter ? '#0ea5e9' : 'var(--text-2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace",
                  transition: 'all 0.2s',
                }}
              >
                {filter === 'all' ? 'All Goals' : `Goal ${filter}`}
              </button>
            ))}
          </div>
        </div>

        {/* Summary statistics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            padding: '12px 16px',
            background: 'var(--surface-2)',
            borderRadius: 9,
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Targets</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-1)', fontFamily: "'DM Mono', monospace" }}>
              {summary.totalTargets}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Indicators</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-1)', fontFamily: "'DM Mono', monospace" }}>
              {summary.totalIndicators}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Linked to RBIS</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981', fontFamily: "'DM Mono', monospace" }}>
              {summary.linkedIndicators}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: 4 }}>Linkage %</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0ea5e9', fontFamily: "'DM Mono', monospace" }}>
              {summary.linkagePercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Goals list */}
      <div style={{ padding: 24 }}>
        {filteredGoals.length === 0 ? (
          <div
            style={{
              padding: 48,
              textAlign: 'center',
              color: 'var(--text-3)',
              background: 'var(--surface-2)',
              borderRadius: 12,
            }}
          >
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 8px 0' }}>
              No results found
            </p>
            <p style={{ fontSize: '0.8rem', margin: 0 }}>
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredGoals.map((goal) => (
              <GBFGoalSection
                key={goal.id}
                goal={goal}
                expanded={expandedGoals.has(goal.id)}
                onToggle={() => toggleGoal(goal.id)}
                expandedTargets={expandedTargets}
                onToggleTarget={toggleTarget}
                onTargetClick={onTargetClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
