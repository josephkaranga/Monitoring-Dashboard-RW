/**
 * System Metrics Service
 *
 * Provides access to automatically updated system-wide metrics
 * calculated from all reporting tool submissions
 */

import { supabase } from '../utils/supabase';

export interface SystemMetrics {
  // Forest and Land Use
  totalForestHa: number;
  totalWetlandHa: number;
  restorationCommitmentsHa: number;

  // Finance (in RWF)
  financeAllocatedRwf: number;
  financeDisbursedRwf: number;
  financeUtilizedRwf: number;

  // Environmental Incidents
  totalHwcIncidents: number;

  // EIA Compliance
  eiaFullCompliance: number;
  eiaPartialCompliance: number;
  eiaNonCompliance: number;
  eiaCompliancePercentage: number;

  // Activity Metrics
  districtsActive: number;
  companiesReporting: number;
  protectedAreasMonitored: number;

  // Metadata
  lastUpdated: string;
}

export interface DashboardMetrics {
  totalForestHa: number;
  totalWetlandHa: number;
  financeAllocatedMillionRwf: number;
  financeDisbursedMillionRwf: number;
  financeUtilizedMillionRwf: number;
  totalHwcIncidents: number;
  eiaFullCompliance: number;
  eiaPartialCompliance: number;
  eiaNonCompliance: number;
  eiaCompliancePercentage: number;
  districtsActive: number;
  companiesReporting: number;
  protectedAreasMonitored: number;
  restorationCommitmentsHa: number;
  lastUpdated: string;
}

/**
 * Fetch current system metrics (detailed format)
 */
export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  try {
    const { data, error } = await supabase.rpc('get_system_metrics');

    if (error) {
      console.error('Error fetching system metrics:', error);
      throw new Error(`Failed to fetch system metrics: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        totalForestHa: 0,
        totalWetlandHa: 0,
        restorationCommitmentsHa: 0,
        financeAllocatedRwf: 0,
        financeDisbursedRwf: 0,
        financeUtilizedRwf: 0,
        totalHwcIncidents: 0,
        eiaFullCompliance: 0,
        eiaPartialCompliance: 0,
        eiaNonCompliance: 0,
        eiaCompliancePercentage: 0,
        districtsActive: 0,
        companiesReporting: 0,
        protectedAreasMonitored: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const row = data[0];
    const totalEia = row.eia_full_compliance + row.eia_partial_compliance + row.eia_non_compliance;
    const eiaCompliancePercentage =
      totalEia > 0 ? Math.round((row.eia_full_compliance / totalEia) * 100) : 0;

    return {
      totalForestHa: parseFloat(row.forest_ha) || 0,
      totalWetlandHa: parseFloat(row.wetland_ha) || 0,
      restorationCommitmentsHa: parseFloat(row.restoration_commitments_ha) || 0,
      financeAllocatedRwf: parseFloat(row.finance_allocated_rwf) || 0,
      financeDisbursedRwf: parseFloat(row.finance_disbursed_rwf) || 0,
      financeUtilizedRwf: parseFloat(row.finance_utilized_rwf) || 0,
      totalHwcIncidents: parseInt(row.hwc_incidents) || 0,
      eiaFullCompliance: parseInt(row.eia_full_compliance) || 0,
      eiaPartialCompliance: parseInt(row.eia_partial_compliance) || 0,
      eiaNonCompliance: parseInt(row.eia_non_compliance) || 0,
      eiaCompliancePercentage,
      districtsActive: parseInt(row.districts_active) || 0,
      companiesReporting: parseInt(row.companies_active) || 0,
      protectedAreasMonitored: parseInt(row.protected_areas_monitored) || 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in fetchSystemMetrics:', error);
    throw error;
  }
}

/**
 * Fetch dashboard metrics (formatted for display)
 */
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const { data, error } = await supabase.from('dashboard_metrics_live').select('*').single();

    if (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw new Error(`Failed to fetch dashboard metrics: ${error.message}`);
    }

    if (!data) {
      // Return default values if no data
      return {
        totalForestHa: 0,
        totalWetlandHa: 0,
        financeAllocatedMillionRwf: 0,
        financeDisbursedMillionRwf: 0,
        financeUtilizedMillionRwf: 0,
        totalHwcIncidents: 0,
        eiaFullCompliance: 0,
        eiaPartialCompliance: 0,
        eiaNonCompliance: 0,
        eiaCompliancePercentage: 0,
        districtsActive: 0,
        companiesReporting: 0,
        protectedAreasMonitored: 0,
        restorationCommitmentsHa: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    return {
      totalForestHa: parseFloat(data.total_forest_ha) || 0,
      totalWetlandHa: parseFloat(data.total_wetland_ha) || 0,
      financeAllocatedMillionRwf: parseFloat(data.finance_allocated_million_rwf) || 0,
      financeDisbursedMillionRwf: parseFloat(data.finance_disbursed_million_rwf) || 0,
      financeUtilizedMillionRwf: parseFloat(data.finance_utilized_million_rwf) || 0,
      totalHwcIncidents: parseInt(data.total_hwc_incidents) || 0,
      eiaFullCompliance: parseInt(data.eia_full_compliance) || 0,
      eiaPartialCompliance: parseInt(data.eia_partial_compliance) || 0,
      eiaNonCompliance: parseInt(data.eia_non_compliance) || 0,
      eiaCompliancePercentage: parseFloat(data.eia_compliance_percentage) || 0,
      districtsActive: parseInt(data.districts_active) || 0,
      companiesReporting: parseInt(data.companies_reporting) || 0,
      protectedAreasMonitored: parseInt(data.protected_areas_monitored) || 0,
      restorationCommitmentsHa: parseFloat(data.restoration_commitments_ha) || 0,
      lastUpdated: data.last_updated || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in fetchDashboardMetrics:', error);
    throw error;
  }
}

/**
 * Recalculate all system metrics (admin function)
 * Use this to ensure data integrity
 */
export async function recalculateSystemMetrics(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('recalculate_system_metrics');
    if (error) {
      console.error('Error recalculating metrics:', error);
      throw new Error(`Failed to recalculate metrics: ${error.message}`);
    }
    return data || 'Metrics recalculated successfully';
  } catch (error) {
    console.error('Error in recalculateSystemMetrics:', error);
    throw error;
  }
}

/**
 * Get metrics for specific categories
 */
export async function fetchCategoryMetrics(
  category: 'forest' | 'wetland' | 'finance' | 'hwc' | 'eia' | 'activity'
) {
  const metrics = await fetchSystemMetrics();

  switch (category) {
    case 'forest':
      return {
        totalForestHa: metrics.totalForestHa,
        restorationCommitmentsHa: metrics.restorationCommitmentsHa,
      };

    case 'wetland':
      return {
        totalWetlandHa: metrics.totalWetlandHa,
      };

    case 'finance':
      return {
        allocated: metrics.financeAllocatedRwf,
        disbursed: metrics.financeDisbursedRwf,
        utilized: metrics.financeUtilizedRwf,
        allocationRate:
          metrics.financeAllocatedRwf > 0
            ? (metrics.financeDisbursedRwf / metrics.financeAllocatedRwf) * 100
            : 0,
        utilizationRate:
          metrics.financeDisbursedRwf > 0
            ? (metrics.financeUtilizedRwf / metrics.financeDisbursedRwf) * 100
            : 0,
      };

    case 'hwc':
      return {
        totalIncidents: metrics.totalHwcIncidents,
      };

    case 'eia':
      return {
        fullCompliance: metrics.eiaFullCompliance,
        partialCompliance: metrics.eiaPartialCompliance,
        nonCompliance: metrics.eiaNonCompliance,
        compliancePercentage: metrics.eiaCompliancePercentage,
      };

    case 'activity':
      return {
        districtsActive: metrics.districtsActive,
        companiesReporting: metrics.companiesReporting,
        protectedAreasMonitored: metrics.protectedAreasMonitored,
      };

    default:
      return metrics;
  }
}

/**
 * Format metric values for display
 */
export function formatMetricValue(
  value: number,
  type: 'currency' | 'percentage' | 'number' | 'hectares'
): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('rw-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

    case 'percentage':
      return `${value.toFixed(1)}%`;

    case 'hectares':
      return `${value.toLocaleString()} ha`;

    case 'number':
    default:
      return value.toLocaleString();
  }
}

/**
 * Check if metrics need updating (based on last updated time)
 */
export function metricsNeedUpdate(lastUpdated: string, maxAgeMinutes: number = 60): boolean {
  const lastUpdateTime = new Date(lastUpdated);
  const now = new Date();
  const ageMinutes = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);

  return ageMinutes > maxAgeMinutes;
}
