import React, { useState } from 'react';
import type { NBSAPTarget } from '../types/index';

interface Milestone {
  targetId: number;
  targetTitle: string;
  goal: string;
  yearRange: string;
  description: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'overdue';
}

const currentYear = new Date().getFullYear();

function parseMilestones(targets: NBSAPTarget[]): Milestone[] {
  const milestones: Milestone[] = [];

  for (const t of targets) {
    if (!t.timeline_milestones) continue;

    const segments = t.timeline_milestones.split(/;\s*/);
    for (const seg of segments) {
      const trimmed = seg.trim();
      if (!trimmed) continue;

      const yearMatch = trimmed.match(/^(\d{4})(?:\s*[-–]\s*(\d{4}))?:\s*(.*)/);
      if (!yearMatch) {
        milestones.push({
          targetId: t.id, targetTitle: t.title, goal: t.goal,
          yearRange: '', description: trimmed,
          status: 'upcoming',
        });
        continue;
      }

      const startYear = parseInt(yearMatch[1]);
      const endYear = yearMatch[2] ? parseInt(yearMatch[2]) : startYear;
      const description = yearMatch[3].trim().replace(/\.$/, '');
      const yearRange = yearMatch[2] ? `${startYear}–${endYear}` : `${startYear}`;

      let status: Milestone['status'];
      if (endYear < currentYear) {
        status = t.progress >= 40 ? 'completed' : 'overdue';
      } else if (startYear <= currentYear && endYear >= currentYear) {
        status = 'in-progress';
      } else {
        status = 'upcoming';
      }

      milestones.push({
        targetId: t.id, targetTitle: t.title, goal: t.goal,
        yearRange, description, status,
      });
    }
  }

  return milestones;
}

const statusConfig = {
  'completed':   { icon: 'fa-circle-check', color: '#16a34a', bg: '#dcfce7', label: 'Completed' },
  'in-progress': { icon: 'fa-spinner',      color: '#0284c7', bg: '#e0f2fe', label: 'In Progress' },
  'upcoming':    { icon: 'fa-clock',         color: '#6b7280', bg: '#f3f4f6', label: 'Upcoming' },
  'overdue':     { icon: 'fa-circle-exclamation', color: '#dc2626', bg: '#fee2e2', label: 'Overdue' },
};

const goalColors: Record<string, { bg: string; color: string }> = {
  A: { bg: '#dcfce7', color: '#166534' },
  B: { bg: '#dbeafe', color: '#1e40af' },
  C: { bg: '#fef3c7', color: '#92400e' },
  D: { bg: '#fce7f3', color: '#be185d' },
};

type FilterType = 'all' | 'completed' | 'in-progress' | 'upcoming' | 'overdue';

export function MilestoneTimeline({ targets }: { targets: NBSAPTarget[] }) {
  const [filter, setFilter] = useState<FilterType>('all');
  const allMilestones = parseMilestones(targets);

  const filtered = filter === 'all'
    ? allMilestones
    : allMilestones.filter(m => m.status === filter);

  const counts = {
    all: allMilestones.length,
    completed: allMilestones.filter(m => m.status === 'completed').length,
    'in-progress': allMilestones.filter(m => m.status === 'in-progress').length,
    upcoming: allMilestones.filter(m => m.status === 'upcoming').length,
    overdue: allMilestones.filter(m => m.status === 'overdue').length,
  };

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius, 14px)',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-timeline" style={{ color: '#0284c7' }} />
            Milestone Tracker
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
            Key milestones across all 22 NBSAP targets
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', 'overdue', 'in-progress', 'upcoming', 'completed'] as FilterType[]).map(f => {
          const cfg = f === 'all' ? { color: '#334155', bg: '#f1f5f9' } : { color: statusConfig[f].color, bg: statusConfig[f].bg };
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
              border: filter === f ? `1.5px solid ${cfg.color}` : '1px solid var(--border)',
              background: filter === f ? cfg.bg : 'transparent',
              color: filter === f ? cfg.color : 'var(--text-3)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              {f === 'all' ? 'All' : statusConfig[f].label} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}>
            No milestones match this filter.
          </div>
        ) : filtered.map((m, idx) => {
          const cfg = statusConfig[m.status];
          const gc = goalColors[m.goal] ?? { bg: '#f1f5f9', color: '#334155' };
          return (
            <div key={idx} style={{ display: 'flex', padding: '0 20px' }}>
              {/* Timeline line + dot */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                width: 28, flexShrink: 0, position: 'relative',
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: cfg.bg, border: `2px solid ${cfg.color}`,
                  flexShrink: 0, zIndex: 1, marginTop: 16,
                }} />
                {idx < filtered.length - 1 && (
                  <div style={{
                    width: 2, flex: 1, background: 'var(--border, #e2e8f0)',
                    minHeight: 20,
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{
                flex: 1, padding: '12px 0 12px 12px',
                borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  {m.yearRange && (
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, color: cfg.color,
                      background: cfg.bg, padding: '2px 8px', borderRadius: 4,
                    }}>
                      {m.yearRange}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                    background: gc.bg, color: gc.color,
                  }}>
                    Goal {m.goal}
                  </span>
                  <span style={{ fontSize: '0.6rem', fontWeight: 500, color: cfg.color }}>
                    <i className={`fa-solid ${cfg.icon}`} style={{ marginRight: 3 }} />
                    {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-1)', fontWeight: 500, marginBottom: 2 }}>
                  {m.description}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  Target {m.targetId}: {m.targetTitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
