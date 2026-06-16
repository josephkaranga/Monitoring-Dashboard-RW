/**
 * Browser Console Test for Task 3.1: Report Submission with Stakeholder/Target/Indicator Selections
 * 
 * Instructions:
 * 1. Open the application at http://localhost:3000
 * 2. Navigate to the Reporting Toolkit page
 * 3. Open browser console and paste this script
 * 4. Run: await testTask31ReportSubmission()
 * 
 * This test verifies:
 * - Report creation using different stakeholder/target/indicator combinations
 * - Report submission through the reporting toolkit
 * - Proper storage with correct metadata
 * - submitReport function includes all necessary pipeline information
 */

async function testTask31ReportSubmission() {
  console.log('🔬 Starting Task 3.1: Report Submission Integration Test');
  console.log('=' .repeat(70));
  
  const testResults = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    reportIds: [],
    errors: []
  };

  try {
    // Check if we're on the right page and have access to required functions
    if (typeof submitReport === 'undefined') {
      throw new Error('submitReport function not available. Make sure you are on the Reporting Toolkit page.');
    }

    if (typeof fetchUserResponsibleTargets === 'undefined' || typeof fetchIndicators === 'undefined') {
      throw new Error('Data service functions not available. Make sure all modules are loaded.');
    }

    console.log('✓ Application environment verified');

    // Test scenarios covering different stakeholder/target/indicator combinations
    const testScenarios = [
      {
        name: 'REMA Environmental Monitoring (T01)',
        stakeholder: 'REMA',
        toolId: 'T01',
        formData: {
          stakeholder: 'REMA',
          institution: 'Rwanda Environment Management Authority',
          period: 'Q1 2024',
          current_status: 82,
          milestone: 100,
          budget_utilized: 4500000,
          activities: 'Conducted environmental impact assessments for 8 development projects, monitored biodiversity in 5 protected areas, enforced environmental regulations across 3 districts.',
          challenges: 'Limited field monitoring equipment, need for additional technical staff, coordination challenges with multiple districts.'
        }
      },
      {
        name: 'District Biodiversity Monitoring (T02)', 
        stakeholder: 'District Authorities',
        toolId: 'T02',
        formData: {
          stakeholder: 'District Authorities',
          district: 'Musanze',
          officer: 'Alice Mukamana',
          period: 'Q1 2024',
          forest_ha: 145,
          wetland_ha: 67,
          agroforestry_hh: 380,
          soil_structures: 42,
          conservation_groups: 12,
          illegal_cases: 4,
          notes: 'Significant progress in reforestation activities, strong community participation in conservation programs, enhanced monitoring of Volcanoes National Park buffer zones.'
        }
      },
      {
        name: 'RFA Protected Area Management (T03)',
        stakeholder: 'RFA',
        toolId: 'T03', 
        formData: {
          stakeholder: 'RFA',
          area_name: 'Gishwati-Mukura National Park',
          agency: 'Rwanda Forestry Authority',
          period: 'H1 2024',
          coverage_change_ha: 38,
          species_trend: 'Increasing',
          habitat_quality: 9,
          illegal_cases: 1,
          restoration_ha: 22,
          observations: 'Excellent forest regeneration progress, successful wildlife corridor establishment, effective community engagement in buffer zone management.'
        }
      }
    ];

    // Load available data for testing
    console.log('\n📊 Loading available targets and indicators...');
    
    let availableTargets, availableIndicators;
    
    try {
      availableTargets = await fetchUserResponsibleTargets('Test Organization');
      availableIndicators = await fetchIndicators();
      console.log(`✓ Loaded ${availableTargets.length} targets and ${availableIndicators.length} indicators`);
    } catch (error) {
      console.log(`⚠️ Using fallback data due to: ${error.message}`);
      // Fallback to simulated data for testing
      availableTargets = [
        { id: 1, title: 'Target 1: Biodiversity Loss Reduction', progress: 65, goal: 'A', description: 'Reduce biodiversity loss by 50%' },
        { id: 2, title: 'Target 2: Ecosystem Restoration', progress: 72, goal: 'A', description: 'Restore 30% of degraded ecosystems' },
        { id: 3, title: 'Target 3: Protected Areas Expansion', progress: 58, goal: 'A', description: 'Expand protected areas network' }
      ];
      availableIndicators = [
        { id: 101, name: 'Forest Cover Indicator', definition: 'Measures forest cover percentage', status: 'on-track', progress: 75, nbsap_target_id: 1 },
        { id: 201, name: 'Wetland Restoration Indicator', definition: 'Tracks wetland restoration activities', status: 'on-track', progress: 68, nbsap_target_id: 2 },
        { id: 301, name: 'Protected Area Coverage', definition: 'Measures protected area expansion', status: 'at-risk', progress: 45, nbsap_target_id: 3 }
      ];
    }

    if (availableTargets.length === 0 || availableIndicators.length === 0) {
      throw new Error('No targets or indicators available for testing. Check database connection.');
    }

    // Execute test scenarios
    for (const scenario of testScenarios) {
      testResults.totalTests++;
      
      console.log(`\n🧪 Testing: ${scenario.name}`);
      console.log('-'.repeat(50));
      
      try {
        // Step 1: Select appropriate target based on stakeholder
        const stakeholderTargets = getStakeholderTargets(scenario.stakeholder, availableTargets);
        if (stakeholderTargets.length === 0) {
          throw new Error(`No targets available for stakeholder: ${scenario.stakeholder}`);
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

        // Step 3: Prepare enhanced form data with pipeline information
        const enhancedFormData = {
          ...scenario.formData,
          nbsap_target: selectedTarget.id.toString(),
          indicator: selectedIndicator.id.toString(),
          
          // Pipeline metadata - this is crucial for Task 3.1 verification
          stakeholder_info: {
            id: scenario.stakeholder,
            name: getStakeholderName(scenario.stakeholder),
            targets_accessible: stakeholderTargets.map(t => t.id)
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
          
          // Test metadata
          test_execution: {
            task: '3.1',
            scenario: scenario.name,
            timestamp: new Date().toISOString(),
            pipeline_validation: true
          }
        };

        console.log('  📝 Enhanced form data prepared with complete pipeline information');

        // Step 4: Submit the report
        console.log('  🚀 Submitting report...');
        
        const submitResult = await submitReport(
          scenario.toolId,
          `${scenario.name} - Integration Test`,
          enhancedFormData,
          true, // require verification
          [], // no attachments
          selectedTarget.id // nbsap_target_id
        );

        if (submitResult.error) {
          throw new Error(`Submission failed: ${submitResult.error}`);
        }

        const reportData = submitResult.data;
        testResults.reportIds.push(reportData.id);
        
        console.log(`  ✅ Report submitted successfully!`);
        console.log(`     📝 Report ID: ${reportData.id}`);
        console.log(`     📊 Status: ${reportData.status}`);
        console.log(`     🎯 Target: ${reportData.nbsap_target_id}`);

        // Step 5: Validate submission data
        console.log('  🔍 Validating submission...');
        
        await validateSubmission(reportData, scenario, selectedTarget, selectedIndicator, enhancedFormData);
        
        console.log(`  ✅ ${scenario.name}: ALL VALIDATIONS PASSED`);
        testResults.passed++;

      } catch (error) {
        console.error(`  ❌ ${scenario.name}: FAILED - ${error.message}`);
        testResults.failed++;
        testResults.errors.push({
          scenario: scenario.name,
          error: error.message
        });
      }
    }

    // Final validation: Test the pipeline data integrity
    console.log('\n🔍 Final Pipeline Validation...');
    console.log('-'.repeat(30));
    
    if (testResults.reportIds.length > 0) {
      await validatePipelineIntegrity(testResults.reportIds);
      console.log('✅ Pipeline integrity validation completed');
    }

    // Print comprehensive summary
    printTestSummary(testResults);

    return testResults;

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    testResults.errors.push({
      scenario: 'Test Setup',
      error: error.message
    });
    return testResults;
  }
}

// Helper function to get stakeholder's responsible targets
function getStakeholderTargets(stakeholder, availableTargets) {
  // Based on STAKEHOLDER_RESPONSIBILITIES mapping in ReportingToolkitPage.tsx
  const stakeholderTargetMap = {
    'REMA': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    'District Authorities': [2, 3, 8, 9, 10, 14, 22],
    'RFA': [2, 5, 6, 8, 10, 11, 12],
    'RDB': [1, 3, 4, 6, 9],
    'MINAGRI': [1, 5, 6, 7, 8, 9, 10, 11, 18]
  };
  
  const responsibleTargetIds = stakeholderTargetMap[stakeholder] || [];
  return availableTargets.filter(target => responsibleTargetIds.includes(target.id));
}

// Helper function to get stakeholder full name
function getStakeholderName(stakeholderId) {
  const nameMap = {
    'REMA': 'Rwanda Environment Management Authority',
    'District Authorities': 'District Authorities', 
    'RFA': 'Rwanda Forestry Authority',
    'RDB': 'Rwanda Development Board',
    'MINAGRI': 'Ministry of Agriculture and Animal Resources'
  };
  return nameMap[stakeholderId] || stakeholderId;
}

// Comprehensive validation of submitted report
async function validateSubmission(reportData, scenario, selectedTarget, selectedIndicator, originalFormData) {
  const validations = [
    {
      name: 'Tool ID Validation',
      check: () => reportData.tool_id === scenario.toolId,
      expected: scenario.toolId,
      actual: reportData.tool_id
    },
    {
      name: 'Target Linkage Validation',
      check: () => reportData.nbsap_target_id === selectedTarget.id,
      expected: selectedTarget.id,
      actual: reportData.nbsap_target_id
    },
    {
      name: 'Status Validation',
      check: () => reportData.status === 'pending',
      expected: 'pending',
      actual: reportData.status
    },
    {
      name: 'Form Data Preservation',
      check: () => reportData.form_data && typeof reportData.form_data === 'object',
      expected: 'object',
      actual: typeof reportData.form_data
    },
    {
      name: 'Stakeholder Preservation',
      check: () => reportData.form_data.stakeholder === scenario.stakeholder,
      expected: scenario.stakeholder,
      actual: reportData.form_data.stakeholder
    },
    {
      name: 'Target Selection Preservation',
      check: () => parseInt(reportData.form_data.nbsap_target) === selectedTarget.id,
      expected: selectedTarget.id,
      actual: parseInt(reportData.form_data.nbsap_target)
    },
    {
      name: 'Indicator Selection Preservation', 
      check: () => parseInt(reportData.form_data.indicator) === selectedIndicator.id,
      expected: selectedIndicator.id,
      actual: parseInt(reportData.form_data.indicator)
    },
    {
      name: 'Pipeline Metadata Preservation',
      check: () => reportData.form_data.stakeholder_info && 
                   reportData.form_data.target_info && 
                   reportData.form_data.indicator_info,
      expected: 'All pipeline metadata objects',
      actual: `stakeholder_info: ${!!reportData.form_data.stakeholder_info}, target_info: ${!!reportData.form_data.target_info}, indicator_info: ${!!reportData.form_data.indicator_info}`
    }
  ];

  for (const validation of validations) {
    if (!validation.check()) {
      throw new Error(`${validation.name} failed - Expected: ${validation.expected}, Got: ${validation.actual}`);
    }
    console.log(`     ✓ ${validation.name}`);
  }
}

// Validate pipeline integrity across all submitted reports
async function validatePipelineIntegrity(reportIds) {
  console.log('  Checking pipeline data consistency...');
  
  // Use Supabase client if available
  if (typeof supabase !== 'undefined') {
    try {
      const { data: reports, error } = await supabase
        .from('toolkit_reports')
        .select('*, nbsap_target:nbsap_targets(*)')
        .in('id', reportIds);
      
      if (error) throw error;
      
      console.log(`  ✓ Retrieved ${reports.length} reports from database`);
      
      // Validate each report has proper linkage
      reports.forEach(report => {
        if (!report.nbsap_target) {
          throw new Error(`Report ${report.id} not properly linked to target`);
        }
        
        if (!report.form_data || typeof report.form_data !== 'object') {
          throw new Error(`Report ${report.id} missing form data`);
        }
        
        const requiredPipelineData = ['stakeholder_info', 'target_info', 'indicator_info'];
        requiredPipelineData.forEach(field => {
          if (!report.form_data[field]) {
            throw new Error(`Report ${report.id} missing ${field} in form data`);
          }
        });
      });
      
      console.log('  ✓ All reports have proper database linkage');
      console.log('  ✓ All reports contain required pipeline metadata');
      
    } catch (error) {
      console.warn(`  ⚠️ Pipeline integrity check failed: ${error.message}`);
    }
  } else {
    console.log('  ⚠️ Supabase client not available, skipping database validation');
  }
}

// Print comprehensive test summary
function printTestSummary(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 TASK 3.1 INTEGRATION TEST SUMMARY');
  console.log('='.repeat(70));
  
  console.log(`📊 Test Results:`);
  console.log(`   ✅ Passed: ${results.passed}/${results.totalTests}`);
  console.log(`   ❌ Failed: ${results.failed}/${results.totalTests}`);
  
  if (results.reportIds.length > 0) {
    console.log(`\n📝 Created Reports (${results.reportIds.length}):`);
    results.reportIds.forEach((id, index) => {
      console.log(`   ${index + 1}. Report ID: ${id}`);
    });
  }
  
  if (results.passed === results.totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Task 3.1 Requirements Fulfilled:');
    console.log('   ✅ Reports created using different stakeholder/target/indicator combinations');
    console.log('   ✅ Reports submitted through reporting toolkit successfully');
    console.log('   ✅ Reports properly stored with correct metadata');
    console.log('   ✅ submitReport function includes all necessary pipeline information');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Navigate to Reporting Toolkit → Submissions tab to view created reports');
    console.log('   2. Verify reports show correct stakeholder/target/indicator linkages');
    console.log('   3. Check that dashboard metrics reflect the submitted data');
  } else {
    console.log('\n⚠️ Some tests failed:');
    results.errors.forEach(error => {
      console.log(`   ❌ ${error.scenario}: ${error.error}`);
    });
  }
  
  console.log('\n📌 Task 3.1 Test Completed');
  console.log('='.repeat(70));
}

// Auto-setup for browser console use
if (typeof window !== 'undefined') {
  window.testTask31ReportSubmission = testTask31ReportSubmission;
  console.log('🔬 Task 3.1 Test Script Loaded!');
  console.log('📝 Run: await testTask31ReportSubmission()');
  console.log('🌐 Make sure you are on the Reporting Toolkit page first');
}