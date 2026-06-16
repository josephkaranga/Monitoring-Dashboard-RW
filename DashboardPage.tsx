import React, { useCallback, useState } from 'react';
import { useAuth } from './AuthContext';
import { useDashboardStats, useReports } from './useData';
import { generateAINarrative } from './aiNarrative';
import toast from 'react-hot-toast';

const MetricCard = ({
  label, value, sub, color, icon
}: { label: string; value: string | number; sub: string; color: string; icon: string }) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${color}dd, ${color})`,
      borderRadius: 14, padding: 20, color: '#fff',
      position: 'relative', overflow: 'hidden', flex: 1, minWidth: 160,
    }}
  >
    <div style={{ fontSize: '0.72rem', opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 8 }}>{sub}</div>
    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '2rem', opacity: 0.2 }}>
      {icon}
    </span>
  </div>
);

const ProgressBar = ({ label, value, target, color }: { label: string; value: string; target: string; color: string }) => {
  const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 5 }}>
        <span style={{ fontWeight: 500, color: '#475569' }}>{label}</span>
        <span style={{ fontWeight: 700, color: '#0f172a' }}>{value} / {target}</span>
      </div>
      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user, permissions } = useAuth();
  const { stats, loading, refetch } = useDashboardStats();
  const { reports } = useReports({ status: 'approved', pageSize: 3 });
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

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
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', fontSize: '0.82rem', padding: 40 }}>
        <div style={{ width: 18, height: 18, border: '2px solid #e2e8f0', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        Loading dashboard…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const s = stats;

  return (
    <div>
      {/* AI Narrative */}
      {permissions?.canViewAnalytics && (
        <div
          style={{
            background: 'linear-gradient(135deg, #0f2744, #1e3a5f)',
            borderRadius: 14, padding: 20, color: '#fff', marginBottom: 24,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✦ AI Progress Narrative
              <span style={{ fontSize: '0.65rem', opacity: 0.6, fontFamily: "'DM Mono', monospace" }}>· Powered by Claude API</span>
            </h3>
            <button
              onClick={handleGenerate}
              disabled={aiLoading}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', padding: '6px 14px', borderRadius: 7,
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6,
                opacity: aiLoading ? 0.5 : 1,
              }}
            >
              {aiLoading ? '⟳ Generating…' : '✦ Generate Insight'}
            </button>
          </div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.7, color: '#e0f2fe', minHeight: 40 }}>
            {aiText || (
              <span style={{ opacity: 0.6 }}>
                Click <strong>Generate Insight</strong> to produce a live AI-powered summary of current NBSAP progress, risks, and recommendations.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <MetricCard label="Total Targets" value={s?.totalTargets ?? 22} sub={`${s?.onTrackIndicators ?? 0} on track · ${(s?.atRiskIndicators ?? 0) + (s?.behindIndicators ?? 0)} at risk`} color="#0f2744" icon="🎯" />
        <MetricCard label="Data Submissions" value={s?.totalSubmissions ?? 0} sub={`${s?.pendingVerifications ?? 0} pending review`} color="#059669" icon="📊" />
        <MetricCard label="Active Districts" value={s?.activeDistricts ?? '—'} sub="Reporting this period" color="#0284c7" icon="🗺️" />
        <MetricCard label="Compliance Issues" value={s?.complianceIssues ?? 0} sub="Requires attention" color={s?.complianceIssues ? '#d97706' : '#059669'} icon="⚠️" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Progress Bars */}
        <div
          style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
            padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            📊 NBSAP Target Progress (2025–2030)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <ProgressBar label="Forest Cover" value="27%" target="30%" color="linear-gradient(90deg,#059669,#10b981)" />
            <ProgressBar label="Wetland Restoration" value={`${s?.wetlandHa?.toLocaleString() || 600} ha`} target="1,200 ha" color="linear-gradient(90deg,#0284c7,#38bdf8)" />
            <ProgressBar label="Species Protection" value="650" target="800" color="linear-gradient(90deg,#7c3aed,#8b5cf6)" />
            <ProgressBar label="Community Participation" value="60%" target="80%" color="linear-gradient(90deg,#d97706,#f59e0b)" />
            <ProgressBar label="Water Quality" value="80%" target="90%" color="linear-gradient(90deg,#0891b2,#06b6d4)" />
            <ProgressBar label="Policy Integration" value="10" target="15 plans" color="linear-gradient(90deg,#db2777,#ec4899)" />
          </div>
        </div>

        {/* Recent Activity */}
        <div
          style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
            padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>
            🕐 Recent Activity
          </h3>
          {reports.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '20px 0', textAlign: 'center' }}>
              No submissions yet
            </div>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #f8fafc' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}>
                  ✓
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#0f172a' }}>{r.tool_name} submitted</p>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {new Date(r.submitted_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Stats Row */}
      {s && (
        <div
          style={{
            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
            padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14 }}>
            📡 Live Toolkit Data
            <span style={{ marginLeft: 8, fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>● Live</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {[
              { val: s.totalSubmissions, label: 'Reports', color: '#0ea5e9' },
              { val: s.forestHa.toLocaleString(), label: 'Forest (ha)', color: '#10b981' },
              { val: s.wetlandHa.toLocaleString(), label: 'Wetland (ha)', color: '#0891b2' },
              { val: Object.keys(s.reportsByTool).length, label: 'Active Modules', color: '#8b5cf6' },
              { val: s.financeAllocated >= 1e6 ? (s.financeAllocated / 1e6).toFixed(1) + 'M' : s.financeAllocated, label: 'Finance (RWF)', color: '#059669' },
              { val: s.hwcIncidents, label: 'HWC Incidents', color: '#f59e0b' },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color }}>{val || '—'}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 3, fontFamily: "'DM Mono', monospace" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
