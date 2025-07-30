import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Card from './Card';
import Button from './Button';
import { Database, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { supaclient } from '../services/supabase';

const DatabaseInspector: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const runQuery = async (query: string, description: string) => {
    if (!user) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      console.log(`Running query: ${description}`);
      console.log('Query:', query);
      
      // Use the supabase client directly for raw queries
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = 'https://your-project-ref.supabase.co'; // This will be replaced by actual URL
      const supabaseKey = 'your-supabase-anon-key'; // This will be replaced by actual key
      
      // For now, let's try to get table info through our existing client
      const result = await supaclient.getAllEventsTasks();
      setResults({
        description,
        data: result,
        count: result.length
      });
    } catch (err) {
      console.error('Query error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testEventCreation = async () => {
    if (!user) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      console.log('Testing event creation...');
      
      const testEvent = {
        name: 'Debug Test Event',
        description: 'Testing event creation',
        media_type: 'image' as const,
        media_url: 'https://via.placeholder.com/400x300/6366f1/ffffff?text=Debug+Test',
        status: 'live' as const,
        display_order: 1,
        uploaded_by: user.id,
        created_by: user.id,
        file_size: 0,
        view_count: 0,
        submission_type: 'none' as const
      };

      console.log('Test event data:', testEvent);
      
      const result = await supaclient.createEventTask(testEvent);
      console.log('Creation result:', result);
      
      setResults({
        description: 'Event Creation Test',
        data: result,
        success: true
      });
    } catch (err) {
      console.error('Event creation error:', err);
      setError(`Event creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Log more details about the error
      if (err instanceof Error) {
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserRole = () => {
    if (!user) {
      setError('No user logged in');
      return;
    }

    setResults({
      description: 'User Role Information',
      data: {
        id: user.id,
        username: user.username,
        discord_id: user.discord_id,
        discord_role: user.discord_role,
        is_admin: user.is_admin,
        can_vote: user.can_vote,
        created_at: user.created_at
      }
    });
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Database className="text-purple-400" size={20} />
        <h3 className="text-lg font-bold text-white">Database Inspector</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => runQuery('SELECT * FROM events_tasks ORDER BY created_at DESC LIMIT 5', 'Recent Events')}
            variant="secondary"
            size="sm"
            disabled={isLoading}
          >
            Check Events Table
          </Button>
          <Button
            onClick={testEventCreation}
            variant="secondary"
            size="sm"
            disabled={isLoading}
          >
            Test Event Creation
          </Button>
          <Button
            onClick={checkUserRole}
            variant="secondary"
            size="sm"
            disabled={isLoading}
          >
            Check User Role
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
            <span>Running query...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-400" size={16} />
              <span className="text-red-300 font-medium">Error</span>
            </div>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {results && (
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="text-green-400" size={16} />
              <span className="text-green-300 font-medium">{results.description}</span>
            </div>
            <pre className="bg-slate-800 p-3 rounded text-xs text-slate-300 overflow-x-auto">
              {JSON.stringify(results.data, null, 2)}
            </pre>
            {results.count !== undefined && (
              <p className="text-slate-400 text-sm mt-2">Found {results.count} records</p>
            )}
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="text-blue-400" size={16} />
            <span className="text-blue-300 font-medium">Debug Instructions</span>
          </div>
          <div className="text-blue-200 text-sm space-y-1">
            <p>1. Click "Check Events Table" to see current events</p>
            <p>2. Click "Test Event Creation" to test creating a new event</p>
            <p>3. Click "Check User Role" to see your role information</p>
            <p>4. Check browser console for detailed error logs</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DatabaseInspector;
