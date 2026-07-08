import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDashboardStats, useReports, useDistricts } from '../hooks/useData';
import { fetchIndicators, fetchTargets } from '../services/dataService';
import type { Indicator, NBSAPTarget } from '../types/index';

import { DashboardSkeleton } from '../components/Skeleton';
import { MetricDetailPanel, type MetricKey } from '../components/MetricDetailPanel';
import {
  fetchDashboardMetrics,
  type DashboardMetrics,
  formatMetricValue,
} from '../services/systemMetricsService';
import { eventBus } from '../services/eventBus';
import { progressColor } from '../utils/progressColors';
import toast from 'react-hot-toast';

/**
 * DashboardPageRedesign — UN-level executive redesign (preview: /dashboard-preview).
 * Uses ONLY data available to the live dashboard. Every target/indicator entry
 * point opens an in-page detail panel showing all its fields. Live components
 * are untouched. Trend features (deltas/sparklines/time-series) omitted until a
 * metrics history table exists.
 */

const NAVY = '#14385c';
const ACCENT = '#4b92db';
const UNBLUE = '#1f6cb4';
const ON = '#2f9e44';
const RISK = '#e7b53c';
const BEHIND = '#e0562e';

type StatusKey = 'on-track' | 'at-risk' | 'behind';
type OpenFn = (kind: 'target' | 'indicator', id: number) => void;
type Entity = { type: 'target'; data: NBSAPTarget } | { type: 'indicator'; data: Indicator };

const goalChip: Record<string, { bg: string; color: string }> = {
  A: { bg: '#dcfce7', color: '#166534' },
  B: { bg: '#dbeafe', color: '#1e40af' },
  C: { bg: '#fef3c7', color: '#92400e' },
  D: { bg: '#fce7f3', color: '#be185d' },
};

const goalLabel: Record<string, string> = {
  A: 'Reduce threats to biodiversity',
  B: 'Sustainable use & benefits',
  C: 'Tools & solutions',
  D: 'Mainstreaming biodiversity',
};

function classify(p: number): StatusKey {
  if (p >= 70) return 'on-track';
  if (p >= 40) return 'at-risk';
  return 'behind';
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};
const cardHead: React.CSSProperties = { padding: '15px 20px', borderBottom: '1px solid #f1f5f9' };
const cardTitle: React.CSSProperties = { fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' };
const cardSub: React.CSSProperties = { fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 };

/* ── Flat donut ─────────────────────────────────────────────── */
function Donut({
  segments,
  size = 104,
  thickness = 12,
  total,
  center,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  total?: number;
  center?: React.ReactNode;
}) {
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const denom = (total ?? segments.reduce((s, x) => s + x.value, 0)) || 1;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f6" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const len = (seg.value / denom) * C;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-acc}
              style={{ transition: 'stroke-dasharray 0.8s ease' }}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      {center && (
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
          {center}
        </div>
      )}
    </div>
  );
}

function Legend({
  rows,
  active,
  onSelect,
}: {
  rows: { color: string; label: string; value: number; status: StatusKey }[];
  active: StatusKey | null;
  onSelect: (status: StatusKey) => void;
}) {
  return (
    <div style={{ fontSize: '0.72rem' }}>
      {rows.map(r => {
        const isActive = active === r.status;
        return (
          <div
            key={r.label}
            onClick={() => onSelect(r.status)}
            title={`Show ${r.label.toLowerCase()} items`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              margin: '2px 0',
              padding: '3px 7px',
              borderRadius: 6,
              cursor: 'pointer',
              background: isActive ? '#eef2f6' : 'transparent',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#475569' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: r.color, flexShrink: 0 }} />
              {r.label}
            </span>
            <b style={{ color: '#0f172a' }}>{r.value}</b>
          </div>
        );
      })}
    </div>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 4, background: '#f1f5f9', overflow: 'hidden', flex: 1, maxWidth: 160 }}>
      <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color }} />
    </div>
  );
}

/* ── Executive summary ──────────────────────────────────────── */
const statusMeta: Record<StatusKey, { label: string; color: string }> = {
  'on-track': { label: 'On track', color: ON },
  'at-risk': { label: 'At risk', color: RISK },
  behind: { label: 'Behind', color: BEHIND },
};

function ExecSummaryUN({
  avgProgress,
  targets,
  indicators,
  onOpen,
}: {
  avgProgress: number;
  targets: NBSAPTarget[];
  indicators: Indicator[];
  onOpen: OpenFn;
}) {
  const [sel, setSel] = useState<{ kind: 'target' | 'indicator'; status: StatusKey } | null>(null);

  const tg = {
    on: targets.filter(t => classify(t.progress) === 'on-track').length,
    risk: targets.filter(t => classify(t.progress) === 'at-risk').length,
    behind: targets.filter(t => classify(t.progress) === 'behind').length,
  };
  const ind = {
    on: indicators.filter(i => i.status === 'on-track').length,
    risk: indicators.filter(i => i.status === 'at-risk').length,
    behind: indicators.filter(i => i.status === 'behind').length,
  };

  const pick = (kind: 'target' | 'indicator', status: StatusKey) =>
    setSel(prev => (prev && prev.kind === kind && prev.status === status ? null : { kind, status }));

  const selTargets = sel && sel.kind === 'target' ? targets.filter(t => classify(t.progress) === sel.status) : [];
  const selIndicators = sel && sel.kind === 'indicator' ? indicators.filter(i => i.status === sel.status) : [];
  const selCount = sel?.kind === 'target' ? selTargets.length : selIndicators.length;

  const cell: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'center' };
  const listRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 7px',
    borderBottom: '1px solid #f8fafc',
    cursor: 'pointer',
    borderRadius: 6,
    fontSize: '0.72rem',
    transition: 'background 0.15s',
  };

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={cardHead}>
        <div style={cardTitle}>Executive summary</div>
        <div style={cardSub}>National status across goals, targets and indicators · click a status to list it</div>
      </div>
      <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
        <div style={cell}>
          <Donut
            size={104}
            thickness={12}
            total={100}
            segments={[{ value: avgProgress, color: UNBLUE }]}
            center={
              <>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{avgProgress}%</span>
                <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>progress</span>
              </>
            }
          />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>Overall progress</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Weighted, {targets.length} targets</div>
          </div>
        </div>

        <div style={cell}>
          <Donut
            size={104}
            thickness={12}
            segments={[
              { value: tg.on, color: ON },
              { value: tg.risk, color: RISK },
              { value: tg.behind, color: BEHIND },
            ]}
            center={
              <>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{targets.length}</span>
                <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>targets</span>
              </>
            }
          />
          <Legend
            active={sel?.kind === 'target' ? sel.status : null}
            onSelect={s => pick('target', s)}
            rows={[
              { color: ON, label: 'On track', value: tg.on, status: 'on-track' },
              { color: RISK, label: 'At risk', value: tg.risk, status: 'at-risk' },
              { color: BEHIND, label: 'Behind', value: tg.behind, status: 'behind' },
            ]}
          />
        </div>

        <div style={cell}>
          <Donut
            size={104}
            thickness={12}
            segments={[
              { value: ind.on, color: ON },
              { value: ind.risk, color: RISK },
              { value: ind.behind, color: BEHIND },
            ]}
            center={
              <>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{indicators.length}</span>
                <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>indicators</span>
              </>
            }
          />
          <Legend
            active={sel?.kind === 'indicator' ? sel.status : null}
            onSelect={s => pick('indicator', s)}
            rows={[
              { color: ON, label: 'On track', value: ind.on, status: 'on-track' },
              { color: RISK, label: 'At risk', value: ind.risk, status: 'at-risk' },
              { color: BEHIND, label: 'Behind', value: ind.behind, status: 'behind' },
            ]}
          />
        </div>
      </div>

      {sel && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: statusMeta[sel.status].color }} />
              {selCount} {statusMeta[sel.status].label.toLowerCase()} {sel.kind}
              {selCount === 1 ? '' : 's'} · click for full details
            </div>
            <i className="fa-solid fa-xmark" onClick={() => setSel(null)} title="Close" style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.85rem' }} />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            {selCount === 0 ? (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', padding: 8 }}>None in this status.</div>
            ) : sel.kind === 'target' ? (
              selTargets.map(t => {
                const pc = progressColor(t.progress);
                return (
                  <div key={t.id} onClick={() => onOpen('target', t.id)} title="View details" style={listRow}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ flex: 1, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Target {t.id}: {t.title}
                    </span>
                    <b style={{ color: pc.color }}>{t.progress}%</b>
                    <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.6rem' }} />
                  </div>
                );
              })
            ) : (
              selIndicators.map(i => {
                const pc = progressColor(i.progress);
                return (
                  <div key={i.id} onClick={() => onOpen('indicator', i.id)} title="View details" style={listRow}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ flex: 1, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i.name}
                    </span>
                    <b style={{ color: pc.color }}>{i.progress}%</b>
                    <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.6rem' }} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Goal hierarchy ─────────────────────────────────────────── */
function GoalHierarchyUN({
  targets,
  indicators,
  onOpen,
}: {
  targets: NBSAPTarget[];
  indicators: Indicator[];
  onOpen: OpenFn;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set(['A']));
  const [openT, setOpenT] = useState<Set<number>>(new Set());
  const toggle = (g: string) =>
    setOpen(prev => {
      const n = new Set(prev);
      n.has(g) ? n.delete(g) : n.add(g);
      return n;
    });
  const toggleT = (id: number) =>
    setOpenT(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const goals = ['A', 'B', 'C', 'D'].map(g => {
    const gt = targets.filter(t => t.goal === g);
    const avg = gt.length ? Math.round(gt.reduce((s, t) => s + t.progress, 0) / gt.length) : 0;
    return { key: g, targets: gt, avg };
  });

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 0',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.78rem',
  };

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={cardHead}>
        <div style={cardTitle}>Goal → target → indicator hierarchy</div>
        <div style={cardSub}>Aligned to the Kunming-Montreal GBF · click a target to expand, then any row for full details</div>
      </div>
      <div style={{ padding: '4px 20px 12px' }}>
        {goals.map(g => {
          const isOpen = open.has(g.key);
          return (
            <div key={g.key}>
              <div style={{ ...rowStyle, cursor: 'pointer' }} onClick={() => toggle(g.key)}>
                <i className={`fa-solid fa-chevron-${isOpen ? 'down' : 'right'}`} style={{ color: '#94a3b8', fontSize: '0.7rem', width: 12 }} />
                <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: goalChip[g.key].bg, color: goalChip[g.key].color }}>
                  Goal {g.key}
                </span>
                <span style={{ flex: 1, fontWeight: 600, color: '#0f172a' }}>{goalLabel[g.key]}</span>
                <Bar value={g.avg} color={progressColor(g.avg).color} />
                <b style={{ width: 34, textAlign: 'right', color: progressColor(g.avg).color }}>{g.avg}%</b>
                <span style={{ width: 62, textAlign: 'right', color: '#94a3b8' }}>{g.targets.length} targets</span>
              </div>

              {isOpen &&
                g.targets.map(t => {
                  const pc = progressColor(t.progress);
                  const tInd = indicators.filter(i => i.nbsap_target_id === t.id);
                  const tOpen = openT.has(t.id);
                  return (
                    <div key={t.id}>
                      <div
                        onClick={() => toggleT(t.id)}
                        title={tInd.length ? 'Show indicators' : 'No indicators'}
                        style={{ ...rowStyle, paddingLeft: 24, fontSize: '0.72rem', color: '#334155', cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <i className={`fa-solid fa-chevron-${tOpen ? 'down' : 'right'}`} style={{ color: tInd.length ? '#94a3b8' : '#e2e8f0', fontSize: '0.62rem', width: 10 }} />
                        <span style={{ flex: 1 }}>Target {t.id}: {t.title}</span>
                        <Bar value={t.progress} color={pc.color} />
                        <b style={{ width: 34, textAlign: 'right', color: pc.color }}>{t.progress}%</b>
                        <span style={{ width: 48, textAlign: 'right', color: '#94a3b8', fontSize: '0.62rem' }}>{tInd.length} ind.</span>
                        <i
                          className="fa-solid fa-circle-info"
                          title="View full details"
                          onClick={e => {
                            e.stopPropagation();
                            onOpen('target', t.id);
                          }}
                          style={{ color: UNBLUE, fontSize: '0.72rem', width: 14, cursor: 'pointer' }}
                        />
                      </div>

                      {tOpen &&
                        tInd.map(indr => {
                          const ipc = progressColor(indr.progress);
                          return (
                            <div
                              key={indr.id}
                              onClick={() => onOpen('indicator', indr.id)}
                              title="View indicator details"
                              style={{ ...rowStyle, paddingLeft: 48, fontSize: '0.68rem', color: '#64748b', cursor: 'pointer', borderRadius: 6, borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <i className="fa-solid fa-angle-right" style={{ color: '#cbd5e1', fontSize: '0.55rem', width: 8 }} />
                              <span style={{ flex: 1 }}>{indr.name}</span>
                              <Bar value={indr.progress} color={ipc.color} />
                              <b style={{ width: 34, textAlign: 'right', color: ipc.color }}>{indr.progress}%</b>
                              <span style={{ width: 48 }} />
                              <i className="fa-solid fa-circle-info" style={{ color: UNBLUE, fontSize: '0.68rem', width: 14 }} />
                            </div>
                          );
                        })}
                      {tOpen && tInd.length === 0 && (
                        <div style={{ padding: '8px 0 8px 48px', fontSize: '0.66rem', color: '#94a3b8', borderBottom: '1px solid #f8fafc' }}>
                          No indicators linked to this target yet.
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Milestone tracker ──────────────────────────────────────── */
interface Milestone {
  targetId: number;
  targetTitle: string;
  goal: string;
  yearRange: string;
  description: string;
  status: 'completed' | 'in-progress' | 'upcoming' | 'overdue';
}

const CUR_YEAR = new Date().getFullYear();

function parseMilestones(targets: NBSAPTarget[]): Milestone[] {
  const out: Milestone[] = [];
  for (const t of targets) {
    if (!t.timeline_milestones) continue;
    for (const seg of t.timeline_milestones.split(/;\s*/)) {
      const trimmed = seg.trim();
      if (!trimmed) continue;
      const ym = trimmed.match(/^(\d{4})(?:\s*[-–]\s*(\d{4}))?:\s*(.*)/);
      if (!ym) {
        out.push({ targetId: t.id, targetTitle: t.title, goal: t.goal, yearRange: '', description: trimmed, status: 'upcoming' });
        continue;
      }
      const startYear = parseInt(ym[1]);
      const endYear = ym[2] ? parseInt(ym[2]) : startYear;
      const description = ym[3].trim().replace(/\.$/, '');
      const yearRange = ym[2] ? `${startYear}–${endYear}` : `${startYear}`;
      let status: Milestone['status'];
      if (endYear < CUR_YEAR) status = t.progress >= 40 ? 'completed' : 'overdue';
      else if (startYear <= CUR_YEAR && endYear >= CUR_YEAR) status = 'in-progress';
      else status = 'upcoming';
      out.push({ targetId: t.id, targetTitle: t.title, goal: t.goal, yearRange, description, status });
    }
  }
  return out;
}

const mStatus = {
  completed: { icon: 'fa-circle-check', color: '#16a34a', bg: '#dcfce7', label: 'Completed' },
  'in-progress': { icon: 'fa-spinner', color: '#0284c7', bg: '#e0f2fe', label: 'In progress' },
  upcoming: { icon: 'fa-clock', color: '#6b7280', bg: '#f3f4f6', label: 'Upcoming' },
  overdue: { icon: 'fa-circle-exclamation', color: '#dc2626', bg: '#fee2e2', label: 'Overdue' },
} as const;

type MFilter = 'all' | 'completed' | 'in-progress' | 'upcoming' | 'overdue';

function MilestoneTrackerUN({ targets, onOpen }: { targets: NBSAPTarget[]; onOpen: OpenFn }) {
  const [filter, setFilter] = useState<MFilter>('all');
  const all = parseMilestones(targets);
  const filtered = filter === 'all' ? all : all.filter(m => m.status === filter);
  const counts = {
    all: all.length,
    completed: all.filter(m => m.status === 'completed').length,
    'in-progress': all.filter(m => m.status === 'in-progress').length,
    upcoming: all.filter(m => m.status === 'upcoming').length,
    overdue: all.filter(m => m.status === 'overdue').length,
  };

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={cardTitle}>
            <i className="fa-solid fa-timeline" style={{ color: UNBLUE, marginRight: 8 }} />
            Milestone tracker
          </div>
          <div style={cardSub}>Key milestones across all 22 NBSAP targets · click for target details</div>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{all.length} milestones</span>
      </div>

      <div style={{ padding: '11px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', 'overdue', 'in-progress', 'upcoming', 'completed'] as MFilter[]).map(f => {
          const active = filter === f;
          const c = f === 'all' ? NAVY : mStatus[f].color;
          const label = f === 'all' ? 'All' : mStatus[f].label;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: '4px 11px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', border: active ? `1.5px solid ${c}` : '1px solid #e2e8f0', background: active ? `${c}12` : 'transparent', color: active ? c : '#64748b' }}
            >
              {label} ({counts[f]})
            </button>
          );
        })}
      </div>

      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '6px 20px 10px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No milestones match this filter.</div>
        ) : (
          filtered.map((m, idx) => {
            const cfg = mStatus[m.status];
            const gc = goalChip[m.goal] ?? { bg: '#f1f5f9', color: '#334155' };
            return (
              <div key={idx} style={{ display: 'flex', gap: 11 }}>
                <div style={{ width: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}`, marginTop: 14 }} />
                  {idx < filtered.length - 1 && <div style={{ width: 2, flex: 1, background: '#eef2f6', minHeight: 14 }} />}
                </div>
                <div
                  onClick={() => onOpen('target', m.targetId)}
                  title="View full target details"
                  style={{ flex: 1, padding: '11px 8px', marginRight: -8, borderRadius: 6, cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    {m.yearRange && <span style={{ fontSize: '0.62rem', fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 5 }}>{m.yearRange}</span>}
                    <span style={{ fontSize: '0.58rem', fontWeight: 600, padding: '2px 7px', borderRadius: 5, background: gc.bg, color: gc.color }}>Goal {m.goal}</span>
                    <span style={{ fontSize: '0.58rem', fontWeight: 600, color: cfg.color }}>
                      <i className={`fa-solid ${cfg.icon}`} style={{ marginRight: 3 }} />
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#0f172a', fontWeight: 500, marginBottom: 2 }}>{m.description}</div>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>Target {m.targetId}: {m.targetTitle}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── What needs attention ───────────────────────────────────── */
interface AttentionItem {
  id: number;
  type: 'target' | 'indicator';
  name: string;
  progress: number;
  goal?: string;
  reasons: string[];
  severity: 'behind' | 'at-risk';
}

function deriveAttention(targets: NBSAPTarget[], indicators: Indicator[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const t of targets) {
    if (progressColor(t.progress).label === 'On Track') continue;
    const reasons: string[] = [];
    if (t.progress < 20) reasons.push('Progress critically low');
    else if (t.progress < 40) reasons.push('Progress below 40% threshold');
    else reasons.push('Progress needs acceleration');
    if ((t.total_reports ?? 0) === 0) reasons.push('No data submissions yet');
    items.push({ id: t.id, type: 'target', name: `Target ${t.id}: ${t.title}`, progress: t.progress, goal: t.goal, reasons, severity: t.progress < 40 ? 'behind' : 'at-risk' });
  }
  for (const ind of indicators) {
    if (ind.status === 'on-track') continue;
    const reasons: string[] = [];
    if (ind.progress < 20) reasons.push('Progress critically low');
    else if (ind.progress < 40) reasons.push('Below minimum threshold');
    else reasons.push('Needs acceleration to meet 2030 target');
    if (ind.current_value && ind.final_target) reasons.push(`Current: ${ind.current_value} → Target: ${ind.final_target}`);
    items.push({ id: ind.id, type: 'indicator', name: ind.name, progress: ind.progress, reasons, severity: ind.progress < 40 ? 'behind' : 'at-risk' });
  }
  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'behind' ? -1 : 1;
    return a.progress - b.progress;
  });
  return items;
}

function AttentionPanelUN({ targets, indicators, onOpen }: { targets: NBSAPTarget[]; indicators: Indicator[]; onOpen: OpenFn }) {
  const items = deriveAttention(targets, indicators);
  const behind = items.filter(i => i.severity === 'behind').length;
  const atRisk = items.filter(i => i.severity === 'at-risk').length;

  return (
    <div style={card}>
      <div style={{ ...cardHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={cardTitle}>Requires attention</div>
          <div style={cardSub}>Targets and indicators off track · click for details</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '3px 8px', borderRadius: 9, background: '#fee2e2', color: '#dc2626' }}>{behind} behind</span>
          <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '3px 8px', borderRadius: 9, background: '#fef3c7', color: '#d97706' }}>{atRisk} at risk</span>
        </div>
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '4px 20px 10px' }}>
        {items.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#16a34a', fontSize: '0.82rem' }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />
            All targets and indicators on track
          </div>
        ) : (
          items.slice(0, 40).map(item => {
            const sev = item.severity === 'behind'
              ? { color: '#dc2626', bg: '#fee2e2', icon: 'fa-triangle-exclamation' }
              : { color: '#d97706', bg: '#fef3c7', icon: 'fa-circle-exclamation' };
            return (
              <div
                key={`${item.type}-${item.id}-${item.name}`}
                onClick={() => onOpen(item.type, item.id)}
                title="View full details"
                style={{ display: 'flex', gap: 10, padding: '10px 8px', marginRight: -8, marginLeft: -8, borderRadius: 6, borderBottom: '1px solid #f8fafc', alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: sev.bg, color: sev.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', marginTop: 1 }}>
                  <i className={`fa-solid ${sev.icon}`} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#0f172a' }}>
                    <span style={{ fontSize: '0.56rem', textTransform: 'uppercase', color: '#94a3b8', marginRight: 6 }}>{item.type}</span>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 2 }}>{item.reasons.join(' · ')}</div>
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9, background: sev.bg, color: sev.color, flexShrink: 0 }}>{item.progress}%</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Detail slide-out panel ─────────────────────────────────── */
function DField({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.4, color: '#94a3b8', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: '0.78rem', color: '#1e293b', lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function DChips({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.4, color: '#94a3b8', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {items.map((it, i) => (
          <span key={i} style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#475569', padding: '3px 9px', borderRadius: 12 }}>{it}</span>
        ))}
      </div>
    </div>
  );
}

function EntityDetailPanel({
  entity,
  indicators,
  onOpen,
  onClose,
  navigate,
}: {
  entity: Entity;
  indicators: Indicator[];
  onOpen: OpenFn;
  onClose: () => void;
  navigate: (to: string) => void;
}) {
  const isTarget = entity.type === 'target';
  const pc = progressColor(entity.data.progress);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)' }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(480px, 94vw)',
          background: '#fff',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ background: NAVY, color: '#fff', padding: '16px 20px', borderBottom: `3px solid ${ACCENT}`, position: 'sticky', top: 0, zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: '0.62rem', color: '#8fbce8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isTarget ? `National target ${(entity.data as NBSAPTarget).id}` : 'Biodiversity indicator'}
            </div>
            <i className="fa-solid fa-xmark" onClick={onClose} title="Close" style={{ cursor: 'pointer', fontSize: '1rem' }} />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: 4 }}>
            {isTarget ? (entity.data as NBSAPTarget).title : (entity.data as Indicator).name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(entity.data.progress, 100)}%`, height: '100%', background: pc.color }} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{entity.data.progress}%</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '2px 8px', borderRadius: 9, background: pc.bg, color: pc.color }}>{pc.label}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '6px 20px 24px' }}>
          {isTarget ? (
            (() => {
              const t = entity.data as NBSAPTarget;
              const tInd = indicators.filter(i => i.nbsap_target_id === t.id);
              const ms = parseMilestones([t]);
              return (
                <>
                  <DField label="Goal" value={`Goal ${t.goal} — ${goalLabel[t.goal] ?? ''}`} />
                  <DField label="Description" value={t.description} />
                  <DField label="Baseline" value={t.baseline} />
                  <DField label="Headline indicator" value={t.headline_indicator} />
                  <DChips label="Strategic actions" items={t.strategic_actions} />
                  <DChips label="Responsible stakeholders" items={t.responsible_stakeholders} />
                  <DField
                    label="Reporting"
                    value={
                      <span>
                        {t.total_reports ?? 0} total · {t.approved_reports ?? 0} approved · {t.pending_reports ?? 0} pending
                        {t.report_completion_rate != null ? ` · ${t.report_completion_rate}% approval rate` : ''}
                      </span>
                    }
                  />
                  {ms.length > 0 && (
                    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.4, color: '#94a3b8', marginBottom: 6 }}>Timeline milestones</div>
                      {ms.map((m, i) => {
                        const cfg = mStatus[m.status];
                        return (
                          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: '0.72rem' }}>
                            {m.yearRange && <span style={{ color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: 5, fontWeight: 600, height: 'fit-content' }}>{m.yearRange}</span>}
                            <span style={{ color: '#475569' }}>{m.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ padding: '10px 0' }}>
                    <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.4, color: '#94a3b8', marginBottom: 6 }}>
                      Indicators ({tInd.length})
                    </div>
                    {tInd.length === 0 ? (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No indicators linked yet.</div>
                    ) : (
                      tInd.map(i => {
                        const ipc = progressColor(i.progress);
                        return (
                          <div
                            key={i.id}
                            onClick={() => onOpen('indicator', i.id)}
                            title="View indicator details"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', marginLeft: -8, marginRight: -8, borderRadius: 6, cursor: 'pointer', borderBottom: '1px solid #f8fafc', fontSize: '0.72rem' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ flex: 1, color: '#475569' }}>{i.name}</span>
                            <b style={{ color: ipc.color }}>{i.progress}%</b>
                            <i className="fa-solid fa-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.6rem' }} />
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => {
                      navigate(`/targets?expand=${t.id}`);
                      onClose();
                    }}
                    style={{ marginTop: 10, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: NAVY, color: '#fff', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <i className="fa-solid fa-up-right-from-square" />
                    Open on Targets page
                  </button>
                </>
              );
            })()
          ) : (
            (() => {
              const i = entity.data as Indicator;
              return (
                <>
                  <DField label="Definition" value={i.definition} />
                  <DField label="Belongs to" value={
                    i.nbsap_target_id != null ? (
                      <span
                        onClick={() => onOpen('target', i.nbsap_target_id)}
                        style={{ color: UNBLUE, cursor: 'pointer', fontWeight: 600 }}
                      >
                        {i.nbsap_target ?? `Target ${i.nbsap_target_id}`} <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.6rem' }} />
                      </span>
                    ) : undefined
                  } />
                  <DField label="Tier" value={i.tier} />
                  <DField label="KM-GBF alignment" value={i.km_gbf} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <DField label="Baseline" value={i.baseline} />
                    <DField label="Current value" value={i.current_value} />
                    <DField label="Mid-term" value={i.midterm} />
                    <DField label="Final target" value={i.final_target} />
                    <DField label="2030 target" value={i.target_2030} />
                    <DField label="Periodicity" value={i.periodicity} />
                  </div>
                  <DField label="Data source" value={i.data_source} />
                  <DChips label="Responsible" items={i.responsible} />
                  <button
                    onClick={() => {
                      navigate(i.nbsap_target_id != null ? `/indicators?target=${i.nbsap_target_id}` : '/indicators');
                      onClose();
                    }}
                    style={{ marginTop: 14, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: NAVY, color: '#fff', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <i className="fa-solid fa-up-right-from-square" />
                    Open on Indicators page
                  </button>
                </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function DashboardPageRedesign() {
  const navigate = useNavigate();
  const { stats, loading, refetch: refetchStats } = useDashboardStats(false);
  const { reports, refetch: refetchReports } = useReports({ status: 'approved', pageSize: 6 });
  const [systemMetrics, setSystemMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [targets, setTargets] = useState<NBSAPTarget[]>([]);
  const [activeMetric, setActiveMetric] = useState<MetricKey>(null);
  const [entity, setEntity] = useState<Entity | null>(null);
  const { data: districts } = useDistricts();

  useEffect(() => {
    fetchIndicators({ pageSize: 200 }).then(setIndicators);
    fetchTargets().then(setTargets);
  }, []);

  const loadSystemMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      setSystemMetrics(await fetchDashboardMetrics());
    } catch (error) {
      console.error('Failed to load system metrics:', error);
      toast.error('Failed to load automated metrics');
    }
    setMetricsLoading(false);
  }, []);

  useEffect(() => {
    loadSystemMetrics();
  }, [loadSystemMetrics]);

  const refreshAll = useCallback(() => {
    refetchStats();
    refetchReports();
    loadSystemMetrics();
    fetchTargets().then(setTargets);
    fetchIndicators({ pageSize: 200 }).then(setIndicators);
  }, [refetchStats, refetchReports, loadSystemMetrics]);

  useEffect(() => {
    return eventBus.on('dashboard-refresh', refreshAll);
  }, [refreshAll]);

  const onOpen = useCallback<OpenFn>(
    (kind, id) => {
      if (kind === 'target') {
        const t = targets.find(x => x.id === id);
        if (t) setEntity({ type: 'target', data: t });
      } else {
        const i = indicators.find(x => x.id === id);
        if (i) setEntity({ type: 'indicator', data: i });
      }
    },
    [targets, indicators]
  );

  if (loading) return <DashboardSkeleton />;

  const s = stats;
  const m = systemMetrics;

  const forestHa = m?.totalForestHa || 0 || s?.forestHa || 0;
  const wetlandHa = m?.totalWetlandHa || 0 || s?.wetlandHa || 0;
  const financeVal = m?.financeUtilizedMillionRwf || 0 || (s?.financeAllocated ? s.financeAllocated / 1e6 : 0);
  const hwcVal = m?.totalHwcIncidents || 0 || s?.hwcIncidents || 0;
  const eiaVal = m?.eiaCompliancePercentage || 0;

  const metricItems =
    m || s
      ? [
          { label: 'Forest Restored', val: formatMetricValue(forestHa, 'hectares'), color: '#10b981', icon: 'fa-tree', key: 'forest' as MetricKey },
          { label: 'Wetland Restored', val: formatMetricValue(wetlandHa, 'hectares'), color: '#0891b2', icon: 'fa-water', key: 'wetland' as MetricKey },
          { label: 'Finance Utilized', val: `${financeVal.toFixed(1)}M RWF`, color: '#059669', icon: 'fa-coins', key: 'finance' as MetricKey },
          { label: 'HWC Incidents', val: String(hwcVal), color: '#f59e0b', icon: 'fa-paw', key: 'hwc' as MetricKey },
          { label: 'EIA Compliance', val: `${eiaVal.toFixed(0)}%`, color: progressColor(eiaVal).color, icon: 'fa-clipboard-check', key: 'eia' as MetricKey },
          { label: 'Districts Reporting', val: '30/30', color: '#6366f1', icon: 'fa-map-location-dot', key: 'districts' as MetricKey },
        ]
      : null;

  return (
    <div>
      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      {s && <ExecSummaryUN avgProgress={s.avgProgress} targets={targets} indicators={indicators} onOpen={onOpen} />}

      {/* ═══ KEY NATIONAL METRICS ═══ */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={cardHead}>
          <div style={cardTitle}>Key national metrics</div>
          <div style={cardSub}>Click any metric for district-level breakdown</div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {metricsLoading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
          ) : metricItems ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {metricItems.map(item => (
                <div
                  key={item.label}
                  onClick={() => setActiveMetric(item.key)}
                  style={{ padding: '12px 13px', borderRadius: 10, border: '1px solid #eef2f6', borderTop: `3px solid ${NAVY}`, background: '#fff', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.borderTopColor = item.color;
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#eef2f6';
                    e.currentTarget.style.borderTopColor = NAVY;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${item.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`fa-solid ${item.icon}`} style={{ color: item.color, fontSize: '0.85rem' }} />
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500, marginTop: 8 }}>{item.label}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginTop: 3, lineHeight: 1.1 }}>{item.val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No metrics available</div>
          )}
        </div>
      </div>

      {/* ═══ GOAL HIERARCHY ═══ */}
      <GoalHierarchyUN targets={targets} indicators={indicators} onOpen={onOpen} />

      {/* ═══ MILESTONE TRACKER ═══ */}
      <MilestoneTrackerUN targets={targets} onOpen={onOpen} />

      {/* ═══ ATTENTION + RECENT ACTIVITY ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <AttentionPanelUN targets={targets} indicators={indicators} onOpen={onOpen} />

        <div style={card}>
          <div style={cardHead}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={cardTitle}>Recent activity</div>
              {(s?.pendingVerifications ?? 0) > 0 && (
                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: '#fef3c7', color: '#d97706' }}>
                  {s?.pendingVerifications} pending review
                </span>
              )}
            </div>
          </div>
          <div style={{ padding: '8px 20px', maxHeight: 420, overflowY: 'auto' }}>
            {reports.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: '1.6rem', display: 'block', marginBottom: 10, opacity: 0.4 }} />
                No approved submissions yet
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.78rem' }}>
                    <i className="fa-solid fa-check" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{r.tool_name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
                      Approved · {new Date(r.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══ PROVENANCE FOOTER ═══ */}
      <div style={{ padding: '11px 15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ fontSize: '0.6rem', color: '#94a3b8', lineHeight: 1.6, flex: 1, minWidth: 260 }}>
          Sources: REMA NBSAP Monitoring System · RBIS · GBIF. Prepared in alignment with the Convention on Biological Diversity (CBD) and the Kunming-Montreal Global Biodiversity Framework.
        </div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: '0.6rem', color: '#64748b' }}>
          <i className="fa-solid fa-lock" />
          Official · for national decision-makers
        </div>
      </div>

      {/* ═══ DETAIL SLIDE-OUT ═══ */}
      {entity && (
        <EntityDetailPanel entity={entity} indicators={indicators} onOpen={onOpen} onClose={() => setEntity(null)} navigate={to => navigate(to)} />
      )}

      {/* ═══ METRIC SLIDE-OUT ═══ */}
      {activeMetric && (
        <MetricDetailPanel
          metricKey={activeMetric}
          metrics={systemMetrics}
          stats={s}
          districts={(districts as any[]) ?? []}
          targets={targets}
          onClose={() => setActiveMetric(null)}
        />
      )}
    </div>
  );
}
