// ============================================================
// EIA Compliance Tracker — React Hook
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import { ComplianceState, type EIAMetrics } from '../types/automaticReporting';

export interface ComplianceTrendPoint {
  period: string;
  percentage: number;
}

interface T06ReportRow {
  form_data: Record<string, unknown> | null;
}

const EMPTY_METRICS: EIAMetrics = {
  totalReports: 0,
  compliantReports: 0,
  partialCompliant: 0,
  nonCompliant: 0,
  compliancePercentage: 0,
  activeIssues: 0,
  lastUpdated: new Date(0),
};

/**
 * Map a T06 report's `eia_compliance` form field to a ComplianceState.
 */
export function getEIAComplianceState(rawValue: unknown): ComplianceState {
  switch (rawValue) {
    case 'Full compliance':
      return ComplianceState.COMPLIANT;
    case 'Partial compliance':
      return ComplianceState.PARTIAL_COMPLIANT;
    case 'Non-compliant':
      return ComplianceState.NON_COMPLIANT;
    default:
      return ComplianceState.PENDING_REVIEW;
  }
}

/**
 * Compute EIA compliance metrics from a set of approved T06 reports.
 */
export function calculateEIAMetrics(reports: T06ReportRow[]): EIAMetrics {
  let compliantReports = 0;
  let partialCompliant = 0;
  let nonCompliant = 0;

  for (const report of reports) {
    const state = getEIAComplianceState(report.form_data?.eia_compliance);
    if (state === ComplianceState.COMPLIANT) compliantReports++;
    else if (state === ComplianceState.PARTIAL_COMPLIANT) partialCompliant++;
    else if (state === ComplianceState.NON_COMPLIANT) nonCompliant++;
  }

  const totalReports = reports.length;
  const compliancePercentage =
    totalReports > 0 ? Math.round((compliantReports / totalReports) * 100) : 0;

  return {
    totalReports,
    compliantReports,
    partialCompliant,
    nonCompliant,
    compliancePercentage,
    activeIssues: partialCompliant + nonCompliant,
    lastUpdated: new Date(),
  };
}

/**
 * Label the current quarter (e.g. "Q2 2026") for compliance trend points.
 */
export function getCurrentQuarterLabel(date: Date = new Date()): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

/**
 * Tracks EIA compliance metrics for approved T06 reports, refreshing
 * automatically in real-time whenever T06 reports change.
 */
export function useEIAComplianceTracking() {
  const [eiaMetrics, setEIAMetrics] = useState<EIAMetrics>(EMPTY_METRICS);
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrendPoint[]>([]);
  const mountedRef = useRef(true);

  const updateEIAMetrics = useCallback(async () => {
    const { data, error } = await supabase
      .from('toolkit_reports')
      .select('form_data')
      .eq('tool_id', 'T06')
      .eq('status', 'approved');

    if (error || !mountedRef.current) return;

    const metrics = calculateEIAMetrics((data || []) as T06ReportRow[]);
    setEIAMetrics(metrics);

    const period = getCurrentQuarterLabel();
    setComplianceTrend(prev => {
      const existingIndex = prev.findIndex(point => point.period === period);
      if (existingIndex === -1) {
        return [...prev, { period, percentage: metrics.compliancePercentage }];
      }
      const next = [...prev];
      next[existingIndex] = { period, percentage: metrics.compliancePercentage };
      return next;
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    updateEIAMetrics();

    const channel = supabase
      .channel('eia_compliance_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'toolkit_reports', filter: 'tool_id=eq.T06' },
        () => updateEIAMetrics()
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [updateEIAMetrics]);

  return { eiaMetrics, complianceTrend, updateEIAMetrics };
}
