import React, { useState } from 'react';
import type { NBSAPTarget, Indicator } from '../types/index';
import { progressColor } from '../utils/progressColors';

interface Props {
  targets: NBSAPTarget[];
}

const goalMeta: Record<string, { label: string; color: string; bg: string; light: string }> = {
  A: { label: 'Reduce Threats to Biodiversity', color: '#16a34a', bg: '#f0fdf4', light: '#dcfce7' },
  B: { label: 'Sustainable Use & Benefits', color: '#2563eb', bg: '#eff6ff', light: '#dbeafe' },
  C: { label: 'Tools & Solutions', color: '#d97706', bg: '#fffbeb', light: '#fef3c7' },
  D: { label: 'Mainstreaming Biodiversity', color: '#db2777', bg: '#fdf2f8', light: '#fce7f3' },
};

function ProgressRing({ value, size, color }: { value: number; size: number; color: string }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

function IndicatorRow({ ind }: { ind: Indicator }) {
  const pc = progressColor(ind.progress);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 80px',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderBottom: '1px solid #f8fafc',
      }}
    >
      {/* Indicator name */}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{ind.name}</div>
        {ind.periodicity && (
          <div style={{ fontSize: '0.58rem', color: '#94a3b8', marginTop: 2 }}>
            {ind.periodicity}
          </div>
        )}
      </div>

      {/* Target */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
          {ind.final_target || '—'}
        </div>
        <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>Target</div>
      </div>

      {/* Current */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: pc.color }}>
          {ind.current_value || '—'}
        </div>
        <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>Current</div>
      </div>

      {/* Progress ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
        <ProgressRing value={ind.progress} size={32} color={pc.color} />
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: pc.color }}>
            {ind.progress}%
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoalHierarchy({ targets }: Props) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set(['A']));
  const [expandedTargets, setExpandedTargets] = useState<Set<number>>(new Set());

  const toggleGoal = (g: string) => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };
  const toggleTarget = (id: number) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const goals = ['A', 'B', 'C', 'D'].map(g => ({
    key: g,
    ...goalMeta[g],
    targets: targets.filter(t => t.goal === g),
    avg: (() => {
      const gt = targets.filter(t => t.goal === g);
      return gt.length > 0 ? Math.round(gt.reduce((s, t) => s + t.progress, 0) / gt.length) : 0;
    })(),
  }));

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
          Goal → Target → Indicator Breakdown
        </div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
          Full hierarchy with targets, current values, and progress
        </div>
      </div>

      {goals.map(g => {
        const isGoalOpen = expandedGoals.has(g.key);
        const gpc = progressColor(g.avg);
        return (
          <div key={g.key}>
            {/* ── Goal row ── */}
            <div
              onClick={() => toggleGoal(g.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 22px',
                background: isGoalOpen ? g.bg : '#fff',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: g.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  fontFamily: "'Playfair Display', serif",
                  flexShrink: 0,
                }}
              >
                {g.key}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                  Goal {g.key}: {g.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div
                    style={{
                      flex: 1,
                      maxWidth: 200,
                      height: 6,
                      background: '#e2e8f0',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${g.avg}%`,
                        background: g.color,
                        borderRadius: 3,
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: gpc.color }}>
                    {g.avg}%
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                    · {g.targets.length} targets
                  </span>
                </div>
              </div>

              <i
                className={`fa-solid fa-chevron-${isGoalOpen ? 'up' : 'down'}`}
                style={{ color: '#94a3b8', fontSize: '0.7rem' }}
              />
            </div>

            {/* ── Targets under goal ── */}
            {isGoalOpen &&
              g.targets.map(t => {
                const isTargetOpen = expandedTargets.has(t.id);
                const tpc = progressColor(t.progress);
                const indicators = t.indicators || [];

                return (
                  <div key={t.id}>
                    {/* Target row */}
                    <div
                      onClick={() => toggleTarget(t.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 22px 12px 52px',
                        borderBottom: '1px solid #f8fafc',
                        cursor: 'pointer',
                        background: isTargetOpen ? '#fafbfc' : '#fff',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => {
                        if (!isTargetOpen) e.currentTarget.style.background = '#fafbfc';
                      }}
                      onMouseLeave={e => {
                        if (!isTargetOpen) e.currentTarget.style.background = '#fff';
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 32,
                          borderRadius: 3,
                          background: tpc.color,
                          flexShrink: 0,
                        }}
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                          Target {t.id}: {t.title}
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}
                        >
                          <div
                            style={{
                              flex: 1,
                              maxWidth: 180,
                              height: 5,
                              background: '#f1f5f9',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${t.progress}%`,
                                background: tpc.color,
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: tpc.color }}>
                            {t.progress}%
                          </span>
                          <span
                            style={{
                              fontSize: '0.55rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: tpc.bg,
                              color: tpc.color,
                            }}
                          >
                            {tpc.label}
                          </span>
                          {indicators.length > 0 && (
                            <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>
                              · {indicators.length} indicator{indicators.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <i
                        className={`fa-solid fa-chevron-${isTargetOpen ? 'up' : 'down'}`}
                        style={{ color: '#cbd5e1', fontSize: '0.6rem' }}
                      />
                    </div>

                    {/* Indicators under target */}
                    {isTargetOpen && indicators.length > 0 && (
                      <div style={{ background: '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                        {/* Column headers */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 100px 100px 80px',
                            gap: 12,
                            padding: '6px 16px 6px 68px',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 600,
                              color: '#94a3b8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Indicator
                          </div>
                          <div
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 600,
                              color: '#94a3b8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              textAlign: 'center',
                            }}
                          >
                            Target
                          </div>
                          <div
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 600,
                              color: '#94a3b8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              textAlign: 'center',
                            }}
                          >
                            Current
                          </div>
                          <div
                            style={{
                              fontSize: '0.58rem',
                              fontWeight: 600,
                              color: '#94a3b8',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              textAlign: 'center',
                            }}
                          >
                            Progress
                          </div>
                        </div>
                        <div style={{ paddingLeft: 52 }}>
                          {indicators.map(ind => (
                            <IndicatorRow key={ind.id} ind={ind} />
                          ))}
                        </div>
                      </div>
                    )}

                    {isTargetOpen && indicators.length === 0 && (
                      <div
                        style={{
                          padding: '12px 22px 12px 68px',
                          background: '#fafbfc',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No indicators linked to this target
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}
