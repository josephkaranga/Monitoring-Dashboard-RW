import React from 'react';
import type { LakeFeature } from '../../types/overlays';

interface LakePopupProps {
  lake: LakeFeature;
  position: { x: number; y: number };
  onClose: () => void;
}

export const LakePopup: React.FC<LakePopupProps> = ({
  lake,
  position,
  onClose
}) => {
  const { name, area_km2, max_depth_m, elevation_m, ecological_significance } = lake.properties;

  // Determine if popup should be positioned on left or right side
  // to avoid going off-screen
  const isRightSide = position.x > window.innerWidth / 2;
  const isBottomSide = position.y > window.innerHeight / 2;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />
      
      {/* Popup */}
      <div
        style={{
          position: 'fixed',
          top: isBottomSide ? 'auto' : position.y + 10,
          bottom: isBottomSide ? window.innerHeight - position.y + 10 : 'auto',
          left: isRightSide ? 'auto' : position.x + 10,
          right: isRightSide ? window.innerWidth - position.x + 10 : 'auto',
          width: 340,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          zIndex: 9999,
          animation: 'scaleIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid #e2e8f0',
            position: 'relative',
            backgroundColor: '#eff6ff'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
              lineHeight: 1,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1e293b'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
            aria-label="Close lake details"
          >
            ×
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 4
            }}
          >
            <span style={{ fontSize: 24 }}>💧</span>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: '#1e293b',
                paddingRight: 32
              }}
            >
              {name}
            </h2>
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#3b82f6',
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}
          >
            MAJOR LAKE
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            padding: 20,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }}
        >
          {/* Area */}
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>AREA</div>
            <div style={metricValueStyle}>{area_km2.toLocaleString()} km²</div>
          </div>

          {/* Max Depth */}
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>MAX DEPTH</div>
            <div style={metricValueStyle}>{max_depth_m} m</div>
          </div>

          {/* Elevation */}
          <div style={{ ...metricCardStyle, gridColumn: '1 / -1' }}>
            <div style={metricLabelStyle}>ELEVATION</div>
            <div style={metricValueStyle}>{elevation_m.toLocaleString()} m</div>
          </div>

          {/* Ecological Significance */}
          <div style={{ ...metricCardStyle, gridColumn: '1 / -1' }}>
            <div style={metricLabelStyle}>ECOLOGICAL SIGNIFICANCE</div>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: '#475569',
                marginTop: 8
              }}
            >
              {ecological_significance}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#475569'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Type:</span>
              <span>Freshwater Lake</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Status:</span>
              <span style={{ color: '#10b981', fontWeight: 500 }}>Active</span>
            </div>
          </div>
        </div>

        {/* Animation keyframes */}
        <style>{`
          @keyframes scaleIn {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </>
  );
};

// Shared styles
const metricCardStyle: React.CSSProperties = {
  padding: 12,
  backgroundColor: '#f8fafc',
  borderRadius: 8,
  border: '1px solid #e2e8f0'
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.5px',
  marginBottom: 6
};

const metricValueStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1e293b'
};
