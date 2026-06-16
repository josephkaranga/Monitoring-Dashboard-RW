// ============================================================
// ReportsPage.tsx
// ============================================================
import React, { useCallback } from 'react';
import { useDashboardStats, useReports } from './useData';
import { exportReportsToCSV, exportReportsToJSON } from './reportService';
import toast from 'react-hot-toast';

export function ReportsPage() {
  const { stats } = useDashboardStats(false);
  const { reports } = useReports({ pageSize: 200 });

  const handlePDF = useCallback(() => {
    try {
      const { jsPDF } = (window as unknown as { jspdf: { jsPDF: new () => { text: (t: string, x: number, y: number) => void; save: (n: string) => void; setFontSize: (s: number) => void; setFont: (f: string, t: string) => void } } }).jspdf;
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('NBSAP Monitoring Report — Rwanda', 15, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 30);
      doc.text(`Total Submissions: ${reports.length}`, 15, 42);
      doc.text(`Indicators On-Track: ${stats?.onTrackIndicators ?? '—'} / 22`, 15, 50);
      doc.text(`Active Districts: ${stats?.activeDistricts ?? '—'}`, 15, 58);
      doc.save(`nbsap_report_${Date.now()}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      // Fallback: export as CSV
      const csv = exportReportsToCSV(reports);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `nbsap_report_${Date.now()}.csv`; a.click();
      toast.success('Report exported as CSV');
    }
  }, [reports, stats]);

  const handleCSV = useCallback(() => {
    const csv = exportReportsToCSV(reports);
    if (!csv) { toast.error('No data'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `nbsap_q4_${Date.now()}.csv`; a.click();
    toast.success('CSV exported');
  }, [reports]);

  const reportRows = [
    { title: 'Annual NBSAP Report', period: '2025', status: 'Completed', statusColor: '#dcfce7', statusText: '#166534', due: 'Mar 30, 2026', deadline: '✓ Done', dlColor: '#dcfce7', dlText: '#166634' },
    { title: 'Q4 Operational Update', period: 'Oct–Dec 2025', status: 'In Review', statusColor: '#dbeafe', statusText: '#1e40af', due: 'Jan 15, 2026', deadline: '✓ Done', dlColor: '#dcfce7', dlText: '#166634' },
    { title: 'Gender Monitoring Report', period: '2025', status: 'Pending', statusColor: '#fef9c3', statusText: '#854d0e', due: 'Apr 15, 2026', deadline: '16 days', dlColor: '#ffedd5', dlText: '#9a3412' },
    { title: 'Mid-Term Evaluation', period: '2025–2027', status: 'Scheduled', statusColor: '#f1f5f9', statusText: '#475569', due: 'Q3 2027', deadline: '17+ mo', dlColor: '#dcfce7', dlText: '#166634' },
    { title: 'CBD National Report', period: '2025–2029', status: 'Scheduled', statusColor: '#f1f5f9', statusText: '#475569', due: 'Jun 2029', deadline: '39 mo', dlColor: '#dcfce7', dlText: '#166634' },
  ];

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '📄', bg: '#dbeafe', iconColor: '#1e40af', title: 'Annual Reports', desc: 'Progress against 22 NBSAP targets', btnColor: '#1e40af', btnLabel: 'Download 2025 Report', onClick: handlePDF },
          { icon: '📈', bg: '#dcfce7', iconColor: '#16a34a', title: 'Quarterly Updates', desc: 'Operational updates on activities', btnColor: '#16a34a', btnLabel: 'Export Q4 2025 CSV', onClick: handleCSV },
          { icon: '📋', bg: '#f3e8ff', iconColor: '#9333ea', title: 'CBD National Report', desc: 'International reporting obligations', btnColor: '#7c3aed', btnLabel: 'Due: Jun 2029', onClick: () => {} },
        ].map(c => (
          <div key={c.title} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 52, height: 52, background: c.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.3rem' }}>{c.icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{c.title}</h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 14 }}>{c.desc}</p>
            <button onClick={c.onClick} style={{ background: c.btnColor, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
              📥 {c.btnLabel}
            </button>
          </div>
        ))}
      </div>

      {/* Report status table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 14 }}>✅ Report Generation Status</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Report Type','Period','Status','Due Date','Deadline','Action'].map(h => (
                  <th key={h} style={{ padding: '10px 13px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows.map(r => (
                <tr key={r.title} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 13px', fontWeight: 600 }}>{r.title}</td>
                  <td style={{ padding: '11px 13px', color: '#94a3b8', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem' }}>{r.period}</td>
                  <td style={{ padding: '11px 13px' }}><span style={{ background: r.statusColor, color: r.statusText, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{r.status}</span></td>
                  <td style={{ padding: '11px 13px', color: '#94a3b8', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem' }}>{r.due}</td>
                  <td style={{ padding: '11px 13px' }}><span style={{ background: r.dlColor, color: r.dlText, fontSize: '0.62rem', padding: '2px 7px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{r.deadline}</span></td>
                  <td style={{ padding: '11px 13px' }}>
                    <button onClick={handlePDF} style={{ color: '#0ea5e9', fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>Export ↓</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handlePDF} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 9, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          📤 Generate Full Report (PDF)
        </button>
      </div>
    </div>
  );
}

export default ReportsPage;
