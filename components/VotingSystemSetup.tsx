import React, { useState } from 'react';
import { supaclient } from '../services/supabase';

const VotingSystemSetup: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runSetup = async () => {
    setIsRunning(true);
    setResults([]);
    
    const sqlStatements = [
      // 1. Create event_submission_votes table
      `CREATE TABLE IF NOT EXISTS event_submission_votes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        submission_id UUID NOT NULL REFERENCES event_submissions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(submission_id, user_id)
      )`,
      
      // 2. Create indexes
      `CREATE INDEX IF NOT EXISTS idx_event_submission_votes_submission_id ON event_submission_votes(submission_id)`,
      `CREATE INDEX IF NOT EXISTS idx_event_submission_votes_user_id ON event_submission_votes(user_id)`,
      
      // 3. Enable RLS
      `ALTER TABLE event_submission_votes ENABLE ROW LEVEL SECURITY`,
      
      // 4. Drop existing policies
      `DROP POLICY IF EXISTS "Allow public read access to votes" ON event_submission_votes`,
      `DROP POLICY IF EXISTS "Allow authenticated users to vote" ON event_submission_votes`,
      `DROP POLICY IF EXISTS "Allow users to delete own votes" ON event_submission_votes`,
      
      // 5. Create RLS policies
      `CREATE POLICY "Allow public read access to votes" ON event_submission_votes FOR SELECT USING (true)`,
      `CREATE POLICY "Allow authenticated users to vote" ON event_submission_votes FOR INSERT WITH CHECK (auth.uid() = user_id)`,
      `CREATE POLICY "Allow users to delete own votes" ON event_submission_votes FOR DELETE USING (auth.uid() = user_id)`,
      
      // 6. Grant permissions
      `GRANT SELECT ON event_submission_votes TO anon, authenticated`,
      `GRANT INSERT ON event_submission_votes TO authenticated`,
      `GRANT DELETE ON event_submission_votes TO authenticated`,
      `GRANT ALL ON event_submission_votes TO service_role`
    ];

    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      try {
        setResults(prev => [...prev, `🔄 Executing statement ${i + 1}/${sqlStatements.length}...`]);
        
        // Try to execute the statement directly using supabase client
        let data, error;

        // For table creation, use direct queries
        if (statement.includes('CREATE TABLE')) {
          const result = await (supaclient as any).supabase.rpc('exec_sql', { sql_query: statement });
          data = result.data;
          error = result.error;
        } else {
          // For other operations, try direct execution
          const result = await (supaclient as any).supabase.rpc('exec_sql', { sql_query: statement });
          data = result.data;
          error = result.error;
        }
        
        if (error) {
          setResults(prev => [...prev, `❌ Statement ${i + 1} failed: ${error.message}`]);
        } else {
          setResults(prev => [...prev, `✅ Statement ${i + 1} executed successfully`]);
        }
      } catch (error) {
        setResults(prev => [...prev, `❌ Statement ${i + 1} error: ${error}`]);
      }
    }

    // Test the setup
    try {
      setResults(prev => [...prev, `🔍 Testing voting table access...`]);
      const { data, error } = await (supaclient as any).supabase
        .from('event_submission_votes')
        .select('count')
        .limit(1);

      if (error) {
        setResults(prev => [...prev, `❌ Table test failed: ${error.message}`]);
      } else {
        setResults(prev => [...prev, `✅ Voting table is accessible!`]);
        setResults(prev => [...prev, `🎉 Voting system setup completed successfully!`]);
      }
    } catch (error) {
      setResults(prev => [...prev, `❌ Table test error: ${error}`]);
    }

    setIsRunning(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-800 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Voting System Setup</h2>
      <p className="text-slate-300 mb-6">
        This will create the missing voting table and set up the voting system.
      </p>
      
      <button
        onClick={runSetup}
        disabled={isRunning}
        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        {isRunning ? 'Setting up...' : 'Run Voting System Setup'}
      </button>

      {results.length > 0 && (
        <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-3">Setup Results:</h3>
          <div className="space-y-1">
            {results.map((result, index) => (
              <div key={index} className="text-sm font-mono text-slate-300">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingSystemSetup;
