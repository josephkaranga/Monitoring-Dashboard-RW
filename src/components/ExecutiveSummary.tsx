import React, { useState } from 'react';
import type { DashboardStats, NBSAPTarget, Indicator } from '../types/index';
import { progressColor } from '../utils/progressColors';

type StatusFilter = 'on-track' | 'at-risk' | 'behind' | null;

interface Props {
  stats: DashboardStats | null;
  targets: NBSAPTarget[];
  indicators: Indicator[];
}

function classify(progress: number): 'on-track' | 'at-risk' | 'behind' {
  if (progress >= 70) return 'on-track';
  if (progress >= 40) return 'at-risk';
  return 'behind';
}

function GaugeRing({
  value,
  size,
  stroke,
  color,
  bgColor,
}: {
  value: number;
  size: number;
  stroke: number;
  color: string;
  bgColor: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor} strokeWidth={stroke} />
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
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
    </svg>
  );
}

function StatusDonut({
  onTrack,
  atRisk,
  behind,
  size = 140,
}: {
  onTrack: number;
  atRisk: number;
  behind: number;
  size?: number;
}) {
  const total = onTrack + atRisk + behind;
  if (total === 0) return null;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const segments = [
    { pct: onTrack / total, color: '#16a34a' },
    { pct: atRisk / total, color: '#f59e0b' },
    { pct: behind / total, color: '#ef4444' },
  ];
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const len = seg.pct * circ;
        const dashOffset = circ - len;
        const rotation = (offset / circ) * 360;
        offset += len;
        if (seg.pct === 0) return null;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={0}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center',
              transition: 'all 0.8s ease',
            }}
          />
        );
      })}
    </svg>
  );
}

const goalColors: Record<string, { bg: string; color: string }> = {
  A: { bg: '#dcfce7', color: '#166534' },
  B: { bg: '#dbeafe', color: '#1e40af' },
  C: { bg: '#fef3c7', color: '#92400e' },
  D: { bg: '#fce7f3', color: '#be185d' },
};

const pillMeta = {
  'on-track': { label: 'On Track', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  'at-risk': { label: 'At Risk', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  behind: { label: 'Behind', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

export function ExecutiveSummary({ stats, targets, indicators }: Props) {
  const [expanded, setExpanded] = useState<StatusFilter>(null);

  if (!stats) return null;

  const { avgProgress } = stats;
  const pc = progressColor(avgProgress);

  const indByStatus = {
    'on-track': indicators.filter(i => i.status === 'on-track'),
    'at-risk': indicators.filter(i => i.status === 'at-risk'),
    behind: indicators.filter(i => i.status === 'behind'),
  };
  const tgtByStatus = {
    'on-track': targets.filter(t => classify(t.progress) === 'on-track'),
    'at-risk': targets.filter(t => classify(t.progress) === 'at-risk'),
    behind: targets.filter(t => classify(t.progress) === 'behind'),
  };

  const totalInd = indicators.length;
  const totalTgt = targets.length;

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '28px 32px',
          borderBottomLeftRadius: expanded ? 0 : 14,
          borderBottomRightRadius: expanded ? 0 : 14,
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            NBSAP 2025–2030 Implementation Dashboard
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3 }}>
            Rwanda NBSAP Implementation Progress
          </div>
        </div>

        {/* Three visual panels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 24,
            alignItems: 'center',
          }}
        >
          {/* LEFT: Overall progress gauge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <GaugeRing
                value={avgProgress}
                size={150}
                stroke={14}
                color={pc.color}
                bgColor="#f1f5f9"
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '2.4rem',
                    fontWeight: 800,
                    color: pc.color,
                    lineHeight: 1,
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {avgProgress}%
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>Progress</div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginTop: 10 }}>
              Overall Implementation
            </div>
          </div>

          {/* CENTER: Target status donut */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <StatusDonut
                onTrack={tgtByStatus['on-track'].length}
                atRisk={tgtByStatus['at-risk'].length}
                behind={tgtByStatus['behind'].length}
                size={150}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1,
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {totalTgt}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>Targets</div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginTop: 10 }}>
              National Targets
            </div>
          </div>

          {/* RIGHT: Indicator status donut */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <StatusDonut
                onTrack={indByStatus['on-track'].length}
                atRisk={indByStatus['at-risk'].length}
                behind={indByStatus['behind'].length}
                size={150}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1,
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {totalInd}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>
                  Indicators
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginTop: 10 }}>
              Monitoring Indicators
            </div>
          </div>
        </div>

        {/* Legend / clickable pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
          {(['on-track', 'at-risk', 'behind'] as const).map(status => {
            const meta = pillMeta[status];
            const tCount = tgtByStatus[status].length;
            const iCount = indByStatus[status].length;
            const isOpen = expanded === status;
            return (
              <div
                key={status}
                onClick={() => setExpanded(prev => (prev === status ? null : status))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: meta.bg,
                  border: `1.5px solid ${isOpen ? meta.color : meta.border}`,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: meta.color,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: meta.color }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                    {tCount} targets · {iCount} indicators
                  </div>
                </div>
                <i
                  className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
                  style={{ fontSize: '0.55rem', color: meta.color, opacity: 0.5, marginLeft: 4 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded &&
        (() => {
          const meta = pillMeta[expanded];
          const tgts = tgtByStatus[expanded];
          const inds = indByStatus[expanded];
          return (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderTop: '1px dashed #cbd5e1',
                borderRadius: '0 0 14px 14px',
                padding: '20px 32px',
                maxHeight: 380,
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {meta.label} Targets{' '}
                    <span style={{ fontWeight: 400, color: '#94a3b8' }}>({tgts.length})</span>
                  </div>
                  {tgts.length === 0 ? (
                    <div
                      style={{
                        padding: 20,
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: 8,
                      }}
                    >
                      None
                    </div>
                  ) : (
                    tgts.map(t => {
                      const tpc = progressColor(t.progress);
                      const gc = goalColors[t.goal] ?? { bg: '#f1f5f9', color: '#334155' };
                      return (
                        <div
                          key={t.id}
                          style={{ padding: '10px 0', borderBottom: '1px solid #f8fafc' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: gc.bg,
                                color: gc.color,
                              }}
                            >
                              Goal {t.goal}
                            </span>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: '#0f172a',
                                flex: 1,
                              }}
                            >
                              T{t.id}: {t.title}
                            </span>
                            <span
                              style={{ fontSize: '0.78rem', fontWeight: 700, color: tpc.color }}
                            >
                              {t.progress}%
                            </span>
                          </div>
                          <div
                            style={{
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
                        </div>
                      );
                    })
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {meta.label} Indicators{' '}
                    <span style={{ fontWeight: 400, color: '#94a3b8' }}>({inds.length})</span>
                  </div>
                  {inds.length === 0 ? (
                    <div
                      style={{
                        padding: 20,
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: 8,
                      }}
                    >
                      None
                    </div>
                  ) : (
                    inds.map(ind => {
                      const ipc = progressColor(ind.progress);
                      return (
                        <div
                          key={ind.id}
                          style={{ padding: '10px 0', borderBottom: '1px solid #f8fafc' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 8,
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: '#0f172a',
                                flex: 1,
                              }}
                            >
                              {ind.name}
                            </span>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: ipc.color,
                                flexShrink: 0,
                              }}
                            >
                              {ind.progress}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 5,
                              background: '#f1f5f9',
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${ind.progress}%`,
                                background: ipc.color,
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
