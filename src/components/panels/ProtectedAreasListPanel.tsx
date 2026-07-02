// Protected Areas List Panel - List of protected areas with details

import React, { useState } from 'react';
import type { ProtectedArea } from '../../types/overlays';

interface ProtectedAreasListPanelProps {
  areas: ProtectedArea[];
  loading?: boolean;
  onAreaClick?: (areaName: string) => void;
  isMobile?: boolean;
}

type DesignationType = 'National Park' | 'Reserve' | 'Wetland' | 'Forest Reserve';

/**
 * Panel displaying list of protected areas with name, type, and size
 * Allows filtering by designation type
 * Performance: Memoized to prevent unnecessary re-renders
 */
export const ProtectedAreasListPanel = React.memo(function ProtectedAreasListPanel({
  areas,
  loading = false,
  onAreaClick,
  isMobile = false,
}: ProtectedAreasListPanelProps) {
  const [filterType, setFilterType] = useState<DesignationType | 'all'>('all');

  const filteredAreas = areas.filter(
    area => filterType === 'all' || area.properties.designationType === filterType
  );

  const getTypeColor = (type: string | undefined): string => {
    switch (type) {
      case 'National Park':
        return '#10b981'; // green
      case 'Reserve':
        return '#3b82f6'; // blue
      case 'Wetland':
        return '#0891b2'; // cyan
      case 'Forest Reserve':
        return '#059669'; // dark green
      default:
        return '#6b7280'; // gray
    }
  };

  const getTypeIcon = (type: string | undefined): string => {
    switch (type) {
      case 'National Park':
        return 'fa-mountain-sun';
      case 'Reserve':
        return 'fa-shield-halved';
      case 'Wetland':
        return 'fa-water';
      case 'Forest Reserve':
        return 'fa-tree';
      default:
        return 'fa-map-pin';
    }
  };

  const typeCounts = areas.reduce(
    (acc, area) => {
      const type = area.properties.designationType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<DesignationType, number>
  );

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: isMobile ? 12 : 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Protected Areas
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i
            className="fa-solid fa-spinner fa-spin"
            style={{ fontSize: '1.5rem', marginBottom: 8 }}
          />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>Loading protected areas...</p>
        </div>
      </div>
    );
  }

  if (areas.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: isMobile ? 12 : 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Protected Areas
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i
            className="fa-solid fa-inbox"
            style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }}
          />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>No protected areas data available</p>
          <p style={{ fontSize: '0.7rem', margin: '8px 0 0 0', opacity: 0.7 }}>
            Add GeoJSON file to display protected areas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: isMobile ? 12 : 18,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <i className="fa-solid fa-shield-halved" style={{ color: '#10b981' }} />
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
          Protected Areas
        </h3>
        <span
          style={{
            fontSize: '0.65rem',
            padding: '3px 8px',
            borderRadius: 12,
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            background: '#dcfce7',
            color: '#166534',
            marginLeft: 'auto',
          }}
        >
          {filteredAreas.length} Areas
        </span>
      </div>

      {/* Filter buttons */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setFilterType('all')}
          style={{
            background: filterType === 'all' ? 'var(--sky-dim)' : 'transparent',
            border: '1px solid var(--border)',
            color: filterType === 'all' ? '#fff' : 'var(--text-2)',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
        >
          All ({areas.length})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setFilterType(type as DesignationType)}
            style={{
              background:
                filterType === type ? getTypeColor(type as DesignationType) : 'transparent',
              border: `1px solid ${filterType === type ? getTypeColor(type as DesignationType) : 'var(--border)'}`,
              color: filterType === type ? '#fff' : 'var(--text-2)',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            {type} ({count})
          </button>
        ))}
      </div>

      {/* Areas list */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {filteredAreas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '0.8rem', margin: 0 }}>No areas match this filter</p>
          </div>
        ) : (
          filteredAreas.map((area, idx) => (
            <div
              key={idx}
              onClick={() => onAreaClick?.(area.properties.name)}
              style={{
                padding: 12,
                marginBottom: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: onAreaClick ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                if (onAreaClick) {
                  e.currentTarget.style.background = 'var(--surface-3)';
                  e.currentTarget.style.borderColor = getTypeColor(area.properties.designationType);
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* Area name and type */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: getTypeColor(area.properties.designationType) + '20',
                    color: getTypeColor(area.properties.designationType),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <i className={`fa-solid ${getTypeIcon(area.properties.designationType)}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      margin: 0,
                      marginBottom: 4,
                    }}
                  >
                    {area.properties.name}
                  </h4>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-3)',
                    }}
                  >
                    {area.properties.designationType}
                  </span>
                </div>
              </div>

              {/* Area details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 2 }}>
                    Area
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    {area.properties.area.toLocaleString()} km²
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 2 }}>
                    Established
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    {area.properties.established}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
          fontSize: '0.7rem',
          color: 'var(--text-3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          <i className="fa-solid fa-info-circle" style={{ marginRight: 4 }} />
          {onAreaClick ? 'Click to view on map' : 'Protected conservation zones'}
        </span>
        <span>
          Total: {areas.reduce((sum, a) => sum + a.properties.area, 0).toLocaleString()} km²
        </span>
      </div>
    </div>
  );
});
