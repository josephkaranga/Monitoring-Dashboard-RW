import React, { useMemo } from 'react';
import type { District } from '../../types/index';
import type { GBIFOccurrence } from '../../types/biodiversity';
import type { ProtectedAreasCollection } from '../../types/overlays';

interface DistrictDetailPanelProps {
  district: District | null;
  onClose: () => void;
  occurrences?: GBIFOccurrence[];
  protectedAreas?: ProtectedAreasCollection | null;
  biodiversityData?: Map<number, any>;
  threatData?: Map<
    number,
    { threatScore: number; threatLevel: 'high' | 'medium' | 'low'; riskFactors: string[] }
  >;
  nbsapData?: Map<number, { progress: number; indicatorCount: number }>;
}

export const DistrictDetailPanel: React.FC<DistrictDetailPanelProps> = ({
  district,
  onClose,
  occurrences = [],
  protectedAreas = null,
  biodiversityData,
  threatData,
  nbsapData,
}) => {
  // Calculate district-specific metrics
  const metrics = useMemo(() => {
    if (!district) return null;

    // Get biodiversity data for this district
    const biodivData = biodiversityData?.get(district.id);
    const speciesCount = biodivData?.speciesRichness || 0;

    // Get threat level
    const threat = threatData?.get(district.id);
    const threatLevel = threat?.threatLevel || 'low';
    const threatEmoji = threatLevel === 'high' ? '🔴' : threatLevel === 'medium' ? '🟡' : '🟢';
    const threatLabel = threatLevel.charAt(0).toUpperCase() + threatLevel.slice(1);

    // Get NBSAP progress
    const nbsap = nbsapData?.get(district.id);
    const nbsapProgress = nbsap?.progress || 0;

    // Find protected areas in this district (simplified - would need proper geospatial query)
    const districtProtectedAreas =
      protectedAreas?.features.filter(
        area =>
          area.properties.name.toLowerCase().includes(district.name.toLowerCase()) ||
          district.name.toLowerCase().includes(area.properties.name.toLowerCase())
      ) || [];

    const wetlandArea = district.wetland_area || 0;
    const lat = district.latitude || 0;
    const lng = district.longitude || 0;
    const elevation = district.elevation || 0;

    return {
      speciesCount,
      threatLevel,
      threatEmoji,
      threatLabel,
      nbsapProgress,
      districtProtectedAreas,
      wetlandArea,
      lat,
      lng,
      elevation,
    };
  }, [district, biodiversityData, threatData, nbsapData, protectedAreas]);

  if (!district || !metrics) return null;

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
          animation: 'fadeIn 0.3s ease-out',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 80,
          right: 20,
          width: 320,
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          zIndex: 9999,
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid #e2e8f0',
            position: 'relative',
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
            }}
            aria-label="Close district details"
          >
            ×
          </button>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: '#1e293b',
              paddingRight: 32,
            }}
          >
            {district.name}
          </h2>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              color: '#64748b',
            }}
          >
            <span style={{ fontWeight: 600 }}>PROVINCE</span>
            <span>{district.province?.name || 'Unknown'}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            padding: 20,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {/* Coordinates */}
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>LAT / LNG</div>
            <div style={metricValueStyle}>
              {metrics.lat.toFixed(2)}° / {metrics.lng.toFixed(2)}°
            </div>
          </div>

          {/* Elevation */}
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>ELEVATION</div>
            <div style={metricValueStyle}>{metrics.elevation} m</div>
          </div>

          {/* Forest Cover */}
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>FOREST COVER</div>
            <div style={metricValueStyle}>{district.forest_cover}%</div>
          </div>

          {/* Wetland */}
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>WETLAND</div>
            <div style={metricValueStyle}>{metrics.wetlandArea} ha</div>
          </div>

          {/* Species */}
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>SPECIES</div>
            <div style={metricValueStyle}>{metrics.speciesCount}</div>
          </div>

          {/* Threat Level */}
          <div style={{ ...metricCardStyle, gridColumn: '1 / -1' }}>
            <div style={metricLabelStyle}>THREAT LEVEL</div>
            <div style={{ ...metricValueStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{metrics.threatEmoji}</span>
              <span>{metrics.threatLabel}</span>
            </div>
          </div>

          {/* Protected Area */}
          {metrics.districtProtectedAreas.length > 0 && (
            <div style={{ ...metricCardStyle, gridColumn: '1 / -1' }}>
              <div style={metricLabelStyle}>PROTECTED AREA</div>
              <div style={metricValueStyle}>
                {metrics.districtProtectedAreas[0].properties.name}
              </div>
              {metrics.districtProtectedAreas[0].properties.designationType && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  {metrics.districtProtectedAreas[0].properties.designationType}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            fontSize: 12,
            color: '#94a3b8',
            textAlign: 'center',
          }}
        >
          {district.province?.name} Province
        </div>

        {/* Animation keyframes */}
        <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
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
  border: '1px solid #e2e8f0',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.5px',
  marginBottom: 6,
};

const metricValueStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1e293b',
};
