/**
 * Narrative Report Export Service
 * Generates descriptive, narrative-style national reports for NBSAP 2025–2030.
 * Supports formatted Word-compatible (.doc) download and multi-page PDF generation.
 */

import { jsPDF } from 'jspdf';
import type { ToolkitReport, NBSAPTarget, Indicator } from '../types/index';

export interface NarrativeExportOptions {
  targets: NBSAPTarget[];
  indicators: Indicator[];
  reports: ToolkitReport[];
  overallProgress?: number;
  timeframe?: string;
  authorName?: string;
}

export function generateNarrativeHTML(options: NarrativeExportOptions): string {
  const {
    targets,
    indicators,
    reports,
    overallProgress = 0,
    timeframe = '2025–2030',
    authorName = 'REMA M&E Team',
  } = options;
  const approvedReports = reports.filter(
    r => r.status === 'approved' || r.workflow_status === 'published'
  );
  const now = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Group reports by target
  const reportsByTarget: Record<number, ToolkitReport[]> = {};
  for (const r of reports) {
    if (r.nbsap_target_id) {
      if (!reportsByTarget[r.nbsap_target_id]) reportsByTarget[r.nbsap_target_id] = [];
      reportsByTarget[r.nbsap_target_id].push(r);
    }
  }

  // Build target sections
  const targetNarratives = targets
    .map(t => {
      const targetReports = reportsByTarget[t.id] || [];
      const relatedIndicators = indicators.filter(i => i.nbsap_target_id === t.id);

      // Collect activities & challenges from form_data
      const activities: string[] = [];
      const challenges: string[] = [];
      const observations: string[] = [];

      for (const rep of targetReports) {
        if (rep.form_data) {
          if (rep.form_data.activities) activities.push(String(rep.form_data.activities));
          if (rep.form_data.challenges) challenges.push(String(rep.form_data.challenges));
          if (rep.form_data.notes) observations.push(String(rep.form_data.notes));
          if (rep.form_data.key_findings) observations.push(String(rep.form_data.key_findings));
        }
      }

      return `
      <div class="target-card">
        <h3>Target ${t.id}: ${t.title}</h3>
        <p class="meta"><strong>Strategic Goal:</strong> ${t.goal} &nbsp;|&nbsp; <strong>Cumulative Progress:</strong> ${t.progress}% &nbsp;|&nbsp; <strong>Submissions:</strong> ${targetReports.length}</p>
        <p><strong>Baseline Context:</strong> ${t.baseline || 'Baseline monitoring active under 2025–2030 framework.'}</p>
        
        <h4>1. Implementation Narrative & Key Activities</h4>
        <p>${
          activities.length > 0
            ? activities.map(a => `• ${a}`).join('<br>')
            : 'Lead institutions are executing aligned biodiversity conservation activities and operational baseline indicators under this national target.'
        }</p>

        <h4>2. Operational Challenges & Bottlenecks</h4>
        <p>${
          challenges.length > 0
            ? challenges.map(c => `• ${c}`).join('<br>')
            : 'No acute institutional bottlenecks were logged in this reporting period; routine cross-sector monitoring continues.'
        }</p>

        ${
          observations.length > 0
            ? `
          <h4>3. Field Observations & Research Notes</h4>
          <p>${observations.map(o => `• ${o}`).join('<br>')}</p>
        `
            : ''
        }

        <p class="indicator-tag">Related National Indicators (${relatedIndicators.length}): ${
          relatedIndicators
            .map(i => i.name)
            .slice(0, 4)
            .join(', ') || 'General target indicators'
        }${relatedIndicators.length > 4 ? ` and ${relatedIndicators.length - 4} more` : ''}</p>
      </div>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Rwanda NBSAP Narrative Monitoring Report</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #1e293b;
          max-width: 850px;
          margin: 40px auto;
          padding: 0 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #1b6ca8;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1b6ca8;
          margin-bottom: 5px;
          font-size: 24px;
        }
        .header h2 {
          color: #475569;
          font-size: 16px;
          font-weight: 500;
          margin-top: 0;
        }
        .meta-bar {
          background: #f1f5f9;
          padding: 12px 18px;
          border-radius: 6px;
          margin-bottom: 24px;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
        }
        .executive-summary {
          background: #f8fafc;
          border-left: 4px solid #1b6ca8;
          padding: 16px 20px;
          margin-bottom: 30px;
          border-radius: 0 6px 6px 0;
        }
        .executive-summary h3 {
          margin-top: 0;
          color: #0f172a;
        }
        .target-card {
          margin-bottom: 28px;
          padding: 18px 20px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .target-card h3 {
          margin-top: 0;
          color: #1e3a8a;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
        }
        .target-card h4 {
          margin: 14px 0 6px 0;
          color: #334155;
          font-size: 14px;
        }
        .meta {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 12px;
        }
        .indicator-tag {
          font-size: 12px;
          color: #0369a1;
          background: #e0f2fe;
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: 12px;
        }
        .footer {
          margin-top: 40px;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>REPUBLIC OF RWANDA</h1>
        <h2>RWANDA ENVIRONMENT MANAGEMENT AUTHORITY (REMA)</h2>
        <h3>National Biodiversity Strategy & Action Plan (NBSAP 2025–2030)</h3>
        <p>Comprehensive Narrative Implementation Progress Report</p>
      </div>

      <div class="meta-bar">
        <span><strong>Report Period:</strong> ${timeframe}</span>
        <span><strong>Generated Date:</strong> ${now}</span>
        <span><strong>Compiled By:</strong> ${authorName}</span>
      </div>

      <div class="executive-summary">
        <h3>Executive Narrative Synthesis</h3>
        <p>
          This document represents the synthesized qualitative and quantitative progress of Rwanda's 2025–2030
          National Biodiversity Strategy and Action Plan (NBSAP). Current overall national achievement stands at
          <strong>${overallProgress}%</strong>, evaluated across <strong>${targets.length} National Targets</strong>
          and <strong>${indicators.length} National Indicators</strong>.
        </p>
        <p>
          A total of <strong>${reports.length} monitoring submissions</strong> have been compiled across National Institutional
          Reporting (T01), District Biodiversity Monitoring (T02), Private Sector Compliance (T03), and Research Contributions (T04),
          with <strong>${approvedReports.length} validated and published reports</strong> actively contributing to national indicator milestones.
        </p>
      </div>

      <h2>Detailed Target Implementation Narratives</h2>
      ${targetNarratives}

      <div class="footer">
        <p>© ${new Date().getFullYear()} Rwanda Environment Management Authority (REMA) — NBSAP Monitoring & Evaluation Framework</p>
      </div>
    </body>
    </html>
  `;
}

export function downloadNarrativeDocument(options: NarrativeExportOptions, filename?: string) {
  const html = generateNarrativeHTML(options);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `NBSAP_Narrative_Report_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadNarrativePDF(options: NarrativeExportOptions, filename?: string) {
  const { targets, reports, overallProgress = 0, timeframe = '2025–2030' } = options;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(27, 108, 168);
  doc.text('REPUBLIC OF RWANDA — REMA', 15, y);
  y += 7;

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('NBSAP 2025–2030 Comprehensive Narrative Report', 15, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Period: ${timeframe} | Generated: ${new Date().toLocaleDateString()} | Total Reports: ${reports.length}`,
    15,
    y
  );
  y += 10;

  // Executive Summary Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 180, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Summary', 20, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const summaryText = `Rwanda's NBSAP 2025-2030 implementation is at ${overallProgress}% overall completion. Cross-sector stakeholders and local districts have submitted ${reports.length} reports tracking 22 national biodiversity targets. Below is the detailed narrative progress by target.`;
  const splitSummary = doc.splitTextToSize(summaryText, 170);
  doc.text(splitSummary, 20, y + 13);
  y += 34;

  // Target narratives
  targets.forEach((t, index) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(27, 108, 168);
    doc.text(`Target ${t.id}: ${t.title.slice(0, 60)}`, 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Progress: ${t.progress}% | Goal: ${t.goal} | Baseline: ${t.baseline ? t.baseline.slice(0, 50) : 'Active'}`,
      15,
      y
    );
    y += 5;

    // Narrative text
    doc.setTextColor(51, 65, 85);
    const narrativeText = `Active implementation under Target ${t.id} aligns with Rwanda's GBF commitment (${t.goal}). Stakeholder monitoring highlights continued ecosystem assessments, forest and wetland protection measures, and institutional capacity enhancements.`;
    const splitNarrative = doc.splitTextToSize(narrativeText, 180);
    doc.text(splitNarrative, 15, y);
    y += splitNarrative.length * 4 + 6;
  });

  doc.save(filename || `NBSAP_Narrative_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
