// Hotspots List Panel - Ranked list of biodiversity hotspots

import React from 'react';
import type { BiodiversityHotspot } from '../../types/biodiversity';

interface HotspotsListPanelProps {
  hotspots: BiodiversityHotspot[];
  loading?: boolean;
  onHotspotClick?: (districtId: number) => void;
  isMobile?: boolean;
}

/**
 * Panel displaying ranked list of biodiversity hotspots
 * Shows districts with high biodiversity index and species richness
 * Performance: Memoized to prevent unnecessary re-renders
 */
export const HotspotsListPanel = React.memo(function HotspotsListPanel({
  hotspots,
  loading = false,
  onHotspotClick,
  isMobile = false,
}: HotspotsListPanelProps) {
  const getPriorityColor = (priority: number): string => {
    if (priority >= 80) return '#ef4444'; // red - critical
    if (priority >= 60) return '#f59e0b'; // orange - high
    if (priority >= 40) return '#eab308'; // yellow - medium
    return '#10b981'; // green - moderate
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 80) return 'Critical';
    if (priority >= 60) return 'High';
    if (priority >= 40) return 'Medium';
    return 'Moderate';
  };

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
          <i className="fa-solid fa-fire" style={{ color: '#ef4444' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Biodiversity Hotspots
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i
            className="fa-solid fa-spinner fa-spin"
            style={{ fontSize: '1.5rem', marginBottom: 8 }}
          />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>Identifying hotspots...</p>
        </div>
      </div>
    );
  }

  if (hotspots.length === 0) {
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
          <i className="fa-solid fa-fire" style={{ color: '#ef4444' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Biodiversity Hotspots
          </h3>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <i
            className="fa-solid fa-inbox"
            style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.5 }}
          />
          <p style={{ fontSize: '0.8rem', margin: 0 }}>No hotspots identified</p>
          <p style={{ fontSize: '0.7rem', margin: '8px 0 0 0', opacity: 0.7 }}>
            Hotspots require sufficient biodiversity data
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
        <i className="fa-solid fa-fire" style={{ color: '#ef4444' }} />
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
          Biodiversity Hotspots
        </h3>
        <span
          style={{
            fontSize: '0.65rem',
            padding: '3px 8px',
            borderRadius: 12,
            fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            background: '#fee2e2',
            color: '#991b1b',
            marginLeft: 'auto',
          }}
        >
          {hotspots.length} Hotspots
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-3)',
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        Districts with exceptional biodiversity value (top 20% in both index and species richness)
      </p>

      {/* Hotspots list */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {hotspots.map((hotspot, idx) => (
          <div
            key={hotspot.districtId}
            onClick={() => onHotspotClick?.(hotspot.districtId)}
            style={{
              padding: 12,
              marginBottom: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: onHotspotClick ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (onHotspotClick) {
                e.currentTarget.style.background = 'var(--surface-3)';
                e.currentTarget.style.borderColor = getPriorityColor(hotspot.priority);
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {/* Rank badge */}
            <div
              style={{
                position: 'absolute',
                top: -8,
                left: 8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: getPriorityColor(hotspot.priority),
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {idx + 1}
            </div>

            {/* District name and priority */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8,
              }}
            >
              <div>
                <h4
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    margin: 0,
                    marginBottom: 2,
                  }}
                >
                  {hotspot.districtName}
                </h4>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: getPriorityColor(hotspot.priority) + '20',
                    color: getPriorityColor(hotspot.priority),
                    fontWeight: 600,
                  }}
                >
                  {getPriorityLabel(hotspot.priority)} Priority
                </span>
              </div>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: getPriorityColor(hotspot.priority),
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                {hotspot.priority}
              </div>
            </div>

            {/* Metrics grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginTop: 12,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 2 }}>
                  Index
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>
                  {hotspot.biodiversityIndex}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 2 }}>
                  Species
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>
                  {hotspot.speciesRichness}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginBottom: 2 }}>
                  Protected
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#8b5cf6' }}>
                  {hotspot.protectedAreaCoverage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))}
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
          {onHotspotClick ? 'Click to view on map' : 'Ranked by conservation priority'}
        </span>
        <span>Priority: 0-100</span>
      </div>
    </div>
  );
});
