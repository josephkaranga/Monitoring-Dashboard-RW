import React, { useEffect, useState, useMemo } from 'react';
import { useInstitutions } from '../hooks/useInstitutions';
import { fetchStrategicActions } from '../services/institutionService';
import { fetchTargets } from '../services/dataService';

const card: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-sm)',
};

interface StrategicAction {
  action: string;
  institutions: string[];
  dataSources: string[];
}

interface TargetMapping {
  id: number;
  goal: string;
  title: string;
  actions: StrategicAction[];
}

const MODULE_NAMES: Record<string, { name: string; color: string }> = {
  T01: { name: 'Institutional Reporting', color: '#1B6CA8' },
  T02: { name: 'District Monitoring', color: '#1E7D4B' },
  T03: { name: 'Protected Areas', color: '#5B3FA6' },
  T04: { name: 'Community Monitoring', color: '#B56A00' },
  T05: { name: 'Finance Tracking', color: '#0E6655' },
  T06: { name: 'Private Sector Compliance', color: '#922B21' },
  T07: { name: 'Research & Academic', color: '#1A5276' },
};

const goalColors: Record<string, { bg: string; color: string; accent: string }> = {
  A: { bg: '#f0fdf4', color: '#166534', accent: '#16a34a' },
  B: { bg: '#eff6ff', color: '#1e40af', accent: '#2563eb' },
  C: { bg: '#fffbeb', color: '#92400e', accent: '#d97706' },
  D: { bg: '#fdf2f8', color: '#be185d', accent: '#db2777' },
};

// Institutions and reporting modules come from the database (migration 039).
function getAllInstitutions(
  targets: TargetMapping[],
  modulesByCode: Map<string, string[]>
): {
  name: string;
  targetCount: number;
  targets: number[];
  modules: string[];
}[] {
  const map = new Map<string, Set<number>>();
  targets.forEach(t => {
    t.actions.forEach(a => {
      a.institutions.forEach(inst => {
        if (!map.has(inst)) map.set(inst, new Set());
        map.get(inst)!.add(t.id);
      });
    });
  });
  return Array.from(map.entries())
    .map(([name, tgts]) => ({
      name,
      targetCount: tgts.size,
      targets: Array.from(tgts).sort((a, b) => a - b),
      modules: modulesByCode.get(name) || [],
    }))
    .sort((a, b) => b.targetCount - a.targetCount);
}

export default function StakeholdersPage() {
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [expandedTargets, setExpandedTargets] = useState<Set<number>>(new Set([1]));
  const [view, setView] = useState<'targets' | 'institutions'>('targets');

  const { institutions } = useInstitutions();
  const [targetsData, setTargetsData] = useState<TargetMapping[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [targetRows, actions] = await Promise.all([fetchTargets(), fetchStrategicActions()]);
        if (cancelled) return;
        setTargetsData(
          targetRows.map(t => ({
            id: t.id,
            goal: String(t.goal),
            title: t.title,
            actions: actions
              .filter(a => a.target_id === t.id)
              .map(a => ({
                action: a.action,
                dataSources: a.data_sources,
                institutions: a.institutions.map(x => {
                  const inst = x.institution_id
                    ? institutions.find(i => i.id === x.institution_id)
                    : undefined;
                  return inst ? inst.code : x.label;
                }),
              })),
          }))
        );
        setLoadError(null);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
      if (!cancelled) setLoadingData(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [institutions]);

  const modulesByCode = useMemo(
    () => new Map(institutions.map(i => [i.code, i.tool_ids])),
    [institutions]
  );
  const allInstitutions = useMemo(
    () => getAllInstitutions(targetsData, modulesByCode),
    [targetsData, modulesByCode]
  );

  const filtered = useMemo(() => {
    return targetsData.filter(t => {
      if (goalFilter !== 'all' && t.goal !== goalFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      if (t.title.toLowerCase().includes(q)) return true;
      if (t.actions.some(a => a.action.toLowerCase().includes(q))) return true;
      if (t.actions.some(a => a.institutions.some(i => i.toLowerCase().includes(q)))) return true;
      return false;
    });
  }, [search, goalFilter, targetsData]);

  const filteredInstitutions = useMemo(() => {
    if (!search) return allInstitutions;
    const q = search.toLowerCase();
    return allInstitutions.filter(i => i.name.toLowerCase().includes(q));
  }, [search, allInstitutions]);

  const toggleTarget = (id: number) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loadingData) {
    return (
      <div style={{ ...card, padding: 24, color: 'var(--text-3)', fontSize: '0.85rem' }}>
        Loading the NBSAP institutional framework…
      </div>
    );
  }
  if (loadError) {
    return (
      <div style={{ ...card, padding: 24, color: '#b91c1c', fontSize: '0.85rem' }}>
        Could not load the institutional framework: {loadError}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ ...card, padding: '20px 24px', marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-1)' }}>
              NBSAP Stakeholder & Institutional Framework
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
              {allInstitutions.length} institutions across {targetsData.length} national targets ·
              Linked to reporting modules and data sources
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['targets', 'institutions'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  border: view === v ? '1px solid var(--sky-dim)' : '1px solid var(--border)',
                  background: view === v ? 'rgba(14,165,233,0.1)' : 'transparent',
                  color: view === v ? 'var(--sky-dim)' : 'var(--text-3)',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {v === 'targets' ? 'By Target' : 'By Institution'}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Goal filter */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search institutions, targets, or actions..."
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              fontSize: '0.78rem',
              fontFamily: "'DM Sans', sans-serif",
              outline: 'none',
              background: 'var(--surface-2)',
            }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'A', label: 'Goal A' },
              { key: 'B', label: 'Goal B' },
              { key: 'C', label: 'Goal C' },
              { key: 'D', label: 'Goal D' },
            ].map(g => (
              <button
                key={g.key}
                onClick={() => setGoalFilter(g.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  border:
                    goalFilter === g.key
                      ? `1px solid ${goalColors[g.key]?.accent ?? 'var(--sky-dim)'}`
                      : '1px solid var(--border)',
                  background:
                    goalFilter === g.key
                      ? (goalColors[g.key]?.bg ?? 'rgba(14,165,233,0.1)')
                      : 'transparent',
                  color:
                    goalFilter === g.key
                      ? (goalColors[g.key]?.color ?? 'var(--sky-dim)')
                      : 'var(--text-3)',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TARGET VIEW */}
      {view === 'targets' &&
        filtered.map(t => {
          const gc = goalColors[t.goal];
          const isOpen = expandedTargets.has(t.id);
          return (
            <div key={t.id} style={{ ...card, marginBottom: 10, overflow: 'hidden' }}>
              {/* Target header */}
              <div
                onClick={() => toggleTarget(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  background: isOpen ? gc.bg : 'var(--surface)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: gc.accent,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {t.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>
                    Target {t.id}: {t.title}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>
                    {t.actions.length} strategic actions ·{' '}
                    {new Set(t.actions.flatMap(a => a.institutions)).size} institutions
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: gc.bg,
                    color: gc.color,
                    border: `1px solid ${gc.accent}30`,
                  }}
                >
                  Goal {t.goal}
                </span>
                <i
                  className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
                  style={{ color: 'var(--text-3)', fontSize: '0.65rem' }}
                />
              </div>

              {/* Expanded actions */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {t.actions.map((a, ai) => (
                    <div
                      key={ai}
                      style={{
                        padding: '14px 20px 14px 72px',
                        borderBottom: ai < t.actions.length - 1 ? '1px solid #f8fafc' : 'none',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: 'var(--text-1)',
                          marginBottom: 8,
                        }}
                      >
                        {a.action}
                      </div>
                      <div style={{ display: 'flex', gap: 20 }}>
                        {/* Institutions */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              color: 'var(--text-3)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              marginBottom: 4,
                            }}
                          >
                            Responsible Institutions
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {a.institutions.map(inst => (
                              <span
                                key={inst}
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  background: '#eff6ff',
                                  color: '#1e40af',
                                  fontWeight: 500,
                                  border: '1px solid #dbeafe',
                                }}
                              >
                                {inst}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* Data Sources */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              color: 'var(--text-3)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              marginBottom: 4,
                            }}
                          >
                            Data Sources
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {a.dataSources.map((ds, di) => (
                              <span
                                key={di}
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  fontWeight: 500,
                                  border: '1px solid #dcfce7',
                                }}
                              >
                                {ds}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {/* INSTITUTION VIEW */}
      {view === 'institutions' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  {['Institution', 'Reporting Modules', 'Targets', 'Target Links'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                        background: 'var(--surface-2)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInstitutions.map(inst => (
                  <tr key={inst.name} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-1)' }}>
                      {inst.name}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {inst.modules.length > 0 ? (
                          inst.modules.map(m => {
                            const mod = MODULE_NAMES[m];
                            return (
                              <span
                                key={m}
                                style={{
                                  fontSize: '0.6rem',
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: `${mod?.color ?? '#6b7280'}14`,
                                  color: mod?.color ?? '#6b7280',
                                  fontWeight: 600,
                                  border: `1px solid ${mod?.color ?? '#6b7280'}30`,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {m}
                              </span>
                            );
                          })
                        ) : (
                          <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sky-dim)' }}>
                        {inst.targetCount}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {inst.targets.map(tid => {
                          const t = targetsData.find(x => x.id === tid);
                          const gc = goalColors[t?.goal ?? 'A'];
                          return (
                            <span
                              key={tid}
                              onClick={() => {
                                setView('targets');
                                setExpandedTargets(new Set([tid]));
                                setGoalFilter('all');
                              }}
                              style={{
                                fontSize: '0.62rem',
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: gc.bg,
                                color: gc.color,
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: `1px solid ${gc.accent}30`,
                              }}
                            >
                              T{tid}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && view === 'targets' && (
        <div
          style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: '0.82rem' }}
        >
          No targets match your search.
        </div>
      )}
    </div>
  );
}
