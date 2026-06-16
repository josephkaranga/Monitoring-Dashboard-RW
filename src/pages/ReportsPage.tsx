// ============================================================
// NBSAP Comprehensive Analytics & Visualisation Dashboard
// ============================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler,
  Legend, LinearScale, LineElement, PointElement, Title, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import { format, parseISO, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../services/AuthContext';
import { checkAccountStatus } from '../services/AuthContext';
import { useDashboardStats, useReports } from '../hooks/useData';
import { exportReportsToCSV } from '../services/reportService';
import { fetchTargets, fetchIndicators } from '../services/dataService';
import { eventBus } from '../services/eventBus';
import type { NBSAPTarget, Indicator } from '../types/index';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip);

// ── Constants ─────────────────────────────────────────────────
const C = { green: '#10b981', amber: '#f59e0b', red: '#f43f5e', blue: '#0ea5e9', purple: '#8b5cf6', teal: '#14b8a6', indigo: '#6366f1', pink: '#ec4899', orange: '#f97316' };

const TOOL_LABELS: Record<string, string> = {
  T01: 'National Institutional', T02: 'District Biodiversity', T03: 'Protected Area',
  T04: 'Community Monitoring', T05: 'Finance Tracking', T06: 'Private Sector', T07: 'Research & Academic',
};
const TOOL_COLORS = ['#1B6CA8','#1E7D4B','#5B3FA6','#B56A00','#0E6655','#922B21','#1A5276'];
const TABS = ['Overview','Targets & Indicators','Financial','Compliance','Evidence & Activities','Trends','AI Insights'];

const card: React.CSSProperties = { background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' };

const chartDefaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const, labels: { font: { family: "'DM Sans', sans-serif", size: 11 }, padding: 12 } } } };

// ── Section header ─────────────────────────────────────────────
function SectionHead({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <i className={`fa-solid ${icon}`} style={{ color: 'var(--sky-dim)', fontSize: '1rem' }} />
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)' }}>{title}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── ChartBox wrapper ───────────────────────────────────────────
function ChartBox({ title, height = 280, children }: { title: string; height?: number; children: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({ label, value, icon, bg, color, sub }: { label: string; value: string | number; icon: string; bg: string; color: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1.1rem' }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)', fontFamily: "'Playfair Display', serif", lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export function ReportsPage() {
  const { user } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [targets, setTargets] = useState<NBSAPTarget[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', toolId: 'all', district: 'all', year: 'all' });
  const printRef = useRef<HTMLDivElement>(null);

  const { stats, refetch: refetchStats } = useDashboardStats(false);
  const { reports: allReports, refetch: refetchReports } = useReports({ pageSize: 500 });

  // Access check
  useEffect(() => {
    if (!user) { setCheckingAccess(false); return; }
    checkAccountStatus(user).then(s => {
      setAccessDenied(!s.allowed);
      setAccessMessage(s.message || '');
    }).catch(() => { setAccessDenied(true); setAccessMessage('Unable to verify access.'); })
      .finally(() => setCheckingAccess(false));
  }, [user]);

  // Load supplemental data
  useEffect(() => {
    fetchTargets().then(setTargets).catch(console.error);
    fetchIndicators().then(setIndicators).catch(console.error);
  }, []);

  // Refresh when reports change via event bus
  useEffect(() => {
    return eventBus.on('dashboard-refresh', () => {
      refetchStats();
      refetchReports();
    });
  }, [refetchStats, refetchReports]);

  // ── Filtered reports ───────────────────────────────────────
  const reports = useMemo(() => {
    return allReports.filter(r => {
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.toolId !== 'all' && r.tool_id !== filters.toolId) return false;
      if (filters.district !== 'all' && r.district !== filters.district) return false;
      if (filters.year !== 'all' && !r.submitted_at.startsWith(filters.year)) return false;
      return true;
    });
  }, [allReports, filters]);

  const approved = useMemo(() => reports.filter(r => r.status === 'approved'), [reports]);
  const pending = useMemo(() => reports.filter(r => r.status === 'pending'), [reports]);

  // ── KPI Metrics ────────────────────────────────────────────
  const kpis = useMemo(() => {
    const overallProgress = targets.length > 0 ? Math.round(targets.reduce((s, t) => s + t.progress, 0) / targets.length) : 0;
    const completedIndicators = indicators.filter(i => i.progress >= 80 || i.status === 'on-track').length;
    const evidenceCount = reports.reduce((s, r) => s + (r.attachments?.length || 0), 0);
    const institutions = new Set(reports.map(r => r.form_data?.institution || r.form_data?.company || r.tool_id).filter(Boolean)).size;
    return { overallProgress, completedIndicators, evidenceCount, institutions };
  }, [targets, indicators, reports]);

  // ── Chart datasets ─────────────────────────────────────────

  // 1. Target status donut
  const targetStatusData = useMemo(() => {
    const onTrack = targets.filter(t => t.progress >= 60).length;
    const atRisk = targets.filter(t => t.progress >= 35 && t.progress < 60).length;
    const behind = targets.filter(t => t.progress < 35).length;
    return { labels: ['On Track', 'At Risk', 'Behind Schedule'], datasets: [{ data: [onTrack, atRisk, behind], backgroundColor: [C.green, C.amber, C.red], borderWidth: 0 }] };
  }, [targets]);

  // 2. Reports by tool bar
  const reportsByToolData = useMemo(() => {
    const counts = Object.keys(TOOL_LABELS).map(id => reports.filter(r => r.tool_id === id).length);
    return { labels: Object.values(TOOL_LABELS), datasets: [{ label: 'Reports', data: counts, backgroundColor: TOOL_COLORS, borderRadius: 4 }] };
  }, [reports]);

  // 3. Target performance horizontal bar (22 targets)
  const targetPerfData = useMemo(() => {
    const sorted = [...targets].sort((a, b) => a.id - b.id);
    return {
      labels: sorted.map(t => `T${t.id}`),
      datasets: [{
        label: 'Progress %',
        data: sorted.map(t => t.progress),
        backgroundColor: sorted.map(t => t.progress >= 60 ? C.green : t.progress >= 35 ? C.amber : C.red),
        borderRadius: 3,
      }],
    };
  }, [targets]);

  // 4. Reports by target bar
  const reportsByTargetData = useMemo(() => {
    const counts = targets.sort((a, b) => a.id - b.id).map(t => reports.filter(r => r.nbsap_target_id === t.id).length);
    return { labels: targets.sort((a, b) => a.id - b.id).map(t => `T${t.id}`), datasets: [{ label: 'Reports', data: counts, backgroundColor: C.blue, borderRadius: 3 }] };
  }, [targets, reports]);

  // 5. Milestone status (derived from indicators)
  const milestoneData = useMemo(() => {
    const completed = indicators.filter(i => i.status === 'on-track' && i.progress >= 50).length;
    const inProgress = indicators.filter(i => i.status === 'at-risk' || (i.status === 'on-track' && i.progress < 50)).length;
    const notStarted = indicators.filter(i => i.status === 'behind').length;
    return { labels: ['Completed', 'In Progress', 'Not Started'], datasets: [{ data: [completed, inProgress, notStarted], backgroundColor: [C.green, C.amber, C.red], borderWidth: 0 }] };
  }, [indicators]);

  // 6. Indicator achievement (top 15 by name length/priority)
  const indicatorAchievData = useMemo(() => {
    const top = indicators.slice(0, 15);
    return {
      labels: top.map((i, idx) => `I${idx + 1}`),
      datasets: [
        { label: 'Baseline', data: top.map(() => 0), backgroundColor: '#e2e8f0', borderRadius: 2 },
        { label: 'Current', data: top.map(i => i.progress), backgroundColor: C.blue, borderRadius: 2 },
        { label: 'Target', data: top.map(() => 100), backgroundColor: `${C.green}44`, borderRadius: 2 },
      ],
    };
  }, [indicators]);

  // 7. Budget performance from T01/T05 reports
  const budgetData = useMemo(() => {
    const buckets: Record<string, { allocated: number; disbursed: number }> = { T01: { allocated: 0, disbursed: 0 }, T05: { allocated: 0, disbursed: 0 } };
    approved.forEach(r => {
      const id = r.tool_id as 'T01' | 'T05';
      if (!buckets[id]) return;
      const alloc = parseFloat(String(r.form_data?.budget_allocated ?? r.form_data?.budget_utilized ?? 0)) || 0;
      const disb = parseFloat(String(r.form_data?.budget_disbursed ?? 0)) || 0;
      buckets[id].allocated += alloc;
      buckets[id].disbursed += disb;
    });
    const labels = ['National Institutional (T01)', 'Finance Tracking (T05)'];
    const allocated = [buckets.T01.allocated, buckets.T05.allocated];
    const disbursed = [buckets.T01.disbursed, buckets.T05.disbursed];
    const remaining = [Math.max(0, buckets.T01.allocated - buckets.T01.disbursed), Math.max(0, buckets.T05.allocated - buckets.T05.disbursed)];
    return { labels, datasets: [
      { label: 'Utilized (RWF)', data: disbursed, backgroundColor: C.green, borderRadius: 3 },
      { label: 'Remaining (RWF)', data: remaining, backgroundColor: C.amber, borderRadius: 3 },
    ]};
  }, [approved]);

  // 8. Geographic bar (districts from T02)
  const geoData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => { if (r.district) counts[r.district] = (counts[r.district] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
    return { labels: entries.map(e => e[0]), datasets: [{ label: 'Reports', data: entries.map(e => e[1]), backgroundColor: C.teal, borderRadius: 3 }] };
  }, [reports]);

  // 9. Evidence analytics (attachment file types)
  const evidenceData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => (r.attachments || []).forEach(a => {
      const ext = (a.ext || a.name.split('.').pop() || 'other').toLowerCase();
      const label = ext === 'pdf' ? 'PDF' : ['xlsx','xls'].includes(ext) ? 'Excel' : ['doc','docx'].includes(ext) ? 'Word' : ['png','jpg','jpeg'].includes(ext) ? 'Images' : 'Other';
      counts[label] = (counts[label] || 0) + 1;
    }));
    const entries = Object.entries(counts);
    const colors = [C.red, C.green, C.blue, C.purple, C.amber];
    return { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: colors, borderWidth: 0 }] };
  }, [reports]);

  // 10. Challenges keyword bar
  const challengesData = useMemo(() => {
    const stopWords = new Set(['that','this','with','from','have','been','were','they','their','also','into','what','when','more','some','than','will','would','could','should','most']);
    const freq: Record<string, number> = {};
    reports.forEach(r => {
      const text = (r.form_data?.challenges || '') + ' ' + (r.form_data?.notes || '');
      text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(w => {
        if (w.length > 4 && !stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
      });
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15);
    return { labels: top.map(e => e[0]), datasets: [{ label: 'Frequency', data: top.map(e => e[1]), backgroundColor: `${C.red}cc`, borderRadius: 3 }] };
  }, [reports]);

  // 11. Activities bar
  const activitiesData = useMemo(() => {
    const toolCounts = Object.keys(TOOL_LABELS).map(id => approved.filter(r => r.tool_id === id).length);
    return { labels: Object.values(TOOL_LABELS), datasets: [{ label: 'Approved Reports', data: toolCounts, backgroundColor: TOOL_COLORS, borderRadius: 4 }] };
  }, [approved]);

  // 12. Progress over time line
  const trendsData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return format(d, 'MMM yyyy');
    });
    const allCounts = months.map(m => reports.filter(r => {
      try { return format(startOfMonth(parseISO(r.submitted_at)), 'MMM yyyy') === m; } catch { return false; }
    }).length);
    const approvedCounts = months.map(m => approved.filter(r => {
      try { return format(startOfMonth(parseISO(r.submitted_at)), 'MMM yyyy') === m; } catch { return false; }
    }).length);
    return {
      labels: months,
      datasets: [
        { label: 'All Submissions', data: allCounts, borderColor: C.blue, backgroundColor: `${C.blue}22`, fill: true, tension: 0.4, pointRadius: 4 },
        { label: 'Approved', data: approvedCounts, borderColor: C.green, backgroundColor: `${C.green}22`, fill: true, tension: 0.4, pointRadius: 4 },
      ],
    };
  }, [reports, approved]);

  // 13. Reporting compliance (by tool)
  const complianceData = useMemo(() => {
    const labels = Object.values(TOOL_LABELS);
    const submittedCounts = Object.keys(TOOL_LABELS).map(id => reports.filter(r => r.tool_id === id && r.status === 'approved').length);
    const pendingCounts = Object.keys(TOOL_LABELS).map(id => reports.filter(r => r.tool_id === id && r.status === 'pending').length);
    return { labels, datasets: [
      { label: 'Approved', data: submittedCounts, backgroundColor: C.green, borderRadius: 3 },
      { label: 'Pending Review', data: pendingCounts, backgroundColor: C.amber, borderRadius: 3 },
    ]};
  }, [reports]);

  // ── Unique filter options ──────────────────────────────────
  const filterOptions = useMemo(() => {
    const districts = [...new Set(allReports.map(r => r.district).filter(Boolean))] as string[];
    const years = [...new Set(allReports.map(r => r.submitted_at.slice(0, 4)))].sort().reverse();
    return { districts, years };
  }, [allReports]);

  // ── Exports ────────────────────────────────────────────────
  const handleCSV = useCallback(() => {
    const csv = exportReportsToCSV(reports);
    if (!csv) { toast.error('No data'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nbsap_analytics_${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  }, [reports]);

  const handlePDF = useCallback(() => {
    try {
      const doc = new jsPDF();
      let y = 15;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('NBSAP Analytics Report — Rwanda', 15, y); y += 8;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()} · Total Reports: ${reports.length}`, 15, y); y += 12;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Executive Summary', 15, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      [
        `Total NBSAP Targets: ${targets.length}`,
        `Total Indicators: ${indicators.length}`,
        `Total Reports Submitted: ${reports.length}`,
        `Approved Reports: ${approved.length}`,
        `Pending Approval: ${pending.length}`,
        `Overall National Progress: ${kpis.overallProgress}%`,
        `Evidence Files Uploaded: ${kpis.evidenceCount}`,
        `Active Institutions: ${kpis.institutions}`,
      ].forEach(line => { doc.text(line, 15, y); y += 6; });
      y += 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('Target Progress (Top 10)', 15, y); y += 7;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      [...targets].sort((a, b) => b.progress - a.progress).slice(0, 10).forEach(t => {
        if (y > 270) { doc.addPage(); y = 20; }
        const status = t.progress >= 60 ? 'On Track' : t.progress >= 35 ? 'At Risk' : 'Behind';
        doc.text(`Target ${t.id}: ${t.title.slice(0, 45)} — ${t.progress}% (${status})`, 15, y); y += 6;
      });
      doc.save(`nbsap_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) { console.error(err); toast.error('PDF generation failed'); }
  }, [reports, targets, indicators, approved, pending, kpis]);

  const handlePrint = useCallback(() => window.print(), []);

  // ── AI Analytics ───────────────────────────────────────────
  const handleAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const summary = {
        totalReports: reports.length,
        approved: approved.length,
        pending: pending.length,
        overallProgress: kpis.overallProgress,
        targets: targets.length,
        indicators: indicators.length,
        onTrackTargets: targets.filter(t => t.progress >= 60).length,
        atRiskTargets: targets.filter(t => t.progress >= 35 && t.progress < 60).length,
        behindTargets: targets.filter(t => t.progress < 35).length,
        evidenceFiles: kpis.evidenceCount,
        topChallenges: Object.entries((() => {
          const f: Record<string, number> = {};
          reports.forEach(r => String(r.form_data?.challenges ?? '').split(/\s+/).forEach((w: string) => { if (w.length > 5) f[w] = (f[w] || 0) + 1; }));
          return f;
        })()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]),
      };
      const prompt = `You are a senior NBSAP policy analyst for Rwanda REMA reviewing biodiversity monitoring data.

ANALYTICS SNAPSHOT:
- Total reports submitted: ${summary.totalReports} (${summary.approved} approved, ${summary.pending} pending)
- Overall national NBSAP progress: ${summary.overallProgress}%
- Targets: ${summary.targets} total | On-track: ${summary.onTrackTargets} | At-risk: ${summary.atRiskTargets} | Behind: ${summary.behindTargets}
- Indicators monitored: ${summary.indicators}
- Evidence files: ${summary.evidenceFiles}
- Top challenge keywords: ${summary.topChallenges.join(', ')}

Generate a comprehensive analytics insight report with 4 sections:
1. TREND ANALYSIS (2-3 sentences): What the submission and approval data reveals about implementation momentum.
2. EMERGING RISKS (2-3 sentences): Based on the at-risk/behind targets and challenge keywords, what risks are emerging.
3. PERFORMANCE INSIGHTS (2-3 sentences): Key performance findings from the data.
4. SUGGESTED ACTIONS (3 bullet points): Specific, actionable recommendations for the next quarter.

Write in professional policy language. Be data-specific. Reference Rwanda and KM-GBF targets where relevant.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 700, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setAiText(data.content?.[0]?.text || 'No response received.');
    } catch {
      setAiText(`Based on the available data (${reports.length} reports, ${kpis.overallProgress}% overall progress, ${approved.length} approved):

TREND ANALYSIS: Report submission activity indicates active engagement across all 7 toolkit tools. The ${Math.round((approved.length / Math.max(reports.length, 1)) * 100)}% approval rate suggests the verification pipeline is ${approved.length > pending.length ? 'flowing well' : 'experiencing a backlog that needs attention'}.

EMERGING RISKS: With ${targets.filter(t => t.progress < 35).length} targets behind schedule, there is a risk of missing the 2030 KM-GBF commitments for those target areas. The concentration of reports in certain tools may indicate data gaps in underreported sectors.

PERFORMANCE INSIGHTS: The ${kpis.overallProgress}% national progress reflects ${kpis.overallProgress >= 50 ? 'reasonable momentum' : 'slower-than-expected progress'} toward 2030 targets. Evidence files uploaded (${kpis.evidenceCount}) demonstrate active documentation of field activities.

SUGGESTED ACTIONS:
• Prioritise approval of ${pending.length} pending reports to ensure data completeness for the quarterly review.
• Convene a coordination meeting for the ${targets.filter(t => t.progress < 35).length} behind-schedule targets with responsible stakeholders.
• Increase data collection in underreported districts to ensure geographic coverage for the national report.`);
    }
    setAiLoading(false);
  }, [reports, approved, pending, targets, indicators, kpis]);

  // ── Early returns ──────────────────────────────────────────
  if (checkingAccess) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '4px solid var(--surface-3)', borderTop: '4px solid var(--sky-dim)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: 'var(--text-3)' }}>Verifying access…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (accessDenied) return (
    <div style={{ ...card, padding: 32, textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
      <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <i className="fa-solid fa-lock" style={{ color: '#dc2626', fontSize: '1.8rem' }} />
      </div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>Access Restricted</h2>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>{accessMessage}</p>
    </div>
  );

  const barOpts = (horizontal = false) => ({ ...chartDefaults, ...(horizontal ? { indexAxis: 'y' as const } : {}), plugins: { ...chartDefaults.plugins, tooltip: { callbacks: {} } } });

  return (
    <div ref={printRef}>
      {/* ── Page Header ── */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-chart-mixed" style={{ color: '#38bdf8', fontSize: '1.1rem' }} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>NBSAP Analytics Dashboard</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>National Biodiversity Strategy 2020–2030 · {reports.length} reports · auto-updates on approval</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowFilters(f => !f)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: showFilters ? 'var(--navy)' : 'var(--surface)', color: showFilters ? '#fff' : 'var(--text-2)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <i className="fa-solid fa-filter" /> Filters
          </button>
          <button onClick={handleCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid var(--sky-dim)', borderRadius: 8, background: 'transparent', color: 'var(--sky-dim)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <i className="fa-solid fa-file-csv" /> CSV
          </button>
          <button onClick={handlePDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid #ef4444', borderRadius: 8, background: 'transparent', color: '#ef4444', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <i className="fa-solid fa-file-pdf" /> PDF
          </button>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <i className="fa-solid fa-print" /> Print
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div style={{ ...card, padding: '12px 16px', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Status', key: 'status' as const, opts: [['all','All Status'],['approved','Approved'],['pending','Pending'],['rejected','Rejected']] },
            { label: 'Tool', key: 'toolId' as const, opts: [['all','All Tools'], ...Object.entries(TOOL_LABELS).map(([id, name]) => [id, `${id} – ${name.split(' ')[0]}`])] },
            { label: 'District', key: 'district' as const, opts: [['all','All Districts'], ...filterOptions.districts.map(d => [d, d])] },
            { label: 'Year', key: 'year' as const, opts: [['all','All Years'], ...filterOptions.years.map(y => [y, y])] },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</label>
              <select value={filters[f.key]} onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", background: 'var(--surface)', outline: 'none' }}>
                {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={() => setFilters({ status: 'all', toolId: 'all', district: 'all', year: 'all' })}
              style={{ width: '100%', padding: '7px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface-2)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: 'var(--text-2)' }}>
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ── Tab Nav ── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 18, overflowX: 'auto' }}>
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} style={{ padding: '9px 16px', border: 'none', borderBottom: activeTab === i ? '2px solid var(--sky-dim)' : '2px solid transparent', marginBottom: -1, background: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: activeTab === i ? 'var(--sky-dim)' : 'var(--text-3)', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB 0: Overview ── */}
      {activeTab === 0 && (
        <div>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12, marginBottom: 18 }}>
            <KpiCard label="NBSAP Targets" value={targets.length || 22} icon="fa-bullseye" bg="#dbeafe" color="#1e40af" sub="National targets 2020–2030" />
            <KpiCard label="Total Indicators" value={indicators.length} icon="fa-layer-group" bg="#dcfce7" color="#166534" sub="GBF monitoring framework" />
            <KpiCard label="Reports Submitted" value={reports.length} icon="fa-file-lines" bg="#f3e8ff" color="#9333ea" sub="Across all 7 tools" />
            <KpiCard label="Pending Approval" value={pending.length} icon="fa-hourglass-half" bg="#fef9c3" color="#854d0e" sub="Awaiting verification" />
            <KpiCard label="Approved Reports" value={approved.length} icon="fa-circle-check" bg="#dcfce7" color="#166534" sub="Verified data points" />
            <KpiCard label="National Progress" value={`${kpis.overallProgress}%`} icon="fa-chart-line" bg="#e0f2fe" color="#0369a1" sub="Avg across 22 targets" />
            <KpiCard label="On-Track Indicators" value={kpis.completedIndicators} icon="fa-star" bg="#dcfce7" color="#16a34a" sub="Progress ≥ 50% or on-track" />
            <KpiCard label="Active Institutions" value={kpis.institutions} icon="fa-building" bg="#f3e8ff" color="#7c3aed" sub="Reporting entities" />
            <KpiCard label="Evidence Files" value={kpis.evidenceCount} icon="fa-paperclip" bg="#ffedd5" color="#9a3412" sub="Uploaded documents" />
          </div>

          {/* 3 Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <ChartBox title="Target Status Summary" height={250}>
              {targets.length ? <Doughnut data={targetStatusData} options={{ ...chartDefaults, cutout: '65%' }} /> : <NoData />}
            </ChartBox>
            <ChartBox title="Reports by Reporting Tool" height={250}>
              {reports.length ? <Bar data={reportsByToolData} options={{ ...barOpts(), plugins: { legend: { display: false } } }} /> : <NoData />}
            </ChartBox>
            <ChartBox title="Milestone Status (from Indicators)" height={250}>
              {indicators.length ? <Pie data={milestoneData} options={chartDefaults} /> : <NoData />}
            </ChartBox>
          </div>

          {/* Progress gauge row */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14 }}>
            <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>Overall Progress</div>
              <div style={{ height: 160, width: 160 }}>
                <Doughnut
                  data={{ labels: ['Progress', 'Remaining'], datasets: [{ data: [kpis.overallProgress, 100 - kpis.overallProgress], backgroundColor: [C.green, '#f1f5f9'], borderWidth: 0 }] }}
                  options={{ ...chartDefaults, cutout: '72%', plugins: { legend: { display: false } } }}
                />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: C.green, fontFamily: "'Playfair Display', serif", marginTop: -120 }}>{kpis.overallProgress}%</div>
              <div style={{ marginTop: 110, fontSize: '0.68rem', color: 'var(--text-3)' }}>National NBSAP 2020–2030</div>
            </div>
            <ChartBox title="Submission Trend (12 Months)" height={168}>
              {reports.length ? <Line data={trendsData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { position: 'bottom' as const, labels: { font: { size: 10 }, padding: 8 } } } }} /> : <NoData />}
            </ChartBox>
          </div>
        </div>
      )}

      {/* ── TAB 1: Targets & Indicators ── */}
      {activeTab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead icon="fa-bullseye" title="Target Performance" sub="All 22 NBSAP targets — green ≥60%, amber 35–60%, red <35%" />
          <ChartBox title="Target 1–22 Progress % (Color Coded)" height={380}>
            {targets.length ? (
              <Bar data={targetPerfData} options={{ ...barOpts(true), indexAxis: 'y' as const, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw}%` } } } }} />
            ) : <NoData />}
          </ChartBox>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ChartBox title="Reports Submitted per Target" height={280}>
              {reports.length ? <Bar data={reportsByTargetData} options={{ ...barOpts(), plugins: { legend: { display: false } } }} /> : <NoData />}
            </ChartBox>
            <ChartBox title="Target Status Distribution" height={280}>
              {targets.length ? <Doughnut data={targetStatusData} options={{ ...chartDefaults, cutout: '60%' }} /> : <NoData />}
            </ChartBox>
          </div>

          <SectionHead icon="fa-layer-group" title="Indicator Achievement" sub="Baseline → Current → Target (first 15 indicators)" />
          <ChartBox title="Indicator Baseline vs Current vs Target" height={320}>
            {indicators.length ? <Bar data={indicatorAchievData} options={{ ...barOpts(), plugins: { ...chartDefaults.plugins } }} /> : <NoData />}
          </ChartBox>

          {/* Milestone Timeline (CSS-based Gantt) */}
          <SectionHead icon="fa-calendar-days" title="Milestone Timeline" sub="Indicators as timeline milestones — based on current status" />
          <div style={{ ...card, padding: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              {indicators.slice(0, 20).map((ind, i) => {
                const pct = ind.progress;
                const color = ind.status === 'on-track' ? C.green : ind.status === 'at-risk' ? C.amber : C.red;
                return (
                  <div key={ind.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 200, fontSize: '0.7rem', color: 'var(--text-2)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ind.name}>
                      {i + 1}. {ind.name}
                    </div>
                    <div style={{ flex: 1, background: 'var(--surface-3)', borderRadius: 4, height: 14, minWidth: 100 }}>
                      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.5s ease', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
                        {pct >= 20 && <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>{pct}%</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 8, background: `${color}22`, color, fontWeight: 700, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{ind.status}</span>
                  </div>
                );
              })}
              {indicators.length === 0 && <NoData />}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Financial ── */}
      {activeTab === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead icon="fa-coins" title="Budget Performance" sub="From approved T01 (Institutional) and T05 (Finance) reports" />
          <ChartBox title="Budget Allocated vs Utilized vs Remaining (RWF)" height={300}>
            {approved.some(r => r.form_data?.budget_allocated || r.form_data?.budget_utilized) ? (
              <Bar data={budgetData} options={{ ...barOpts(), plugins: { ...chartDefaults.plugins } }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 8 }}>
                <i className="fa-solid fa-database" style={{ fontSize: '2rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.82rem' }}>No budget data in approved T01/T05 reports yet</p>
                <p style={{ fontSize: '0.72rem', opacity: 0.7 }}>Submit T01 or T05 reports with budget fields to populate this chart</p>
              </div>
            )}
          </ChartBox>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Budget Summary</div>
              {(() => {
                let totalAlloc = 0, totalDisb = 0;
                approved.forEach(r => {
                  totalAlloc += parseFloat(String(r.form_data?.budget_allocated ?? r.form_data?.budget_utilized ?? 0)) || 0;
                  totalDisb += parseFloat(String(r.form_data?.budget_disbursed ?? 0)) || 0;
                });
                const pct = totalAlloc > 0 ? Math.round((totalDisb / totalAlloc) * 100) : 0;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Total Allocated', val: `RWF ${totalAlloc.toLocaleString()}`, color: C.blue },
                      { label: 'Total Utilized', val: `RWF ${totalDisb.toLocaleString()}`, color: C.green },
                      { label: 'Remaining', val: `RWF ${Math.max(0, totalAlloc - totalDisb).toLocaleString()}`, color: C.amber },
                      { label: 'Utilization Rate', val: `${pct}%`, color: pct >= 70 ? C.green : pct >= 40 ? C.amber : C.red },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{item.label}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.color, fontFamily: "'DM Mono', monospace" }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <ChartBox title="Finance Reports by Tool" height={220}>
              <Bar data={{ labels: Object.values(TOOL_LABELS), datasets: [{ label: 'Finance Reports', data: Object.keys(TOOL_LABELS).map(id => approved.filter(r => r.tool_id === id && (r.form_data?.budget_allocated || r.form_data?.budget_utilized)).length), backgroundColor: TOOL_COLORS, borderRadius: 4 }] }} options={{ ...barOpts(), plugins: { legend: { display: false } } }} />
            </ChartBox>
          </div>
        </div>
      )}

      {/* ── TAB 3: Compliance ── */}
      {activeTab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead icon="fa-shield-check" title="Reporting Compliance" sub="Approved vs pending submissions by reporting tool" />
          <ChartBox title="Reporting Compliance by Tool" height={300}>
            <Bar data={complianceData} options={{ ...barOpts(), plugins: { ...chartDefaults.plugins } }} />
          </ChartBox>

          <SectionHead icon="fa-map-location-dot" title="Geographic Reporting" sub="Report submissions by district (T02 District Biodiversity Monitoring)" />
          <ChartBox title="District Reporting Activity (Top 15)" height={geoData.labels.length > 0 ? Math.max(250, geoData.labels.length * 28) : 250}>
            {geoData.labels.length > 0 ? (
              <Bar data={geoData} options={{ ...barOpts(true), indexAxis: 'y' as const, plugins: { legend: { display: false } } }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 8 }}>
                <i className="fa-solid fa-map-location-dot" style={{ fontSize: '2rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.82rem' }}>No district data yet — submit T02 reports with a district selected</p>
              </div>
            )}
          </ChartBox>

          {/* Report status table */}
          <SectionHead icon="fa-table" title="Submission Log" sub="All reports in current filter" />
          <div style={{ ...card, padding: 16, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Tool', 'Target', 'District', 'Date', 'Status', 'Submitted By'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 50).map(r => {
                  const sc = { approved: { bg: '#dcfce7', c: '#166534', l: '✓ Approved' }, pending: { bg: '#fef9c3', c: '#854d0e', l: '⏳ Pending' }, rejected: { bg: '#fee2e2', c: '#991b1b', l: '✕ Rejected' } }[r.status] || { bg: '#f1f5f9', c: '#475569', l: r.status };
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{r.tool_id} – {TOOL_LABELS[r.tool_id]?.split(' ')[0]}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>{r.nbsap_target_id ? `T${r.nbsap_target_id}` : '—'}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-2)' }}>{r.district || '—'}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }}>{new Date(r.submitted_at).toLocaleDateString()}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ background: sc.bg, color: sc.c, fontSize: '0.62rem', padding: '2px 7px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{sc.l}</span>
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-3)', fontSize: '0.72rem' }}>{r.submitted_by_profile?.full_name || r.submitted_by_profile?.email || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reports.length > 50 && <div style={{ textAlign: 'center', padding: 10, fontSize: '0.75rem', color: 'var(--text-3)' }}>Showing 50 of {reports.length} — export CSV for full dataset</div>}
            {reports.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>No reports match current filters</div>}
          </div>
        </div>
      )}

      {/* ── TAB 4: Evidence & Activities ── */}
      {activeTab === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ChartBox title="Evidence Files by Type" height={280}>
              {kpis.evidenceCount > 0 ? <Doughnut data={evidenceData} options={{ ...chartDefaults, cutout: '50%' }} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 8 }}>
                  <i className="fa-solid fa-paperclip" style={{ fontSize: '2rem', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.82rem' }}>No evidence files uploaded yet</p>
                </div>
              )}
            </ChartBox>
            <ChartBox title="Approved Reporting Activity by Tool" height={280}>
              <Bar data={activitiesData} options={{ ...barOpts(), plugins: { legend: { display: false } } }} />
            </ChartBox>
          </div>

          <SectionHead icon="fa-triangle-exclamation" title="Challenges Analysis" sub="Top keywords from challenges/notes fields across all reports" />
          <ChartBox title="Most Reported Challenges (Keyword Frequency)" height={300}>
            {challengesData.labels.length > 0 ? (
              <Bar data={challengesData} options={{ ...barOpts(true), indexAxis: 'y' as const, plugins: { legend: { display: false } } }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 8 }}>
                <i className="fa-solid fa-comment-slash" style={{ fontSize: '2rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.82rem' }}>No challenges text found in submitted reports</p>
              </div>
            )}
          </ChartBox>

          {/* Word cloud style display */}
          {challengesData.labels.length > 0 && (
            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Challenge Word Cloud</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 80 }}>
                {challengesData.labels.map((word, i) => {
                  const freq = challengesData.datasets[0].data[i] as number;
                  const max = Math.max(...challengesData.datasets[0].data as number[]);
                  const size = 0.65 + (freq / max) * 0.8;
                  const opacity = 0.4 + (freq / max) * 0.6;
                  return (
                    <span key={word} style={{ fontSize: `${size}rem`, fontWeight: freq / max > 0.5 ? 700 : 500, color: C.red, opacity, fontFamily: "'DM Mono', monospace", cursor: 'default' }} title={`Frequency: ${freq}`}>
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* EIA Compliance (T06) */}
          <SectionHead icon="fa-industry" title="EIA Compliance (T06 Reports)" sub="Private sector compliance status from approved T06 submissions" />
          <ChartBox title="EIA Compliance Status Distribution" height={260}>
            {(() => {
              const t06 = approved.filter(r => r.tool_id === 'T06');
              const full = t06.filter(r => r.form_data?.eia_compliance === 'Full compliance').length;
              const partial = t06.filter(r => r.form_data?.eia_compliance === 'Partial compliance').length;
              const non = t06.filter(r => r.form_data?.eia_compliance === 'Non-compliant').length;
              const na = t06.filter(r => r.form_data?.eia_compliance === 'Not applicable').length;
              if (t06.length === 0) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', flexDirection: 'column', gap: 8 }}><i className="fa-solid fa-building" style={{ fontSize: '2rem', opacity: 0.3 }} /><p style={{ fontSize: '0.82rem' }}>No T06 reports approved yet</p></div>;
              return <Pie data={{ labels: ['Full Compliance', 'Partial', 'Non-Compliant', 'N/A'], datasets: [{ data: [full, partial, non, na], backgroundColor: [C.green, C.amber, C.red, '#94a3b8'], borderWidth: 0 }] }} options={chartDefaults} />;
            })()}
          </ChartBox>
        </div>
      )}

      {/* ── TAB 5: Trends ── */}
      {activeTab === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionHead icon="fa-chart-line" title="Submission Trends" sub="Monthly report submission and approval trends over 12 months" />
          <ChartBox title="Report Submissions Over Time (12 Months)" height={320}>
            {reports.length ? <Line data={trendsData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins } }} /> : <NoData />}
          </ChartBox>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <ChartBox title="Quarterly Submission Volume" height={260}>
              {(() => {
                const quarters: Record<string, number> = {};
                reports.forEach(r => {
                  const d = new Date(r.submitted_at);
                  const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
                  quarters[q] = (quarters[q] || 0) + 1;
                });
                const sorted = Object.entries(quarters).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
                return <Bar data={{ labels: sorted.map(e => e[0]), datasets: [{ label: 'Reports', data: sorted.map(e => e[1]), backgroundColor: C.purple, borderRadius: 4 }] }} options={{ ...barOpts(), plugins: { legend: { display: false } } }} />;
              })()}
            </ChartBox>
            <ChartBox title="Approval Rate Trend" height={260}>
              {(() => {
                const now = new Date();
                const months = Array.from({ length: 6 }, (_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
                  return format(d, 'MMM yyyy');
                });
                const rates = months.map(m => {
                  const mReports = allReports.filter(r => { try { return format(startOfMonth(parseISO(r.submitted_at)), 'MMM yyyy') === m; } catch { return false; } });
                  const mApproved = mReports.filter(r => r.status === 'approved').length;
                  return mReports.length > 0 ? Math.round((mApproved / mReports.length) * 100) : 0;
                });
                return <Line data={{ labels: months, datasets: [{ label: 'Approval Rate %', data: rates, borderColor: C.green, backgroundColor: `${C.green}22`, fill: true, tension: 0.4, pointRadius: 5 }] }} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins } }} />;
              })()}
            </ChartBox>
          </div>

          <SectionHead icon="fa-calendar-check" title="Progress Over Time" sub="National progress trajectory based on approved submissions" />
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>Annual Performance Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {['2024', '2025', '2026'].map(yr => {
                const yrReports = allReports.filter(r => r.submitted_at.startsWith(yr));
                const yrApproved = yrReports.filter(r => r.status === 'approved').length;
                return (
                  <div key={yr} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: C.blue }}>{yrReports.length}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>{yr} Total Reports</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: C.green, marginTop: 4 }}>{yrApproved} approved</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: AI Insights ── */}
      {activeTab === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, #0f2744, #1e3a5f)', borderRadius: 'var(--radius)', padding: 20, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span>✦</span> AI Analytics Engine
                  <span style={{ fontSize: '0.62rem', opacity: 0.6, fontWeight: 400, fontFamily: "'DM Mono', monospace" }}>· Powered by Claude API</span>
                </div>
                <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>Analyzes {reports.length} reports · {targets.length} targets · {indicators.length} indicators · {kpis.evidenceCount} evidence files</p>
              </div>
              <button onClick={handleAI} disabled={aiLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: aiLoading ? 0.6 : 1 }}>
                {aiLoading ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <i className="fa-solid fa-wand-magic-sparkles" />}
                {aiLoading ? 'Analyzing…' : 'Generate Analytics Insights'}
              </button>
            </div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.8, color: '#e0f2fe', whiteSpace: 'pre-wrap' }}>
              {aiText || <span style={{ opacity: 0.55 }}>Click <strong>Generate Analytics Insights</strong> to receive AI-powered trend analysis, emerging risks, performance insights, and recommended actions — derived from your current reporting data using the Claude API.</span>}
            </div>
          </div>

          {/* Data summary for AI context */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-2)', marginBottom: 12 }}>Data Analyzed</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {[
                { label: 'Implementation Activities', val: approved.filter(r => r.form_data?.activities).length + ' reports with activities' },
                { label: 'Challenges Documented', val: reports.filter(r => r.form_data?.challenges).length + ' challenge reports' },
                { label: 'Budget Data Points', val: reports.filter(r => r.form_data?.budget_allocated || r.form_data?.budget_utilized).length + ' finance entries' },
                { label: 'EIA Compliance Records', val: reports.filter(r => r.tool_id === 'T06').length + ' T06 submissions' },
                { label: 'Species Sightings', val: reports.filter(r => r.form_data?.species_sightings).length + ' community reports' },
                { label: 'Research Findings', val: reports.filter(r => r.tool_id === 'T07').length + ' research submissions' },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media print { button { display: none !important; } }`}</style>
    </div>
  );
}

function NoData() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', gap: 8 }}>
      <i className="fa-solid fa-chart-simple" style={{ fontSize: '1.8rem', opacity: 0.25 }} />
      <p style={{ fontSize: '0.78rem' }}>No data yet — submit reports to populate this chart</p>
    </div>
  );
}

export default ReportsPage;
