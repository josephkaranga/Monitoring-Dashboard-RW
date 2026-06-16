// ============================================================
// AIExtractionPanel — shown inside VerifQueuePage report cards
// Displays AI extraction status, findings, and per-proposal
// approve/reject/modify controls for reviewers.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  approveProposal,
  applyApprovedProposals,
  fetchExtraction,
  rejectProposal,
  retriggerExtraction,
} from '../../services/aiExtractionService';
import type { AIExtraction, AIExtractionProposal, AIProposalStatus } from '../../types/index';

interface Props {
  reportId: string;
  reviewerId: string;
}

const PROPOSAL_LABELS: Record<string, string> = {
  indicator_value:    'Indicator Update',
  target_progress:    'Target Progress',
  target_association: 'Target Link',
  budget_update:      'Budget Finding',
  geographic_update:  'Geographic Data',
  milestone_status:   'Milestone',
};

const PROPOSAL_COLORS: Record<string, { bg: string; text: string }> = {
  indicator_value:    { bg: '#dbeafe', text: '#1e40af' },
  target_progress:    { bg: '#dcfce7', text: '#166534' },
  target_association: { bg: '#f3e8ff', text: '#6b21a8' },
  budget_update:      { bg: '#fef9c3', text: '#854d0e' },
  geographic_update:  { bg: '#e0f2fe', text: '#0369a1' },
  milestone_status:   { bg: '#ffedd5', text: '#9a3412' },
};

const STATUS_CHIP: Record<AIProposalStatus, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Pending',  bg: '#f1f5f9', color: '#475569' },
  approved: { label: 'Approved', bg: '#dcfce7', color: '#166534' },
  rejected: { label: 'Rejected', bg: '#fee2e2', color: '#991b1b' },
  modified: { label: 'Modified', bg: '#fef9c3', color: '#854d0e' },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: '0.65rem', fontWeight: 700, color, fontFamily: "'DM Mono', monospace", width: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: AIExtractionProposal;
  onApprove: (p: AIExtractionProposal, modified?: string) => Promise<void>;
  onReject: (p: AIExtractionProposal) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const chips = PROPOSAL_COLORS[proposal.proposal_type] ?? { bg: '#f1f5f9', text: '#475569' };
  const sc = STATUS_CHIP[proposal.status];

  const parseDisplay = (raw: string) => {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  };

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(proposal, editMode && editValue.trim() ? editValue.trim() : undefined);
    setLoading(false);
    setEditMode(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(proposal);
    setLoading(false);
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--surface)', marginBottom: 8 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: chips.bg, color: chips.text }}>
            {PROPOSAL_LABELS[proposal.proposal_type] ?? proposal.proposal_type}
          </span>
          {proposal.source_field && (
            <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
              from: {proposal.source_field}
            </span>
          )}
        </div>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: sc.bg, color: sc.color }}>
          {sc.label}
        </span>
      </div>

      {/* Confidence */}
      {proposal.confidence_score !== undefined && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Confidence</div>
          <ConfidenceBar value={proposal.confidence_score} />
        </div>
      )}

      {/* Current vs Proposed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        {proposal.current_value && (
          <div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Current</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: "'DM Mono', monospace", background: '#f8fafc', borderRadius: 6, padding: '4px 8px', wordBreak: 'break-word' }}>
              {proposal.current_value}
            </div>
          </div>
        )}
        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Proposed</div>
          <div style={{ fontSize: '0.72rem', color: '#0f172a', fontFamily: "'DM Mono', monospace", background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 8px', wordBreak: 'break-word' }}>
            {parseDisplay(proposal.modified_value ?? proposal.proposed_value)}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {proposal.reasoning && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', lineHeight: 1.5, background: 'var(--surface-2)', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontStyle: 'italic' }}>
          {proposal.reasoning}
        </div>
      )}

      {/* Modify input */}
      {editMode && proposal.status === 'pending' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Override value (JSON)</div>
          <textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            rows={2}
            placeholder={`e.g. {"current_value":"70%"}`}
            style={{ width: '100%', padding: '6px 10px', border: '1.5px solid var(--sky-dim)', borderRadius: 7, fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>
      )}

      {/* Action buttons */}
      {proposal.status === 'pending' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={handleApprove}
            disabled={loading}
            style={{ padding: '5px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.6 : 1 }}>
            {loading ? '…' : '✓ Approve'}
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            style={{ padding: '5px 14px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.6 : 1 }}>
            {loading ? '…' : '✕ Reject'}
          </button>
          <button
            onClick={() => { setEditMode(m => !m); setEditValue(proposal.proposed_value); }}
            style={{ padding: '5px 14px', background: '#fef9c3', color: '#854d0e', border: 'none', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            {editMode ? 'Cancel Edit' : '✎ Modify'}
          </button>
        </div>
      )}
      {proposal.reviewer_note && (
        <div style={{ marginTop: 6, fontSize: '0.65rem', color: 'var(--text-3)', fontStyle: 'italic' }}>
          Note: {proposal.reviewer_note}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────
export function AIExtractionPanel({ reportId, reviewerId }: Props) {
  const [extraction, setExtraction] = useState<AIExtraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const result = await fetchExtraction(reportId);
    setExtraction(result);
    setLoading(false);

    // Poll while still processing
    if (result?.status === 'processing' || result?.status === 'pending') {
      pollRef.current = setTimeout(load, 3000);
    }
  }, [reportId]);

  useEffect(() => {
    setLoading(true);
    load();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [load]);

  const handleApprove = useCallback(async (p: AIExtractionProposal, modified?: string) => {
    const { error } = await approveProposal(p, reviewerId, modified);
    if (error) { toast.error(`Approve failed: ${error}`); return; }
    toast.success('Proposal approved');
    setExtraction(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        proposals: (prev.proposals ?? []).map(x =>
          x.id === p.id ? { ...x, status: modified ? 'modified' : 'approved', modified_value: modified } : x
        ),
      };
    });
  }, [reviewerId]);

  const handleReject = useCallback(async (p: AIExtractionProposal) => {
    const { error } = await rejectProposal(p.id, reviewerId);
    if (error) { toast.error(`Reject failed: ${error}`); return; }
    toast.success('Proposal rejected');
    setExtraction(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        proposals: (prev.proposals ?? []).map(x =>
          x.id === p.id ? { ...x, status: 'rejected' } : x
        ),
      };
    });
  }, [reviewerId]);

  const handleApplyAll = useCallback(async () => {
    setApplying(true);
    const { applied, errors } = await applyApprovedProposals(reportId, reviewerId);
    setApplying(false);
    if (errors.length > 0) {
      toast.error(`Applied ${applied}, but ${errors.length} failed: ${errors[0]}`);
    } else {
      toast.success(`Applied ${applied} proposal${applied !== 1 ? 's' : ''} successfully`);
    }
    await load();
  }, [reportId, reviewerId, load]);

  const handleRetrigger = useCallback(async () => {
    setLoading(true);
    setExtraction(null);
    await retriggerExtraction(reportId);
    setTimeout(load, 1500);
  }, [reportId, load]);

  const approvedCount = (extraction?.proposals ?? []).filter(p => p.status === 'approved' || p.status === 'modified').length;
  const pendingCount  = (extraction?.proposals ?? []).filter(p => p.status === 'pending').length;

  const result = extraction?.extraction_result;

  return (
    <div style={{ border: '1.5px solid #bfdbfe', borderRadius: 12, background: 'linear-gradient(180deg,#f0f9ff 0%,var(--surface) 100%)', marginTop: 16, overflow: 'hidden' }}>
      {/* ── Panel header ── */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid #bfdbfe' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>✦</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af' }}>AI Extraction Analysis</span>
          {!loading && extraction && (
            <span style={{
              fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: extraction.status === 'complete' ? '#dcfce7' : extraction.status === 'failed' ? '#fee2e2' : '#fef9c3',
              color: extraction.status === 'complete' ? '#166534' : extraction.status === 'failed' ? '#991b1b' : '#854d0e',
            }}>
              {extraction.status === 'complete' ? `✓ Complete · ${(extraction.proposals ?? []).length} proposal${(extraction.proposals ?? []).length !== 1 ? 's' : ''}` : extraction.status === 'processing' ? '⟳ Analyzing…' : extraction.status === 'failed' ? '✕ Failed' : '⏳ Pending'}
            </span>
          )}
          {!loading && !extraction && (
            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: '#f1f5f9', color: '#64748b' }}>
              Not yet analyzed
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!loading && extraction?.status === 'failed' && (
            <button
              onClick={e => { e.stopPropagation(); handleRetrigger(); }}
              style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#1e40af', fontFamily: "'DM Sans', sans-serif" }}>
              ↺ Retry
            </button>
          )}
          {!loading && !extraction && (
            <button
              onClick={e => { e.stopPropagation(); handleRetrigger(); }}
              style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#1e40af', fontFamily: "'DM Sans', sans-serif" }}>
              ▶ Run Analysis
            </button>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </div>

      {collapsed ? null : (
        <div style={{ padding: 14 }}>
          {/* ── Loading ── */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: 'var(--text-3)' }}>
              <div style={{ width: 18, height: 18, border: '2.5px solid #bfdbfe', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem' }}>Loading AI analysis…</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* ── Processing ── */}
          {!loading && extraction?.status === 'processing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: '#1e40af' }}>
              <div style={{ width: 18, height: 18, border: '2.5px solid #bfdbfe', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Analyzing report…</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>Parsing fields and uploaded documents with Claude AI</div>
              </div>
            </div>
          )}

          {/* ── Failed ── */}
          {!loading && extraction?.status === 'failed' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Analysis failed</div>
              <div style={{ fontSize: '0.72rem', color: '#7f1d1d', fontFamily: "'DM Mono', monospace" }}>{extraction.error_message}</div>
            </div>
          )}

          {/* ── Complete ── */}
          {!loading && extraction?.status === 'complete' && result && (
            <>
              {/* Summary */}
              {result.summary && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>AI Summary</div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e3a8a', lineHeight: 1.6 }}>{result.summary}</p>
                  {extraction.processing_time_ms && (
                    <div style={{ fontSize: '0.62rem', color: '#93c5fd', marginTop: 6 }}>Analyzed in {(extraction.processing_time_ms / 1000).toFixed(1)}s · {extraction.model_used}</div>
                  )}
                </div>
              )}

              {/* Quick findings grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 14 }}>
                {result.locations.length > 0 && (
                  <FindingChip icon="📍" label="Locations" value={result.locations.join(', ')} bg="#f0fdf4" />
                )}
                {result.activities.length > 0 && (
                  <FindingChip icon="⚡" label="Activities" value={`${result.activities.length} detected`} bg="#fef9c3" />
                )}
                {result.challenges.length > 0 && (
                  <FindingChip icon="⚠️" label="Challenges" value={`${result.challenges.length} identified`} bg="#fef2f2" />
                )}
                {result.risks.length > 0 && (
                  <FindingChip icon="🔴" label="Risks" value={`${result.risks.length} flagged`} bg="#fef2f2" />
                )}
                {result.budget_info.length > 0 && (
                  <FindingChip icon="💰" label="Budget" value={result.budget_info.map(b => `${b.currency} ${b.amount.toLocaleString()}`).join(', ')} bg="#fffbeb" />
                )}
                {result.targets_mentioned.length > 0 && (
                  <FindingChip icon="🎯" label="Also references" value={result.targets_mentioned.map(t => `T${t}`).join(', ')} bg="#f5f3ff" />
                )}
              </div>

              {/* Activities list */}
              {result.activities.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <SectionLabel text="Activities Detected" />
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18, listStyle: 'disc' }}>
                    {result.activities.map((a, i) => (
                      <li key={i} style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginBottom: 2, lineHeight: 1.5 }}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Challenges */}
              {result.challenges.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <SectionLabel text="Challenges Extracted" />
                  {result.challenges.map((ch, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#fee2e2', color: '#991b1b', whiteSpace: 'nowrap', flexShrink: 0 }}>{ch.type}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{ch.description}{ch.delay_mentioned ? ` (delay: ${ch.delay_mentioned})` : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Risks */}
              {result.risks.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <SectionLabel text="Risks Identified" />
                  {result.risks.map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: r.severity === 'high' ? '#fee2e2' : r.severity === 'medium' ? '#fef9c3' : '#f0fdf4', color: r.severity === 'high' ? '#991b1b' : r.severity === 'medium' ? '#854d0e' : '#166534', whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'uppercase' }}>{r.severity}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{r.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Proposed Updates */}
              {(extraction.proposals ?? []).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <SectionLabel text={`Proposed Updates (${(extraction.proposals ?? []).length})`} />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {pendingCount > 0 && (
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>{pendingCount} pending review</span>
                      )}
                      {approvedCount > 0 && (
                        <button
                          onClick={handleApplyAll}
                          disabled={applying}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 7, fontSize: '0.72rem', fontWeight: 700, cursor: applying ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: applying ? 0.6 : 1 }}>
                          {applying
                            ? <><div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Applying…</>
                            : <>▶ Apply {approvedCount} Approved</>}
                        </button>
                      )}
                    </div>
                  </div>

                  {(extraction.proposals ?? []).map(p => (
                    <ProposalCard
                      key={p.id}
                      proposal={p}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </div>
              )}

              {(extraction.proposals ?? []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-3)', fontSize: '0.78rem' }}>
                  No data update proposals generated — the report content did not contain extractable values above the confidence threshold.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{text}</div>
  );
}

function FindingChip({ icon, label, value, bg }: { icon: string; label: string; value: string; bg: string }) {
  return (
    <div style={{ background: bg, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-1)', fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
