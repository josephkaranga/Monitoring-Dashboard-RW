import React, { useState, useCallback } from 'react';
import { useDashboardStats } from './useData';
import { generateAINarrative } from './aiNarrative';
import toast from 'react-hot-toast';

// ── Module-level AI cache — persists across navigation ────────
let _cachedDecisionBrief = '';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export default function AdaptiveManagementPage() {
  const { stats } = useDashboardStats(false);
  const [aiText, setAiText] = useState(_cachedDecisionBrief);
  const [aiLoading, setAiLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!stats) return;
    setAiLoading(true);
    try {
      const text = await generateAINarrative(stats);
      _cachedDecisionBrief = text;
      setAiText(text);
    } catch {
      toast.error('AI generation failed');
    }
    setAiLoading(false);
  }, [stats]);

  const forestPct = stats ? Math.round((stats.forestHa / 2500) * 100) : 44;
  const financePct = stats?.financeAllocated
    ? `RWF ${(stats.financeAllocated / 1e9).toFixed(1)}B of 10B`
    : 'RWF 7.2B of 10B';

  return (
    <div>
      {/* AI Decision Brief */}
      <div style={{ background: 'linear-gradient(135deg, #0f2744, #1e3a5f)', borderRadius: 'var(--radius)', padding: 20, color: '#fff', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(56,189,248,0.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>✦</span> AI Decision Brief
            <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 400, fontFamily: "'DM Mono', monospace" }}>· Powered by Claude API</span>
          </h3>
          <button onClick={handleGenerate} disabled={aiLoading}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 14px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6, opacity: aiLoading ? 0.5 : 1 }}>
            <i className="fa-solid fa-wand-magic-sparkles" />
            {aiLoading ? 'Generating…' : 'Generate Decision Brief'}
          </button>
        </div>
        <div style={{ fontSize: '0.82rem', lineHeight: 1.7, color: '#e0f2fe', minHeight: 40 }}>
          {aiText || <span style={{ opacity: 0.6 }}>Click <strong>Generate Decision Brief</strong> to produce an AI-powered adaptive management summary — identifying implementation gaps, financing shortfalls, and recommended corrective actions based on live dashboard data.</span>}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(125,211,252,0.6)', marginTop: 10, fontFamily: "'DM Mono', monospace" }}>
          Powered by Claude · Evidence-based policy support
        </div>
      </div>

      {/* Monitoring-to-Policy Feedback Loop */}
      <div style={{ ...card, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-arrows-spin" style={{ color: 'var(--sky-dim)' }} />
          Monitoring-to-Policy Feedback Loop
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', padding: '8px 0' }}>
          {[
            { num: '1', label: 'Monitor', sub: 'T01–T07 submitted quarterly', gradient: 'linear-gradient(135deg,#0f2744,#1e3a5f)' },
            { num: '2', label: 'Analyse', sub: 'Gap detection vs milestones', gradient: 'linear-gradient(135deg,#0284c7,#38bdf8)' },
            { num: '3', label: 'Alert', sub: 'Trigger if indicator <60%', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)' },
            { num: '4', label: 'Decide', sub: 'Policy review or budget shift', gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
            { num: '5', label: 'Adjust', sub: 'Implement · Re-monitor', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
          ].map((step, i) => (
            <React.Fragment key={step.num}>
              <div style={{ background: step.gradient, color: '#fff', padding: '14px 16px', borderRadius: 12, textAlign: 'center', minWidth: 120 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{step.num} · {step.label}</div>
                <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 3 }}>{step.sub}</div>
              </div>
              {i < 4 && <i className="fa-solid fa-arrow-right" style={{ color: 'var(--text-3)', fontSize: '1.1rem' }} />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { bg: '#fee2e2', border: '#f43f5e', color: '#991b1b', label: '🔴 CRITICAL TRIGGER', desc: 'Indicator <40% of milestone → Emergency ministerial review + budget reallocation within 30 days' },
            { bg: '#fff7ed', border: '#f59e0b', color: '#9a3412', label: '🟠 WARNING TRIGGER', desc: 'Indicator 40–60% of milestone → Technical review + corrective action plan within 60 days' },
            { bg: '#f0fdf4', border: '#10b981', color: '#166534', label: '🟢 ON TRACK', desc: 'Indicator ≥60% of milestone → Standard quarterly monitoring, no corrective action needed' },
          ].map(t => (
            <div key={t.label} style={{ background: t.bg, borderRadius: 9, padding: '12px 14px', borderLeft: `3px solid ${t.border}` }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: t.color, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{t.label}</div>
              <div style={{ fontSize: '0.77rem', color: t.color }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 6 Decision Support Functions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: 'fa-triangle-exclamation', color: '#f43f5e', border: '#f43f5e', title: 'Implementation Gap Detection', desc: `Early warning system for indicators falling behind targets. Currently ${(stats?.atRiskIndicators ?? 0) + (stats?.behindIndicators ?? 0)} indicators flagged for corrective action.`, sub: 'Targets 17 · 15 · 22 at risk' },
          { icon: 'fa-chart-line', color: '#10b981', border: '#10b981', title: 'Restoration Performance Tracking', desc: `Monitoring forest and wetland restoration against milestones. Currently at ${forestPct}% of 2,500 ha 2030 target.`, sub: 'T02 district module feeds this' },
          { icon: 'fa-coins', color: '#f59e0b', border: '#f59e0b', title: 'Financing Shortfall Monitoring', desc: `Tracking biodiversity budget allocations vs disbursements. ${financePct} mobilized.`, sub: 'T05 finance module feeds this' },
          { icon: 'fa-clipboard-check', color: '#6366f1', border: '#6366f1', title: 'Institutional Compliance Levels', desc: 'Evaluating ministry and district reporting compliance. 92% EIA · 88% Protected Areas · 75% ABS · 68% Species Laws', sub: 'T01 & T06 modules feed this' },
          { icon: 'fa-scale-balanced', color: '#0ea5e9', border: '#0ea5e9', title: 'Evidence-Based Policy Adjustment', desc: 'Enabling dynamic response to biodiversity risks. 28 decisions made from M&E data out of 50 target decisions by 2030.', sub: 'Indicator 16 tracks this' },
          { icon: 'fa-venus-mars', color: '#ec4899', border: '#ec4899', title: 'Gender-Responsive Monitoring', desc: 'Tracking women, youth & IPLC inclusion in biodiversity M&E. Currently 32% women and 18% IPLC participation.', sub: 'T04 community module feeds this' },
        ].map(c => (
          <div key={c.title} style={{ ...card, padding: 18, borderTop: `3px solid ${c.border}` }}>
            <i className={`fa-solid ${c.icon}`} style={{ fontSize: '1.4rem', color: c.color, display: 'block', marginBottom: 10 }} />
            <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{c.desc}</div>
            <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Reporting & Evaluation Timeline */}
      <div style={{ ...card, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-calendar-check" style={{ color: 'var(--sky-dim)' }} />
          Reporting &amp; Evaluation Timeline
        </div>
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
          {[
            { color: '#10b981', label: 'Quarterly · 2026', title: 'Institutional Submissions', desc: 'All 7 reporting modules — T01 through T07' },
            { color: '#0ea5e9', label: 'Annual · Mar 2026', title: 'National Biodiversity Implementation Report', desc: 'Consolidated progress against 22 NBSAP targets submitted to Cabinet' },
            { color: '#8b5cf6', label: 'Q3 2027', title: 'Mid-Term Evaluation', desc: 'Comprehensive review of NBSAP 2025–2030 halfway milestone' },
            { color: '#f59e0b', label: 'Annual · 2028', title: 'Annual Progress Report', desc: 'Third annual report with course-correction recommendations' },
            { color: '#e11d48', label: 'Jun 2029', title: 'CBD National Report Submission', desc: 'International reporting to Convention on Biological Diversity Secretariat' },
            { color: '#0f2744', label: 'Q4 2030', title: 'Final Evaluation', desc: 'Comprehensive evaluation against all 22 targets and KM-GBF commitments' },
          ].map(item => (
            <div key={item.title} style={{ position: 'relative', paddingLeft: 20, marginBottom: 18 }}>
              <div style={{ position: 'absolute', left: -20, top: 4, width: 14, height: 14, borderRadius: '50%', background: 'var(--surface-3)', border: `2px solid ${item.color}` }} />
              <div style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: item.color, fontWeight: 700, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</div>
              <div style={{ fontSize: '0.77rem', color: 'var(--text-2)', marginTop: 2 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
