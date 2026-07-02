// ============================================================
// Data Validation & Consistency Checks
// ============================================================

import { supabase } from '../utils/supabase';
import {
  TOOL_WEIGHTS,
  validateToolWeights,
  type ProgressCalculation,
  type ToolId,
} from '../types/automaticReporting';

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

interface TargetProgressRow {
  id: number;
  progress: number;
  auto_update_count?: number | null;
}

function result(issues: ValidationIssue[]): ValidationResult {
  return { valid: issues.length === 0, issues };
}

/**
 * Validate that a progress value is a finite number within the 0-100 range.
 */
export function validateProgressValue(value: number): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(value)) {
    issues.push({ field: 'progress', message: `Progress value ${value} is not a finite number` });
  } else if (value < 0 || value > 100) {
    issues.push({
      field: 'progress',
      message: `Progress value ${value} is outside the 0-100 range`,
    });
  }

  return result(issues);
}

/**
 * Clamp a progress value to the valid 0-100 range.
 */
export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Validate that a single tool weight is a number between 0 and 1.
 */
export function validateToolWeightValue(weight: number): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(weight)) {
    issues.push({ field: 'weight', message: `Tool weight ${weight} is not a finite number` });
  } else if (weight < 0 || weight > 1) {
    issues.push({ field: 'weight', message: `Tool weight ${weight} is outside the 0-1 range` });
  }

  return result(issues);
}

/**
 * Validate that a full set of tool weights sums to 1.0.
 */
export function validateToolWeightsSum(
  weights: Record<ToolId, number> = TOOL_WEIGHTS
): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const [toolId, weight] of Object.entries(weights)) {
    const weightCheck = validateToolWeightValue(weight);
    for (const issue of weightCheck.issues) {
      issues.push({ field: toolId, message: issue.message });
    }
  }

  if (!validateToolWeights(weights)) {
    const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
    issues.push({ field: 'weights', message: `Tool weights sum to ${sum}, expected 1.0` });
  }

  return result(issues);
}

/**
 * Validate a single target's stored progress and auto-update count.
 */
export function validateTargetProgressRow(row: TargetProgressRow): ValidationResult {
  const issues: ValidationIssue[] = [];

  const progressCheck = validateProgressValue(row.progress);
  issues.push(
    ...progressCheck.issues.map(issue => ({ ...issue, field: `target ${row.id} ${issue.field}` }))
  );

  if (row.auto_update_count != null && row.auto_update_count < 0) {
    issues.push({
      field: `target ${row.id} auto_update_count`,
      message: `auto_update_count ${row.auto_update_count} cannot be negative`,
    });
  }

  return result(issues);
}

/**
 * Validate that a progress calculation is internally consistent: the
 * weighted contribution matches base contribution * tool weight, and the
 * new progress is the clamped sum of the previous progress and the
 * weighted contribution.
 */
export function validateProgressCalculation(calculation: ProgressCalculation): ValidationResult {
  const issues: ValidationIssue[] = [];

  const expectedWeighted = calculation.baseContribution * calculation.toolWeight;
  if (Math.abs(calculation.weightedContribution - expectedWeighted) > 1e-9) {
    issues.push({
      field: 'weightedContribution',
      message: `Expected weighted contribution ${expectedWeighted}, got ${calculation.weightedContribution}`,
    });
  }

  const expectedNewProgress = clampProgress(
    calculation.previousProgress + calculation.weightedContribution
  );
  if (Math.abs(calculation.newProgress - expectedNewProgress) > 1e-9) {
    issues.push({
      field: 'newProgress',
      message: `Expected new progress ${expectedNewProgress}, got ${calculation.newProgress}`,
    });
  }

  issues.push(...validateProgressValue(calculation.newProgress).issues);

  return result(issues);
}

/**
 * Fetch all NBSAP targets and verify their stored progress and
 * auto-update counts are within valid ranges. Used for periodic data
 * integrity audits.
 */
export async function auditTargetProgressIntegrity(): Promise<ValidationResult> {
  const { data, error } = await supabase
    .from('nbsap_targets')
    .select('id, progress, auto_update_count');

  if (error || !data) {
    return result([
      { field: 'nbsap_targets', message: error?.message || 'Unable to load targets' },
    ]);
  }

  const issues = (data as TargetProgressRow[]).flatMap(
    row => validateTargetProgressRow(row).issues
  );
  return result(issues);
}
