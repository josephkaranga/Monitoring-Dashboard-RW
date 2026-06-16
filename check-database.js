/**
 * Check Database Connection and Apply Migrations
 * 
 * This script checks if the database is properly set up and applies
 * migrations if needed for testing the report submission pipeline.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
const env = {};
const envContent = fs.readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=', 2);
    env[key.trim()] = value.trim();
  }
});

// Initialize Supabase client
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

console.log('🔍 Checking Database Connection and Schema...');
console.log('='.repeat(50));

async function checkDatabase() {
  try {
    // Test basic connection
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names', {});
    
    if (tablesError) {
      console.log('❌ Error getting table list:', tablesError.message);
      
      // Try a simpler approach - check if basic tables exist
      console.log('📋 Checking if required tables exist...');
      
      const tableChecks = [
        'nbsap_targets',
        'indicators', 
        'toolkit_reports',
        'profiles'
      ];
      
      for (const table of tableChecks) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('count(*)', { count: 'exact', head: true });
            
          if (error) {
            console.log(`❌ Table '${table}' not accessible: ${error.message}`);
          } else {
            console.log(`✅ Table '${table}' exists (${data.count || 0} records)`);
          }
        } catch (err) {
          console.log(`❌ Table '${table}' check failed: ${err.message}`);
        }
      }
    } else {
      console.log('✅ Database connection successful');
      console.log('📋 Available tables:', tables);
    }
    
    // Check specific data
    console.log('\n📊 Checking data availability...');
    
    // Check NBSAP targets
    const { data: targets, error: targetsError } = await supabase
      .from('nbsap_targets')
      .select('id, title')
      .limit(5);
      
    if (targetsError) {
      console.log('❌ Cannot access nbsap_targets:', targetsError.message);
    } else {
      console.log(`✅ Found ${targets.length} NBSAP targets`);
      if (targets.length > 0) {
        console.log('   Sample targets:', targets.map(t => `${t.id}: ${t.title}`));
      }
    }
    
    // Check indicators
    const { data: indicators, error: indicatorsError } = await supabase
      .from('indicators')
      .select('id, name, nbsap_target_id')
      .limit(5);
      
    if (indicatorsError) {
      console.log('❌ Cannot access indicators:', indicatorsError.message);
    } else {
      console.log(`✅ Found ${indicators.length} indicators`);
      if (indicators.length > 0) {
        console.log('   Sample indicators:', indicators.map(i => `${i.id}: ${i.name} (Target ${i.nbsap_target_id})`));
      }
    }
    
    // Check reports
    const { data: reports, error: reportsError } = await supabase
      .from('toolkit_reports')
      .select('id, tool_id, status')
      .limit(5);
      
    if (reportsError) {
      console.log('❌ Cannot access toolkit_reports:', reportsError.message);
    } else {
      console.log(`✅ Found ${reports.length} reports in system`);
    }
    
  } catch (error) {
    console.log('❌ Database check failed:', error.message);
  }
}

async function seedBasicData() {
  console.log('\n🌱 Seeding basic test data...');
  
  try {
    // Try to insert a few test targets
    const testTargets = [
      {
        id: 1,
        goal: 'A',
        title: 'Biodiversity-Inclusive Spatial Planning',
        description: 'By 2030, participatory biodiversity-inclusive spatial land use planning and management to ensure biodiversity loss is close to zero.',
        baseline: 'No consolidated information on biodiversity-inclusive spatial planning.',
        progress: 18
      },
      {
        id: 2,
        goal: 'A', 
        title: 'Degraded Land Restoration',
        description: 'By 2030, increase the area of degraded lands and inland water under restoration by at least 10%.',
        baseline: 'Baseline: 332,861 ha; target 600,000 ha by 2029.',
        progress: 32
      },
      {
        id: 5,
        goal: 'B',
        title: 'Sustainable Management of Wild Species',
        description: 'By 2030, ensure the sustainable management of wild species and curb illegal harvesting.',
        baseline: 'Fish production in Lake Kivu dropped from 24,199 t (2017) to 16,194 t (2020).',
        progress: 28
      }
    ];
    
    const { data: insertedTargets, error: targetError } = await supabase
      .from('nbsap_targets')
      .upsert(testTargets, { onConflict: 'id' });
      
    if (targetError) {
      console.log('❌ Failed to seed targets:', targetError.message);
    } else {
      console.log('✅ Seeded test targets successfully');
    }
    
    // Try to insert test indicators
    const testIndicators = [
      {
        name: 'Spatial Plan Biodiversity Coverage (%)',
        definition: '% of land and water bodies covered by biodiversity-inclusive spatial plans',
        tier: 'headline',
        nbsap_target_id: 1,
        target_2030: '100% of priority areas covered',
        baseline: 'No consolidated baseline',
        midterm: '50% (2027)',
        final_target: '100% (2030)',
        current_value: '18%',
        progress: 18,
        status: 'behind',
        km_gbf: 'GBF Target 1',
        periodicity: 'Annual',
        data_source: 'District land-use plans, RBIS, NISR',
        responsible: ['REMA', 'Ministry of Environment', 'MINAGRI']
      },
      {
        name: 'Degraded Land & Water Under Restoration (ha)',
        definition: 'Total area (ha) of degraded lands, wetlands, lakes and rivers under restoration',
        tier: 'headline',
        nbsap_target_id: 2,
        target_2030: '600,000 ha by 2029',
        baseline: '332,861 ha',
        midterm: '450,000 ha (2027)',
        final_target: '600,000 ha (2029)',
        current_value: '385,000 ha',
        progress: 32,
        status: 'at-risk',
        km_gbf: 'GBF Target 2',
        periodicity: 'Annual',
        data_source: 'Field surveys, Remote sensing, RBIS',
        responsible: ['REMA', 'RFA', 'District Authorities']
      },
      {
        name: 'Illegal Harvesting Reduction (%)',
        definition: 'Proportion of illegal harvesting curbed across agriculture, forests and waters',
        tier: 'headline',
        nbsap_target_id: 5,
        target_2030: '75% reduction in illegal activities',
        baseline: 'Illegal fishing declining; fish production 16,194 t (2020)',
        midterm: '50% reduction (2027)',
        final_target: '75% reduction (2030)',
        current_value: '28%',
        progress: 28,
        status: 'at-risk',
        km_gbf: 'GBF Target 5',
        periodicity: 'Annual',
        data_source: 'RAB fisheries, RFA forest records, Enforcement reports',
        responsible: ['MINAGRI', 'RAB', 'RFA', 'REMA']
      }
    ];
    
    const { data: insertedIndicators, error: indicatorError } = await supabase
      .from('indicators')
      .upsert(testIndicators);
      
    if (indicatorError) {
      console.log('❌ Failed to seed indicators:', indicatorError.message);
    } else {
      console.log('✅ Seeded test indicators successfully');
    }
    
  } catch (error) {
    console.log('❌ Seeding failed:', error.message);
  }
}

async function main() {
  await checkDatabase();
  
  // Ask if we should seed test data
  console.log('\n' + '='.repeat(50));
  console.log('💡 If tables exist but have no data, you may need to:');
  console.log('   1. Apply the SQL migration files in order');
  console.log('   2. Or run this script with --seed to add basic test data');
  console.log('');
  
  // Check if --seed flag is provided
  if (process.argv.includes('--seed')) {
    await seedBasicData();
    console.log('\n✅ Database seeding complete. You can now test the report submission pipeline.');
  }
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});