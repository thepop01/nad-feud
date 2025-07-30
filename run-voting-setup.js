const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read config from services/config.ts
const configContent = fs.readFileSync('./services/config.ts', 'utf8');
const supabaseUrlMatch = configContent.match(/export const supabaseUrl = ['"`]([^'"`]+)['"`]/);
const supabaseAnonKeyMatch = configContent.match(/export const supabaseAnonKey = ['"`]([^'"`]+)['"`]/);

if (!supabaseUrlMatch || !supabaseAnonKeyMatch) {
  console.error('Could not find Supabase URL or Anon Key in config.ts');
  process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1];
const supabaseAnonKey = supabaseAnonKeyMatch[1];

console.log('🔧 Setting up voting system...');
console.log('📍 Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runVotingSetup() {
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./database/create_voting_system_simple.sql', 'utf8');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + '...');

        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('\n🎉 Voting system setup completed!');
    console.log('🔍 Testing the setup...');

    // Test if the table was created
    const { data: tables, error: tableError } = await supabase
      .from('event_submission_votes')
      .select('count')
      .limit(1);

    if (tableError) {
      console.error('❌ Voting table test failed:', tableError);
    } else {
      console.log('✅ Voting table is accessible');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

runVotingSetup();