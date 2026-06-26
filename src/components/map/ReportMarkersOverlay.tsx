import React, { useMemo } from 'react';
import type { ToolkitReport, District } from '../../types/index';

interface ReportMarkersOverlayProps {
  reports: ToolkitReport[];
  districts: District[];
  geoData: GeoJSON.FeatureCollection | null;
  onReportClick: (report: ToolkitReport) => void;
  onReportHover: (report: ToolkitReport | null) => void;
}

const TOOL_COLORS: Record<string, string> = {
  T01: '#1B6CA8',
  T02: '#1E7D4B',
  T03: '#5B3FA6',
  T04: '#B56A00',
  T05: '#0E6655',
  T06: '#922B21',
  T07: '#1A5276',
};

const TOOL_ICONS: Record<string, string> = {
  T01: '\u{1F3DB}',
  T02: '\u{1F33F}',
  T03: '\u{1F6E1}',
  T04: '\u{1F465}',
  T05: '\u{1F4B0}',
  T06: '\u{1F3D7}',
  T07: '\u{1F52C}',
};

function getDistrictCentroid(
  districtName: string,
  districts: District[],
  geoData: GeoJSON.FeatureCollection | null
): { lon: number; lat: number } | null {
  // Try database coordinates first
  const dbDistrict = districts.find(
    d => d.name.toLowerCase() === districtName.toLowerCase()
  );
  if (dbDistrict?.longitude && dbDistrict?.latitude) {
    return { lon: dbDistrict.longitude, lat: dbDistrict.latitude };
  }

  // Fall back to GeoJSON centroid
  if (!geoData) return null;
  const feature = geoData.features.find(f => {
    const name = (f.properties?.name || f.properties?.ADM2_EN || '').toLowerCase();
    return name === districtName.toLowerCase();
  });
  if (!feature || feature.geometry.type !== 'Polygon') return null;

  const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
  const lon = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return { lon, lat };
}

interface PlacedReport {
  report: ToolkitReport;
  lon: number;
  lat: number;
}

export const ReportMarkersOverlay = React.memo(function ReportMarkersOverlay({
  reports,
  districts,
  geoData,
  onReportClick,
  onReportHover,
}: ReportMarkersOverlayProps) {
  const placedReports = useMemo(() => {
    const result: PlacedReport[] = [];
    // Group by district to offset overlapping markers
    const byDistrict = new Map<string, PlacedReport[]>();

    for (const report of reports) {
      const districtName = report.district
        || (report.form_data?.district as string)
        || (report.form_data?.area_name as string)
        || '';
      if (!districtName) continue;

      const center = getDistrictCentroid(districtName, districts, geoData);
      if (!center) continue;

      const key = districtName.toLowerCase();
      if (!byDistrict.has(key)) byDistrict.set(key, []);
      const group = byDistrict.get(key)!;

      // Spiral offset for multiple reports at the same district
      const i = group.length;
      const angle = i * 1.2;
      const radius = i === 0 ? 0 : 0.02 + (i * 0.008);
      const offsetLon = Math.cos(angle) * radius;
      const offsetLat = Math.sin(angle) * radius;

      const placed = {
        report,
        lon: center.lon + offsetLon,
        lat: center.lat + offsetLat,
      };
      group.push(placed);
      result.push(placed);
    }

    return result;
  }, [reports, districts, geoData]);

  if (placedReports.length === 0) return null;

  return (
    <g className="report-markers-overlay" aria-label="Approved reports">
      {placedReports.map(({ report, lon, lat }) => {
        const color = TOOL_COLORS[report.tool_id] || '#6b7280';
        const svgY = -lat;

        return (
          <g key={report.id}
            onClick={(e) => { e.stopPropagation(); onReportClick(report); }}
            onMouseEnter={() => onReportHover(report)}
            onMouseLeave={() => onReportHover(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Drop shadow */}
            <circle cx={lon} cy={svgY + 0.004} r={0.018} fill="rgba(0,0,0,0.15)" />
            {/* Marker background */}
            <circle cx={lon} cy={svgY} r={0.018}
              fill={color} fillOpacity={0.9}
              stroke="#fff" strokeWidth={0.005}
              style={{ transition: 'r 0.15s, fill-opacity 0.15s' }}
            />
            {/* Pulse ring for pending reports */}
            {report.status === 'pending' && (
              <circle cx={lon} cy={svgY} r={0.025}
                fill="none" stroke={color} strokeWidth={0.003} strokeOpacity={0.4}>
                <animate attributeName="r" from="0.018" to="0.035" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <title>
              {report.tool_name}
              {'\n'}District: {report.district || (report.form_data?.district as string) || '—'}
              {report.period && `\nPeriod: ${report.period}`}
              {'\n'}Status: {report.status}
              {'\n'}Submitted: {new Date(report.submitted_at).toLocaleDateString()}
              {report.submitted_by_profile?.full_name && `\nBy: ${report.submitted_by_profile.full_name}`}
            </title>
          </g>
        );
      })}
    </g>
  );
});

export default ReportMarkersOverlay;
