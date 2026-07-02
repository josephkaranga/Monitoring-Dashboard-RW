// Loading skeleton for map initial data fetch

import React from 'react';

/**
 * MapLoadingSkeleton Component
 *
 * Displays animated loading skeleton while map data is being fetched
 * Provides visual feedback during initial load
 */
export const MapLoadingSkeleton: React.FC = () => {
  const pulseAnimation = {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        minHeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>

      {/* Map outline skeleton */}
      <div
        style={{
          width: '80%',
          maxWidth: 600,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Map shape placeholder */}
        <div
          style={{
            width: '100%',
            height: 300,
            background: 'rgba(148, 163, 184, 0.2)',
            borderRadius: 12,
            ...pulseAnimation,
          }}
        />

        {/* Loading text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--text-3)',
            fontSize: '0.85rem',
          }}
        >
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.2rem' }} />
          <span>Loading map data...</span>
        </div>

        {/* Progress indicators */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {['Districts', 'Biodiversity', 'Overlays'].map((label, idx) => (
            <div
              key={label}
              style={{
                padding: '4px 12px',
                background: 'rgba(148, 163, 184, 0.15)',
                borderRadius: 16,
                fontSize: '0.7rem',
                color: 'var(--text-3)',
                ...pulseAnimation,
                animationDelay: `${idx * 0.2}s`,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapLoadingSkeleton;
