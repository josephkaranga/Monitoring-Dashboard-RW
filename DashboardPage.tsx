import React, { useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { useDashboardStats, useReports, useIndicators } from './useData';
import { generateAINarrative } from './aiNarrative';
import { DashboardSkeleton } from './Skeleton';
import toast from 'react-hot-toast';
import type { Indicator } from './index';

// ── Shared card styles ────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

// ── Metric Card ───────────────────────────────────────────────
function MetricCard({ label, value, sub, gradient, icon }: {
  label: string; value: string | number; sub: string; gradient: string; icon: string;
}) {
  return (
    <div style={{
      padding: 20, borderRadius: 'var(--radius)', color: '#fff',
      background: gradient, position: 'relative', overflow: 'hidden', flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: '0.72rem', opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 8 }}>{sub}</div>
      <i className={`fa-solid ${icon}`} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }} />
    </div>
  );
}

// ── Progress Row ──────────────────────────────────────────────
function ProgRow({ label, value, target, color }: { label: string; value: string; target: string; color: string }) {
  const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 5 }}>
        <span style={{ fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{value} / {target}</span>
      </div>
      <div style={{ height: 7, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { permissions } = useAuth();
  const { stats, loading } = useDashboardStats(false);
  const { reports } = useReports({ status: 'approved', pageSize: 4 });
  const { data: rawIndicators } = useIndicators() as { data: Indicator[] | null; loading: boolean; error: string | null; refetch: () => void };
  const indicators: Indicator[] = rawIndicators ?? [];
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Build live progress rows from DB indicators
  const getIndicatorProgress = (name: string) => {
    const ind = indicators.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
    return ind ? { value: ind.current_value || `${ind.progress}%`, progress: ind.progress } : null;
  };

  const handleGenerate = useCallback(async () => {
    if (!stats) return;
    setAiLoading(true);
    try {
      const text = await generateAINarrative(stats);
      setAiText(text);
    } catch {
      toast.error('AI narrative generation failed');
    }
    setAiLoading(false);
  }, [stats]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const s = stats;

  return (
    <div>
      {/* ── AI Narrative ── */}
      {permissions?.canViewAnalytics && (
        <div style={{
          background: 'linear-gradient(135deg, #0f2744, #1e3a5f)',
          borderRadius: 'var(--radius)', padding: 20, color: '#fff',
          marginBottom: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(56,189,248,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✦</span> AI Progress Narrative
              <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 400, fontFamily: "'DM Mono', monospace" }}>· Powered by Claude API</span>
            </h3>
            <button
              onClick={handleGenerate}
              disabled={aiLoading}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', padding: '6px 14px', borderRadius: 7,
                fontSize: '0.75rem', fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6,
                opacity: aiLoading ? 0.5 : 1,
              }}
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
              {aiLoading ? 'Generating…' : 'Generate Insight'}
            </button>
          </div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.7, color: '#e0f2fe', minHeight: 40 }}>
            {aiText || (
              <span style={{ opacity: 0.6 }}>
                Click <strong>Generate Insight</strong> to produce a live AI-powered summary of current NBSAP progress, risks, and recommendations — generated from your actual dashboard data using the Claude API.
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(125,211,252,0.6)', marginTop: 10, fontFamily: "'DM Mono', monospace" }}>
            Powered by Claude · Data as of {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <MetricCard
          label="Total Targets" icon="fa-bullseye"
          value={s?.totalTargets ?? 22}
          sub={`${s?.onTrackIndicators ?? 0} on track · ${(s?.atRiskIndicators ?? 0) + (s?.behindIndicators ?? 0)} at risk`}
          gradient="linear-gradient(135deg, #0f2744 0%, #1e3a5f 100%)"
        />
        <MetricCard
          label="Data Submissions" icon="fa-database"
          value={(s?.totalSubmissions ?? 0).toLocaleString()}
          sub={`${s?.pendingVerifications ?? 0} pending review`}
          gradient="linear-gradient(135deg, #059669 0%, #10b981 100%)"
        />
        <MetricCard
          label="Active Districts" icon="fa-map-location-dot"
          value={s?.activeDistricts ?? '—'}
          sub="Reporting this period"
          gradient="linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
        />
        <MetricCard
          label="Compliance Issues" icon="fa-triangle-exclamation"
          value={s?.complianceIssues ?? 0}
          sub="Requires attention"
          gradient={s?.complianceIssues ? "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" : "linear-gradient(135deg, #059669 0%, #10b981 100%)"}
        />
      </div>

      {/* ── Access Layers ── */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--sky-dim)' }} />
            Dashboard Access Layers
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#e0f2fe', color: '#0369a1' }}>
            Role-Based
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', label: '🌐 PUBLIC ACCESS', desc: 'Headline indicators · National progress summaries · Maps & trends · Transparency & accountability' },
            { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', label: '🏛️ INSTITUTIONAL REPORTING', desc: 'Ministries · Districts · Protected area authorities · Research institutions · Data entry & progress tracking' },
            { bg: '#faf5ff', border: '#e9d5ff', color: '#6b21a8', label: '📊 DECISION-MAKER ANALYTICS', desc: 'REMA · Cabinet technical teams · Policy planners · Performance dashboards · Scenario modelling · Exportable reports' },
          ].map(({ bg, border, color, label, desc }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color, fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color, lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Live Toolkit Stats ── */}
      {s && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
              <i className="fa-solid fa-satellite-dish" style={{ color: 'var(--sky-dim)' }} />
              Live Toolkit Data
              <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dcfce7', color: '#166534' }}>● Live</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>Auto-updates when reports are submitted via the Reporting Toolkit</p>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { val: s.totalSubmissions, label: 'Toolkit Reports', color: '#0ea5e9' },
                { val: s.forestHa.toLocaleString(), label: 'Forest (ha)', color: '#10b981' },
                { val: s.wetlandHa.toLocaleString(), label: 'Wetland (ha)', color: '#0891b2' },
                { val: s.activeDistricts, label: 'Districts', color: '#8b5cf6' },
                { val: s.financeAllocated >= 1e6 ? (s.financeAllocated / 1e6).toFixed(1) + 'M' : s.financeAllocated || '—', label: 'Finance (RWF M)', color: '#059669' },
                { val: s.hwcIncidents || '—', label: 'HWC Incidents', color: '#f59e0b' },
              ].map(({ val, label, color }) => (
                <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color }}>{val}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 3, fontFamily: "'DM Mono', monospace" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Charts + Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Progress */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            <i className="fa-solid fa-chart-line" style={{ color: 'var(--sky-dim)' }} />
            Indicator Progress Trends
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            {[
              { label: 'Forest Cover', key: 'forest', target: '30%', color: 'linear-gradient(90deg,#059669,#10b981)' },
              { label: 'Wetland Restoration', key: 'wetland', target: '1,200 ha', color: 'linear-gradient(90deg,#0284c7,#38bdf8)' },
              { label: 'Species Protection', key: 'species', target: '800', color: 'linear-gradient(90deg,#7c3aed,#8b5cf6)' },
              { label: 'Community Participation', key: 'community', target: '80%', color: 'linear-gradient(90deg,#d97706,#f59e0b)' },
              { label: 'Water Quality', key: 'water', target: '90%', color: 'linear-gradient(90deg,#0891b2,#06b6d4)' },
              { label: 'Policy Integration', key: 'policy', target: '15 plans', color: 'linear-gradient(90deg,#db2777,#ec4899)' },
            ].map(({ label, key, target, color }) => {
              const live = getIndicatorProgress(key === 'forest' ? 'Forest Cover' : key === 'wetland' ? 'Wetland' : key === 'species' ? 'Species' : key === 'community' ? 'Community' : key === 'water' ? 'Water' : 'Policy');
              return <ProgRow key={label} label={label} value={live?.value ?? '—'} target={target} color={color} />;
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ ...card, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--sky-dim)' }} />
            Recent Activity
          </div>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: '0.8rem' }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8, opacity: 0.5 }} />
              No submissions yet
            </div>
          ) : reports.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--surface-3)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.8rem' }}>
                <i className="fa-solid fa-check" />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-1)' }}>{r.tool_name} submitted</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{new Date(r.submitted_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── NBSAP Target Progress ── */}
      <div style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>
          <i className="fa-solid fa-chart-column" style={{ color: 'var(--sky-dim)' }} />
          NBSAP Target Progress (2025–2030)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 32px' }}>
          <div>
            <ProgRow label="Forest Cover" value="27%" target="30%" color="linear-gradient(90deg,#059669,#10b981)" />
            <ProgRow label="Wetland Restoration" value="600 ha" target="1200 ha" color="linear-gradient(90deg,#0284c7,#38bdf8)" />
          </div>
          <div>
            <ProgRow label="Species Protection" value="650" target="800" color="linear-gradient(90deg,#7c3aed,#8b5cf6)" />
            <ProgRow label="Community Participation" value="60%" target="80%" color="linear-gradient(90deg,#d97706,#f59e0b)" />
          </div>
          <div>
            <ProgRow label="Water Quality" value="80%" target="90%" color="linear-gradient(90deg,#0891b2,#06b6d4)" />
            <ProgRow label="Policy Integration" value="10" target="15 plans" color="linear-gradient(90deg,#db2777,#ec4899)" />
          </div>
        </div>
      </div>
    </div>
  );
}
