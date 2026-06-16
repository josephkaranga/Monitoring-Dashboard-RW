// ============================================================
// Progress Calculator Engine — Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { ProgressCalculator } from './progressCalculator';
import { ToolId, type ReportSubmission } from '../types/automaticReporting';

function makeReport(overrides: Partial<ReportSubmission> = {}): ReportSubmission {
  return {
    id: 'report-123',
    toolId: ToolId.T01,
    toolName: 'National Institutional Reporting',
    submittedBy: 'user-456',
    status: 'approved',
    nbsapTargetId: 1,
    formData: {},
    submissionTime: new Date(),
    contributionValue: 20,
    ...overrides,
  };
}

describe('ProgressCalculator', () => {
  const calculator = new ProgressCalculator();

  describe('validateWeightSum', () => {
    it('should confirm tool weights sum to 1.0', () => {
      expect(calculator.validateWeightSum()).toBe(true);
    });
  });

  describe('calculateWeightedProgress', () => {
    it('should apply the T01 weight to a single report contribution', () => {
      const reports = [makeReport({ toolId: ToolId.T01, contributionValue: 20 })];
      // 30 + (20 * 0.25) = 35
      expect(calculator.calculateWeightedProgress(reports, 30)).toBe(35);
    });

    it('should sum weighted contributions from multiple tools', () => {
      const reports = [
        makeReport({ toolId: ToolId.T01, contributionValue: 20 }), // +5
        makeReport({ toolId: ToolId.T02, contributionValue: 20 }), // +4
      ];
      expect(calculator.calculateWeightedProgress(reports, 30)).toBe(39);
    });

    it('should clamp progress at 100', () => {
      const reports = [makeReport({ toolId: ToolId.T01, contributionValue: 100 })];
      expect(calculator.calculateWeightedProgress(reports, 95)).toBe(100);
    });

    it('should clamp progress at 0', () => {
      const reports = [makeReport({ toolId: ToolId.T01, contributionValue: -100 })];
      expect(calculator.calculateWeightedProgress(reports, 5)).toBe(0);
    });

    it('should return current progress unchanged when there are no reports', () => {
      expect(calculator.calculateWeightedProgress([], 42)).toBe(42);
    });
  });

  describe('calculateContribution', () => {
    it('should compute the weighted contribution and new progress for T01', () => {
      const report = makeReport({ toolId: ToolId.T01, contributionValue: 20 });
      const calculation = calculator.calculateContribution(report, 1, 30);

      expect(calculation.targetId).toBe(1);
      expect(calculation.toolId).toBe(ToolId.T01);
      expect(calculation.toolWeight).toBe(0.25);
      expect(calculation.baseContribution).toBe(20);
      expect(calculation.weightedContribution).toBe(5);
      expect(calculation.previousProgress).toBe(30);
      expect(calculation.newProgress).toBe(35);
      expect(calculation.reportId).toBe('report-123');
      expect(calculation.calculatedAt).toBeInstanceOf(Date);
    });

    it('should clamp newProgress at 100 within the calculation', () => {
      const report = makeReport({ toolId: ToolId.T01, contributionValue: 100 });
      const calculation = calculator.calculateContribution(report, 1, 95);

      expect(calculation.newProgress).toBe(100);
    });
  });

  describe('buildUpdateResult', () => {
    it('should mark progressUpdated true when progress changes', () => {
      const report = makeReport({ toolId: ToolId.T01, contributionValue: 20 });
      const calculation = calculator.calculateContribution(report, 1, 30);
      const result = calculator.buildUpdateResult(calculation, report.toolId);

      expect(result.success).toBe(true);
      expect(result.targetId).toBe(1);
      expect(result.progressUpdated).toBe(true);
      expect(result.eiaComplianceUpdated).toBe(false);
      expect(result.newProgress).toBe(35);
      expect(result.calculationDetails).toBe(calculation);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should mark progressUpdated false when already at the cap', () => {
      const report = makeReport({ toolId: ToolId.T01, contributionValue: 20 });
      const calculation = calculator.calculateContribution(report, 1, 100);
      const result = calculator.buildUpdateResult(calculation, report.toolId);

      expect(result.progressUpdated).toBe(false);
      expect(result.newProgress).toBe(100);
    });

    it('should set eiaComplianceUpdated true for T06 reports', () => {
      const report = makeReport({ toolId: ToolId.T06, contributionValue: 15 });
      const calculation = calculator.calculateContribution(report, 5, 40);
      const result = calculator.buildUpdateResult(calculation, report.toolId);

      expect(result.eiaComplianceUpdated).toBe(true);
    });
  });
});
