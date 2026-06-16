// Biodiversity Index Panel - Sortable district table with biodiversity indices

import React, { useState, useMemo } from 'react';
import type { BiodiversityData } from '../../types/biodiversity';

interface BiodiversityIndexPanelProps {
  biodiversityData: Map<number, BiodiversityData>;
  loading?: boolean;
  onDistrictClick?: (districtId: number) => void;
  isMobile?: boolean;
}

type SortField = 'name' | 'biodiversityIndex' | 'speciesRichness' | 'occurrenceCount';
type SortDirection = 'asc' | 'desc';

/**
 * Panel displaying biodiversity index for all districts in a sortable table
 * Allows users to compare biodiversity metrics across Rwanda's districts
 * Performance: Memoized to prevent unnecessary re-renders
 */
export const BiodiversityIndexPanel = React.memo(function BiodiversityIndexPanel({
  biodiversityData,
  loading = false,
  onDistrictClick,
  isMobile = false
}: BiodiversityIndexPanelProps) {
  const [sortField, setSortField] = useState<SortField>('biodiversityIndex');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Convert map to array and sort
  const sortedData = useMemo(() => {
    const dataArray = Array.from(biodiversityData.values());
    
    return dataArray.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      
      switch (sortField) {
        case 'name':
          aVal = a.districtName;
          bVal = b.districtName;
          break;
        case 'biodiversityIndex':
          aVal = a.biodiversityIndex;
          bVal = b.biodiversityIndex;
          break;
        case 'speciesRichness':
          aVal = a.speciesRichness;
          bVal = b.speciesRichness;
          break;
        case 'occurrenceCount':
          aVal = a.occurrenceCount;
          bVal = b.occurrenceCount;
          break;
        default:
          aVal = a.biodiversityIndex;
          bVal = b.biodiversityIndex;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [biodiversityData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <i className="fa-solid fa-sort" style={{ opacity: 0.3, fontSize: '0.7rem' }} />;
    }
    return sortDirection === 'asc' 
      ? <i className="fa-solid fa-sort-up" style={{ fontSize: '0.7rem' }} />
      : <i className="fa-solid fa-sort-down" style={{ fontSize: '0.7rem' }} />;
  };

  const getIndexColor = (index: number): string => {
    if (index >= 70) return '#10b981'; // green
    if (index >= 50) return '#f59e0b'; // orange
    if (index >= 30) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  if (loading) {
    return (
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <i className="fa-solid fa-chart-bar" style={{ color: 'var(--sky-dim)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Biodiversity Index by District
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: 8 }} />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>Loading biodiversity data...</p>
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <i className="fa-solid fa-chart-bar" style={{ color: 'var(--sky-dim)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Biodiversity Index by District
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }} />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>No biodiversity data available</p>
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
        <i className="fa-solid fa-chart-bar" style={{ color: 'var(--sky-dim)' }} />
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
          Biodiversity Index by District
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
          {sortedData.length} Districts
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>
            <tr>
              <th
                onClick={() => handleSort('name')}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  District {getSortIcon('name')}
                </div>
              </th>
              <th
                onClick={() => handleSort('biodiversityIndex')}
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  Index {getSortIcon('biodiversityIndex')}
                </div>
              </th>
              <th
                onClick={() => handleSort('speciesRichness')}
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  Species {getSortIcon('speciesRichness')}
                </div>
              </th>
              <th
                onClick={() => handleSort('occurrenceCount')}
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderBottom: '2px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  Records {getSortIcon('occurrenceCount')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((district, idx) => (
              <tr
                key={district.districtId}
                onClick={() => onDistrictClick?.(district.districtId)}
                style={{
                  cursor: onDistrictClick ? 'pointer' : 'default',
                  background: idx % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (onDistrictClick) {
                    e.currentTarget.style.background = 'var(--surface-3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--surface-2)';
                }}
              >
                <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-1)' }}>
                      {district.districtName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                      {district.province}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <div
                      style={{
                        width: 40,
                        height: 6,
                        background: 'var(--surface-3)',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${district.biodiversityIndex}%`,
                          height: '100%',
                          background: getIndexColor(district.biodiversityIndex),
                          borderRadius: 3,
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        color: getIndexColor(district.biodiversityIndex),
                        minWidth: 30,
                        textAlign: 'right'
                      }}
                    >
                      {district.biodiversityIndex}
                    </span>
                  </div>
                </td>
                <td style={{
                  padding: '10px 8px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  borderBottom: '1px solid var(--border)'
                }}>
                  {district.speciesRichness}
                </td>
                <td style={{
                  padding: '10px 8px',
                  textAlign: 'right',
                  color: 'var(--text-2)',
                  borderBottom: '1px solid var(--border)'
                }}>
                  {district.occurrenceCount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 12,
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
          Click column headers to sort
        </span>
        <span>
          Index scale: 0-100
        </span>
      </div>
    </div>
  );
});
