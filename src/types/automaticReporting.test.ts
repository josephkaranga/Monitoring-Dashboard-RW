// ============================================================
// Automatic Reporting Types — Unit Tests
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  ToolId,
  ComplianceState,
  UpdateStatus,
  ToolWeight,
  ProgressCalculation,
  UpdateResult,
  EIAMetrics,
  OrganizationConfig,
  ReportSubmission,
  ProcessingResult,
  UpdateEvent,
  BatchUpdate,
  TOOL_WEIGHTS,
  TOOL_DESCRIPTIONS,
  validateToolWeights,
  getToolWeight,
  getToolDescription,
  reportTypeToToolId,
  toolIdToReportType,
} from './automaticReporting';
import type { ReportType, SubmissionStatus } from './index';

describe('Automatic Reporting Types', () => {
  // ── ENUM TESTS ─────────────────────────────────────────────

  describe('ToolId enum', () => {
    it('should contain all required tool IDs', () => {
      expect(ToolId.T01).toBe('T01');
      expect(ToolId.T02).toBe('T02');
      expect(ToolId.T03).toBe('T03');
      expect(ToolId.T04).toBe('T04');
      expect(ToolId.T05).toBe('T05');
      expect(ToolId.T06).toBe('T06');
      expect(ToolId.T07).toBe('T07');
    });

    it('should have exactly 7 tool IDs', () => {
      const toolIds = Object.values(ToolId);
      expect(toolIds).toHaveLength(7);
    });
  });

  describe('ComplianceState enum', () => {
    it('should contain all required compliance states', () => {
      expect(ComplianceState.COMPLIANT).toBe('compliant');
      expect(ComplianceState.PARTIAL_COMPLIANT).toBe('partial_compliant');
      expect(ComplianceState.NON_COMPLIANT).toBe('non_compliant');
      expect(ComplianceState.PENDING_REVIEW).toBe('pending_review');
      expect(ComplianceState.NOT_APPLICABLE).toBe('not_applicable');
    });
  });

  describe('UpdateStatus enum', () => {
    it('should contain all required update statuses', () => {
      expect(UpdateStatus.PENDING).toBe('pending');
      expect(UpdateStatus.PROCESSING).toBe('processing');
      expect(UpdateStatus.COMPLETED).toBe('completed');
      expect(UpdateStatus.FAILED).toBe('failed');
      expect(UpdateStatus.RETRYING).toBe('retrying');
    });
  });

  // ── TOOL WEIGHTS TESTS ─────────────────────────────────────

  describe('TOOL_WEIGHTS constant', () => {
    it('should have correct weight values as specified in requirements', () => {
      expect(TOOL_WEIGHTS[ToolId.T01]).toBe(0.25); // National Institutional Reporting
      expect(TOOL_WEIGHTS[ToolId.T02]).toBe(0.2); // District Biodiversity Monitoring
      expect(TOOL_WEIGHTS[ToolId.T03]).toBe(0.15); // Protected Area Monitoring
      expect(TOOL_WEIGHTS[ToolId.T04]).toBe(0.15); // Community Biodiversity Monitoring
      expect(TOOL_WEIGHTS[ToolId.T05]).toBe(0.1); // Biodiversity Finance Tracking
      expect(TOOL_WEIGHTS[ToolId.T06]).toBe(0.1); // Private Sector Compliance
      expect(TOOL_WEIGHTS[ToolId.T07]).toBe(0.05); // Research & Academic Contribution
    });

    it('should have weights that sum to 1.0', () => {
      const totalWeight = Object.values(TOOL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
      expect(totalWeight).toBe(1.0);
    });

    it('should contain weights for all tool IDs', () => {
      const toolIds = Object.values(ToolId);
      toolIds.forEach(toolId => {
        expect(TOOL_WEIGHTS).toHaveProperty(toolId);
        expect(typeof TOOL_WEIGHTS[toolId]).toBe('number');
      });
    });
  });

  describe('TOOL_DESCRIPTIONS constant', () => {
    it('should have descriptions for all tool IDs', () => {
      expect(TOOL_DESCRIPTIONS[ToolId.T01]).toBe('National Institutional Reporting');
      expect(TOOL_DESCRIPTIONS[ToolId.T02]).toBe('District Biodiversity Monitoring');
      expect(TOOL_DESCRIPTIONS[ToolId.T03]).toBe('Protected Area Monitoring');
      expect(TOOL_DESCRIPTIONS[ToolId.T04]).toBe('Community Biodiversity Monitoring');
      expect(TOOL_DESCRIPTIONS[ToolId.T05]).toBe('Biodiversity Finance Tracking');
      expect(TOOL_DESCRIPTIONS[ToolId.T06]).toBe('Private Sector Compliance');
      expect(TOOL_DESCRIPTIONS[ToolId.T07]).toBe('Research & Academic Contribution');
    });

    it('should contain descriptions for all tool IDs', () => {
      const toolIds = Object.values(ToolId);
      toolIds.forEach(toolId => {
        expect(TOOL_DESCRIPTIONS).toHaveProperty(toolId);
        expect(typeof TOOL_DESCRIPTIONS[toolId]).toBe('string');
        expect(TOOL_DESCRIPTIONS[toolId].length).toBeGreaterThan(0);
      });
    });
  });

  // ── INTERFACE VALIDATION TESTS ─────────────────────────────

  describe('ToolWeight interface', () => {
    it('should accept valid tool weight objects', () => {
      const toolWeight: ToolWeight = {
        toolId: ToolId.T01,
        weight: 0.25,
        description: 'National Institutional Reporting',
        active: true,
        updatedAt: new Date(),
      };

      expect(toolWeight.toolId).toBe(ToolId.T01);
      expect(toolWeight.weight).toBe(0.25);
      expect(toolWeight.description).toBe('National Institutional Reporting');
      expect(toolWeight.active).toBe(true);
      expect(toolWeight.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('ProgressCalculation interface', () => {
    it('should accept valid progress calculation objects', () => {
      const calculation: ProgressCalculation = {
        targetId: 1,
        toolId: ToolId.T01,
        toolWeight: 0.25,
        baseContribution: 20,
        weightedContribution: 5,
        previousProgress: 30,
        newProgress: 35,
        calculatedAt: new Date(),
        reportId: 'report-123',
      };

      expect(calculation.targetId).toBe(1);
      expect(calculation.toolId).toBe(ToolId.T01);
      expect(calculation.toolWeight).toBe(0.25);
      expect(calculation.baseContribution).toBe(20);
      expect(calculation.weightedContribution).toBe(5);
      expect(calculation.previousProgress).toBe(30);
      expect(calculation.newProgress).toBe(35);
      expect(calculation.calculatedAt).toBeInstanceOf(Date);
      expect(calculation.reportId).toBe('report-123');
    });
  });

  describe('UpdateResult interface', () => {
    it('should accept valid update result objects', () => {
      const updateResult: UpdateResult = {
        success: true,
        targetId: 1,
        progressUpdated: true,
        eiaComplianceUpdated: false,
        processingTime: 250,
        newProgress: 35,
        updatedAt: new Date(),
        calculationDetails: {
          targetId: 1,
          toolId: ToolId.T01,
          toolWeight: 0.25,
          baseContribution: 20,
          weightedContribution: 5,
          previousProgress: 30,
          newProgress: 35,
          calculatedAt: new Date(),
          reportId: 'report-123',
        },
      };

      expect(updateResult.success).toBe(true);
      expect(updateResult.targetId).toBe(1);
      expect(updateResult.progressUpdated).toBe(true);
      expect(updateResult.eiaComplianceUpdated).toBe(false);
      expect(updateResult.processingTime).toBe(250);
      expect(updateResult.newProgress).toBe(35);
      expect(updateResult.updatedAt).toBeInstanceOf(Date);
      expect(updateResult.calculationDetails).toBeDefined();
    });
  });

  describe('EIAMetrics interface', () => {
    it('should accept valid EIA metrics objects', () => {
      const eiaMetrics: EIAMetrics = {
        totalReports: 100,
        compliantReports: 80,
        partialCompliant: 15,
        nonCompliant: 5,
        compliancePercentage: 80,
        activeIssues: 5,
        lastUpdated: new Date(),
      };

      expect(eiaMetrics.totalReports).toBe(100);
      expect(eiaMetrics.compliantReports).toBe(80);
      expect(eiaMetrics.partialCompliant).toBe(15);
      expect(eiaMetrics.nonCompliant).toBe(5);
      expect(eiaMetrics.compliancePercentage).toBe(80);
      expect(eiaMetrics.activeIssues).toBe(5);
      expect(eiaMetrics.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('OrganizationConfig interface', () => {
    it('should accept valid organization config objects', () => {
      const orgConfig: OrganizationConfig = {
        organizationId: 'org-123',
        organizationName: 'REMA',
        automaticUpdatesEnabled: true,
        requireVerification: false,
        auditLevel: 'standard',
        processingTimeout: 30,
        enableNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(orgConfig.organizationId).toBe('org-123');
      expect(orgConfig.organizationName).toBe('REMA');
      expect(orgConfig.automaticUpdatesEnabled).toBe(true);
      expect(orgConfig.requireVerification).toBe(false);
      expect(orgConfig.auditLevel).toBe('standard');
      expect(orgConfig.processingTimeout).toBe(30);
      expect(orgConfig.enableNotifications).toBe(true);
      expect(orgConfig.createdAt).toBeInstanceOf(Date);
      expect(orgConfig.updatedAt).toBeInstanceOf(Date);
    });

    it('should accept valid audit level values', () => {
      const levels: Array<'minimal' | 'standard' | 'comprehensive'> = [
        'minimal',
        'standard',
        'comprehensive',
      ];

      levels.forEach(level => {
        const config: OrganizationConfig = {
          organizationId: 'org-123',
          organizationName: 'Test Org',
          automaticUpdatesEnabled: true,
          requireVerification: false,
          auditLevel: level,
          processingTimeout: 30,
          enableNotifications: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(config.auditLevel).toBe(level);
      });
    });
  });

  // ── UTILITY FUNCTION TESTS ─────────────────────────────────

  describe('validateToolWeights function', () => {
    it('should validate correct tool weights (sum = 1.0)', () => {
      const result = validateToolWeights(TOOL_WEIGHTS);
      expect(result).toBe(true);
    });

    it('should reject tool weights that do not sum to 1.0', () => {
      const invalidWeights = {
        [ToolId.T01]: 0.3,
        [ToolId.T02]: 0.2,
        [ToolId.T03]: 0.1,
        [ToolId.T04]: 0.1,
        [ToolId.T05]: 0.1,
        [ToolId.T06]: 0.1,
        [ToolId.T07]: 0.05,
      } as Record<ToolId, number>;

      const result = validateToolWeights(invalidWeights);
      expect(result).toBe(false);
    });

    it('should handle floating point precision correctly', () => {
      const weightsWithPrecisionIssue = {
        [ToolId.T01]: 0.1,
        [ToolId.T02]: 0.1,
        [ToolId.T03]: 0.1,
        [ToolId.T04]: 0.1,
        [ToolId.T05]: 0.1,
        [ToolId.T06]: 0.1,
        [ToolId.T07]: 0.4,
      } as Record<ToolId, number>;

      // This should sum to 1.0 but might have floating point issues
      const sum = Object.values(weightsWithPrecisionIssue).reduce(
        (total, weight) => total + weight,
        0
      );
      expect(sum).toBe(1.0);

      const result = validateToolWeights(weightsWithPrecisionIssue);
      expect(result).toBe(true);
    });
  });

  describe('getToolWeight function', () => {
    it('should return correct weight for each tool ID', () => {
      expect(getToolWeight(ToolId.T01)).toBe(0.25);
      expect(getToolWeight(ToolId.T02)).toBe(0.2);
      expect(getToolWeight(ToolId.T03)).toBe(0.15);
      expect(getToolWeight(ToolId.T04)).toBe(0.15);
      expect(getToolWeight(ToolId.T05)).toBe(0.1);
      expect(getToolWeight(ToolId.T06)).toBe(0.1);
      expect(getToolWeight(ToolId.T07)).toBe(0.05);
    });
  });

  describe('getToolDescription function', () => {
    it('should return correct description for each tool ID', () => {
      expect(getToolDescription(ToolId.T01)).toBe('National Institutional Reporting');
      expect(getToolDescription(ToolId.T02)).toBe('District Biodiversity Monitoring');
      expect(getToolDescription(ToolId.T03)).toBe('Protected Area Monitoring');
      expect(getToolDescription(ToolId.T04)).toBe('Community Biodiversity Monitoring');
      expect(getToolDescription(ToolId.T05)).toBe('Biodiversity Finance Tracking');
      expect(getToolDescription(ToolId.T06)).toBe('Private Sector Compliance');
      expect(getToolDescription(ToolId.T07)).toBe('Research & Academic Contribution');
    });
  });

  describe('reportTypeToToolId function', () => {
    it('should convert ReportType to ToolId correctly', () => {
      expect(reportTypeToToolId('T01' as ReportType)).toBe(ToolId.T01);
      expect(reportTypeToToolId('T02' as ReportType)).toBe(ToolId.T02);
      expect(reportTypeToToolId('T03' as ReportType)).toBe(ToolId.T03);
      expect(reportTypeToToolId('T04' as ReportType)).toBe(ToolId.T04);
      expect(reportTypeToToolId('T05' as ReportType)).toBe(ToolId.T05);
      expect(reportTypeToToolId('T06' as ReportType)).toBe(ToolId.T06);
      expect(reportTypeToToolId('T07' as ReportType)).toBe(ToolId.T07);
    });
  });

  describe('toolIdToReportType function', () => {
    it('should convert ToolId to ReportType correctly', () => {
      expect(toolIdToReportType(ToolId.T01)).toBe('T01');
      expect(toolIdToReportType(ToolId.T02)).toBe('T02');
      expect(toolIdToReportType(ToolId.T03)).toBe('T03');
      expect(toolIdToReportType(ToolId.T04)).toBe('T04');
      expect(toolIdToReportType(ToolId.T05)).toBe('T05');
      expect(toolIdToReportType(ToolId.T06)).toBe('T06');
      expect(toolIdToReportType(ToolId.T07)).toBe('T07');
    });
  });

  // ── INTEGRATION TESTS ──────────────────────────────────────

  describe('Real-time update interfaces', () => {
    it('should accept valid UpdateEvent objects', () => {
      const updateEvent: UpdateEvent = {
        type: 'progress_updated',
        targetId: 1,
        newValues: {
          progress: 35,
        },
        timestamp: new Date(),
        sourceReportId: 'report-123',
      };

      expect(updateEvent.type).toBe('progress_updated');
      expect(updateEvent.targetId).toBe(1);
      expect(updateEvent.newValues.progress).toBe(35);
      expect(updateEvent.timestamp).toBeInstanceOf(Date);
      expect(updateEvent.sourceReportId).toBe('report-123');
    });

    it('should accept valid BatchUpdate objects', () => {
      const batchUpdate: BatchUpdate = {
        updates: [
          { targetId: 1, contribution: 10, toolId: ToolId.T01 },
          { targetId: 2, contribution: 5, toolId: ToolId.T02 },
        ],
        createdAt: new Date(),
        timeout: 30,
      };

      expect(batchUpdate.updates).toHaveLength(2);
      expect(batchUpdate.updates[0].targetId).toBe(1);
      expect(batchUpdate.updates[0].contribution).toBe(10);
      expect(batchUpdate.updates[0].toolId).toBe(ToolId.T01);
      expect(batchUpdate.createdAt).toBeInstanceOf(Date);
      expect(batchUpdate.timeout).toBe(30);
    });
  });

  describe('Processing interfaces', () => {
    it('should accept valid ReportSubmission objects', () => {
      const reportSubmission: ReportSubmission = {
        id: 'report-123',
        toolId: ToolId.T01,
        toolName: 'National Institutional Reporting',
        submittedBy: 'user-456',
        status: 'pending' as SubmissionStatus,
        nbsapTargetId: 1,
        formData: { field1: 'value1', field2: 42 },
        submissionTime: new Date(),
        contributionValue: 20,
      };

      expect(reportSubmission.id).toBe('report-123');
      expect(reportSubmission.toolId).toBe(ToolId.T01);
      expect(reportSubmission.toolName).toBe('National Institutional Reporting');
      expect(reportSubmission.submittedBy).toBe('user-456');
      expect(reportSubmission.status).toBe('pending');
      expect(reportSubmission.nbsapTargetId).toBe(1);
      expect(reportSubmission.formData).toEqual({ field1: 'value1', field2: 42 });
      expect(reportSubmission.submissionTime).toBeInstanceOf(Date);
      expect(reportSubmission.contributionValue).toBe(20);
    });

    it('should accept valid ProcessingResult objects', () => {
      const processingResult: ProcessingResult = {
        success: true,
        progressUpdated: true,
        processingTime: 150,
        status: UpdateStatus.COMPLETED,
      };

      expect(processingResult.success).toBe(true);
      expect(processingResult.progressUpdated).toBe(true);
      expect(processingResult.processingTime).toBe(150);
      expect(processingResult.status).toBe(UpdateStatus.COMPLETED);
    });
  });

  // ── MATHEMATICAL CONSISTENCY TESTS ─────────────────────────

  describe('Tool weight mathematical consistency', () => {
    it('should maintain mathematical properties across all operations', () => {
      // Test that weights are positive
      Object.values(TOOL_WEIGHTS).forEach(weight => {
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });

      // Test that weights sum to exactly 1.0
      const sum = Object.values(TOOL_WEIGHTS).reduce((total, weight) => total + weight, 0);
      expect(sum).toBe(1.0);

      // Test that T01 has the highest weight (as per requirements)
      const t01Weight = TOOL_WEIGHTS[ToolId.T01];
      Object.entries(TOOL_WEIGHTS).forEach(([toolId, weight]) => {
        if (toolId !== ToolId.T01) {
          expect(t01Weight).toBeGreaterThanOrEqual(weight);
        }
      });

      // Test that T07 has the lowest weight (as per requirements)
      const t07Weight = TOOL_WEIGHTS[ToolId.T07];
      Object.entries(TOOL_WEIGHTS).forEach(([toolId, weight]) => {
        if (toolId !== ToolId.T07) {
          expect(weight).toBeGreaterThanOrEqual(t07Weight);
        }
      });
    });

    it('should validate weighted contribution calculations', () => {
      const baseContribution = 20;

      // Test each tool weight produces correct weighted contribution
      Object.entries(TOOL_WEIGHTS).forEach(([toolId, weight]) => {
        const weightedContribution = baseContribution * weight;
        expect(weightedContribution).toBe(baseContribution * weight);
        expect(weightedContribution).toBeGreaterThan(0);
        expect(weightedContribution).toBeLessThanOrEqual(baseContribution);
      });
    });
  });
});
