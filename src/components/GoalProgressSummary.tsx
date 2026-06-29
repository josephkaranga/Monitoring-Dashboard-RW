import React, { useState } from 'react';
import type { NBSAPTarget } from '../types/index';
import { progressColor } from '../utils/progressColors';

const goalMeta: Record<string, { label: string; color: string; bg: string }> = {
  A: { label: 'Reduce Threats to Biodiversity', color: '#16a34a', bg: '#f0fdf4' },
  B: { label: 'Sustainable Use & Benefits',     color: '#2563eb', bg: '#eff6ff' },
  C: { label: 'Tools & Solutions',               color: '#d97706', bg: '#fffbeb' },
  D: { label: 'Mainstreaming Biodiversity',      color: '#db2777', bg: '#fdf2f8' },
};

export function GoalProgressSummary({ targets }: { targets: NBSAPTarget[] }) {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const goals = ['A', 'B', 'C', 'D'].map(g => {
    const meta = goalMeta[g];
    const goalTargets = targets.filter(t => t.goal === g);
    const avg = goalTargets.length > 0
      ? Math.round(goalTargets.reduce((s, t) => s + t.progress, 0) / goalTargets.length) : 0;
    return { goal: g, ...meta, targets: goalTargets, avg,
      onTrack: goalTargets.filter(t => t.progress >= 70).length,
      atRisk: goalTargets.filter(t => t.progress >= 40 && t.progress < 70).length,
      behind: goalTargets.filter(t => t.progress < 40).length,
    };
  });

  return (
    <div style={{
      background: '#fff', borderRadius: 14,
      border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Progress by GBF Goal</div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Click a goal to see individual targets</div>
      </div>

      <div style={{ padding: '16px 22px' }}>
        {goals.map(g => {
          const isOpen = expandedGoal === g.goal;
          return (
            <div key={g.goal} style={{ marginBottom: isOpen ? 4 : 12 }}>
              {/* Goal bar */}
              <div
                onClick={() => setExpandedGoal(isOpen ? null : g.goal)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  background: isOpen ? g.bg : '#fafbfc',
                  border: `1.5px solid ${isOpen ? g.color : '#f1f5f9'}`,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = g.color + '60'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = '#f1f5f9'; }}
              >
                {/* Goal letter badge */}
                <div style={{
                  width: 38, height: 38, borderRadius: 8,
                  background: g.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 800, fontFamily: "'Playfair Display', serif",
                  flexShrink: 0,
                }}>
                  {g.goal}
                </div>

                {/* Progress bar section */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{g.label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: g.color, fontFamily: "'Playfair Display', serif" }}>{g.avg}%</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${g.avg}%`,
                      background: `linear-gradient(90deg, ${g.color}, ${g.color}bb)`,
                      borderRadius: 4, transition: 'width 1s ease',
                    }} />
                  </div>
                </div>

                {/* Status dots */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {g.onTrack > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: 4 }}>{g.onTrack}</span>}
                  {g.atRisk > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>{g.atRisk}</span>}
                  {g.behind > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>{g.behind}</span>}
                </div>

                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
                  style={{ fontSize: '0.6rem', color: '#94a3b8', flexShrink: 0 }} />
              </div>

              {/* Expanded targets */}
              {isOpen && (
                <div style={{ padding: '8px 14px 12px 64px' }}>
                  {g.targets.map(t => {
                    const tpc = progressColor(t.progress);
                    return (
                      <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>T{t.id}: {t.title}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: tpc.color }}>{t.progress}%</span>
                        </div>
                        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${t.progress}%`, background: tpc.color, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
