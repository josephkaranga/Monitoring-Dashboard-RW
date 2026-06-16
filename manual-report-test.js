/**
 * Manual Test Script for Task 3.1: Report Submission with Stakeholder/Target/Indicator Selections
 * 
 * This script can be run in the browser console to test the report submission pipeline
 * Run this after opening the Reporting Toolkit page in the browser
 */

async function runReportSubmissionTests() {
  console.log('🔬 Starting Report Submission Pipeline Tests for Task 3.1');
  console.log('=' .repeat(60));
  
  // Import necessary functions (assuming they're available globally or can be imported)
  const { submitReport } = window.reportService || {};
  const { fetchUserResponsibleTargets, fetchIndicators } = window.dataService || {};
  
  if (!submitReport) {
    console.error('❌ submitReport function not available. Make sure you\'re on the Reporting Toolkit page.');
    return;
  }

  const testResults = {
    passed: 0,
    failed: 0,
    scenarios: []
  };

  // Test scenarios to validate different stakeholder/target/indicator combinations
  const testScenarios = [
    {
      name: 'REMA Environmental Institutional Reporting',
      stakeholder: 'REMA',
      toolId: 'T01',
      formData: {
        stakeholder: 'REMA',
        institution: 'Rwanda Environment Management Authority',
        period: 'Q1 2024',
        current_status: 75,
        milestone: 100,
        budget_utilized: 2500000,
        activities: 'Environmental impact assessments and biodiversity monitoring activities completed.',
        challenges: 'Limited field equipment and staff capacity for comprehensive monitoring.'
      },
      expectedTargets: [1, 2, 3, 4, 5] // REMA should have access to multiple environmental targets
    },
    {
      name: 'District Biodiversity Monitoring',
      stakeholder: 'District Authorities',
      toolId: 'T02',
      formData: {
        stakeholder: 'District Authorities',
        district: 'Gasabo',
        officer: 'Marie Uwimana',
        period: 'Q1 2024',
        forest_ha: 85,
        wetland_ha: 32,
        agroforestry_hh: 180,
        soil_structures: 25,
        conservation_groups: 6,
        illegal_cases: 1,
        notes: 'Successful tree planting campaign in three sectors with high community participation.'
      },
      expectedTargets: [2, 3, 8, 9, 10] // Districts focus on local implementation targets
    },
    {
      name: 'RFA Protected Area Monitoring',
      stakeholder: 'RFA',
      toolId: 'T03',
      formData: {
        stakeholder: 'RFA',
        area_name: 'Volcanoes National Park',
        agency: 'Rwanda Forestry Authority',
        period: 'H1 2024',
        coverage_change_ha: 15,
        species_trend: 'Stable',
        habitat_quality: 9,
        illegal_cases: 0,
        restoration_ha: 8,
        observations: 'Mountain gorilla population stable, excellent habitat recovery in restored areas.'
      },
      expectedTargets: [2, 5, 6, 8] // RFA focuses on forest and protected area targets
    }
  ];

  async function testScenario(scenario) {
    console.log(`\n🧪 Testing Scenario: ${scenario.name}`);
    console.log('-'.repeat(50));
    
    try {
      // Step 1: Verify stakeholder selection and target filtering
      console.log('1️⃣ Testing stakeholder selection and target filtering...');
      
      // Simulate stakeholder selection (this would normally be done through UI)
      const stakeholderInfo = window.STAKEHOLDER_RESPONSIBILITIES?.[scenario.stakeholder];
      if (!stakeholderInfo) {
        throw new Error(`Stakeholder ${scenario.stakeholder} not found in STAKEHOLDER_RESPONSIBILITIES`);
      }
      
      console.log(`   ✓ Stakeholder found: ${stakeholderInfo.name}`);
      console.log(`   ✓ Responsible for ${stakeholderInfo.targets.length} targets: [${stakeholderInfo.targets.join(', ')}]`);
      
      // Step 2: Load available targets for this stakeholder
      console.log('2️⃣ Loading available targets...');
      
      let availableTargets = [];
      try {
        if (fetchUserResponsibleTargets) {
          availableTargets = await fetchUserResponsibleTargets('Test Organization');
        }
        console.log(`   ✓ Loaded ${availableTargets.length} available targets from database`);
      } catch (error) {
        console.log(`   ⚠️ Could not load from database: ${error.message}`);
        // Fallback: simulate target data
        availableTargets = stakeholderInfo.targets.map(id => ({
          id,
          title: `Target ${id} - Test Data`,
          description: `Simulated target ${id} for testing`,
          progress: Math.floor(Math.random() * 100),
          goal: id <= 4 ? 'A' : id <= 8 ? 'B' : id <= 12 ? 'C' : 'D'
        }));
        console.log(`   ✓ Using simulated target data for ${availableTargets.length} targets`);
      }
      
      // Filter targets based on stakeholder responsibilities
      const stakeholderTargets = availableTargets.filter(target => 
        stakeholderInfo.targets.includes(target.id)
      );
      
      if (stakeholderTargets.length === 0) {
        console.log('   ⚠️ No matching targets found, using first available target');
        stakeholderTargets.push(availableTargets[0]);
      }
      
      console.log(`   ✓ Filtered to ${stakeholderTargets.length} targets for this stakeholder`);
      
      // Step 3: Select a target and load indicators
      console.log('3️⃣ Selecting target and loading indicators...');
      
      const selectedTarget = stakeholderTargets[0];
      console.log(`   ✓ Selected target: ${selectedTarget.id} - ${selectedTarget.title}`);
      
      let availableIndicators = [];
      try {
        if (fetchIndicators) {
          availableIndicators = await fetchIndicators({ targetId: selectedTarget.id });
        }
        console.log(`   ✓ Loaded ${availableIndicators.length} indicators for target ${selectedTarget.id}`);
      } catch (error) {
        console.log(`   ⚠️ Could not load indicators: ${error.message}`);
        // Fallback: simulate indicator data
        availableIndicators = [
          {
            id: selectedTarget.id * 10 + 1,
            name: `Indicator ${selectedTarget.id}.1 - Simulated`,
            definition: `Test indicator definition for target ${selectedTarget.id}`,
            status: 'on-track',
            progress: Math.floor(Math.random() * 100),
            nbsap_target_id: selectedTarget.id
          }
        ];
        console.log(`   ✓ Using simulated indicator data`);
      }
      
      if (availableIndicators.length === 0) {
        throw new Error(`No indicators available for target ${selectedTarget.id}`);
      }
      
      const selectedIndicator = availableIndicators[0];
      console.log(`   ✓ Selected indicator: ${selectedIndicator.id} - ${selectedIndicator.name}`);
      
      // Step 4: Prepare enhanced form data with pipeline information
      console.log('4️⃣ Preparing enhanced form data...');
      
      const enhancedFormData = {
        ...scenario.formData,
        // Add target and indicator selections
        nbsap_target: selectedTarget.id.toString(),
        indicator: selectedIndicator.id.toString(),
        
        // Add pipeline metadata for verification
        stakeholder_info: {
          id: scenario.stakeholder,
          name: stakeholderInfo.name,
          targets: stakeholderInfo.targets
        },
        target_info: {
          id: selectedTarget.id,
          title: selectedTarget.title,
          progress: selectedTarget.progress,
          goal: selectedTarget.goal
        },
        indicator_info: {
          id: selectedIndicator.id,
          name: selectedIndicator.name,
          definition: selectedIndicator.definition,
          status: selectedIndicator.status,
          progress: selectedIndicator.progress
        },
        
        // Add submission metadata
        submission_timestamp: new Date().toISOString(),
        test_scenario: scenario.name,
        pipeline_validation: true
      };
      
      console.log('   ✓ Enhanced form data prepared with complete pipeline information');
      
      // Step 5: Submit the report
      console.log('5️⃣ Submitting report...');
      
      const submitResult = await submitReport(
        scenario.toolId,
        `${scenario.toolId} - ${scenario.name} (Test)`,
        enhancedFormData,
        true, // require verification
        [], // no attachments
        selectedTarget.id // nbsap_target_id
      );
      
      if (submitResult.error) {
        throw new Error(`Submission failed: ${submitResult.error}`);
      }
      
      console.log(`   ✅ Report submitted successfully!`);
      console.log(`   📝 Report ID: ${submitResult.data?.id}`);
      console.log(`   📊 Status: ${submitResult.data?.status}`);
      console.log(`   🎯 Target ID: ${submitResult.data?.nbsap_target_id}`);
      
      // Step 6: Validate submission data
      console.log('6️⃣ Validating submission data...');
      
      const submittedData = submitResult.data;
      
      // Validate core fields
      if (submittedData?.tool_id !== scenario.toolId) {
        throw new Error(`Tool ID mismatch: expected ${scenario.toolId}, got ${submittedData?.tool_id}`);
      }
      
      if (submittedData?.nbsap_target_id !== selectedTarget.id) {
        throw new Error(`Target ID mismatch: expected ${selectedTarget.id}, got ${submittedData?.nbsap_target_id}`);
      }
      
      if (submittedData?.status !== 'pending') {
        throw new Error(`Status mismatch: expected 'pending', got ${submittedData?.status}`);
      }
      
      // Validate form data preservation
      const storedFormData = submittedData?.form_data;
      if (!storedFormData) {
        throw new Error('Form data not stored');
      }
      
      // Check pipeline information preservation
      if (storedFormData.stakeholder !== scenario.stakeholder) {
        throw new Error(`Stakeholder not preserved: expected ${scenario.stakeholder}, got ${storedFormData.stakeholder}`);
      }
      
      if (storedFormData.nbsap_target !== selectedTarget.id.toString()) {
        throw new Error(`Target not preserved: expected ${selectedTarget.id}, got ${storedFormData.nbsap_target}`);
      }
      
      if (storedFormData.indicator !== selectedIndicator.id.toString()) {
        throw new Error(`Indicator not preserved: expected ${selectedIndicator.id}, got ${storedFormData.indicator}`);
      }
      
      if (!storedFormData.stakeholder_info || !storedFormData.target_info || !storedFormData.indicator_info) {
        throw new Error('Pipeline metadata not preserved in form data');
      }
      
      console.log('   ✅ All validation checks passed!');
      console.log('   📋 Form data correctly preserved');
      console.log('   🔗 Pipeline linkages validated');
      console.log('   📊 Metadata structure confirmed');
      
      return {
        success: true,
        reportId: submittedData.id,
        targetId: selectedTarget.id,
        indicatorId: selectedIndicator.id,
        message: `Successfully submitted ${scenario.name} report`
      };
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: `Failed to submit ${scenario.name} report`
      };
    }
  }

  // Run all test scenarios
  console.log('🚀 Running all test scenarios...\n');
  
  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    testResults.scenarios.push(result);
    
    if (result.success) {
      testResults.passed++;
      console.log(`✅ ${scenario.name}: PASSED`);
    } else {
      testResults.failed++;
      console.log(`❌ ${scenario.name}: FAILED - ${result.error}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.scenarios.length}`);
  
  if (testResults.passed === testResults.scenarios.length) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✓ Report submission with stakeholder/target/indicator selections working correctly');
    console.log('✓ Reports properly stored with correct metadata');
    console.log('✓ submitReport function includes all necessary pipeline information');
  } else {
    console.log('\n⚠️ Some tests failed. Check individual scenario results above.');
  }
  
  return testResults;
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('🔬 Manual Report Submission Test Script Loaded');
  console.log('Run: runReportSubmissionTests() to execute all tests');
  window.runReportSubmissionTests = runReportSubmissionTests;
}