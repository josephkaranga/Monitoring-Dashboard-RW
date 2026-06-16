import React, { useState, useEffect } from 'react';
import { fetchTargetsWithReportStats } from './dataService';
import type { NBSAPTarget } from './index';

// ── NBSAP Target Progress Widget ──────────────────────────────
export function NBSAPTargetProgress() {
  const [targets, setTargets] = useState<NBSAPTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<string>('all');

  useEffect(() => {
    const loadTargets = async () => {
      setLoading(true);
      try {
        const targetsData = await fetchTargetsWithReportStats();
        setTargets(targetsData);
      } catch (error) {
        console.error('Error loading NBSAP targets:', error);
      }
      setLoading(false);
    };

    loadTargets();
  }, []);

  const filteredTargets = selectedGoal === 'all' 
    ? targets 
    : targets.filter(t => t.goal === selectedGoal);

  const goalStats = {
    A: targets.filter(t => t.goal === 'A'),
    B: targets.filter(t => t.goal === 'B'), 
    C: targets.filter(t => t.goal === 'C'),
    D: targets.filter(t => t.goal === 'D'),
  };

  const goalColors = {
    A: { bg: '#dcfce7', color: '#166534', accent: '#10b981' },
    B: { bg: '#dbeafe', color: '#1e40af', accent: '#3b82f6' },
    C: { bg: '#fef3c7', color: '#92400e', accent: '#f59e0b' },
    D: { bg: '#fce7f3', color: '#be185d', accent: '#ec4899' },
  };

  if (loading) {
    return (
      <div style={{ 
        background: '#fff', 
        borderRadius: 14, 
        border: '1px solid #e2e8f0', 
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)' 
      }}>
        <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
          Loading NBSAP targets...
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 14, 
      border: '1px solid #e2e8f0', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)' 
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: '#0f172a',
            marginBottom: 4 
          }}>
            🎯 NBSAP Target Progress
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#64748b' 
          }}>
            Progress linked to report submissions • {targets.length} targets tracked
          </div>
        </div>
        
        {/* Goal Filter */}
        <select 
          value={selectedGoal}
          onChange={(e) => setSelectedGoal(e.target.value)}
          style={{
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: '0.75rem',
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
            background: '#fff'
          }}
        >
          <option value="all">All Goals</option>
          <option value="A">Goal A - Reduce threats</option>
          <option value="B">Goal B - Sustainable use</option>
          <option value="C">Goal C - Fair sharing</option>
          <option value="D">Goal D - Implementation</option>
        </select>
      </div>

      {/* Goal Overview Stats */}
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid #f1f5f9',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12
      }}>
        {Object.entries(goalStats).map(([goal, goalTargets]) => {
          const avgProgress = goalTargets.length > 0 
            ? Math.round(goalTargets.reduce((sum, t) => sum + t.progress, 0) / goalTargets.length)
            : 0;
          const colors = goalColors[goal as keyof typeof goalColors];
          
          return (
            <div 
              key={goal}
              style={{
                background: colors.bg,
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
                cursor: 'pointer',
                border: selectedGoal === goal ? `2px solid ${colors.accent}` : '2px solid transparent'
              }}
              onClick={() => setSelectedGoal(selectedGoal === goal ? 'all' : goal)}
            >
              <div style={{ 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                color: colors.color,
                marginBottom: 4
              }}>
                Goal {goal}
              </div>
              <div style={{ 
                fontSize: '1.4rem', 
                fontWeight: 700, 
                color: colors.color,
                fontFamily: "'Playfair Display', serif"
              }}>
                {avgProgress}%
              </div>
              <div style={{ 
                fontSize: '0.65rem', 
                color: colors.color,
                opacity: 0.8
              }}>
                {goalTargets.length} targets
              </div>
            </div>
          );
        })}
      </div>

      {/* Target List */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {filteredTargets.map(target => {
          const colors = goalColors[target.goal as keyof typeof goalColors];
          const reportCompletion = target.report_completion_rate || 0;
          
          return (
            <div 
              key={target.id}
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {/* Goal Badge */}
              <div style={{
                background: colors.bg,
                color: colors.color,
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: 6,
                minWidth: 32,
                textAlign: 'center'
              }}>
                {target.goal}
              </div>

              {/* Target Info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: 2
                }}>
                  Target {target.id}: {target.title}
                </div>
                
                {/* Progress Bars */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  {/* Overall Progress */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Overall</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#0f172a' }}>{target.progress}%</span>
                    </div>
                    <div style={{ 
                      height: 4, 
                      background: '#f1f5f9', 
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${target.progress}%`,
                        background: colors.accent,
                        borderRadius: 2,
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                  </div>

                  {/* Report Completion */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Reports</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#0f172a' }}>{reportCompletion}%</span>
                    </div>
                    <div style={{ 
                      height: 4, 
                      background: '#f1f5f9', 
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${reportCompletion}%`,
                        background: '#10b981',
                        borderRadius: 2,
                        transition: 'width 0.8s ease'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Report Stats */}
                <div style={{ display: 'flex', gap: 12, fontSize: '0.65rem', color: '#64748b' }}>
                  <span>
                    📊 {target.total_reports || 0} reports
                  </span>
                  {(target.approved_reports || 0) > 0 && (
                    <span style={{ color: '#10b981' }}>
                      ✅ {target.approved_reports} approved
                    </span>
                  )}
                  {(target.pending_reports || 0) > 0 && (
                    <span style={{ color: '#f59e0b' }}>
                      ⏳ {target.pending_reports} pending
                    </span>
                  )}
                </div>
              </div>

              {/* Auto-update Badge */}
              {(target.total_reports || 0) > 0 && (
                <div style={{
                  background: '#dcfce7',
                  color: '#166534',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  padding: '3px 6px',
                  borderRadius: 4,
                  fontFamily: "'DM Mono', monospace"
                }}>
                  AUTO
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTargets.length === 0 && (
        <div style={{ 
          padding: 40, 
          textAlign: 'center', 
          color: '#94a3b8',
          fontSize: '0.85rem'
        }}>
          No targets found for the selected goal.
        </div>
      )}
    </div>
  );
}