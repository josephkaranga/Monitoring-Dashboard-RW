/**
 * Task 3.1 Report Submission Test Runner
 * 
 * This script tests report submission with different stakeholder/target/indicator combinations
 * by interacting with the actual running application
 */

import { submitReport } from './reportService.js';
import { fetchUserResponsibleTargets, fetchIndicators, writeAuditEntry } from './dataService.js';
import { supabase } from './supabase.js';

// Test scenarios that match the stakeholder responsibilities in the app
const TEST_SCENARIOS = [
  {
    id: 'rema_institutional',
    name: 'REMA Institutional Reporting',
    stakeholder: 'REMA',
    toolId: 'T01',
    formData: {
      stakeholder: 'REMA',
      institution: 'Rwanda Environment Management Authority',
      period: 'Q1 2024',
      current_status: 78,
      budget_utilized: 3200000,
      activities: 'Completed environmental impact assessments for 5 major projects, conducted biodiversity monitoring in 3 protected areas',
      challenges: 'Insufficient technical equipment for comprehensive field monitoring, need additional staff training'
    }
  },
  {
    id: 'district_monitoring',
    name: 'District Biodiversity Monitoring',
    stakeholder: 'District Authorities',
    toolId: 'T02',
    formData: {
      stakeholder: 'District Authorities',
      district: 'Kicukiro',
      officer: 'Paul Nkubana',
      period: 'Q1 2024',
      forest_ha: 95,
      wetland_ha: 28,
      agroforestry_hh: 220,
      soil_structures: 18,
      conservation_groups: 7,
      illegal_cases: 3,
      notes: 'Successful wetland restoration project completed, increased community participation in conservation activities'
    }
  },
  {
    id: 'rfa_protected_area',
    name: 'RFA Protected Area Management',
    stakeholder: 'RFA',
    toolId: 'T03',
    formData: {
      stakeholder: 'RFA',
      area_name: 'Akagera National Park',
      agency: 'Rwanda Forestry Authority',
      period: 'H1 2024',
      coverage_change_ha: 25,
      species_trend: 'Increasing',
      habitat_quality: 8,
      illegal_cases: 2,
      restoration_ha: 12,
      observations: 'Wildlife population showing positive trends, successful anti-poaching measures implemented'
    }
  }
];

class SubmissionTester {
  constructor() {
    this.results = [];
    this.submittedReportIds = [];
  }

  async runAllTests() {
    console.log('🔬 Starting Report Submission Tests for Task 3.1');
    console.log('=' .repeat(60));
    
    try {
      // Test authentication
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('User not authenticated. Please log in first.');
      }
      
      console.log(`✓ Authenticated as: ${session.session.user.email}`);
      
      // Load available data
      console.log('📊 Loading available targets and indicators...');
      const targets = await fetchUserResponsibleTargets(session.session.user.user_metadata?.organization || 'Test Org');
      const indicators = await fetchIndicators();
      
      console.log(`✓ Loaded ${targets.length} targets and ${indicators.length} indicators`);
      
      if (targets.length === 0) {
        throw new Error('No targets available for testing. Check user permissions.');
      }
      
      if (indicators.length === 0) {
        throw new Error('No indicators available for testing. Check database setup.');
      }
      
      // Run each test scenario
      for (const scenario of TEST_SCENARIOS) {
        console.log(`\n🧪 Testing: ${scenario.name}`);
        console.log('-'.repeat(40));
        
        try {
          const result = await this.testScenario(scenario, targets, indicators);
          this.results.push(result);
          
          if (result.success) {
            console.log(`✅ ${scenario.name}: PASSED`);
            if (result.reportId) {
              this.submittedReportIds.push(result.reportId);
            }
          } else {
            console.log(`❌ ${scenario.name}: FAILED - ${result.error}`);
          }
        } catch (error) {
          console.log(`❌ ${scenario.name}: ERROR - ${error.message}`);
          this.results.push({
            success: false,
            scenarioId: scenario.id,
            error: error.message
          });
        }
      }
      
      // Print summary
      this.printSummary();
      
      // Audit log the test completion
      await writeAuditEntry(
        'test_completion',
        'Report submission integration test completed',
        `Task 3.1 - Tested ${TEST_SCENARIOS.length} scenarios, ${this.results.filter(r => r.success).length} passed`
      );
      
    } catch (error) {
      console.error('❌ Test setup failed:', error.message);
      throw error;
    }
  }

  async testScenario(scenario, availableTargets, availableIndicators) {
    // Step 1: Find appropriate target for this stakeholder
    const stakeholderTargets = this.getStakeholderTargets(scenario.stakeholder, availableTargets);
    
    if (stakeholderTargets.length === 0) {
      throw new Error(`No targets found for stakeholder: ${scenario.stakeholder}`);
    }
    
    const selectedTarget = stakeholderTargets[0];
    console.log(`  🎯 Selected target: ${selectedTarget.id} - ${selectedTarget.title}`);
    
    // Step 2: Find indicators for the selected target
    const targetIndicators = availableIndicators.filter(ind => ind.nbsap_target_id === selectedTarget.id);
    
    if (targetIndicators.length === 0) {
      throw new Error(`No indicators found for target ${selectedTarget.id}`);
    }
    
    const selectedIndicator = targetIndicators[0];
    console.log(`  📊 Selected indicator: ${selectedIndicator.id} - ${selectedIndicator.name}`);
    
    // Step 3: Prepare complete form data
    const completeFormData = {
      ...scenario.formData,
      nbsap_target: selectedTarget.id.toString(),
      indicator: selectedIndicator.id.toString(),
      
      // Pipeline information for verification
      stakeholder_info: {
        id: scenario.stakeholder,
        name: this.getStakeholderName(scenario.stakeholder)
      },
      target_info: {
        id: selectedTarget.id,
        title: selectedTarget.title,
        progress: selectedTarget.progress
      },
      indicator_info: {
        id: selectedIndicator.id,
        name: selectedIndicator.name,
        definition: selectedIndicator.definition,
        status: selectedIndicator.status
      },
      
      // Test metadata
      test_run: true,
      test_scenario: scenario.id,
      test_timestamp: new Date().toISOString()
    };
    
    console.log('  📝 Prepared enhanced form data with pipeline information');
    
    // Step 4: Submit the report
    console.log('  🚀 Submitting report...');
    
    const submitResult = await submitReport(
      scenario.toolId,
      `${scenario.toolId} - ${scenario.name} (Integration Test)`,
      completeFormData,
      true, // require verification
      [], // no attachments
      selectedTarget.id
    );
    
    if (submitResult.error) {
      throw new Error(`Submission failed: ${submitResult.error}`);
    }
    
    const reportData = submitResult.data;
    console.log(`  ✅ Report submitted with ID: ${reportData.id}`);
    
    // Step 5: Verify the submission
    console.log('  🔍 Verifying submission...');
    
    await this.verifySubmission(reportData, scenario, selectedTarget, selectedIndicator);
    
    console.log('  ✅ Verification completed successfully');
    
    return {
      success: true,
      scenarioId: scenario.id,
      reportId: reportData.id,
      targetId: selectedTarget.id,
      indicatorId: selectedIndicator.id,
      toolId: scenario.toolId,
      status: reportData.status
    };
  }

  async verifySubmission(reportData, scenario, selectedTarget, selectedIndicator) {
    // Verify basic report properties
    if (reportData.tool_id !== scenario.toolId) {
      throw new Error(`Tool ID mismatch: expected ${scenario.toolId}, got ${reportData.tool_id}`);
    }
    
    if (reportData.nbsap_target_id !== selectedTarget.id) {
      throw new Error(`Target ID mismatch: expected ${selectedTarget.id}, got ${reportData.nbsap_target_id}`);
    }
    
    if (reportData.status !== 'pending') {
      throw new Error(`Status mismatch: expected 'pending', got ${reportData.status}`);
    }
    
    // Verify form data preservation
    const formData = reportData.form_data;
    
    if (formData.stakeholder !== scenario.stakeholder) {
      throw new Error(`Stakeholder not preserved: expected ${scenario.stakeholder}, got ${formData.stakeholder}`);
    }
    
    if (parseInt(formData.nbsap_target) !== selectedTarget.id) {
      throw new Error(`Target selection not preserved: expected ${selectedTarget.id}, got ${formData.nbsap_target}`);
    }
    
    if (parseInt(formData.indicator) !== selectedIndicator.id) {
      throw new Error(`Indicator selection not preserved: expected ${selectedIndicator.id}, got ${formData.indicator}`);
    }
    
    // Verify pipeline information preservation
    if (!formData.stakeholder_info || !formData.target_info || !formData.indicator_info) {
      throw new Error('Pipeline information not preserved in form data');
    }
    
    if (formData.stakeholder_info.id !== scenario.stakeholder) {
      throw new Error('Stakeholder info not preserved correctly');
    }
    
    if (formData.target_info.id !== selectedTarget.id) {
      throw new Error('Target info not preserved correctly');
    }
    
    if (formData.indicator_info.id !== selectedIndicator.id) {
      throw new Error('Indicator info not preserved correctly');
    }
    
    // Verify database storage
    const { data: storedReport, error } = await supabase
      .from('toolkit_reports')
      .select('*, nbsap_target:nbsap_targets(*)')
      .eq('id', reportData.id)
      .single();
    
    if (error) {
      throw new Error(`Failed to retrieve stored report: ${error.message}`);
    }
    
    if (!storedReport.nbsap_target || storedReport.nbsap_target.id !== selectedTarget.id) {
      throw new Error('Report not properly linked to target in database');
    }
    
    console.log('    ✓ Basic report properties verified');
    console.log('    ✓ Form data preservation verified');
    console.log('    ✓ Pipeline information verified');
    console.log('    ✓ Database storage and linking verified');
  }

  getStakeholderTargets(stakeholder, availableTargets) {
    // Map stakeholders to their responsible targets based on the app's STAKEHOLDER_RESPONSIBILITIES
    const stakeholderTargetMap = {
      'REMA': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
      'District Authorities': [2, 3, 8, 9, 10, 14, 22],
      'RFA': [2, 5, 6, 8, 10, 11, 12],
      'RDB': [1, 3, 4, 6, 9],
      'MINAGRI': [1, 5, 6, 7, 8, 9, 10, 11, 18]
    };
    
    const targetIds = stakeholderTargetMap[stakeholder] || [];
    return availableTargets.filter(target => targetIds.includes(target.id));
  }

  getStakeholderName(stakeholderId) {
    const nameMap = {
      'REMA': 'Rwanda Environment Management Authority',
      'District Authorities': 'District Authorities',
      'RFA': 'Rwanda Forestry Authority',
      'RDB': 'Rwanda Development Board',
      'MINAGRI': 'Ministry of Agriculture and Animal Resources'
    };
    
    return nameMap[stakeholderId] || stakeholderId;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TASK 3.1 TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.length - passed;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total Scenarios: ${this.results.length}`);
    
    if (passed === this.results.length) {
      console.log('\n🎉 ALL TESTS PASSED! Task 3.1 Requirements Satisfied:');
      console.log('  ✓ Reports created using different stakeholder/target/indicator combinations');
      console.log('  ✓ Reports submitted through reporting toolkit successfully');  
      console.log('  ✓ Reports properly stored with correct metadata');
      console.log('  ✓ submitReport function includes all necessary pipeline information');
    } else {
      console.log('\n⚠️ Some tests failed:');
      this.results.filter(r => !r.success).forEach(result => {
        console.log(`  ❌ ${result.scenarioId}: ${result.error}`);
      });
    }
    
    if (this.submittedReportIds.length > 0) {
      console.log(`\n📝 Created ${this.submittedReportIds.length} test reports:`);
      this.submittedReportIds.forEach(id => console.log(`  📄 Report ID: ${id}`));
      console.log('\n💡 These reports can be verified in the Reporting Toolkit submissions tab');
    }
  }

  async cleanup() {
    if (this.submittedReportIds.length > 0) {
      console.log(`\n🧹 Cleaning up ${this.submittedReportIds.length} test reports...`);
      
      const { error } = await supabase
        .from('toolkit_reports')
        .delete()
        .in('id', this.submittedReportIds);
      
      if (error) {
        console.warn('⚠️ Failed to clean up test reports:', error.message);
      } else {
        console.log('✓ Test reports cleaned up successfully');
      }
    }
  }
}

// Export for use
export { SubmissionTester };

// If running as script
if (typeof window !== 'undefined') {
  window.SubmissionTester = SubmissionTester;
  window.runTask31Tests = async () => {
    const tester = new SubmissionTester();
    await tester.runAllTests();
    return tester.results;
  };
}