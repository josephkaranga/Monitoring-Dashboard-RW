import React, { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useReports } from './useData';
import { submitReport, exportReportsToCSV, exportReportsToJSON, deleteReport, importReportsFromJSON } from './reportService';
import { writeAuditEntry } from './dataService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import type { ReportType, ReportAttachment } from './index';

// ── Tool Definitions ─────────────────────────────────────────
const TOOLKIT_TOOLS = [
  { id: 'T01', name: 'National Institutional Reporting', icon: '🏛️', color: '#1B6CA8', accent: '#4CA3DD', frequency: 'Quarterly', output: 'Institutional Compliance Scorecard',
    fields: [
      { key: 'institution', label: 'Reporting Institution', type: 'select', options: ['Environment Ministry','Agriculture Ministry','Infrastructure Ministry','Forestry Authority','Wildlife Authority','National Statistics Office','Water Resources Authority'], required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026'], required: true },
      { key: 'nbsap_target', label: 'NBSAP Target Number', type: 'text', placeholder: 'e.g. TARGET-03', required: true },
      { key: 'current_status', label: 'Current Status / Value', type: 'number', placeholder: '0', required: true },
      { key: 'milestone', label: 'Target Milestone', type: 'number', placeholder: '0', required: true },
      { key: 'budget_utilized', label: 'Budget Utilized (RWF)', type: 'number', placeholder: '0', required: false },
      { key: 'activities', label: 'Implementation Activities', type: 'textarea', placeholder: 'Describe completed activities...', required: false },
      { key: 'challenges', label: 'Challenges Encountered', type: 'textarea', placeholder: 'Describe constraints...', required: false },
    ]
  },
  { id: 'T02', name: 'District Biodiversity Monitoring', icon: '🌿', color: '#1E7D4B', accent: '#4CBB7F', frequency: 'Quarterly', output: 'District Biodiversity Performance Index',
    fields: [
      { key: 'district', label: 'District Name', type: 'text', placeholder: 'e.g. Nyarugenge', required: true },
      { key: 'officer', label: 'Reporting Officer', type: 'text', placeholder: 'Officer name', required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026'], required: true },
      { key: 'forest_ha', label: 'Forest Restoration (ha)', type: 'number', placeholder: '0', required: true },
      { key: 'wetland_ha', label: 'Wetland Rehabilitation (ha)', type: 'number', placeholder: '0', required: true },
      { key: 'agroforestry_hh', label: 'Agroforestry Households', type: 'number', placeholder: '0', required: false },
      { key: 'soil_structures', label: 'Soil Conservation Structures', type: 'number', placeholder: '0', required: false },
      { key: 'conservation_groups', label: 'Conservation Groups', type: 'number', placeholder: '0', required: false },
      { key: 'illegal_cases', label: 'Illegal Activities Reported', type: 'number', placeholder: '0', required: false },
      { key: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any observations...', required: false },
    ]
  },
  { id: 'T03', name: 'Protected Area Monitoring', icon: '🛡️', color: '#5B3FA6', accent: '#9C78E0', frequency: 'Biannual', output: 'Ecosystem Integrity Report',
    fields: [
      { key: 'area_name', label: 'Protected Area Name', type: 'text', placeholder: 'e.g. Nyungwe National Park', required: true },
      { key: 'agency', label: 'Managing Agency', type: 'text', placeholder: 'Agency name', required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['H1 2024','H2 2024','H1 2025','H2 2025'], required: true },
      { key: 'coverage_change_ha', label: 'Coverage Change (ha)', type: 'number', placeholder: '0', required: true },
      { key: 'species_trend', label: 'Species Population Trend', type: 'select', options: ['Increasing','Stable','Declining','Unknown'], required: true },
      { key: 'habitat_quality', label: 'Habitat Quality (1–10)', type: 'number', placeholder: '1', required: true },
      { key: 'illegal_cases', label: 'Illegal Activities Detected', type: 'number', placeholder: '0', required: false },
      { key: 'restoration_ha', label: 'Restoration Activities (ha)', type: 'number', placeholder: '0', required: false },
      { key: 'observations', label: 'Field Observations', type: 'textarea', placeholder: 'Key findings...', required: false },
    ]
  },
  { id: 'T04', name: 'Community Biodiversity Monitoring', icon: '👥', color: '#B56A00', accent: '#F0A030', frequency: 'Quarterly', output: 'Community Observation Dataset',
    fields: [
      { key: 'community', label: 'Community / Village', type: 'text', placeholder: 'Community name', required: true },
      { key: 'reporter', label: 'Reporter / Group Name', type: 'text', placeholder: 'Name or group', required: true },
      { key: 'reporter_type', label: 'Reporter Type', type: 'select', options: ['Community Conservation Committee','Youth Environmental Club','Women\'s Cooperative','Indigenous Knowledge Holder','Other'], required: true },
      { key: 'period', label: 'Reporting Period', type: 'select', options: ['Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026'], required: true },
      { key: 'hwc_incidents', label: 'Human-Wildlife Conflict Incidents', type: 'number', placeholder: '0', required: true },
      { key: 'tree_planting_hh', label: 'Tree Planting Households', type: 'number', placeholder: '0', required: false },
      { key: 'water_source_status', label: 'Water Source Condition', type: 'select', options: ['Good','Fair','Degraded','Dry / Absent'], required: false },
      { key: 'species_sightings', label: 'Species Sightings', type: 'textarea', placeholder: 'e.g. Mountain gorilla – 3 sightings', required: false },
    ]
  },
  { id: 'T05', name: 'Biodiversity Finance Tracking', icon: '💰', color: '#0E6655', accent: '#1ABC9C', frequency: 'Annual', output: 'Finance Gap Analysis',
    fields: [
      { key: 'institution', label: 'Institution Name', type: 'text', placeholder: 'Institution or partner', required: true },
      { key: 'institution_type', label: 'Institution Type', type: 'select', options: ['Ministry of Finance','Environment Ministry','Development Partner','NGO','Private Sector','Other'], required: true },
      { key: 'year', label: 'Fiscal Year', type: 'select', options: ['2023','2024','2025'], required: true },
      { key: 'budget_allocated', label: 'Budget Allocated (RWF)', type: 'number', placeholder: '0', required: true },
      { key: 'budget_disbursed', label: 'Budget Disbursed (RWF)', type: 'number', placeholder: '0', required: true },
      { key: 'implementation_pct', label: 'Implementation Status (%)', type: 'number', placeholder: '0', required: true },
      { key: 'activity_funded', label: 'Activity / Program Funded', type: 'textarea', placeholder: 'Description...', required: false },
    ]
  },
  { id: 'T06', name: 'Private Sector Compliance', icon: '🏗️', color: '#922B21', accent: '#E74C3C', frequency: 'Annual', output: 'Private-Sector Compliance Index',
    fields: [
      { key: 'company', label: 'Company Name', type: 'text', placeholder: 'Company name', required: true },
      { key: 'sector', label: 'Sector', type: 'select', options: ['Infrastructure','Agribusiness','Mining','Tourism','Finance / Investment','Other'], required: true },
      { key: 'year', label: 'Reporting Year', type: 'select', options: ['2023','2024','2025'], required: true },
      { key: 'eia_compliance', label: 'EIA Compliance', type: 'select', options: ['Full compliance','Partial compliance','Non-compliant','Not applicable'], required: true },
      { key: 'restoration_ha', label: 'Restoration Commitments (ha)', type: 'number', placeholder: '0', required: false },
      { key: 'esg_score', label: 'ESG Biodiversity Score (1–100)', type: 'number', placeholder: '0', required: false },
      { key: 'waste_management', label: 'Waste Management Rating', type: 'select', options: ['Excellent','Good','Fair','Poor'], required: false },
    ]
  },
  { id: 'T07', name: 'Research & Academic Contribution', icon: '🔬', color: '#1A5276', accent: '#2E86C1', frequency: 'Annual', output: 'Biodiversity Evidence Repository',
    fields: [
      { key: 'institution', label: 'Research Institution', type: 'text', placeholder: 'University or institute', required: true },
      { key: 'study_title', label: 'Study Title', type: 'text', placeholder: 'Full title', required: true },
      { key: 'year', label: 'Year Completed', type: 'select', options: ['2021','2022','2023','2024','2025'], required: true },
      { key: 'ecosystem_assessed', label: 'Ecosystem Assessed', type: 'select', options: ['Forest','Wetland','Savanna','Aquatic','Agricultural','Urban','Multiple'], required: true },
      { key: 'key_findings', label: 'Key Findings Summary', type: 'textarea', placeholder: 'Summarize main findings...', required: true },
      { key: 'policy_relevance', label: 'Policy Relevance & NBSAP Linkage', type: 'textarea', placeholder: 'How does this support NBSAP?', required: false },
    ]
  },
];

// ── Report Form ───────────────────────────────────────────────
const ReportForm = ({ tool, onBack, onSuccess }: { tool: typeof TOOLKIT_TOOLS[0]; onBack: () => void; onSuccess: () => void }) => {
  const { settings } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    const newErrors: Record<string, boolean> = {};
    tool.fields.forEach(f => { if (f.required && !formData[f.key]?.trim()) newErrors[f.key] = true; });
    if (Object.keys(newErrors).length) { setErrors(newErrors); toast.error('Please fill in all required fields'); return; }

    setSubmitting(true);
    const requireVerification = settings?.require_verification ?? true;
    const result = await submitReport(tool.id as ReportType, tool.name, formData, requireVerification, attachments);
    if (result.error) {
      toast.error(result.error);
    } else {
      await writeAuditEntry('submit', `${tool.name} submitted`, `Tool: ${tool.id} · Status: ${result.data?.status}`);
      toast.success(requireVerification ? 'Submission queued for verification ⏳' : 'Report submitted successfully ✓');
      onSuccess();
    }
    setSubmitting(false);
  }, [formData, tool, settings, attachments, onSuccess]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!['pdf','xlsx','xls','doc','docx'].includes(ext)) return;
      const reader = new FileReader();
      reader.onload = e => {
        setAttachments(prev => [...prev, { name: file.name, ext, size: file.size, data_url: e.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#0ea5e9', fontSize: '0.82rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 18, fontFamily: "'DM Sans', sans-serif" }}>
        ← Back to Tools
      </button>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '2rem' }}>{tool.icon}</span>
          <div>
            <div style={{ fontSize: '0.65rem', color: tool.accent, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', marginBottom: 2 }}>{tool.id} · {tool.frequency}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{tool.name}</div>
            <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>Output: {tool.output}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
            {tool.fields.map(f => (
              <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? 'span 2' : 'span 1' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 5 }}>
                  {f.label}
                  {f.required && <span style={{ color: '#f43f5e', marginLeft: 2 }}>*</span>}
                  {!f.required && <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (optional)</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    placeholder={f.placeholder}
                    rows={3}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', resize: 'vertical', boxShadow: errors[f.key] ? '0 0 0 3px rgba(244,63,94,0.1)' : 'none' }}
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff', color: '#0f172a' }}
                  >
                    <option value="">— Select —</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={formData[f.key] || ''}
                    onChange={e => { setFormData(d => ({ ...d, [f.key]: e.target.value })); setErrors(err => ({ ...err, [f.key]: false })); }}
                    placeholder={f.placeholder}
                    min={f.type === 'number' ? 0 : undefined}
                    style={{ width: '100%', padding: '9px 12px', border: `1.5px solid ${errors[f.key] ? '#f43f5e' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxShadow: errors[f.key] ? '0 0 0 3px rgba(244,63,94,0.1)' : 'none' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            style={{ border: '2px dashed #e2e8f0', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 14, transition: '0.2s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = '#0ea5e9')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0')}
          >
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: 6 }}>📎</span>
            <div style={{ fontSize: '0.82rem', color: '#475569' }}>Drop files or <span style={{ color: tool.accent, textDecoration: 'underline' }}>browse</span></div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 3 }}>PDF · Excel (.xlsx) · Word (.docx)</div>
          </div>

          {/* Attached files */}
          {attachments.map((att, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '0.82rem' }}>📄</span>
              <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{(att.size / 1024).toFixed(1)} KB</span>
              <button type="button" onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" disabled={submitting} style={{ padding: '10px 28px', background: `linear-gradient(135deg, ${tool.color}, ${tool.accent})`, color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.88rem', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {submitting && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
              {submitting ? 'Submitting…' : 'Submit Report →'}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
};

// ── Success screen ────────────────────────────────────────────
const SuccessScreen = ({ tool, onAnother, onBack }: { tool: typeof TOOLKIT_TOOLS[0]; onAnother: () => void; onBack: () => void }) => (
  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 48, textAlign: 'center' }}>
    <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>Report Submitted Successfully</h3>
    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 20 }}>{tool.name} · {new Date().toLocaleDateString()}</p>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button onClick={onAnother} style={{ padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${tool.accent}`, color: tool.accent, background: 'transparent', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Submit Another</button>
      <button onClick={onBack} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: tool.accent, color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back to Tools</button>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────
export default function ReportingToolkitPage() {
  const [searchParams] = useSearchParams();
  const initTool = searchParams.get('tool');
  const [activeTool, setActiveTool] = useState<typeof TOOLKIT_TOOLS[0] | null>(initTool ? TOOLKIT_TOOLS.find(t => t.id === initTool) || null : null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'submissions' | 'analytics'>('submissions');
  const [toolFilter, setToolFilter] = useState('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { reports, loading, refetch } = useReports({ toolId: toolFilter !== 'ALL' ? toolFilter as ReportType : undefined, pageSize: 50 });

  const handleDelete = useCallback(async (reportId: string, toolName: string) => {
    if (!window.confirm(`Delete "${toolName}" submission? This cannot be undone.`)) return;
    const result = await deleteReport(reportId);
    if (result.error) toast.error(result.error);
    else { toast.success('Submission deleted'); refetch(); }
  }, [refetch]);

  const handleExportCSV = useCallback(() => {
    const csv = exportReportsToCSV(reports);
    if (!csv) { toast.error('No data to export'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nbsap_toolkit_${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported');
  }, [reports]);

  const handleExportJSON = useCallback(() => {
    const json = exportReportsToJSON(reports);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = `nbsap_toolkit_backup_${Date.now()}.json`;
    a.click();
    toast.success('JSON backup exported');
  }, [reports]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = await importReportsFromJSON(text);
    if (result.error) toast.error(result.error);
    else { toast.success(`Imported ${result.data?.imported} records`); refetch(); }
  }, [refetch]);

  const toolCounts: Record<string, number> = {};
  reports.forEach(r => { toolCounts[r.tool_id] = (toolCounts[r.tool_id] || 0) + 1; });

  if (activeTool && !showSuccess) {
    return <ReportForm tool={activeTool} onBack={() => { setActiveTool(null); setShowSuccess(false); }} onSuccess={() => { setShowSuccess(true); refetch(); }} />;
  }
  if (activeTool && showSuccess) {
    return <SuccessScreen tool={activeTool} onAnother={() => setShowSuccess(false)} onBack={() => { setActiveTool(null); setShowSuccess(false); }} />;
  }

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #0ea5e9' }}>
        <span style={{ fontSize: '1.5rem' }}>📝</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Integrated Reporting Modules (T01–T07)</div>
          <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: 2 }}>Structured templates linked to the 5-tier data pipeline. Each submission is stored in Supabase and flows through to the national dashboard.</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['Quarterly','Biannual','Annual'].map(f => (
            <span key={f} style={{ fontSize: '0.65rem', padding: '3px 9px', borderRadius: 10, background: f === 'Quarterly' ? '#dcfce7' : f === 'Biannual' ? '#dbeafe' : '#fef9c3', color: f === 'Quarterly' ? '#166534' : f === 'Biannual' ? '#1e40af' : '#854d0e', fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Tool cards grid — responsive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
        {TOOLKIT_TOOLS.map(t => {
          const cnt = toolCounts[t.id] || 0;
          return (
            <div
              key={t.id}
              onClick={() => { setActiveTool(t); setShowSuccess(false); }}
              style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', borderTop: `3px solid ${t.accent}`, padding: 18, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
            >
              <span style={{ fontSize: '1.6rem', marginBottom: 10, display: 'block' }}>{t.icon}</span>
              <div style={{ fontSize: '0.62rem', color: t.accent, fontFamily: "'DM Mono', monospace", marginBottom: 4, letterSpacing: '0.08em' }}>{t.id} · {t.frequency}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 10 }}>→ {t.output}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 8, background: `${t.accent}22`, color: t.accent, fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{t.frequency}</span>
                {cnt > 0 && <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700 }}>✓ {cnt} submitted</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submissions section */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0', padding: '0 16px' }}>
          {[['submissions', '🗂 Submissions'], ['analytics', '📊 Analytics']].map(([k, l]) => (
            <button key={k} onClick={() => setActiveSubTab(k as 'submissions' | 'analytics')} style={{ padding: '9px 16px', border: 'none', borderBottom: activeSubTab === k ? '2px solid #0ea5e9' : '2px solid transparent', marginBottom: -1, background: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: activeSubTab === k ? '#0ea5e9' : '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>
              {l}
            </button>
          ))}
        </div>

        {activeSubTab === 'submissions' && (
          <div style={{ padding: 16 }}>
            {/* Filter row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <select value={toolFilter} onChange={e => setToolFilter(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#fff' }}>
                <option value="ALL">All Tools</option>
                {TOOLKIT_TOOLS.map(t => <option key={t.id} value={t.id}>{t.id} – {t.name}</option>)}
              </select>
              <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid #0ea5e9', borderRadius: 8, color: '#0ea5e9', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>📥 Export CSV</button>
              <button onClick={handleExportJSON} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid #8b5cf6', borderRadius: 8, color: '#8b5cf6', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>📦 Export JSON</button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1.5px solid #10b981', borderRadius: 8, color: '#10b981', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                📂 Import JSON
                <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>Loading…</div>
            ) : reports.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📥</div>
                <p style={{ fontSize: '0.85rem' }}>No submissions yet. Use a reporting tool above.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Tool', 'Date', 'Status', 'Key Fields', 'Submitted By', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => {
                      const tool = TOOLKIT_TOOLS.find(t => t.id === r.tool_id);
                      const statusConf = { pending: { bg: '#fef9c3', color: '#854d0e', label: '⏳ Pending' }, approved: { bg: '#dcfce7', color: '#166534', label: '✓ Approved' }, rejected: { bg: '#fee2e2', color: '#991b1b', label: '✕ Rejected' } }[r.status] || { bg: '#f1f5f9', color: '#475569', label: r.status };
                      const keyField = Object.entries(r.form_data || {}).find(([k]) => ['district','institution','company','area_name','community','study_title'].includes(k));
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.1rem' }}>{tool?.icon}</span>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.78rem' }}>{r.tool_id}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{tool?.frequency}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#94a3b8', fontFamily: "'DM Mono', monospace", fontSize: '0.72rem' }}>
                            {new Date(r.submitted_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ background: statusConf.bg, color: statusConf.color, fontSize: '0.62rem', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{statusConf.label}</span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569', fontSize: '0.78rem' }}>
                            {keyField ? `${keyField[0].replace(/_/g, ' ')}: ${keyField[1]}` : `${Object.keys(r.form_data || {}).length} fields`}
                          </td>
                          <td style={{ padding: '11px 14px', color: '#475569', fontSize: '0.75rem' }}>
                            {r.submitted_by_profile?.full_name || r.submitted_by_profile?.email || '—'}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <button onClick={() => handleDelete(r.id, r.tool_name)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.78rem', padding: '3px 6px', borderRadius: 5 }}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'analytics' && (
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Submissions', val: reports.length, color: '#0ea5e9' },
                { label: 'Approved', val: reports.filter(r => r.status === 'approved').length, color: '#10b981' },
                { label: 'Pending Review', val: reports.filter(r => r.status === 'pending').length, color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {TOOLKIT_TOOLS.map(t => {
              const cnt = reports.filter(r => r.tool_id === t.id).length;
              const max = Math.max(...TOOLKIT_TOOLS.map(tt => reports.filter(r => r.tool_id === tt.id).length), 1);
              return (
                <div key={t.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                    <span>{t.icon} {t.id} · {t.name.split(' ').slice(0, 2).join(' ')}</span>
                    <span style={{ color: t.accent, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{cnt}</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 7 }}>
                    <div style={{ background: t.accent, width: `${(cnt / max) * 100}%`, height: 7, borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
