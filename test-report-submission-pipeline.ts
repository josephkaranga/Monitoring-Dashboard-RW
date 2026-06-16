/**
 * Test Suite: Report Submission Data Pipeline Integration
 * 
 * This test suite verifies task 3.1: Test report submission with stakeholder/target/indicator selections
 * 
 * Tests the complete data pipeline from stakeholder selection → target filtering → 
 * indicator loading → report submission → data storage with correct metadata
 */

import { supabase } from './supabase';
import { submitReport } from './reportService';
import { fetchUserResponsibleTargets, fetchIndicators, writeAuditEntry } from './dataService';
import type { NBSAPTarget, Indicator, ToolkitReport, ReportType } from './index';

// Test configuration
const TEST_CONFIG = {
  // Test stakeholder configurations
  stakeholders: [
    {
      id: 'REMA',
      name: 'Rwanda Environment Management Authority',
      expectedTargetIds: [1, 2, 3, 4, 6, 7, 8, 11, 13, 14, 17, 18, 19, 20, 21, 22],
      toolId: 'T02' as ReportType
    },
    {
      id: 'Districts',
      name: 'District Authorities', 
      expectedTargetIds: [1, 8, 11, 12],
      toolId: 'T02' as ReportType
    },
    {
      id: 'Private Sector',
      name: 'Private Sector Companies',
      expectedTargetIds: [7, 10, 13, 14, 15, 16],
      toolId: 'T06' as ReportType
    }
  ],
  // Test target IDs to focus on
  testTargetIds: [1, 2, 8, 13],
  // Test user data
  testUser: {
    id: 'test-user-pipeline',
    organization: 'REMA',
    email: 'test@pipeline.test'
  }
};

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  data?: any;
  error?: string;
}

class PipelineTestSuite {
  private results: TestResult[] = [];
  private testReportIds: string[] = [];

  constructor() {
    console.log('🔬 Starting Report Submission Data Pipeline Test Suite');
    console.log('📋 Testing task 3.1: stakeholder/target/indicator selection pipeline');
  }

  private addResult(testName: string, passed: boolean, details: string, data?: any, error?: string) {
    this.results.push({ testName, passed, details, data, error });
    const emoji = passed ? '✅' : '❌';
    console.log(`${emoji} ${testName}: ${details}`);
    if (error) console.log(`   Error: ${error}`);
  }

  /**
   * Test 1: Verify stakeholder-to-target filtering works correctly
   */
  async testStakeholderTargetFiltering(): Promise<void> {
    console.log('\n🎯 Test 1: Stakeholder-Target Filtering');
    
    try {
      const allTargets = await fetchUserResponsibleTargets();
      
      for (const stakeholder of TEST_CONFIG.stakeholders) {
        // Filter targets based on stakeholder mapping (simulating frontend logic)
        const filteredTargets = allTargets.filter(target => 
          stakeholder.expectedTargetIds.includes(target.id)
        );

        const actualTargetIds = filteredTargets.map(t => t.id).sort();
        const expectedTargetIds = stakeholder.expectedTargetIds.sort();
        
        const match = JSON.stringify(actualTargetIds) === JSON.stringify(expectedTargetIds);
        
        this.addResult(
          `Stakeholder ${stakeholder.id} target filtering`,
          match,
          `Expected ${expectedTargetIds.length} targets, got ${actualTargetIds.length}`,
          {
            stakeholder: stakeholder.id,
            expectedTargetIds,
            actualTargetIds,
            filteredTargets: filteredTargets.map(t => ({ id: t.id, title: t.title }))
          }
        );
      }
    } catch (error) {
      this.addResult(
        'Stakeholder-Target Filtering',
        false,
        'Failed to fetch or filter targets',
        null,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 2: Verify target-to-indicator loading works correctly
   */
  async testTargetIndicatorLoading(): Promise<void> {
    console.log('\n🎯 Test 2: Target-Indicator Loading');
    
    for (const targetId of TEST_CONFIG.testTargetIds) {
      try {
        const indicators = await fetchIndicators({ targetId });
        
        // Verify all indicators belong to the correct target
        const allBelongToTarget = indicators.every(ind => ind.nbsap_target_id === targetId);
        
        this.addResult(
          `Target ${targetId} indicator loading`,
          allBelongToTarget && indicators.length > 0,
          `Loaded ${indicators.length} indicators, all belong to target: ${allBelongToTarget}`,
          {
            targetId,
            indicatorCount: indicators.length,
            indicators: indicators.map(i => ({ 
              id: i.id, 
              name: i.name, 
              nbsap_target_id: i.nbsap_target_id,
              definition: i.definition ? 'Has definition' : 'Missing definition'
            }))
          }
        );
      } catch (error) {
        this.addResult(
          `Target ${targetId} indicator loading`,
          false,
          'Failed to load indicators',
          null,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  /**
   * Test 3: Test report submission with complete stakeholder/target/indicator data
   */
  async testReportSubmissionPipeline(): Promise<void> {
    console.log('\n🎯 Test 3: Complete Report Submission Pipeline');
    
    for (const stakeholder of TEST_CONFIG.stakeholders.slice(0, 2)) { // Test first 2 stakeholders
      try {
        // Get targets for this stakeholder
        const allTargets = await fetchUserResponsibleTargets();
        const stakeholderTargets = allTargets.filter(target => 
          stakeholder.expectedTargetIds.includes(target.id)
        );

        if (stakeholderTargets.length === 0) {
          this.addResult(
            `${stakeholder.id} report submission`,
            false,
            'No targets available for stakeholder',
            { stakeholder: stakeholder.id }
          );
          continue;
        }

        // Use first available target
        const selectedTarget = stakeholderTargets[0];
        
        // Get indicators for this target
        const indicators = await fetchIndicators({ targetId: selectedTarget.id });
        
        if (indicators.length === 0) {
          this.addResult(
            `${stakeholder.id} report submission`,
            false,
            `No indicators available for target ${selectedTarget.id}`,
            { stakeholder: stakeholder.id, targetId: selectedTarget.id }
          );
          continue;
        }

        // Use first available indicator
        const selectedIndicator = indicators[0];

        // Create test form data
        const formData = {
          stakeholder: stakeholder.id,
          nbsap_target: selectedTarget.id.toString(),
          indicator: selectedIndicator.id.toString(),
          period: 'Q1 2025',
          district: stakeholder.id === 'Districts' ? 'Nyarugenge' : undefined,
          institution: stakeholder.id !== 'Districts' ? stakeholder.name : undefined,
          current_status: '75',
          budget_utilized: stakeholder.toolId === 'T06' ? '5000000' : undefined,
          activities: 'Test pipeline integration activities',
          challenges: 'Testing data pipeline flow',
          // Enhanced pipeline metadata
          stakeholder_info: {
            name: stakeholder.name,
            responsibilities: ['Testing', 'Pipeline validation']
          },
          target_info: {
            id: selectedTarget.id,
            title: selectedTarget.title,
            description: selectedTarget.description
          },
          indicator_info: {
            id: selectedIndicator.id,
            name: selectedIndicator.name,
            definition: selectedIndicator.definition
          },
          submission_timestamp: new Date().toISOString(),
          submitted_by: TEST_CONFIG.testUser.id,
          submitted_by_organization: TEST_CONFIG.testUser.organization
        };

        // Submit the report
        const result = await submitReport(
          stakeholder.toolId,
          `Test ${stakeholder.toolId} Report`,
          formData,
          false, // Skip verification for testing
          [], // No attachments
          selectedTarget.id
        );

        if (result.error) {
          this.addResult(
            `${stakeholder.id} report submission`,
            false,
            'Report submission failed',
            { stakeholder: stakeholder.id, formData },
            result.error
          );
        } else if (result.data) {
          this.testReportIds.push(result.data.id);
          
          // Verify the submitted report contains correct metadata
          const hasCorrectTargetId = result.data.nbsap_target_id === selectedTarget.id;
          const hasFormData = Object.keys(result.data.form_data).length > 0;
          const hasStakeholderInfo = !!result.data.form_data.stakeholder;
          
          this.addResult(
            `${stakeholder.id} report submission`,
            hasCorrectTargetId && hasFormData && hasStakeholderInfo,
            `Submitted successfully - Target ID: ${hasCorrectTargetId}, Form data: ${hasFormData}, Stakeholder: ${hasStakeholderInfo}`,
            {
              reportId: result.data.id,
              stakeholder: stakeholder.id,
              targetId: selectedTarget.id,
              indicatorId: selectedIndicator.id,
              submittedTargetId: result.data.nbsap_target_id,
              formDataKeys: Object.keys(result.data.form_data),
              status: result.data.status
            }
          );

          // Test audit entry creation
          await this.testAuditLogIntegration(stakeholder, selectedTarget, selectedIndicator, result.data);
          
        } else {
          this.addResult(
            `${stakeholder.id} report submission`,
            false,
            'No data returned from submission',
            { stakeholder: stakeholder.id }
          );
        }

      } catch (error) {
        this.addResult(
          `${stakeholder.id} report submission`,
          false,
          'Exception during report submission',
          { stakeholder: stakeholder.id },
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  /**
   * Test 4: Verify audit logging integration
   */
  async testAuditLogIntegration(
    stakeholder: typeof TEST_CONFIG.stakeholders[0], 
    target: NBSAPTarget, 
    indicator: Indicator,
    report: ToolkitReport
  ): Promise<void> {
    try {
      // Create audit entry similar to what the form does
      await writeAuditEntry(
        'submit',
        `${report.tool_name} submitted → Stakeholder: ${stakeholder.name} → Target ${target.id}: ${target.title} → Indicator: ${indicator.name}`,
        `Tool: ${report.tool_id} · Status: ${report.status} · Stakeholder: ${stakeholder.id} · NBSAP Target: ${target.id} · Indicator: ${indicator.id}`
      );
      
      this.addResult(
        `${stakeholder.id} audit logging`,
        true,
        'Audit entry created successfully',
        {
          stakeholder: stakeholder.id,
          targetId: target.id,
          indicatorId: indicator.id,
          reportId: report.id
        }
      );
    } catch (error) {
      this.addResult(
        `${stakeholder.id} audit logging`,
        false,
        'Failed to create audit entry',
        { stakeholder: stakeholder.id },
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Test 5: Verify database storage and retrieval
   */
  async testDatabaseStorageRetrieval(): Promise<void> {
    console.log('\n🎯 Test 4: Database Storage & Retrieval');
    
    for (const reportId of this.testReportIds) {
      try {
        // Fetch the submitted report from database
        const { data: report, error } = await supabase
          .from('toolkit_reports')
          .select(`
            *,
            submitted_by_profile:profiles!toolkit_reports_submitted_by_fkey(
              id, full_name, email, role, organization
            ),
            nbsap_target:nbsap_targets(
              id, title, progress, goal
            )
          `)
          .eq('id', reportId)
          .single();

        if (error) {
          this.addResult(
            `Database retrieval ${reportId}`,
            false,
            'Failed to retrieve submitted report',
            { reportId },
            error.message
          );
          continue;
        }

        if (!report) {
          this.addResult(
            `Database retrieval ${reportId}`,
            false,
            'Report not found in database',
            { reportId }
          );
          continue;
        }

        // Verify data integrity
        const hasNbsapTargetId = report.nbsap_target_id !== null;
        const hasFormData = report.form_data && Object.keys(report.form_data).length > 0;
        const hasStakeholderData = report.form_data?.stakeholder;
        const hasTargetData = report.form_data?.nbsap_target;
        const hasIndicatorData = report.form_data?.indicator;
        
        const allDataPresent = hasNbsapTargetId && hasFormData && hasStakeholderData && hasTargetData && hasIndicatorData;
        
        this.addResult(
          `Database storage ${reportId}`,
          allDataPresent,
          `Data integrity check - Target ID: ${hasNbsapTargetId}, Form: ${hasFormData}, Stakeholder: ${!!hasStakeholderData}, Target: ${!!hasTargetData}, Indicator: ${!!hasIndicatorData}`,
          {
            reportId,
            nbsapTargetId: report.nbsap_target_id,
            formDataKeys: report.form_data ? Object.keys(report.form_data) : [],
            stakeholder: report.form_data?.stakeholder,
            target: report.form_data?.nbsap_target,
            indicator: report.form_data?.indicator,
            hasTargetRelation: !!report.nbsap_target
          }
        );

      } catch (error) {
        this.addResult(
          `Database retrieval ${reportId}`,
          false,
          'Exception during database retrieval',
          { reportId },
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  /**
   * Test 6: Verify indicator field definition is available
   */
  async testIndicatorFieldDefinition(): Promise<void> {
    console.log('\n🎯 Test 5: Indicator Field Definition Availability');
    
    try {
      // Test a few different targets to ensure indicator definitions are properly available
      for (const targetId of TEST_CONFIG.testTargetIds.slice(0, 3)) {
        const indicators = await fetchIndicators({ targetId });
        
        for (const indicator of indicators.slice(0, 2)) { // Test first 2 indicators per target
          const hasDefinition = !!indicator.definition;
          const hasName = !!indicator.name;
          
          this.addResult(
            `Indicator ${indicator.id} field availability`,
            hasDefinition && hasName,
            `Name: ${hasName}, Definition: ${hasDefinition} ${hasDefinition ? `(${indicator.definition.length} chars)` : ''}`,
            {
              indicatorId: indicator.id,
              name: indicator.name,
              hasDefinition,
              definitionLength: indicator.definition?.length || 0,
              targetId: indicator.nbsap_target_id
            }
          );
        }
      }
    } catch (error) {
      this.addResult(
        'Indicator field definition test',
        false,
        'Failed to test indicator definitions',
        null,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Cleanup: Remove test reports
   */
  async cleanupTestReports(): Promise<void> {
    console.log('\n🧹 Cleaning up test reports...');
    
    for (const reportId of this.testReportIds) {
      try {
        await supabase
          .from('toolkit_reports')
          .delete()
          .eq('id', reportId);
        
        console.log(`   Cleaned up report ${reportId}`);
      } catch (error) {
        console.log(`   Failed to clean up report ${reportId}: ${error}`);
      }
    }
  }

  /**
   * Run all tests and generate report
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive pipeline tests...\n');
    
    try {
      await this.testStakeholderTargetFiltering();
      await this.testTargetIndicatorLoading();
      await this.testReportSubmissionPipeline();
      await this.testDatabaseStorageRetrieval();
      await this.testIndicatorFieldDefinition();
      
      this.generateTestReport();
      
    } finally {
      await this.cleanupTestReports();
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): void {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(50));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.testName}: ${result.details}`);
        if (result.error) console.log(`     Error: ${result.error}`);
      });
    }
    
    console.log('\n🔍 DETAILED TEST DATA:');
    this.results.forEach(result => {
      if (result.data) {
        console.log(`\n${result.testName}:`);
        console.log(JSON.stringify(result.data, null, 2));
      }
    });
    
    // Summary for Task 3.1
    console.log('\n✅ TASK 3.1 VERIFICATION RESULTS:');
    console.log('─'.repeat(40));
    
    const stakeholderTests = this.results.filter(r => r.testName.includes('target filtering'));
    const indicatorTests = this.results.filter(r => r.testName.includes('indicator loading'));
    const submissionTests = this.results.filter(r => r.testName.includes('report submission') && !r.testName.includes('audit'));
    const storageTests = this.results.filter(r => r.testName.includes('Database storage'));
    
    console.log(`✓ Stakeholder-Target Filtering: ${stakeholderTests.filter(t => t.passed).length}/${stakeholderTests.length} passed`);
    console.log(`✓ Target-Indicator Loading: ${indicatorTests.filter(t => t.passed).length}/${indicatorTests.length} passed`);
    console.log(`✓ Report Submission Pipeline: ${submissionTests.filter(t => t.passed).length}/${submissionTests.length} passed`);
    console.log(`✓ Database Storage Integration: ${storageTests.filter(t => t.passed).length}/${storageTests.length} passed`);
    
    const overallSuccess = passedTests === totalTests;
    console.log(`\n🎯 OVERALL TASK 3.1 STATUS: ${overallSuccess ? 'PASSED ✅' : 'NEEDS ATTENTION ⚠️'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 All data pipeline integration tests passed!');
      console.log('   The stakeholder/target/indicator selection pipeline is working correctly.');
      console.log('   Reports are properly submitted with complete metadata.');
      console.log('   Database storage maintains data integrity.');
    }
  }
}

// Export test runner for manual execution
export { PipelineTestSuite };

// Auto-run if this file is executed directly
if (require.main === module) {
  console.log('Starting automated pipeline test execution...');
  const testSuite = new PipelineTestSuite();
  testSuite.runAllTests().catch(console.error);
}