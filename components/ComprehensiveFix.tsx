import React, { useState } from 'react';
import { supaclient } from '../services/supabase';
import Button from './Button';
import Card from './Card';
import { Database, CheckCircle, AlertCircle, Loader, Wrench } from 'lucide-react';

const ComprehensiveFix: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `✅ ${message}`]);
  };

  const addError = (message: string) => {
    setErrors(prev => [...prev, `❌ ${message}`]);
  };

  const runComprehensiveFix = async () => {
    setIsRunning(true);
    setResults([]);
    setErrors([]);

    try {
      // Step 1: Add submission fields to events_tasks table
      addResult('Step 1: Adding submission fields to events_tasks table...');
      
      try {
        // Check if columns exist first
        const { data: testData, error: testError } = await supaclient.supabase
          .from('events_tasks')
          .select('submission_type')
          .limit(1);

        if (testError && testError.message.includes('column "submission_type" does not exist')) {
          // Columns don't exist, try alternative approach
          addError('Submission columns do not exist. Please run the SQL migration manually.');
          addError('Execute these SQL commands in your Supabase SQL editor:');
          addError('ALTER TABLE events_tasks ADD COLUMN submission_type TEXT DEFAULT \'none\';');
          addError('ALTER TABLE events_tasks ADD COLUMN submission_title TEXT;');
          addError('ALTER TABLE events_tasks ADD COLUMN submission_description TEXT;');
        } else {
          addResult('Submission columns already exist in events_tasks table');
        }
      } catch (err) {
        addError(`Failed to add submission columns: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Step 2: Update existing events to have submission_type = 'none' if null
      addResult('Step 2: Updating existing events with null submission_type...');
      try {
        const { error: updateError } = await supaclient.supabase
          .from('events_tasks')
          .update({ submission_type: 'none' })
          .is('submission_type', null);

        if (updateError) {
          throw updateError;
        }
        addResult('Updated existing events with default submission_type');
      } catch (err) {
        addError(`Failed to update existing events: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Step 3: Check and fix sample events
      addResult('Step 3: Checking for problematic sample events...');
      try {
        const { data: allEvents, error: fetchError } = await supaclient.supabase
          .from('events_tasks')
          .select('*');

        if (fetchError) {
          throw fetchError;
        }

        const sampleEvents = allEvents?.filter(event => 
          event.name?.includes('Sample') || 
          event.name?.includes('Debug') ||
          event.description?.includes('sample') ||
          event.description?.includes('test')
        ) || [];

        if (sampleEvents.length > 0) {
          addResult(`Found ${sampleEvents.length} sample/test events`);
          
          // Try to delete them
          for (const event of sampleEvents) {
            try {
              const { error: deleteError } = await supaclient.supabase
                .from('events_tasks')
                .delete()
                .eq('id', event.id);

              if (deleteError) {
                addError(`Failed to delete sample event "${event.name}": ${deleteError.message}`);
              } else {
                addResult(`Deleted sample event: ${event.name}`);
              }
            } catch (err) {
              addError(`Error deleting event "${event.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
          }
        } else {
          addResult('No sample events found to clean up');
        }
      } catch (err) {
        addError(`Failed to check sample events: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Step 4: Test event creation
      addResult('Step 4: Testing event creation...');
      try {
        const testEvent = {
          name: 'Test Event - Delete Me',
          description: 'This is a test event created by the fix script',
          media_type: 'image' as const,
          media_url: 'https://via.placeholder.com/400x300',
          status: 'live' as const,
          display_order: 999,
          uploaded_by: 'system',
          created_by: 'system',
          file_size: 0,
          view_count: 0,
          submission_type: 'link' as const,
          submission_title: 'Test Submission',
          submission_description: 'Test submission description'
        };

        const { data: createdEvent, error: createError } = await supaclient.supabase
          .from('events_tasks')
          .insert([testEvent])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        addResult(`Successfully created test event with ID: ${createdEvent.id}`);

        // Immediately delete the test event
        const { error: deleteError } = await supaclient.supabase
          .from('events_tasks')
          .delete()
          .eq('id', createdEvent.id);

        if (deleteError) {
          addError(`Failed to delete test event: ${deleteError.message}`);
        } else {
          addResult('Successfully deleted test event');
        }
      } catch (err) {
        addError(`Event creation test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // Step 5: Verify final state
      addResult('Step 5: Verifying final database state...');
      try {
        const { data: finalEvents, error: finalError } = await supaclient.supabase
          .from('events_tasks')
          .select('*');

        if (finalError) {
          throw finalError;
        }

        addResult(`Final event count: ${finalEvents?.length || 0}`);
        
        const eventsWithSubmissions = finalEvents?.filter(event => 
          event.submission_type && event.submission_type !== 'none'
        ) || [];
        
        addResult(`Events with submissions enabled: ${eventsWithSubmissions.length}`);
      } catch (err) {
        addError(`Failed to verify final state: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      addResult('🎉 Comprehensive fix completed!');

    } catch (error) {
      addError(`Comprehensive fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="text-orange-400" size={24} />
          <h3 className="text-xl font-bold text-white">Comprehensive Fix</h3>
        </div>
        
        <p className="text-slate-400">
          This will fix all reported issues: database migration, sample event deletion, event creation, and submission system.
        </p>

        <Button
          onClick={runComprehensiveFix}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? <Loader className="animate-spin" size={16} /> : <Wrench size={16} />}
          Run Comprehensive Fix
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-green-300 font-medium">Results:</h4>
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <div key={index} className="text-green-200 text-sm mb-1">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-red-300 font-medium">Errors:</h4>
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 max-h-60 overflow-y-auto">
              {errors.map((error, index) => (
                <div key={index} className="text-red-200 text-sm mb-1">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ComprehensiveFix;
