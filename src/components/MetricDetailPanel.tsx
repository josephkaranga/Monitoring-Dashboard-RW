import React from 'react';
import { progressColor } from '../utils/progressColors';
import type { DashboardMetrics } from '../services/systemMetricsService';
import type { District, NBSAPTarget, DashboardStats } from '../types/index';

export type MetricKey = 'forest' | 'wetland' | 'finance' | 'hwc' | 'eia' | 'districts' | null;

interface MetricConfig {
  title: string;
  icon: string;
  color: string;
  unit: string;
  getCurrent: (m: DashboardMetrics, s: DashboardStats | null) => number;
  getTarget: (m: DashboardMetrics, targets: NBSAPTarget[]) => number;
  targetLabel: (target: number, unit: string) => string;
  getDistrictBreakdown: (districts: District[]) => { name: string; value: number; detail: string }[];
  districtUnit: string;
  inverse?: boolean;
}

const configs: Record<Exclude<MetricKey, null>, MetricConfig> = {
  forest: {
    title: 'Forest Restoration',
    icon: 'fa-tree',
    color: '#10b981',
    unit: 'ha',
    getCurrent: (m, s) => m.totalForestHa || s?.forestHa || 0,
    getTarget: (m, _t) => m.restorationCommitmentsHa || m.totalForestHa || 600000,
    targetLabel: (t, u) => `Restoration target: ${t.toLocaleString()} ${u}`,
    getDistrictBreakdown: (districts) =>
      districts.map(d => ({
        name: d.name,
        value: d.forest_cover ?? 0,
        detail: `${(d.forest_cover ?? 0).toFixed(1)}% forest cover`,
      })).sort((a, b) => b.value - a.value),
    districtUnit: '% cover',
  },
  wetland: {
    title: 'Wetland Rehabilitation',
    icon: 'fa-water',
    color: '#0891b2',
    unit: 'ha',
    getCurrent: (m, s) => m.totalWetlandHa || s?.wetlandHa || 0,
    getTarget: (m, _t) => {
      const current = m.totalWetlandHa || 0;
      return current > 0 ? Math.ceil(current * 1.1) : 50000;
    },
    targetLabel: (t, u) => `Rehabilitation target: ${t.toLocaleString()} ${u}`,
    getDistrictBreakdown: (districts) =>
      districts.map(d => ({
        name: d.name,
        value: d.wetland_area ?? 0,
        detail: `${(d.wetland_area ?? 0).toLocaleString()} ha wetland area`,
      })).sort((a, b) => b.value - a.value),
    districtUnit: 'ha',
  },
  finance: {
    title: 'Finance Utilization',
    icon: 'fa-coins',
    color: '#059669',
    unit: 'M RWF',
    getCurrent: (m, s) => m.financeUtilizedMillionRwf || (s?.financeAllocated ? s.financeAllocated / 1e6 : 0),
    getTarget: (m, _t) => m.financeAllocatedMillionRwf || m.financeUtilizedMillionRwf || 0,
    targetLabel: (t, u) => t > 0 ? `Allocated budget: ${t.toFixed(1)} ${u}` : 'Biodiversity finance allocation',
    getDistrictBreakdown: (districts) =>
      districts.map(d => ({
        name: d.name,
        value: d.compliance ?? 0,
        detail: d.status === 'submitted' ? 'Reporting' : d.status === 'pending' ? 'Pending' : 'Not yet reporting',
      })).sort((a, b) => b.value - a.value),
    districtUnit: '% compliance',
  },
  hwc: {
    title: 'Human-Wildlife Conflict',
    icon: 'fa-paw',
    color: '#f59e0b',
    unit: 'incidents',
    inverse: true,
    getCurrent: (m, s) => m.totalHwcIncidents || s?.hwcIncidents || 0,
    getTarget: () => 0,
    targetLabel: () => 'Goal: Minimize incidents through mitigation measures',
    getDistrictBreakdown: (districts) =>
      districts.map(d => ({
        name: d.name,
        value: d.forest_cover ?? 0,
        detail: `${(d.forest_cover ?? 0).toFixed(1)}% forest cover (habitat proximity)`,
      })).sort((a, b) => b.value - a.value),
    districtUnit: '% cover',
  },
  eia: {
    title: 'EIA Compliance',
    icon: 'fa-clipboard-check',
    color: '#8b5cf6',
    unit: '%',
    getCurrent: (m) => m.eiaCompliancePercentage || 0,
    getTarget: () => 100,
    targetLabel: () => 'Target: 100% EIA compliance across all districts',
    getDistrictBreakdown: (districts) =>
      districts.map(d => ({
        name: d.name,
        value: d.compliance ?? 0,
        detail: `${(d.compliance ?? 0).toFixed(0)}% compliance score`,
      })).sort((a, b) => b.value - a.value),
    districtUnit: '%',
  },
  districts: {
    title: 'Active Districts',
    icon: 'fa-map-location-dot',
    color: '#6366f1',
    unit: 'districts',
    getCurrent: (m) => m.districtsActive || 0,
    getTarget: () => 30,
    targetLabel: () => 'All 30 Rwanda districts actively reporting',
    getDistrictBreakdown: (districts) =>
      districts.map(d => ({
        name: d.name,
        value: d.status === 'submitted' ? 100 : d.status === 'pending' ? 50 : 0,
        detail: d.status === 'submitted' ? 'Active — submitting reports' : d.status === 'pending' ? 'Pending — reports in review' : 'Not yet reporting',
      })).sort((a, b) => b.value - a.value),
    districtUnit: 'status',
  },
};

interface Props {
  metricKey: MetricKey;
  metrics: DashboardMetrics | null;
  stats: DashboardStats | null;
  districts: District[];
  targets: NBSAPTarget[];
  onClose: () => void;
}

const emptyMetrics: DashboardMetrics = {
  totalForestHa: 0, totalWetlandHa: 0, financeAllocatedMillionRwf: 0,
  financeDisbursedMillionRwf: 0, financeUtilizedMillionRwf: 0, totalHwcIncidents: 0,
  eiaFullCompliance: 0, eiaPartialCompliance: 0, eiaNonCompliance: 0,
  eiaCompliancePercentage: 0, districtsActive: 0, companiesReporting: 0,
  protectedAreasMonitored: 0, restorationCommitmentsHa: 0, lastUpdated: '',
};

export function MetricDetailPanel({ metricKey, metrics, stats, districts, targets, onClose }: Props) {
  if (!metricKey) return null;

  const m = metrics || emptyMetrics;
  const config = configs[metricKey];
  const current = config.getCurrent(m, stats);
  const target = config.getTarget(m, targets);
  const districtRows = config.getDistrictBreakdown(districts);
  const maxVal = districtRows.length > 0 ? Math.max(...districtRows.map(d => d.value), 1) : 1;
  const totalVal = districtRows.reduce((s, d) => s + d.value, 0);

  const isInverse = config.inverse;
  const pct = isInverse ? 100 : target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const remaining = isInverse ? current : Math.max(target - current, 0);
  const pc = progressColor(pct);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
        zIndex: 999, transition: 'opacity 0.3s ease',
      }} />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 440, maxWidth: '90vw',
        background: 'var(--surface, #fff)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        animation: 'metricSlideIn 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: `linear-gradient(135deg, ${config.color}11, ${config.color}08)`,
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${config.color}18`, color: config.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem',
            }}>
              <i className={`fa-solid ${config.icon}`} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}>{config.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Detailed Breakdown</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'var(--surface-3)', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)',
          }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Progress overview */}
          <div style={{
            background: 'var(--surface-2)', borderRadius: 12,
            border: '1px solid var(--border)', padding: 20, marginBottom: 20,
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 12, fontWeight: 500 }}>
              {config.targetLabel(target, config.unit)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: config.color, fontFamily: "'Playfair Display', serif" }}>
                  {current.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {isInverse ? 'Reported' : 'Achieved'} ({config.unit})
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#64748b', fontFamily: "'Playfair Display', serif" }}>
                  {remaining.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {isInverse ? 'To Mitigate' : 'Remaining'} ({config.unit})
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: pc.color, fontFamily: "'Playfair Display', serif" }}>
                  {pct}%
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginTop: 2 }}>
                  Progress
                </div>
              </div>
            </div>

            <div>
              <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: `linear-gradient(90deg, ${config.color}, ${config.color}cc)`,
                  borderRadius: 5, transition: 'width 1s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>0</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>
                  {isInverse ? `${current.toLocaleString()} reported` : `Target: ${target.toLocaleString()} ${config.unit}`}
                </span>
              </div>
            </div>
          </div>

          {/* EIA extra breakdown */}
          {metricKey === 'eia' && (
            <div style={{
              background: 'var(--surface-2)', borderRadius: 12,
              border: '1px solid var(--border)', padding: 16, marginBottom: 20,
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                Compliance Breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Full', value: m.eiaFullCompliance, color: '#10b981' },
                  { label: 'Partial', value: m.eiaPartialCompliance, color: '#f59e0b' },
                  { label: 'Non-Compliant', value: m.eiaNonCompliance, color: '#ef4444' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Finance extra breakdown */}
          {metricKey === 'finance' && (
            <div style={{
              background: 'var(--surface-2)', borderRadius: 12,
              border: '1px solid var(--border)', padding: 16, marginBottom: 20,
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>
                Financial Flow
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'Allocated', value: `${m.financeAllocatedMillionRwf.toFixed(1)}M`, color: '#6366f1' },
                  { label: 'Disbursed', value: `${m.financeDisbursedMillionRwf.toFixed(1)}M`, color: '#0284c7' },
                  { label: 'Utilized', value: `${m.financeUtilizedMillionRwf.toFixed(1)}M`, color: '#059669' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center', padding: '8px 4px' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{item.label} RWF</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District Breakdown */}
          <div>
            <div style={{
              fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="fa-solid fa-map-location-dot" style={{ color: '#6b7280' }} />
              By District
              <span style={{ fontSize: '0.62rem', fontWeight: 500, color: 'var(--text-3)', marginLeft: 'auto' }}>
                {districtRows.length} districts
              </span>
            </div>

            {districtRows.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 30, color: 'var(--text-3)',
                background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)',
              }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: '0.8rem' }}>No district data available</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {districtRows.map((d, idx) => {
                  const barPct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
                  return (
                    <div key={d.name} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 12px',
                      background: idx % 2 === 0 ? 'var(--surface-2)' : 'transparent',
                      borderRadius: 8,
                    }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-3)', width: 18, textAlign: 'center', flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-1)' }}>{d.name}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: config.color }}>
                            {typeof d.value === 'number' && d.value % 1 !== 0 ? d.value.toFixed(1) : d.value} {config.districtUnit}
                          </span>
                        </div>
                        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${barPct}%`,
                            background: config.color, borderRadius: 2,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: '0.56rem', color: 'var(--text-3)', marginTop: 2 }}>
                          {d.detail}
                          {totalVal > 0 && d.value > 0 && ` · ${Math.round((d.value / totalVal) * 100)}% of total`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border)',
          fontSize: '0.68rem', color: 'var(--text-3)', textAlign: 'center',
        }}>
          Data from district records and approved reports
        </div>
      </div>

      <style>{`
        @keyframes metricSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
