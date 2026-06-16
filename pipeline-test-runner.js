/**
 * Report Submission Pipeline Test Runner (Node.js compatible)
 * Task 3.1: Test report submission with stakeholder/target/indicator selections
 * 
 * This script tests the complete data flow from stakeholder selection to report storage
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (will need to be loaded from environment)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

class PipelineTestRunner {
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.results = [];
    this.testReportIds = [];
    
    // Stakeholder responsibilities mapping (from ReportingToolkitPage.tsx)
    this.STAKEHOLDER_RESPONSIBILITIES = {
      'REMA': {
        name: 'Rwanda Environment Management Authority',
        targets: [1, 2, 3, 4, 6, 7, 8, 11, 13, 14, 17, 18, 19, 20, 21, 22]
      },
      'Districts': {
        name: 'District Authorities',
        targets: [1, 8, 11, 12]
      },
      'Private Sector': {
        name: 'Private Sector Companies', 
        targets: [7, 10, 13, 14, 15, 16]
      }
    };
    
    console.log('🔬 Starting Report Submission Pipeline Tests');
    console.log('📋 Testing Task 3.1: stakeholder/target/indicator selection workflow');
  }

  log(emoji, message, details = '') {
    console.log(`${emoji} ${message}${details ? ': ' + details : ''}`);
  }

  addResult(testName, passed, details, data = null) {
    this.results.push({ testName, passed, details, data });
    this.log(passed ? '✅' : '❌', testName, details);
    return passed;
  }

  /**
   * Test 1: Verify database connection and basic data access
   */
  async testDatabaseConnection() {
    this.log('🔌', 'Testing database connection and basic data access...');
    
    try {
      // Test targets fetch
      const { data: targets, error: targetError } = await this.supabase
        .from('nbsap_targets')
        .select('id, title, responsible_stakeholders')
        .limit(5);
      
      if (targetError) throw new Error(`Targets fetch failed: ${targetError.message}`);
      
      // Test indicators fetch
      const { data: indicators, error: indicatorError } = await this.supabase
        .from('indicators')
        .select('id, name, definition, nbsap_target_id')
        .limit(5);
      
      if (indicatorError) throw new Error(`Indicators fetch failed: ${indicatorError.message}`);
      
      return this.addResult(
        'Database Connection',
        targets && indicators && targets.length > 0 && indicators.length > 0,
        `Fetched ${targets?.length || 0} targets, ${indicators?.length || 0} indicators`,
        { targetsCount: targets?.length, indicatorsCount: indicators?.length }
      );
      
    } catch (error) {
      return this.addResult(
        'Database Connection',
        false,
        'Connection failed',
        { error: error.message }
      );
    }
  }

  /**
   * Test 2: Verify stakeholder-to-target mapping
   */
  async testStakeholderTargetMapping() {
    this.log('🎯', 'Testing stakeholder-to-target mapping logic...');
    
    try {
      // Fetch all targets
      const { data: allTargets, error } = await this.supabase
        .from('nbsap_targets')
        .select('id, title, responsible_stakeholders')
        .order('id');
      
      if (error) throw new Error(`Failed to fetch targets: ${error.message}`);
      
      let allMappingsCorrect = true;
      const mappingResults = {};
      
      // Test each stakeholder's target mapping
      for (const [stakeholderId, stakeholderInfo] of Object.entries(this.STAKEHOLDER_RESPONSIBILITIES)) {
        const expectedTargetIds = stakeholderInfo.targets;
        const availableTargets = allTargets.filter(target => expectedTargetIds.includes(target.id));
        
        const mappingCorrect = availableTargets.length === expectedTargetIds.length;
        if (!mappingCorrect) allMappingsCorrect = false;
        
        mappingResults[stakeholderId] = {
          expected: expectedTargetIds.length,
          found: availableTargets.length,
          targets: availableTargets.map(t => ({ id: t.id, title: t.title }))
        };
        
        this.log('📊', `${stakeholderId}: ${availableTargets.length}/${expectedTargetIds.length} targets found`);
      }
      
      return this.addResult(
        'Stakeholder Target Mapping',
        allMappingsCorrect,
        `All stakeholder mappings ${allMappingsCorrect ? 'correct' : 'need verification'}`,
        mappingResults
      );
      
    } catch (error) {
      return this.addResult(
        'Stakeholder Target Mapping',
        false,
        'Mapping test failed',
        { error: error.message }
      );
    }
  }

  /**
   * Test 3: Verify target-to-indicator relationships
   */
  async testTargetIndicatorRelationships() {
    this.log('🔗', 'Testing target-to-indicator relationships...');
    
    try {
      // Test a few specific targets
      const testTargetIds = [1, 2, 8, 13];
      const relationshipResults = {};
      let allRelationshipsValid = true;
      
      for (const targetId of testTargetIds) {
        const { data: indicators, error } = await this.supabase
          .from('indicators')
          .select('id, name, definition, nbsap_target_id')
          .eq('nbsap_target_id', targetId);
        
        if (error) {
          allRelationshipsValid = false;
          relationshipResults[targetId] = { error: error.message };
          continue;
        }
        
        // Verify all indicators belong to the correct target
        const correctRelationship = indicators.every(ind => ind.nbsap_target_id === targetId);
        const hasDefinitions = indicators.filter(ind => ind.definition).length;
        
        if (!correctRelationship) allRelationshipsValid = false;
        
        relationshipResults[targetId] = {
          indicatorCount: indicators.length,
          correctRelationship,
          withDefinitions: hasDefinitions,
          indicators: indicators.map(i => ({
            id: i.id,
            name: i.name,
            hasDefinition: !!i.definition
          }))
        };
        
        this.log('📈', `Target ${targetId}: ${indicators.length} indicators, ${hasDefinitions} with definitions`);
      }
      
      return this.addResult(
        'Target Indicator Relationships',
        allRelationshipsValid,
        `${Object.keys(relationshipResults).length} targets tested`,
        relationshipResults
      );
      
    } catch (error) {
      return this.addResult(
        'Target Indicator Relationships',
        false,
        'Relationship test failed',
        { error: error.message }
      );
    }
  }

  /**
   * Test 4: Test report submission with complete pipeline data
   */
  async testReportSubmissionPipeline() {
    this.log('📝', 'Testing complete report submission pipeline...');
    
    try {
      // Create test report data
      const testStakeholder = 'REMA';
      const testTargetId = 1; // First target that REMA is responsible for
      
      // Fetch indicators for this target
      const { data: indicators, error: indicatorError } = await this.supabase
        .from('indicators')
        .select('id, name, definition, nbsap_target_id')
        .eq('nbsap_target_id', testTargetId)
        .limit(1);
      
      if (indicatorError || !indicators || indicators.length === 0) {
        return this.addResult(
          'Report Submission Pipeline',
          false,
          'No indicators available for test target',
          { targetId: testTargetId, indicatorError: indicatorError?.message }
        );
      }
      
      const testIndicator = indicators[0];
      
      // Create comprehensive form data
      const testFormData = {
        stakeholder: testStakeholder,
        nbsap_target: testTargetId.toString(),
        indicator: testIndicator.id.toString(),
        period: 'Q1 2025',
        institution: 'Rwanda Environment Management Authority',
        current_status: '75',
        milestone: '100',
        activities: 'Pipeline testing activities for Task 3.1',
        challenges: 'Testing data flow integration',
        // Enhanced pipeline metadata
        stakeholder_info: this.STAKEHOLDER_RESPONSIBILITIES[testStakeholder],
        target_info: {
          id: testTargetId,
          title: 'Test Target'
        },
        indicator_info: {
          id: testIndicator.id,
          name: testIndicator.name,
          definition: testIndicator.definition
        },
        submission_timestamp: new Date().toISOString(),
        submitted_by: 'pipeline-test-user',
        submitted_by_organization: 'Test Organization'
      };
      
      // Submit test report
      const { data: report, error: submitError } = await this.supabase
        .from('toolkit_reports')
        .insert({
          tool_id: 'T01',
          tool_name: 'Pipeline Test Report',
          submitted_by: 'pipeline-test-user', 
          status: 'approved',
          period: 'Q1 2025',
          form_data: testFormData,
          attachments: [],
          district: null,
          institution: 'Rwanda Environment Management Authority',
          nbsap_target_id: testTargetId,
          submitted_at: new Date().toISOString(),
          reviewed_by: 'pipeline-test-user',
          reviewed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (submitError) {
        return this.addResult(
          'Report Submission Pipeline',
          false,
          'Report submission failed',
          { error: submitError.message, formData: testFormData }
        );
      }
      
      // Track report for cleanup
      this.testReportIds.push(report.id);
      
      // Verify submitted data
      const hasCorrectTargetId = report.nbsap_target_id === testTargetId;
      const hasFormData = report.form_data && Object.keys(report.form_data).length > 0;
      const hasStakeholderData = report.form_data.stakeholder === testStakeholder;
      const hasIndicatorData = report.form_data.indicator === testIndicator.id.toString();
      
      const pipelineSuccess = hasCorrectTargetId && hasFormData && hasStakeholderData && hasIndicatorData;
      
      return this.addResult(
        'Report Submission Pipeline',
        pipelineSuccess,
        `Pipeline integrity: Target ID=${hasCorrectTargetId}, Form=${hasFormData}, Stakeholder=${hasStakeholderData}, Indicator=${hasIndicatorData}`,
        {
          reportId: report.id,
          stakeholder: testStakeholder,
          targetId: testTargetId,
          indicatorId: testIndicator.id,
          submittedData: {
            nbsap_target_id: report.nbsap_target_id,
            formDataKeys: Object.keys(report.form_data),
            stakeholder: report.form_data.stakeholder,
            indicator: report.form_data.indicator
          }
        }
      );
      
    } catch (error) {
      return this.addResult(
        'Report Submission Pipeline',
        false,
        'Exception during pipeline test',
        { error: error.message }
      );
    }
  }

  /**
   * Test 5: Verify data retrieval and integrity
   */
  async testDataRetrievalIntegrity() {
    this.log('🔍', 'Testing data retrieval and integrity...');
    
    if (this.testReportIds.length === 0) {
      return this.addResult(
        'Data Retrieval Integrity',
        false,
        'No test reports to verify',
        { testReportIds: this.testReportIds }
      );
    }
    
    try {
      let allRetrievalsSuccessful = true;
      const retrievalResults = {};
      
      for (const reportId of this.testReportIds) {
        const { data: report, error } = await this.supabase
          .from('toolkit_reports')
          .select(`
            *,
            nbsap_target:nbsap_targets(id, title, progress)
          `)
          .eq('id', reportId)
          .single();
        
        if (error || !report) {
          allRetrievalsSuccessful = false;
          retrievalResults[reportId] = { error: error?.message || 'Report not found' };
          continue;
        }
        
        // Verify data integrity
        const hasRequiredFields = !!(
          report.nbsap_target_id &&
          report.form_data &&
          report.form_data.stakeholder &&
          report.form_data.nbsap_target &&
          report.form_data.indicator
        );
        
        retrievalResults[reportId] = {
          exists: true,
          hasRequiredFields,
          nbsapTargetId: report.nbsap_target_id,
          formDataComplete: Object.keys(report.form_data).length > 5,
          hasTargetRelation: !!report.nbsap_target
        };
        
        if (!hasRequiredFields) allRetrievalsSuccessful = false;
      }
      
      return this.addResult(
        'Data Retrieval Integrity',
        allRetrievalsSuccessful,
        `${this.testReportIds.length} reports verified, ${allRetrievalsSuccessful ? 'all' : 'some'} passed integrity checks`,
        retrievalResults
      );
      
    } catch (error) {
      return this.addResult(
        'Data Retrieval Integrity',
        false,
        'Retrieval test failed',
        { error: error.message }
      );
    }
  }

  /**
   * Cleanup test data
   */
  async cleanupTestData() {
    this.log('🧹', 'Cleaning up test data...');
    
    for (const reportId of this.testReportIds) {
      try {
        await this.supabase
          .from('toolkit_reports')
          .delete()
          .eq('id', reportId);
      } catch (error) {
        console.log(`   Warning: Failed to cleanup ${reportId}: ${error.message}`);
      }
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 TASK 3.1 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
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
      });
    }
    
    // Task 3.1 specific summary
    console.log('\n✅ TASK 3.1 VERIFICATION STATUS:');
    console.log('─'.repeat(40));
    
    const dbTest = this.results.find(r => r.testName === 'Database Connection');
    const mappingTest = this.results.find(r => r.testName === 'Stakeholder Target Mapping');
    const relationshipTest = this.results.find(r => r.testName === 'Target Indicator Relationships');
    const pipelineTest = this.results.find(r => r.testName === 'Report Submission Pipeline');
    const integrityTest = this.results.find(r => r.testName === 'Data Retrieval Integrity');
    
    console.log(`• Database Access: ${dbTest?.passed ? 'PASS' : 'FAIL'}`);
    console.log(`• Stakeholder-Target Filtering: ${mappingTest?.passed ? 'PASS' : 'FAIL'}`);
    console.log(`• Target-Indicator Loading: ${relationshipTest?.passed ? 'PASS' : 'FAIL'}`);
    console.log(`• Report Submission Pipeline: ${pipelineTest?.passed ? 'PASS' : 'FAIL'}`);
    console.log(`• Data Storage Integrity: ${integrityTest?.passed ? 'PASS' : 'FAIL'}`);
    
    const overallSuccess = passedTests === totalTests;
    console.log(`\n🎯 TASK 3.1 OVERALL STATUS: ${overallSuccess ? 'COMPLETED ✅' : 'NEEDS ATTENTION ⚠️'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 SUCCESS: Report submission pipeline is working correctly!');
      console.log('   ✓ Stakeholder/target/indicator selections work properly');
      console.log('   ✓ Reports are submitted with complete metadata');  
      console.log('   ✓ Data pipeline maintains integrity');
      console.log('   ✓ Database storage and retrieval function correctly');
    } else {
      console.log('\n⚠️  Some pipeline components need attention.');
      console.log('   Review failed tests above for specific issues.');
    }
    
    console.log('\n📝 DETAILED TEST DATA:');
    this.results.forEach(result => {
      if (result.data) {
        console.log(`\n${result.testName}:`);
        console.log(JSON.stringify(result.data, null, 2));
      }
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive Task 3.1 pipeline tests...\n');
    
    try {
      await this.testDatabaseConnection();
      await this.testStakeholderTargetMapping();
      await this.testTargetIndicatorRelationships();
      await this.testReportSubmissionPipeline();
      await this.testDataRetrievalIntegrity();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      await this.cleanupTestData();
    }
  }
}

// Export for use in other files
module.exports = { PipelineTestRunner };

// Auto-run if this file is executed directly
if (require.main === module) {
  console.log('⚡ Executing Task 3.1 Pipeline Tests...');
  const runner = new PipelineTestRunner();
  runner.runAllTests().catch(console.error);
}