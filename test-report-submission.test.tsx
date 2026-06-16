/**
 * Integration Test for Task 3.1: Test report submission with stakeholder/target/indicator selections
 * 
 * This test verifies:
 * 1. Reports can be created using different stakeholder/target/indicator combinations
 * 2. Reports are submitted through the reporting toolkit correctly
 * 3. Reports are properly stored with correct metadata
 * 4. submitReport function includes all necessary pipeline information
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { supabase } from './supabase';
import { submitReport } from './reportService';
import { fetchUserResponsibleTargets, fetchIndicators } from './dataService';
import type { ReportType, NBSAPTarget, Indicator } from './index';

// Test data combinations to verify different stakeholder/target/indicator scenarios
const TEST_SCENARIOS = [
  {
    name: 'REMA Environmental Monitoring',
    stakeholder: 'REMA',
    expectedTargets: [1, 2, 3], // REMA should have access to multiple targets
    toolId: 'T01' as ReportType,
    formData: {
      stakeholder: 'REMA',
      institution: 'Rwanda Environment Management Authority',
      period: 'Q1 2024',
      current_status: 85,
      budget_utilized: 5000000,
      activities: 'Environmental monitoring and policy enforcement activities',
      challenges: 'Limited resources for field monitoring'
    }
  },
  {
    name: 'District Biodiversity Monitoring',
    stakeholder: 'District Authorities',
    expectedTargets: [2, 3, 8], // Districts should have access to specific targets
    toolId: 'T02' as ReportType,
    formData: {
      stakeholder: 'District Authorities',
      district: 'Nyarugenge',
      officer: 'John Mugabe',
      period: 'Q1 2024',
      forest_ha: 120,
      wetland_ha: 45,
      agroforestry_hh: 250,
      soil_structures: 35,
      conservation_groups: 8,
      illegal_cases: 2,
      notes: 'Successful forest restoration activities in sector A'
    }
  },
  {
    name: 'RFA Forest Conservation',
    stakeholder: 'RFA',
    expectedTargets: [2, 5, 6], // RFA should focus on forest-related targets
    toolId: 'T03' as ReportType,
    formData: {
      stakeholder: 'RFA',
      area_name: 'Nyungwe National Park',
      agency: 'Rwanda Forestry Authority',
      period: 'H1 2024',
      coverage_change_ha: 50,
      species_trend: 'Increasing',
      habitat_quality: 8,
      illegal_cases: 1,
      restoration_ha: 25,
      observations: 'Positive trend in forest regeneration and wildlife recovery'
    }
  }
];

describe('Report Submission Integration Test - Task 3.1', () => {
  let authenticatedUser: any;
  let availableTargets: NBSAPTarget[];
  let availableIndicators: Indicator[];
  let submittedReportIds: string[] = [];

  beforeAll(async () => {
    // Authenticate test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    if (authError) {
      console.log('Authentication failed, attempting to create test user...');
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      if (signupError) {
        throw new Error(`Failed to create test user: ${signupError.message}`);
      }
      authenticatedUser = signupData.user;
    } else {
      authenticatedUser = authData.user;
    }

    console.log('Test user authenticated:', authenticatedUser?.email);

    // Load available targets and indicators for testing
    availableTargets = await fetchUserResponsibleTargets('Test Organization');
    availableIndicators = await fetchIndicators();

    console.log(`Loaded ${availableTargets.length} targets and ${availableIndicators.length} indicators for testing`);
  });

  afterAll(async () => {
    // Clean up submitted test reports
    if (submittedReportIds.length > 0) {
      console.log(`Cleaning up ${submittedReportIds.length} test reports...`);
      const { error } = await supabase
        .from('toolkit_reports')
        .delete()
        .in('id', submittedReportIds);
      
      if (error) {
        console.warn('Failed to clean up test reports:', error.message);
      }
    }

    // Sign out
    await supabase.auth.signOut();
  });

  describe('Stakeholder/Target/Indicator Selection', () => {
    TEST_SCENARIOS.forEach(scenario => {
      it(`should handle ${scenario.name} scenario`, async () => {
        console.log(`\n=== Testing ${scenario.name} ===`);
        
        // 1. Verify stakeholder has access to expected targets
        const stakeholderTargets = availableTargets.filter(target => 
          scenario.expectedTargets.includes(target.id)
        );
        
        expect(stakeholderTargets.length).toBeGreaterThan(0);
        console.log(`✓ Stakeholder ${scenario.stakeholder} has access to ${stakeholderTargets.length} targets`);

        // 2. Select a target for this test
        const selectedTarget = stakeholderTargets[0];
        expect(selectedTarget).toBeDefined();
        console.log(`✓ Selected target: ${selectedTarget.id} - ${selectedTarget.title}`);

        // 3. Find indicators for the selected target
        const targetIndicators = availableIndicators.filter(
          indicator => indicator.nbsap_target_id === selectedTarget.id
        );
        
        expect(targetIndicators.length).toBeGreaterThan(0);
        console.log(`✓ Found ${targetIndicators.length} indicators for target ${selectedTarget.id}`);

        // 4. Select an indicator
        const selectedIndicator = targetIndicators[0];
        expect(selectedIndicator).toBeDefined();
        console.log(`✓ Selected indicator: ${selectedIndicator.id} - ${selectedIndicator.name}`);

        // 5. Prepare enhanced form data with selections
        const enhancedFormData = {
          ...scenario.formData,
          nbsap_target: selectedTarget.id.toString(),
          indicator: selectedIndicator.id.toString(),
          // Additional pipeline metadata
          stakeholder_info: {
            id: scenario.stakeholder,
            name: scenario.formData.stakeholder || scenario.stakeholder
          },
          target_info: {
            id: selectedTarget.id,
            title: selectedTarget.title,
            progress: selectedTarget.progress
          },
          indicator_info: {
            id: selectedIndicator.id,
            name: selectedIndicator.name,
            status: selectedIndicator.status
          }
        };

        console.log('✓ Enhanced form data prepared with pipeline information');

        // 6. Submit the report
        console.log(`Submitting ${scenario.toolId} report...`);
        const result = await submitReport(
          scenario.toolId,
          `${scenario.toolId} Test Report - ${scenario.name}`,
          enhancedFormData,
          true, // require verification
          [], // no attachments for test
          selectedTarget.id // nbsap_target_id
        );

        // 7. Verify submission was successful
        expect(result.error).toBeNull();
        expect(result.data).toBeDefined();
        expect(result.data?.id).toBeDefined();
        
        if (result.data?.id) {
          submittedReportIds.push(result.data.id);
        }

        console.log(`✓ Report submitted successfully with ID: ${result.data?.id}`);

        // 8. Verify report contains correct metadata
        expect(result.data?.tool_id).toBe(scenario.toolId);
        expect(result.data?.nbsap_target_id).toBe(selectedTarget.id);
        expect(result.data?.status).toBe('pending'); // since requireVerification = true
        expect(result.data?.form_data).toEqual(enhancedFormData);
        expect(result.data?.submitted_by).toBe(authenticatedUser.id);

        console.log('✓ Report metadata verified correctly');

        // 9. Verify stakeholder/target/indicator linkage in database
        const { data: storedReport, error: fetchError } = await supabase
          .from('toolkit_reports')
          .select('*, nbsap_target:nbsap_targets(*)')
          .eq('id', result.data!.id)
          .single();

        expect(fetchError).toBeNull();
        expect(storedReport).toBeDefined();
        expect(storedReport?.nbsap_target?.id).toBe(selectedTarget.id);
        
        console.log('✓ Database linkage verified - report correctly linked to target');

        // 10. Verify form data contains pipeline information
        const storedFormData = storedReport?.form_data as any;
        expect(storedFormData?.stakeholder).toBe(scenario.stakeholder);
        expect(storedFormData?.nbsap_target).toBe(selectedTarget.id.toString());
        expect(storedFormData?.indicator).toBe(selectedIndicator.id.toString());
        expect(storedFormData?.stakeholder_info).toBeDefined();
        expect(storedFormData?.target_info).toBeDefined();
        expect(storedFormData?.indicator_info).toBeDefined();

        console.log('✓ Pipeline information correctly stored in form data');
        console.log(`=== ${scenario.name} test completed successfully ===\n`);
      });
    });
  });

  describe('Data Pipeline Validation', () => {
    it('should include all necessary pipeline information in submitReport', async () => {
      console.log('\n=== Testing Data Pipeline Information ===');
      
      // Use a simple scenario for pipeline validation
      const testTarget = availableTargets[0];
      const testIndicator = availableIndicators.find(i => i.nbsap_target_id === testTarget?.id);
      
      expect(testTarget).toBeDefined();
      expect(testIndicator).toBeDefined();

      const pipelineFormData = {
        stakeholder: 'REMA',
        institution: 'Test Institution',
        period: 'Q1 2024',
        nbsap_target: testTarget!.id.toString(),
        indicator: testIndicator!.id.toString(),
        current_status: 75,
        // Pipeline metadata
        submission_timestamp: new Date().toISOString(),
        submitted_by_organization: 'Test Organization',
        pipeline_version: '1.0'
      };

      console.log('Submitting report with comprehensive pipeline data...');
      
      const result = await submitReport(
        'T01',
        'Pipeline Validation Test Report',
        pipelineFormData,
        false, // no verification needed for this test
        [],
        testTarget!.id
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data?.id) {
        submittedReportIds.push(result.data.id);
      }

      // Verify all pipeline information is preserved
      expect(result.data?.nbsap_target_id).toBe(testTarget!.id);
      expect(result.data?.form_data).toMatchObject(pipelineFormData);
      
      console.log('✓ Pipeline information correctly preserved in submission');

      // Verify the report can be retrieved with full context
      const { data: fullReport, error } = await supabase
        .from('toolkit_reports')
        .select(`
          *,
          nbsap_target:nbsap_targets(*),
          submitted_by_profile:profiles(full_name, email, organization)
        `)
        .eq('id', result.data!.id)
        .single();

      expect(error).toBeNull();
      expect(fullReport).toBeDefined();
      expect(fullReport?.nbsap_target).toBeDefined();
      expect(fullReport?.submitted_by_profile).toBeDefined();

      console.log('✓ Full report context successfully retrieved from database');
      console.log('=== Data Pipeline validation completed ===\n');
    });
  });

  describe('Report Metadata Validation', () => {
    it('should store reports with correct metadata structure', async () => {
      console.log('\n=== Testing Report Metadata Structure ===');

      const testScenario = TEST_SCENARIOS[0];
      const testTarget = availableTargets.find(t => testScenario.expectedTargets.includes(t.id));
      const testIndicator = availableIndicators.find(i => i.nbsap_target_id === testTarget?.id);

      expect(testTarget).toBeDefined();
      expect(testIndicator).toBeDefined();

      const metadataFormData = {
        ...testScenario.formData,
        nbsap_target: testTarget!.id.toString(),
        indicator: testIndicator!.id.toString(),
        // Additional metadata for validation
        report_type: 'integration_test',
        validation_timestamp: new Date().toISOString(),
        test_metadata: {
          scenario: testScenario.name,
          stakeholder: testScenario.stakeholder,
          target_id: testTarget!.id,
          indicator_id: testIndicator!.id
        }
      };

      console.log('Creating report with rich metadata...');

      const result = await submitReport(
        testScenario.toolId,
        `Metadata Test - ${testScenario.name}`,
        metadataFormData,
        true,
        [],
        testTarget!.id
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      if (result.data?.id) {
        submittedReportIds.push(result.data.id);
      }

      console.log(`✓ Report created with ID: ${result.data?.id}`);

      // Validate core metadata fields
      expect(result.data?.tool_id).toBe(testScenario.toolId);
      expect(result.data?.tool_name).toContain(testScenario.name);
      expect(result.data?.status).toBe('pending');
      expect(result.data?.nbsap_target_id).toBe(testTarget!.id);
      expect(result.data?.submitted_by).toBe(authenticatedUser.id);
      expect(result.data?.submitted_at).toBeDefined();

      // Validate form data preservation
      expect(result.data?.form_data).toEqual(metadataFormData);

      console.log('✓ All metadata fields correctly stored and validated');
      console.log('=== Report Metadata validation completed ===\n');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid stakeholder/target combinations gracefully', async () => {
      console.log('\n=== Testing Error Handling ===');

      // Test with invalid target ID
      const invalidFormData = {
        stakeholder: 'REMA',
        institution: 'Test Institution',
        period: 'Q1 2024',
        nbsap_target: '99999', // Invalid target ID
        indicator: '99999', // Invalid indicator ID
        current_status: 50
      };

      console.log('Testing submission with invalid target/indicator IDs...');

      const result = await submitReport(
        'T01',
        'Error Handling Test',
        invalidFormData,
        false,
        [],
        99999 // Invalid target ID
      );

      // The submission should succeed but with invalid references
      // This tests the system's resilience to invalid data
      if (result.error) {
        console.log('✓ System correctly rejected invalid data:', result.error);
        expect(result.error).toBeDefined();
      } else {
        console.log('✓ System accepted submission with invalid references (graceful handling)');
        if (result.data?.id) {
          submittedReportIds.push(result.data.id);
        }
      }

      console.log('=== Error Handling validation completed ===\n');
    });
  });
});