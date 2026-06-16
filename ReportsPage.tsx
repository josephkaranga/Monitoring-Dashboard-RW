import React, { useCallback } from 'react';
import { useDashboardStats, useReports } from './useData';
import { exportReportsToCSV } from './reportService';
import toast from 'react-hot-toast';

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 'var(--radius)',
  border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
};

export function ReportsPage() {
  const { stats } = useDashboardStats(false);
  const { reports } = useReports({ pageSize: 200 });

  const handlePDF = useCallback(() => {
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('NBSAP Monitoring Dashboard — Rwanda', 15, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('National Biodiversity Strategy & Action Plan 2025-2030', 15, 19);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 25);
      let y = 38;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Dashboard Summary', 15, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Total Submissions: ${reports.length}`, 15, y); y += 6;
      doc.text(`Indicators On-Track: ${stats?.onTrackIndicators ?? '—'} / 22`, 15, y); y += 6;
      doc.text(`Active Districts: ${stats?.activeDistricts ?? '—'}`, 15, y); y += 6;
      doc.save(`nbsap_report_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      const csv = exportReportsToCSV(reports);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `nbsap_report_${Date.now()}.csv`;
      a.click();
      toast.success('Report exported as CSV');
    }
  }, [reports, stats]);

  const handleCSV = useCallback(() => {
    const csv = exportReportsToCSV(reports);
    if (!csv) { toast.error('No data'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nbsap_q4_${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  }, [reports]);

  const reportRows = [
    { title: 'Annual NBSAP Report',    period: '2025',         status: 'Completed', sBg: '#dcfce7', sColor: '#166534', due: 'Mar 30, 2026', dl: '✓ Done',  dlBg: '#dcfce7', dlColor: '#166534' },
    { title: 'Q4 Operational Update',  period: 'Oct–Dec 2025', status: 'In Review', sBg: '#dbeafe', sColor: '#1e40af', due: 'Jan 15, 2026', dl: '✓ Done',  dlBg: '#dcfce7', dlColor: '#166534' },
    { title: 'Gender Monitoring Report',period: '2025',         status: 'Pending',   sBg: '#fef9c3', sColor: '#854d0e', due: 'Apr 15, 2026', dl: '16 days', dlBg: '#ffedd5', dlColor: '#9a3412' },
    { title: 'Mid-Term Evaluation',     period: '2025–2027',    status: 'Scheduled', sBg: '#f1f5f9', sColor: '#475569', due: 'Q3 2027',      dl: '17+ mo',  dlBg: '#dcfce7', dlColor: '#166534' },
    { title: 'CBD National Report',     period: '2025–2029',    status: 'Scheduled', sBg: '#f1f5f9', sColor: '#475569', due: 'Jun 2029',     dl: '39 mo',   dlBg: '#dcfce7', dlColor: '#166534' },
  ];

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: 'fa-file-pdf',      bg: '#dbeafe', iconColor: '#1e40af', title: 'Annual Reports',      desc: 'Progress against 22 NBSAP targets',    btnColor: '#1e40af', btnLabel: 'Download 2025 Report', onClick: handlePDF },
          { icon: 'fa-chart-line',    bg: '#dcfce7', iconColor: '#16a34a', title: 'Quarterly Updates',   desc: 'Operational updates on activities',     btnColor: '#16a34a', btnLabel: 'Export Q4 2025 CSV',   onClick: handleCSV },
          { icon: 'fa-file-contract', bg: '#f3e8ff', iconColor: '#9333ea', title: 'CBD National Report', desc: 'International reporting obligations',   btnColor: '#7c3aed', btnLabel: 'Due: Jun 2029',         onClick: () => {} },
        ].map(c => (
          <div key={c.title} style={{ ...card, padding: 18, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, background: c.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <i className={`fa-solid ${c.icon}`} style={{ color: c.iconColor, fontSize: '1.3rem' }} />
            </div>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6 }}>{c.title}</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 14 }}>{c.desc}</p>
            <button onClick={c.onClick} style={{ background: c.btnColor, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
              <i className="fa-solid fa-download" /> {c.btnLabel}
            </button>
          </div>
        ))}
      </div>

      {/* Report status table */}
      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: '0.9rem', fontWeight: 700 }}>
          <i className="fa-solid fa-list-check" style={{ color: 'var(--sky-dim)' }} />
          Report Generation Status
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {['Report Type','Period','Status','Due Date','Deadline','Action'].map(h => (
                  <th key={h} style={{ padding: '9px 13px', textAlign: 'left', fontSize: '0.67rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportRows.map(r => (
                <tr key={r.title} style={{ borderBottom: '1px solid var(--surface-3)' }}>
                  <td style={{ padding: '11px 13px', fontWeight: 600 }}>{r.title}</td>
                  <td style={{ padding: '11px 13px', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem' }}>{r.period}</td>
                  <td style={{ padding: '11px 13px' }}>
                    <span style={{ background: r.sBg, color: r.sColor, fontSize: '0.65rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '11px 13px', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem' }}>{r.due}</td>
                  <td style={{ padding: '11px 13px' }}>
                    <span style={{ background: r.dlBg, color: r.dlColor, fontSize: '0.62rem', padding: '2px 7px', borderRadius: 10, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{r.dl}</span>
                  </td>
                  <td style={{ padding: '11px 13px' }}>
                    <button onClick={handlePDF} style={{ color: 'var(--sky-dim)', fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>PDF ↓</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handlePDF} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#0f2744,#1e3a5f)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 9, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: 'var(--shadow-md)' }}>
          <i className="fa-solid fa-file-export" /> Generate Full Report (PDF)
        </button>
      </div>
    </div>
  );
}

export default ReportsPage;
