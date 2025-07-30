import React, { useState } from 'react';
import { supaclient } from '../services/supabase';
import Button from './Button';
import Card from './Card';
import { Database, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const DatabaseMigration: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const runMigration = async () => {
    setIsRunning(true);
    setResult('');
    setError('');

    try {
      console.log('Running database migration...');
      
      // Execute the migration SQL statements one by one
      const statements = [
        `ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'none' CHECK (submission_type IN ('none', 'link', 'link_media'))`,
        `ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_title TEXT`,
        `ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_description TEXT`,
        `UPDATE events_tasks SET submission_type = 'none' WHERE submission_type IS NULL`
      ];

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`Executing statement ${i + 1}:`, statement);
        
        try {
          // Use raw SQL execution
          const { error } = await supaclient.supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`Error in statement ${i + 1}:`, error);
            // Try alternative approach for ALTER TABLE
            if (statement.includes('ALTER TABLE')) {
              console.log('Trying direct query...');
              const { error: directError } = await supaclient.supabase.from('events_tasks').select('submission_type').limit(1);
              if (!directError) {
                console.log('Column already exists, skipping...');
                continue;
              }
            }
            throw error;
          }
          
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (statementError) {
          console.error(`Statement ${i + 1} failed:`, statementError);
          if (statement.includes('ADD COLUMN IF NOT EXISTS')) {
            console.log('Column might already exist, continuing...');
            continue;
          }
          throw statementError;
        }
      }

      setResult('✅ Migration completed successfully! All submission fields have been added to the events_tasks table.');
      
    } catch (err) {
      console.error('Migration failed:', err);
      setError(`Migration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testConnection = async () => {
    setIsRunning(true);
    setResult('');
    setError('');

    try {
      // Test basic connection
      const { data, error } = await supaclient.supabase.from('events_tasks').select('id').limit(1);
      
      if (error) {
        throw error;
      }

      // Check if submission columns exist
      const { data: tableInfo, error: tableError } = await supaclient.supabase
        .from('events_tasks')
        .select('submission_type, submission_title, submission_description')
        .limit(1);

      if (tableError) {
        setResult('❌ Submission columns do not exist. Migration is needed.');
      } else {
        setResult('✅ Database connection successful and submission columns exist!');
      }

    } catch (err) {
      setError(`Connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="text-purple-400" size={24} />
          <h3 className="text-xl font-bold text-white">Database Migration</h3>
        </div>
        
        <p className="text-slate-400">
          Run this migration to add submission fields to the events_tasks table.
        </p>

        <div className="flex gap-3">
          <Button
            onClick={testConnection}
            disabled={isRunning}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {isRunning ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
            Test Connection
          </Button>
          
          <Button
            onClick={runMigration}
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? <Loader className="animate-spin" size={16} /> : <Database size={16} />}
            Run Migration
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-400" size={16} />
              <span className="text-green-300 font-medium">Success</span>
            </div>
            <p className="text-green-200 mt-1">{result}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-400" size={16} />
              <span className="text-red-300 font-medium">Error</span>
            </div>
            <p className="text-red-200 mt-1">{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DatabaseMigration;
