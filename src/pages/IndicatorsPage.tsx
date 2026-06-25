import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIndicators } from '../hooks/useData';
import { writeAuditEntry } from '../services/dataService';
import { TableRowSkeleton } from '../components/Skeleton';
import { progressColor } from '../utils/progressColors';
import type { Indicator, IndicatorTier, IndicatorStatus } from '../types/index';

// ── Goal config ───────────────────────────────────────────────
const GOAL_CFG = {
  A: { label: 'Goal A · Reduce Threats',    sub: 'Targets 1–4',   bg: '#dcfce7', text: '#166534', border: '#bbf7d0', targets: [1,2,3,4] },
  B: { label: 'Goal B · Meet Needs',         sub: 'Targets 5–8',   bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', targets: [5,6,7,8] },
  C: { label: 'Goal C · Tools & Solutions',  sub: 'Targets 9–12',  bg: '#fef9c3', text: '#854d0e', border: '#fde68a', targets: [9,10,11,12] },
  D: { label: 'Goal D · Means of Impl.',     sub: 'Targets 13–22', bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', targets: [13,14,15,16,17,18,19,20,21,22] },
} as const;

type GBFGoalKey = keyof typeof GOAL_CFG;

function targetToGoal(targetId: number): GBFGoalKey {
  if (targetId <= 4) return 'A';
  if (targetId <= 8) return 'B';
  if (targetId <= 12) return 'C';
  return 'D';
}

// Sample indicator names per tier for the tier panel
const TIER_SAMPLES: Record<IndicatorTier, string[]> = {
  headline:      ['% of land/water under biodiversity-inclusive spatial plans', 'Area (ha) of degraded land under restoration', 'Coverage of PAs and OECMs (% of land/sea)'],
  component:     ['% of spatial plans utilising KBA information', 'Areas of degraded wetland ecosystems restored', 'Area (ha) of Key Biodiversity Areas effectively conserved'],
  complementary: ['Population density in biodiversity-sensitive areas', 'Socioeconomic drivers of land-use change', 'Governance quality index for protected areas'],
  binary:        ['National legislation for IAS adopted (Y/N)', 'National biodiversity finance plan in place (Y/N)', 'NBSAP submitted to CBD Secretariat (Y/N)'],
};

const TIER_CFG: Record<IndicatorTier, { label: string; color: string; bg: string; border: string; icon: string; faIcon: string }> = {
  headline:      { label: 'Headline',      color: '#166534', bg: '#dcfce7', border: '#bbf7d0', icon: '⭐', faIcon: 'fa-star' },
  component:     { label: 'Component',     color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe', icon: '🧩', faIcon: 'fa-puzzle-piece' },
  complementary: { label: 'Complementary', color: '#6b21a8', bg: '#f3e8ff', border: '#e9d5ff', icon: 'ℹ️', faIcon: 'fa-circle-info' },
  binary:        { label: 'Binary',        color: '#854d0e', bg: '#fef9c3', border: '#fde68a', icon: '🔀', faIcon: 'fa-toggle-on' },
};

const STATUS_CFG: Record<IndicatorStatus, { color: string; bg: string; border: string; label: string }> = {
  'on-track': { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', label: '▲ On Track' },
  'at-risk':  { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: '⚠ At Risk'  },
  'behind':   { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', label: '▼ Behind'   },
};

// ── Modal ─────────────────────────────────────────────────────
function IndicatorModal({ indicator: i, onClose, onViewTarget }: { indicator: Indicator; onClose: () => void; onViewTarget: (targetId: number) => void }) {
  const tier = TIER_CFG[i.tier];
  const status = STATUS_CFG[i.status];
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,39,68,0.6)', backdropFilter: 'blur(6px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, flex: 1, paddingRight: 16 }}>#{String(i.id).padStart(3,'0')} — {i.name}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <span style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.border}`, fontSize: '0.62rem', padding: '2px 10px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className={`fa-solid ${tier.faIcon}`} style={{ fontSize: '0.58rem' }} /> {tier.label.toUpperCase()}
            </span>
            <span style={{ background: status.bg, color: status.color, fontSize: '0.62rem', padding: '2px 10px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{status.label}</span>
          </div>
          {/* Progress */}
          {(() => {
            const mpc = progressColor(i.progress);
            return (
            <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 12, padding: 18, color: '#fff', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Progress toward 2030 target</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: mpc.bg, color: mpc.color, fontFamily: "'DM Mono', monospace" }}>{mpc.label}</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: mpc.color }}>{i.progress}%</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                <div style={{ background: mpc.color, width: `${i.progress}%`, height: '100%', borderRadius: 6, transition: 'width 1s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', opacity: 0.75 }}>
                <span>Current: <strong style={{ color: '#fff' }}>{i.current_value}</strong></span>
                <span>Target: <strong style={{ color: '#fff' }}>{i.final_target || i.target_2030}</strong></span>
              </div>
            </div>
            );
          })()}
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[['Definition', i.definition], ['Target 2030', i.target_2030], ['Baseline (2020)', i.baseline], ['Midterm 2027', i.midterm]].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{value || '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 14, fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 12 }}>
            <strong>Data Source:</strong> {i.data_source}<br />
            <strong>Frequency:</strong> {i.periodicity} &nbsp;·&nbsp; <strong>KM-GBF:</strong> {i.km_gbf}
          </div>
          {i.responsible?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {i.responsible.map(org => (
                <span key={org} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', padding: '2px 9px', borderRadius: 10, fontWeight: 600 }}>{org}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button onClick={() => { onClose(); onViewTarget(i.nbsap_target_id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: 'var(--navy)', color: '#fff', border: 'none', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              <i className="fa-solid fa-bullseye" /> View Target {i.nbsap_target_id}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function IndicatorsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tierFilter, setTierFilter] = useState('all');
  const [goalFilter, setGoalFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Indicator | null>(null);
  const [groupByTarget, setGroupByTarget] = useState(false);

  // Read URL params for cross-page navigation
  useEffect(() => {
    const goal = searchParams.get('goal');
    const target = searchParams.get('target');
    if (goal) setGoalFilter(goal);
    if (target) {
      setGroupByTarget(true);
      setTimeout(() => {
        const el = document.getElementById(`group-target-${target}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [searchParams]);

  // Always fetch all indicators so goal breakdown counts are accurate
  const { data: rawIndicators, loading } = useIndicators() as { data: Indicator[] | null; loading: boolean; error: string | null; refetch: () => void };
  const indicators: Indicator[] = rawIndicators ?? [];

  const filtered = useMemo(() => {
    return indicators.filter(i => {
      if (tierFilter !== 'all' && i.tier !== tierFilter) return false;
      if (goalFilter) {
        const g = targetToGoal(i.nbsap_target_id);
        if (g !== goalFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !i.definition?.toLowerCase().includes(q) && !i.responsible?.some(r => r.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [indicators, tierFilter, goalFilter, search]);

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {};
    indicators.forEach(i => { c[i.tier] = (c[i.tier] || 0) + 1; });
    return c;
  }, [indicators]);

  // Goal breakdown: counts per goal per tier
  const goalBreakdown = useMemo(() => {
    const result: Record<GBFGoalKey, Record<IndicatorTier, number>> = {
      A: { headline: 0, component: 0, complementary: 0, binary: 0 },
      B: { headline: 0, component: 0, complementary: 0, binary: 0 },
      C: { headline: 0, component: 0, complementary: 0, binary: 0 },
      D: { headline: 0, component: 0, complementary: 0, binary: 0 },
    };
    indicators.forEach(i => {
      const g = targetToGoal(i.nbsap_target_id);
      result[g][i.tier as IndicatorTier]++;
    });
    return result;
  }, [indicators]);

  const grouped = useMemo(() => {
    if (!groupByTarget) return null;
    const map: Record<string, Indicator[]> = {};
    filtered.forEach(i => { const k = `Target ${i.nbsap_target_id}`; if (!map[k]) map[k] = []; map[k].push(i); });
    return Object.entries(map).sort((a, b) => parseInt(a[0].replace('Target ','')) - parseInt(b[0].replace('Target ','')));
  }, [filtered, groupByTarget]);

  const handleOpen = useCallback(async (ind: Indicator) => {
    setSelected(ind);
    await writeAuditEntry('view', `Viewed indicator: ${ind.name}`, `ID: ${ind.id}`);
  }, []);

  const jumpToTarget = useCallback((targetId: number) => {
    navigate(`/targets?expand=${targetId}`);
  }, [navigate]);

  return (
    <div>
      {selected && <IndicatorModal indicator={selected} onClose={() => setSelected(null)} onViewTarget={(id) => { setSelected(null); navigate(`/targets?expand=${id}`); }} />}

      {/* Tier stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 'var(--radius)', padding: 16, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.72rem', opacity: 0.8, marginBottom: 4 }}>Total Indicators</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{indicators.length}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 4 }}>NBSAP 2025–2030</div>
          <i className="fa-solid fa-layer-group" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }} />
        </div>
        {(Object.entries(TIER_CFG) as [IndicatorTier, typeof TIER_CFG[IndicatorTier]][]).map(([key, cfg]) => (
          <div key={key} onClick={() => setTierFilter(t => t === key ? 'all' : key)}
            style={{ background: tierFilter === key ? cfg.bg : 'var(--surface)', border: `1px solid ${tierFilter === key ? cfg.border : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 16, cursor: 'pointer', transition: '0.2s', borderLeft: `4px solid ${cfg.color}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 600, marginBottom: 4 }}>{cfg.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: cfg.color }}>{tierCounts[key] || 0}</div>
            <div style={{ fontSize: '0.65rem', color: cfg.color, opacity: 0.7, marginTop: 2 }}>indicators</div>
            <i className={`fa-solid ${cfg.faIcon}`} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.15, color: cfg.color }} />
          </div>
        ))}
      </div>

      {/* KM-GBF tier panel */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, marginBottom: 16, borderLeft: '4px solid var(--sky-dim)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-layer-group" style={{ color: 'var(--sky-dim)' }} />
          KM-GBF Aligned 4-Tier Indicator Hierarchy
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#e0f2fe', color: '#0369a1' }}>Rwanda NBSAP 2020H–2030</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {(Object.entries(TIER_CFG) as [IndicatorTier, typeof TIER_CFG[IndicatorTier]][]).map(([key, cfg]) => {
            const tierKey = key as IndicatorTier;
            const TIER_DESCRIPTIONS: Record<IndicatorTier, string> = {
              headline:      'High-level metrics tracking overall progress toward each GBF target. One primary headline indicator per national target. Required for CBD national reporting.',
              component:     'Detailed metrics providing nuanced information on specific aspects of target implementation. 2–4 per target, supporting evidence-based adaptive management.',
              complementary: 'Contextual metrics that support interpretation of headline and component indicators, including socioeconomic variables influencing biodiversity outcomes.',
              binary:        'Yes/no assessments of whether specific policy or legal conditions have been met (e.g., whether national legislation for IAS is adopted).',
            };
            return (
              <div key={key} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 28, height: 28, background: `${cfg.color}22`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`fa-solid ${cfg.faIcon}`} style={{ color: cfg.color, fontSize: '0.75rem' }} />
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color, fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>{cfg.label.toUpperCase()}</span>
                  <span style={{ marginLeft: 'auto', background: cfg.color, color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '1px 7px', borderRadius: 8, fontFamily: "'DM Mono', monospace" }}>{tierCounts[key] || 0}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: cfg.color, lineHeight: 1.5, margin: 0, opacity: 0.85 }}>{TIER_DESCRIPTIONS[tierKey]}</p>
                <div style={{ borderTop: `1px solid ${cfg.border}`, paddingTop: 8 }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: cfg.color, opacity: 0.7, marginBottom: 4, fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}>EXAMPLES</div>
                  {TIER_SAMPLES[tierKey].map((s, idx) => (
                    <div key={idx} style={{ fontSize: '0.68rem', color: cfg.color, opacity: 0.8, marginBottom: 3, display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, marginTop: 1 }}>·</span><span style={{ lineHeight: 1.4 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goal Coverage Breakdown */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: 18, marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fa-solid fa-chart-pie" style={{ color: 'var(--sky-dim)' }} />
          Goal Coverage Breakdown
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>Indicators by GBF Goal</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {(Object.entries(GOAL_CFG) as [GBFGoalKey, typeof GOAL_CFG[GBFGoalKey]][]).map(([gKey, gcfg]) => {
            const bd = goalBreakdown[gKey];
            const total = bd.headline + bd.component + bd.complementary + bd.binary;
            return (
              <div key={gKey} style={{ background: gcfg.bg, border: `1px solid ${gcfg.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: gcfg.text, marginBottom: 2 }}>{gcfg.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: gcfg.text, fontFamily: "'Playfair Display', serif", lineHeight: 1.2 }}>{total}</div>
                <div style={{ fontSize: '0.68rem', color: gcfg.text, opacity: 0.75, marginBottom: 10 }}>indicators · {gcfg.sub}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(['headline', 'component', 'complementary', 'binary'] as IndicatorTier[]).map(tier => (
                    <div key={tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                      <span style={{ color: gcfg.text, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: gcfg.text, display: 'inline-block', opacity: 0.7 }} />
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </span>
                      <span style={{ fontWeight: 700, color: gcfg.text, fontFamily: "'DM Mono', monospace" }}>{bd[tier]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: '0.8rem' }} />
          <input type="text" placeholder={`Search all ${indicators.length} indicators…`} value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid var(--border)', borderRadius: 9, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'], ['headline','Headline'], ['component','Component'], ['complementary','Complementary'], ['binary','Binary']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTierFilter(val)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: tierFilter === val ? 'var(--navy)' : 'var(--surface)', color: tierFilter === val ? '#fff' : 'var(--text-2)', transition: '0.2s' }}>
              {lbl}
            </button>
          ))}
        </div>
        <select
          id="indicator-goal-filter"
          value={goalFilter}
          onChange={e => setGoalFilter(e.target.value)}
          style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 9, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", background: goalFilter ? 'var(--navy)' : 'var(--surface)', color: goalFilter ? '#fff' : 'var(--text-2)', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Goals</option>
          <option value="A">Goal A — Reduce Threats</option>
          <option value="B">Goal B — Meet Needs</option>
          <option value="C">Goal C — Tools &amp; Solutions</option>
          <option value="D">Goal D — Means of Impl.</option>
        </select>
        <button onClick={() => setGroupByTarget(g => !g)}
          style={{ padding: '6px 13px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: groupByTarget ? 'var(--navy)' : 'var(--surface)', color: groupByTarget ? '#fff' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="fa-solid fa-sitemap" /> {groupByTarget ? 'Table View' : 'Group by Target'}
        </button>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginLeft: 'auto' }}>{filtered.length} of {indicators.length} indicators</span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700 }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--sky-dim)' }} />
            {filtered.length === indicators.length ? `All ${indicators.length} NBSAP Indicators` : `${filtered.length} indicators matching filters`}
          </div>
        </div>
        {loading ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  {['#','Indicator Name','Tier','NBSAP Target','Target 2030','Responsible','Progress'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5,6,7,8].map(i => <TableRowSkeleton key={i} cols={7} />)}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2rem', display: 'block', marginBottom: 10, opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No indicators match your filters.</p>
          </div>
        ) : groupByTarget && grouped ? (
          <div style={{ padding: 16 }}>
            {grouped.map(([targetKey, inds]) => (
              <div key={targetKey} style={{ marginBottom: 16 }}>
                <div id={`group-target-${targetKey.replace('Target ','')}`}
                  style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8, padding: '6px 10px', background: 'var(--surface-2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fa-solid fa-bullseye" style={{ color: 'var(--sky-dim)' }} /> {targetKey}
                  <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1e40af', padding: '1px 7px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{inds.length}</span>
                  <button onClick={() => navigate(`/targets?expand=${targetKey.replace('Target ','')}`)}
                    style={{ marginLeft: 'auto', fontSize: '0.68rem', padding: '2px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--sky-dim)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="fa-solid fa-arrow-up-right-from-square" /> View Target
                  </button>
                </div>
                {inds.map(ind => <IndicatorRow key={ind.id} indicator={ind} onClick={() => handleOpen(ind)} />)}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  {['#','Indicator Name','Tier','NBSAP Target','Target 2030','Responsible','Progress'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ind => {
                  const tier = TIER_CFG[ind.tier];
                  const status = STATUS_CFG[ind.status];
                  return (
                    <tr key={ind.id} onClick={() => handleOpen(ind)} style={{ borderBottom: '1px solid var(--surface-3)', cursor: 'pointer', transition: '0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }}>{String(ind.id).padStart(3,'0')}</td>
                      <td style={{ padding: '11px 14px', fontWeight: 600, maxWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.color, flexShrink: 0, marginTop: 4 }} />
                          <span style={{ lineHeight: 1.4 }}>{ind.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: tier.bg, color: tier.color, fontSize: '0.62rem', padding: '2px 8px', borderRadius: 9, fontWeight: 700, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <i className={`fa-solid ${tier.faIcon}`} style={{ fontSize: '0.55rem' }} /> {ind.tier}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                        <span onClick={e => { e.stopPropagation(); jumpToTarget(ind.nbsap_target_id); }}
                          style={{ cursor: 'pointer', color: 'var(--sky-dim)', fontWeight: 700, textDecoration: 'underline' }}
                          title={`View Target ${ind.nbsap_target_id}`}>
                          T{ind.nbsap_target_id}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-2)', fontSize: '0.75rem', maxWidth: 140, lineHeight: 1.4 }}>{ind.target_2030}</td>
                      <td style={{ padding: '11px 14px', maxWidth: 180 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {(ind.responsible || []).slice(0,2).map(r => (
                            <span key={r} style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.62rem', padding: '1px 6px', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>{r}</span>
                          ))}
                          {(ind.responsible || []).length > 2 && <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>+{ind.responsible.length - 2}</span>}
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 64, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ height: '100%', width: `${ind.progress}%`, background: status.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: status.color, fontFamily: "'DM Mono', monospace" }}>{ind.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function IndicatorRow({ indicator: ind, onClick }: { indicator: Indicator; onClick: () => void }) {
  const tier = TIER_CFG[ind.tier];
  const status = STATUS_CFG[ind.status];
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, marginBottom: 5, cursor: 'pointer', transition: '0.15s' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}>
      <span style={{ background: tier.bg, color: tier.color, fontSize: '0.58rem', padding: '1px 6px', borderRadius: 7, fontWeight: 700, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
        <i className={`fa-solid ${tier.faIcon}`} style={{ marginRight: 3, fontSize: '0.55rem' }} />{ind.tier}
      </span>
      <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600 }}>{ind.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${ind.progress}%`, background: status.color, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: status.color, width: 32, fontFamily: "'DM Mono', monospace" }}>{ind.progress}%</span>
        <span style={{ fontSize: '0.58rem', padding: '1px 6px', borderRadius: 7, background: status.bg, color: status.color, fontWeight: 700, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>{status.label}</span>
      </div>
    </div>
  );
}
