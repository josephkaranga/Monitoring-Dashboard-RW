import React from 'react';
import type { NBSAPTarget, Indicator } from '../types/index';
import { progressColor } from '../utils/progressColors';

interface AttentionItem {
  id: number;
  type: 'target' | 'indicator';
  name: string;
  progress: number;
  goal?: string;
  reasons: string[];
  responsible?: string[];
  severity: 'behind' | 'at-risk';
}

interface Props {
  targets: NBSAPTarget[];
  indicators: Indicator[];
}

function deriveAttentionItems(targets: NBSAPTarget[], indicators: Indicator[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const t of targets) {
    const pc = progressColor(t.progress);
    if (pc.label === 'On Track') continue;

    const reasons: string[] = [];
    if (t.progress < 20) reasons.push('Progress critically low');
    else if (t.progress < 40) reasons.push('Progress below 40% threshold');
    else reasons.push('Progress needs acceleration');

    if ((t.pending_reports ?? 0) > 0) {
      reasons.push(`${t.pending_reports} report${t.pending_reports! > 1 ? 's' : ''} pending review`);
    }
    if ((t.total_reports ?? 0) === 0) {
      reasons.push('No data submissions yet');
    }

    const completionRate = t.report_completion_rate ?? 0;
    if (completionRate < 50 && (t.total_reports ?? 0) > 0) {
      reasons.push(`Only ${completionRate}% report approval rate`);
    }

    items.push({
      id: t.id,
      type: 'target',
      name: `Target ${t.id}: ${t.title}`,
      progress: t.progress,
      goal: t.goal,
      reasons,
      responsible: t.responsible_stakeholders,
      severity: t.progress < 40 ? 'behind' : 'at-risk',
    });
  }

  for (const ind of indicators) {
    if (ind.status === 'on-track') continue;
    const reasons: string[] = [];
    if (ind.progress < 20) reasons.push('Progress critically low');
    else if (ind.progress < 40) reasons.push('Below minimum threshold');
    else reasons.push('Needs acceleration to meet 2030 target');

    if (ind.current_value && ind.final_target) {
      reasons.push(`Current: ${ind.current_value} → Target: ${ind.final_target}`);
    }

    items.push({
      id: ind.id,
      type: 'indicator',
      name: ind.name,
      progress: ind.progress,
      reasons,
      severity: ind.progress < 40 ? 'behind' : 'at-risk',
    });
  }

  items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'behind' ? -1 : 1;
    return a.progress - b.progress;
  });

  return items;
}

const goalColors: Record<string, { bg: string; color: string }> = {
  A: { bg: '#dcfce7', color: '#166534' },
  B: { bg: '#dbeafe', color: '#1e40af' },
  C: { bg: '#fef3c7', color: '#92400e' },
  D: { bg: '#fce7f3', color: '#be185d' },
};

export function AttentionPanel({ targets, indicators }: Props) {
  const items = deriveAttentionItems(targets, indicators);

  if (items.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius, 14px)',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>
          <i className="fa-solid fa-circle-check" style={{ color: '#16a34a' }} />
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' }}>All Clear</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>
          All targets and indicators are on track
        </div>
      </div>
    );
  }

  const behindCount = items.filter(i => i.severity === 'behind').length;
  const atRiskCount = items.filter(i => i.severity === 'at-risk').length;

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius, 14px)',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#d97706' }} />
            Requires Attention
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
            Targets and indicators that need management action
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {behindCount > 0 && (
            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>
              {behindCount} Behind
            </span>
          )}
          {atRiskCount > 0 && (
            <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>
              {atRiskCount} At Risk
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {items.map((item, idx) => {
          const pc = progressColor(item.progress);
          return (
            <div key={`${item.type}-${item.id}`} style={{
              padding: '14px 20px',
              borderBottom: idx < items.length - 1 ? '1px solid #f8fafc' : 'none',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              {/* Severity indicator */}
              <div style={{
                width: 4, minHeight: 40, borderRadius: 2, flexShrink: 0, marginTop: 2,
                background: item.severity === 'behind' ? '#dc2626' : '#d97706',
              }} />

              <div style={{ flex: 1 }}>
                {/* Name + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  {item.goal && (
                    <span style={{
                      background: goalColors[item.goal]?.bg ?? '#f1f5f9',
                      color: goalColors[item.goal]?.color ?? '#334155',
                      fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    }}>
                      Goal {item.goal}
                    </span>
                  )}
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                    background: item.type === 'target' ? '#e0f2fe' : '#f3e8ff',
                    color: item.type === 'target' ? '#0369a1' : '#6b21a8',
                  }}>
                    {item.type === 'target' ? 'Target' : 'Indicator'}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    {item.name}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${item.progress}%`,
                      background: pc.color, borderRadius: 3,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pc.color, minWidth: 40 }}>
                    {item.progress}%
                  </span>
                </div>

                {/* Reasons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {item.reasons.map((reason, i) => (
                    <span key={i} style={{
                      fontSize: '0.62rem', color: '#64748b',
                      background: '#f8fafc', padding: '2px 8px', borderRadius: 4,
                      border: '1px solid #e2e8f0',
                    }}>
                      {reason}
                    </span>
                  ))}
                </div>

                {/* Responsible */}
                {item.responsible && item.responsible.length > 0 && (
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 4 }}>
                    <i className="fa-solid fa-user-group" style={{ marginRight: 4 }} />
                    {item.responsible.slice(0, 3).join(', ')}
                    {item.responsible.length > 3 && ` +${item.responsible.length - 3} more`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
