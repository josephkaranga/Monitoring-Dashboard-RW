// Species by Kingdom Panel - Visual breakdown with pie/bar chart

import React, { useMemo, useState } from 'react';
import type { GBIFOccurrence } from '../../types/biodiversity';
import { calculateSpeciesByKingdom } from '../../utils/biodiversityCalculations';
import { getKingdomColor } from '../../types/overlays';

interface SpeciesByKingdomPanelProps {
  occurrences: GBIFOccurrence[];
  loading?: boolean;
  onKingdomClick?: (kingdom: string | null) => void;
  selectedKingdom?: string | null;
  isMobile?: boolean;
}

type ChartType = 'bar' | 'pie';

/**
 * Panel displaying species breakdown by taxonomic kingdom
 * Supports both bar chart and pie chart visualizations
 * Allows filtering by clicking on a kingdom
 * Performance: Memoized to prevent unnecessary re-renders
 */
export const SpeciesByKingdomPanel = React.memo(function SpeciesByKingdomPanel({
  occurrences,
  loading = false,
  onKingdomClick,
  selectedKingdom = null,
  isMobile = false
}: SpeciesByKingdomPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  const speciesBreakdown = useMemo(() => {
    return calculateSpeciesByKingdom(occurrences);
  }, [occurrences]);

  const totalSpecies = useMemo(() => {
    return speciesBreakdown.reduce((sum, item) => sum + item.count, 0);
  }, [speciesBreakdown]);

  const handleKingdomClick = (kingdom: string) => {
    if (onKingdomClick) {
      // Toggle selection: if already selected, deselect
      onKingdomClick(selectedKingdom === kingdom ? null : kingdom);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: isMobile ? 12 : 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <i className="fa-solid fa-chart-pie" style={{ color: 'var(--sky-dim)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Species by Kingdom
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: 8 }} />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>Loading species data...</p>
        </div>
      </div>
    );
  }

  if (speciesBreakdown.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: isMobile ? 12 : 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <i className="fa-solid fa-chart-pie" style={{ color: 'var(--sky-dim)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Species by Kingdom
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }} />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>No species data available</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
      padding: isMobile ? 12 : 18
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <i className="fa-solid fa-chart-pie" style={{ color: 'var(--sky-dim)' }} />
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
          Species by Kingdom
        </h3>
        <span style={{
          fontSize: '0.65rem',
          padding: '3px 8px',
          borderRadius: 12,
          fontWeight: 700,
          fontFamily: "'DM Mono', monospace",
          background: '#dcfce7',
          color: '#166534',
          marginLeft: 'auto'
        }}>
          {totalSpecies} Species
        </span>
        
        {/* Chart type toggle */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          <button
            onClick={() => setChartType('bar')}
            style={{
              background: chartType === 'bar' ? 'var(--sky-dim)' : 'transparent',
              border: '1px solid var(--border)',
              color: chartType === 'bar' ? '#fff' : 'var(--text-2)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.7rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Bar chart"
          >
            <i className="fa-solid fa-chart-bar" />
          </button>
          <button
            onClick={() => setChartType('pie')}
            style={{
              background: chartType === 'pie' ? 'var(--sky-dim)' : 'transparent',
              border: '1px solid var(--border)',
              color: chartType === 'pie' ? '#fff' : 'var(--text-2)',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.7rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Pie chart"
          >
            <i className="fa-solid fa-chart-pie" />
          </button>
        </div>
      </div>

      {/* Chart */}
      {chartType === 'bar' ? (
        <div style={{ marginBottom: 16 }}>
          {speciesBreakdown.map((item) => {
            const isSelected = selectedKingdom === item.kingdom;
            return (
              <div
                key={item.kingdom}
                onClick={() => handleKingdomClick(item.kingdom)}
                style={{
                  marginBottom: 12,
                  cursor: onKingdomClick ? 'pointer' : 'default',
                  opacity: selectedKingdom && !isSelected ? 0.4 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: getKingdomColor(item.kingdom),
                        border: isSelected ? '2px solid var(--text-1)' : 'none'
                      }}
                    />
                    <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                      {item.kingdom}
                    </span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: 'var(--surface-3)',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${item.percentage}%`,
                      background: getKingdomColor(item.kingdom),
                      borderRadius: 4,
                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 16
        }}>
          {/* Simple pie chart using CSS */}
          <div style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `conic-gradient(${speciesBreakdown.map((item, idx) => {
              const startPercent = speciesBreakdown
                .slice(0, idx)
                .reduce((sum, i) => sum + i.percentage, 0);
              const endPercent = startPercent + item.percentage;
              return `${getKingdomColor(item.kingdom)} ${startPercent}% ${endPercent}%`;
            }).join(', ')})`,
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }} />
          
          {/* Legend */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            width: '100%'
          }}>
            {speciesBreakdown.map((item) => {
              const isSelected = selectedKingdom === item.kingdom;
              return (
                <div
                  key={item.kingdom}
                  onClick={() => handleKingdomClick(item.kingdom)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.7rem',
                    cursor: onKingdomClick ? 'pointer' : 'default',
                    opacity: selectedKingdom && !isSelected ? 0.4 : 1,
                    transition: 'opacity 0.2s ease',
                    padding: 4,
                    borderRadius: 4,
                    background: isSelected ? 'var(--surface-2)' : 'transparent'
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: getKingdomColor(item.kingdom),
                      flexShrink: 0,
                      border: isSelected ? '2px solid var(--text-1)' : 'none'
                    }}
                  />
                  <span style={{ color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.kingdom}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-1)', marginLeft: 'auto' }}>
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        paddingTop: 12,
        borderTop: '1px solid var(--border)',
        fontSize: '0.7rem',
        color: 'var(--text-3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          <i className="fa-solid fa-info-circle" style={{ marginRight: 4 }} />
          {onKingdomClick ? 'Click to filter map' : 'Showing all kingdoms'}
        </span>
        {selectedKingdom && (
          <button
            onClick={() => onKingdomClick?.(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sky-dim)',
              fontSize: '0.7rem',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 600
            }}
          >
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
});
