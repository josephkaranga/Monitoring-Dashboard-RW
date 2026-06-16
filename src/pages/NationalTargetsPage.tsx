import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAsync, useIndicators } from '../hooks/useData';
import { useLiveTargetProgress } from '../hooks/useLiveTargetProgress';
import { fetchTargets } from '../services/dataService';
import { eventBus } from '../services/eventBus';
import { progressColor, progressHex } from '../utils/progressColors';
import type { NBSAPTarget, Indicator, IndicatorTier } from '../types/index';

const GOAL_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  A: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: 'Goal A' },
  B: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', label: 'Goal B' },
  C: { bg: '#fef9c3', text: '#854d0e', border: '#fde68a', label: 'Goal C' },
  D: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', label: 'Goal D' },
};

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export default function NationalTargetsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: rawTargets } = useAsync(fetchTargets, []);
  const baseTargets: NBSAPTarget[] = (rawTargets as NBSAPTarget[] | null) ?? [];
  const targets = useLiveTargetProgress(baseTargets);
  const { data: rawIndicators, refetch: refetchIndicators } = useIndicators() as { data: Indicator[] | null; loading: boolean; error: string | null; refetch: () => void };
  const indicators: Indicator[] = rawIndicators ?? [];
  const [goalFilter, setGoalFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  // Refresh linked indicators whenever a target's progress is updated automatically
  useEffect(() => {
    return eventBus.on('national-targets-refresh', () => {
      refetchIndicators();
    });
  }, [refetchIndicators]);

  // Auto-expand target from URL param ?expand=N
  useEffect(() => {
    const expandId = searchParams.get('expand');
    if (expandId) {
      const id = parseInt(expandId);
      if (!isNaN(id)) {
        setExpandedIds(prev => new Set([...prev, id]));
        // Scroll to it after render
        setTimeout(() => {
          const el = document.getElementById(`target-card-${id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [searchParams]);

  const filtered = useMemo(() => targets.filter(t => {
    if (goalFilter !== 'all' && t.goal !== goalFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    }
    return true;
  }), [targets, goalFilter, search]);

  const toggleTarget = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) { setExpandedIds(new Set()); setAllExpanded(false); }
    else { setExpandedIds(new Set(targets.map(t => t.id))); setAllExpanded(true); }
  };

  const goalCounts = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    targets.forEach(t => { if (c[t.goal] !== undefined) c[t.goal]++; });
    return c;
  }, [targets]);

  // Indicator summary counts
  const indicatorSummary = useMemo(() => {
    const c: Record<string, number> = { headline: 0, component: 0, binary: 0 };
    indicators.forEach(i => { if (c[i.tier] !== undefined) c[i.tier]++; });
    return c;
  }, [indicators]);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 'var(--radius)', padding: 16, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 4 }}>Total Targets</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{targets.length || 22}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 4 }}>NBSAP 2020–2030</div>
          <i className="fa-solid fa-bullseye" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }} />
        </div>
        {[
          { goal: 'A', label: 'Goal A · Reduce Threats', sub: 'Targets 1–4', icon: 'fa-shield-halved', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
          { goal: 'B', label: 'Goal B · Meet Needs',    sub: 'Targets 5–8', icon: 'fa-leaf',          gradient: 'linear-gradient(135deg,#0284c7,#38bdf8)' },
          { goal: 'C', label: 'Goal C · Tools',         sub: 'Targets 9–12', icon: 'fa-seedling',     gradient: 'linear-gradient(135deg,#d97706,#f59e0b)' },
          { goal: 'D', label: 'Goal D · Means',         sub: 'Targets 13–22', icon: 'fa-gears',       gradient: 'linear-gradient(135deg,#4338ca,#6366f1)' },
        ].map(g => (
          <div key={g.goal} style={{ background: g.gradient, borderRadius: 'var(--radius)', padding: 16, color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => setGoalFilter(f => f === g.goal ? 'all' : g.goal)}>
            <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 4 }}>{g.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{goalCounts[g.goal] || 0}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 4 }}>{g.sub}</div>
            <i className={`fa-solid ${g.icon}`} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }} />
          </div>
        ))}
      </div>

      {/* GBF alignment */}
      <div style={{ ...card, padding: 16, marginBottom: 16, borderLeft: '4px solid var(--sky-dim)' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-info-circle" style={{ color: 'var(--sky-dim)' }} />
          Kunming-Montreal GBF Goal Alignment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: '0.77rem' }}>
          {[
            { bg: '#dcfce7', color: '#166534', label: 'Goal A', desc: 'Reduce threats to biodiversity · Targets 1–4' },
            { bg: '#e0f2fe', color: '#0369a1', label: 'Goal B', desc: "Meet people's needs through sustainable use · Targets 5–8" },
            { bg: '#fef9c3', color: '#854d0e', label: 'Goal C', desc: 'Tools and solutions for implementation · Targets 9–12' },
            { bg: '#f3e8ff', color: '#6b21a8', label: 'Goal D', desc: 'Means of implementation & mainstreaming · Targets 13–22' },
          ].map(g => (
            <div key={g.label} style={{ background: g.bg, borderRadius: 8, padding: 10 }}>
              <span style={{ fontWeight: 700, color: g.color }}>{g.label}</span>
              <p style={{ color: g.color, marginTop: 3 }}>{g.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Indicator Summary Bar */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
        <i className="fa-solid fa-layer-group" style={{ color: 'var(--sky-dim)', fontSize: '0.85rem', marginRight: 4 }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginRight: 8 }}>Indicator Framework:</span>
        {([
          { tier: 'headline',  label: 'Headline',  bg: '#dcfce7', color: '#166534' },
          { tier: 'component', label: 'Component', bg: '#dbeafe', color: '#1e40af' },
          { tier: 'binary',    label: 'Binary',    bg: '#fef9c3', color: '#854d0e' },
        ]).map(({ tier, label, bg, color }) => (
          <span key={tier} style={{ background: bg, color, fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, fontFamily: "'DM Mono', monospace" }}>
            {label}: {indicatorSummary[tier]}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
          Total: {indicators.length}
        </span>
      </div>

      {/* Filter bar */}
      <div style={{ ...card, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.8rem' }} />
          <input type="text" placeholder="Search targets or indicators…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid var(--border)', borderRadius: 9, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All Goals'],['A','Goal A'],['B','Goal B'],['C','Goal C'],['D','Goal D']].map(([val, lbl]) => (
            <button key={val} onClick={() => setGoalFilter(val)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: goalFilter === val ? 'var(--navy)' : 'var(--surface)', color: goalFilter === val ? '#fff' : 'var(--text-2)', transition: '0.2s' }}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={toggleAll} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ ...card, padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No targets match your filters.</p>
          </div>
        ) : filtered.map(t => {
          const gc = GOAL_COLORS[t.goal] || GOAL_COLORS.A;
          const open = expandedIds.has(t.id) || allExpanded;
          const pc = progressColor(t.progress);
          const progColor = pc.color;
          return (
            <div key={t.id} id={`target-card-${t.id}`} style={{ ...card, overflow: 'hidden' }}>
              {/* Header */}
              <div onClick={() => toggleTarget(t.id)}
                style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: '0.15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: gc.bg, color: gc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>
                  {t.id}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text-1)' }}>{t.title}</span>
                    <span style={{ fontSize: '0.63rem', padding: '2px 8px', borderRadius: 10, background: gc.bg, color: gc.text, fontWeight: 700, fontFamily: "'DM Mono', monospace", border: `1px solid ${gc.border}` }}>{gc.label}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 500 }}>
                    {t.description?.substring(0, 110)}…
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginBottom: 3 }}>Progress</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${t.progress}%`, background: progColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progColor }}>{t.progress}%</span>
                    </div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: pc.color, background: pc.bg, border: `1px solid ${pc.border}`, padding: '1px 6px', borderRadius: 6, marginTop: 3, display: 'inline-block', fontFamily: "'DM Mono', monospace" }}>{pc.label}</span>
                  </div>
                  <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--text-3)', fontSize: '0.75rem' }} />
                </div>
              </div>

              {/* Body */}
              {open && (
                <div style={{ borderTop: '1px solid var(--border)', padding: 18, background: 'var(--surface-2)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Full Target Statement</div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{t.description}</p>
                    </div>
                    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Baseline / Current Status</div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{t.baseline || '—'}</p>
                    </div>
                  </div>
                  {/* Timeline & Milestones */}
                  {t.timeline_milestones && (
                    <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#166534', marginBottom: 8, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fa-solid fa-calendar-days" style={{ fontSize: '0.7rem' }} /> Timeline &amp; Milestones
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {t.timeline_milestones.split(';').map((phase, idx) => {
                          const trimmed = phase.trim();
                          if (!trimmed) return null;
                          const colonIdx = trimmed.indexOf(':');
                          const year  = colonIdx > -1 ? trimmed.slice(0, colonIdx).trim() : '';
                          const desc  = colonIdx > -1 ? trimmed.slice(colonIdx + 1).trim() : trimmed;
                          return (
                            <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                              {year && (
                                <span style={{ background: '#16a34a', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6, fontFamily: "'DM Mono', monospace", flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>{year}</span>
                              )}
                              <span style={{ fontSize: '0.78rem', color: '#166534', lineHeight: 1.5 }}>{desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Progress bar */}
                  <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 12, padding: 16, color: '#fff', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Progress toward 2030</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: pc.bg, color: pc.color, fontFamily: "'DM Mono', monospace" }}>{pc.label}</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: progColor }}>{t.progress}%</span>
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                      <div style={{ background: progColor, width: `${t.progress}%`, height: '100%', borderRadius: 6, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                  {/* Indicator Framework — from DB */}
                  {(t.headline_indicator || (t.component_indicators?.length ?? 0) > 0) && (
                    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fa-solid fa-layer-group" style={{ color: 'var(--sky-dim)' }} /> Indicator Framework
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {t.headline_indicator && (
                          <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#166534', marginBottom: 4, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fa-solid fa-star" style={{ fontSize: '0.55rem' }} /> HEADLINE
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>{t.headline_indicator}</p>
                          </div>
                        )}
                        {(t.component_indicators?.length ?? 0) > 0 && (
                          <div style={{ background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1e40af', marginBottom: 6, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fa-solid fa-puzzle-piece" style={{ fontSize: '0.55rem' }} /> COMPONENT
                            </div>
                            {t.component_indicators!.map((c, idx) => (
                              <div key={idx} style={{ fontSize: '0.76rem', color: '#1e40af', marginBottom: 3, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ flexShrink: 0, marginTop: 2 }}>·</span><span style={{ lineHeight: 1.4 }}>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(t.complementary_indicators?.length ?? 0) > 0 && (
                          <div style={{ background: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6b21a8', marginBottom: 6, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="fa-solid fa-circle-info" style={{ fontSize: '0.55rem' }} /> COMPLEMENTARY
                            </div>
                            {t.complementary_indicators!.map((c, idx) => (
                              <div key={idx} style={{ fontSize: '0.76rem', color: '#6b21a8', marginBottom: 3, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ flexShrink: 0, marginTop: 2 }}>·</span><span style={{ lineHeight: 1.4 }}>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Key Strategic Actions — from DB */}
                  {(t.strategic_actions?.length ?? 0) > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fa-solid fa-list-check" style={{ color: 'var(--sky-dim)' }} /> Key Strategic Actions
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {t.strategic_actions!.map((action, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem', color: 'var(--text-2)' }}>
                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-3)', flexShrink: 0, marginTop: 1, fontFamily: "'DM Mono', monospace" }}>{idx + 1}</span>
                            <span style={{ lineHeight: 1.5 }}>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Live Linked Indicators from DB */}
                  {(() => {
                    const linked = indicators.filter(i => i.nbsap_target_id === t.id);
                    if (!linked.length) return null;
                    const byTier: Record<IndicatorTier, Indicator[]> = { headline: [], component: [], complementary: [], binary: [] };
                    linked.forEach(i => { if (byTier[i.tier as IndicatorTier]) byTier[i.tier as IndicatorTier].push(i); });
                    const TIER_STYLE: Record<IndicatorTier, { bg: string; color: string; border: string; icon: string }> = {
                      headline:      { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', icon: 'fa-star' },
                      component:     { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', icon: 'fa-puzzle-piece' },
                      complementary: { bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff', icon: 'fa-circle-info' },
                      binary:        { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', icon: 'fa-toggle-on' },
                    };
                    return (
                      <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 14, marginTop: 12 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10, fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="fa-solid fa-layer-group" style={{ color: 'var(--sky-dim)' }} />
                            Live Linked Indicators
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 7px', borderRadius: 8, fontWeight: 700 }}>{linked.length} total</span>
                          </span>
                          <button onClick={() => navigate(`/indicators?goal=${t.goal}&target=${t.id}`)}
                            style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--sky-dim)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="fa-solid fa-arrow-right" /> View All in Hierarchy
                          </button>
                        </div>
                        {(Object.entries(byTier) as [IndicatorTier, Indicator[]][]).filter(([, arr]) => arr.length > 0).map(([tier, inds]) => {
                          const ts = TIER_STYLE[tier];
                          return (
                            <div key={tier} style={{ marginBottom: 10 }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: ts.bg, color: ts.color, fontSize: '0.62rem', fontWeight: 700, padding: '2px 9px', borderRadius: 8, fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>
                                <i className={`fa-solid ${ts.icon}`} style={{ fontSize: '0.58rem' }} />
                                {tier.toUpperCase()} ({inds.length})
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 7 }}>
                                {inds.map(ind => {
                                  const ipc = progressColor(ind.progress);
                                  return (
                                    <div key={ind.id} onClick={() => navigate(`/indicators?target=${t.id}`)}
                                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px', cursor: 'pointer', transition: '0.15s' }}
                                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)')}
                                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}>
                                      <div style={{ fontSize: '0.77rem', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.35, marginBottom: 5 }}>{ind.name}</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                                          <div style={{ height: '100%', width: `${ind.progress}%`, background: ipc.color, borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ipc.color, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{ind.progress}%</span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.64rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>{ind.periodicity}</span>
                                        <span style={{ fontSize: '0.62rem', padding: '1px 7px', borderRadius: 8, background: ipc.bg, color: ipc.color, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{ipc.label}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Navigation buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                    <button onClick={() => navigate(`/indicators?goal=${t.goal}&target=${t.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      <i className="fa-solid fa-layer-group" /> View in Indicator Hierarchy
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
