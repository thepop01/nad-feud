import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import Button from './Button';
import { Database, AlertTriangle, CheckCircle, Play } from 'lucide-react';

const QuickDatabaseTest: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${isError ? '❌' : '✅'} ${message}`;
    setResults(prev => [...prev, formattedMessage]);
    console.log(formattedMessage);
  };

  const runDatabaseTest = async () => {
    if (!user) {
      addResult('No user logged in', true);
      return;
    }

    setIsLoading(true);
    setResults([]);
    
    try {
      addResult('Starting database connection test...');
      
      // Import Supabase client directly
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = 'https://czgytqyexrizboaddflu.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6Z3l0cXlleHJpemJvYWRkZmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NTUzOTIsImV4cCI6MjA2ODQzMTM5Mn0.V08KFMNQwFWMx9PAamT8XmM9UZzztHpcvusamAb4Clw';
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      addResult('Supabase client created successfully');

      // Test 1: Check if events_tasks table exists
      addResult('Testing table access...');
      const { data: tableData, error: tableError } = await supabase
        .from('events_tasks')
        .select('*')
        .limit(1);

      if (tableError) {
        addResult(`Table access failed: ${tableError.message}`, true);
        addResult(`Error code: ${tableError.code}`, true);
        addResult(`Error details: ${tableError.details}`, true);
        return;
      }
      
      addResult(`Table access successful. Found ${tableData?.length || 0} records`);

      // Test 2: Check table structure
      addResult('Checking table structure...');
      const { data: structureData, error: structureError } = await supabase
        .from('events_tasks')
        .select('id, name, media_url, submission_type')
        .limit(1);

      if (structureError) {
        addResult(`Structure check failed: ${structureError.message}`, true);
        if (structureError.message.includes('submission_type')) {
          addResult('❗ Missing submission_type column - need to run SQL migration!', true);
        }
        return;
      }
      
      addResult('Table structure looks good');

      // Test 3: Try to insert a test record
      addResult('Testing record insertion...');
      const testRecord = {
        name: 'Database Test Event',
        description: 'Testing database connection',
        media_type: 'image',
        media_url: 'https://via.placeholder.com/400x300/6366f1/ffffff?text=DB+Test',
        status: 'live',
        display_order: 999,
        uploaded_by: user.id,
        created_by: user.id,
        file_size: 0,
        view_count: 0,
        submission_type: 'none'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('events_tasks')
        .insert([testRecord])
        .select()
        .single();

      if (insertError) {
        addResult(`Insert failed: ${insertError.message}`, true);
        addResult(`Error code: ${insertError.code}`, true);
        addResult(`Error details: ${insertError.details || 'No details'}`, true);
        addResult(`Error hint: ${insertError.hint || 'No hint'}`, true);
        return;
      }

      addResult(`Record inserted successfully! ID: ${insertData.id}`);

      // Test 4: Clean up - delete the test record
      const { error: deleteError } = await supabase
        .from('events_tasks')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        addResult(`Cleanup failed: ${deleteError.message}`, true);
      } else {
        addResult('Test record cleaned up successfully');
      }

      addResult('🎉 All database tests passed!');

    } catch (error) {
      addResult(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
      console.error('Database test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Database className="text-green-400" size={20} />
        <h3 className="text-lg font-bold text-white">Quick Database Test</h3>
      </div>
      
      <div className="space-y-4">
        <Button
          onClick={runDatabaseTest}
          disabled={isLoading || !user}
          className="flex items-center gap-2"
        >
          <Play size={16} />
          {isLoading ? 'Running Tests...' : 'Run Database Tests'}
        </Button>

        {!user && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-400" size={16} />
              <span className="text-yellow-300">Please log in to run database tests</span>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 max-h-96 overflow-y-auto">
            <h4 className="text-white font-medium mb-2">Test Results:</h4>
            <div className="space-y-1 font-mono text-sm">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`${
                    result.includes('❌') ? 'text-red-300' : 
                    result.includes('❗') ? 'text-yellow-300' :
                    'text-green-300'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default QuickDatabaseTest;
