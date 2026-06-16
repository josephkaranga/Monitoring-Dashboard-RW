import React, { useState, useMemo } from 'react';
import { useAsync } from './useData';
import { fetchTargets } from './dataService';
import type { NBSAPTarget } from './index';

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
  const { data: rawTargets } = useAsync(fetchTargets, []);
  const targets: NBSAPTarget[] = (rawTargets as NBSAPTarget[] | null) ?? [];
  const [goalFilter, setGoalFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

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

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 'var(--radius)', padding: 16, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 4 }}>Total Targets</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{targets.length || 22}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 4 }}>NBSAP 2025–2030</div>
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
          const progColor = t.progress >= 60 ? '#10b981' : t.progress >= 35 ? '#f59e0b' : '#f43f5e';
          return (
            <div key={t.id} style={{ ...card, overflow: 'hidden' }}>
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
                        <div style={{ height: '100%', width: `${t.progress}%`, background: progColor, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progColor }}>{t.progress}%</span>
                    </div>
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
                  {/* Progress bar */}
                  <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 12, padding: 16, color: '#fff', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Progress toward 2030</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{t.progress}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                      <div style={{ background: '#38bdf8', width: `${t.progress}%`, height: '100%', borderRadius: 6, transition: 'width 1s ease' }} />
                    </div>
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
