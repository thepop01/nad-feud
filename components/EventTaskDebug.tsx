import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supaclient } from '../services/supabase';
import { EventTask } from '../types';

const EventTaskDebug: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
  const [allEventTasks, setAllEventTasks] = useState<EventTask[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching live events...');
      const live = await supaclient.getEventsTasks();
      console.log('Live events:', live);
      setEventTasks(live);

      console.log('Fetching all events...');
      const all = await supaclient.getAllEventsTasks();
      console.log('All events:', all);
      setAllEventTasks(all);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testCreate = async () => {
    if (!user) {
      setTestResult('Error: No user logged in');
      return;
    }

    setLoading(true);
    setTestResult('');
    try {
      const testEvent = {
        name: 'Debug Test Event',
        description: 'This is a test event created for debugging',
        media_type: 'image' as const,
        media_url: 'https://via.placeholder.com/800x400/10b981/ffffff?text=Debug+Test',
        link_url: 'https://example.com',
        status: 'live' as const,
        display_order: 1,
        uploaded_by: user.id,
        created_by: user.id,
        file_size: 0,
        view_count: 0
      };

      console.log('Creating test event:', testEvent);
      const result = await supaclient.createEventTask(testEvent);
      console.log('Created event:', result);
      setTestResult(`Success! Created event with ID: ${result.id}`);
      
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error creating test event:', err);
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTestEvents = async () => {
    setLoading(true);
    setTestResult('');
    try {
      const testEvents = allEventTasks.filter(event => 
        event.name.includes('Debug Test') || 
        event.name.includes('Sample Event') ||
        event.description?.includes('testing purposes')
      );

      for (const event of testEvents) {
        console.log('Deleting test event:', event.id);
        await supaclient.deleteEventTask(event.id);
      }

      setTestResult(`Deleted ${testEvents.length} test events`);
      await fetchData();
    } catch (err) {
      console.error('Error deleting test events:', err);
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6 bg-slate-800 rounded-lg">
      <h2 className="text-xl font-bold text-white mb-4">Event Tasks Debug Panel</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-slate-300">User: {user?.username || 'Not logged in'}</p>
          <p className="text-slate-300">Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
          <p className="text-slate-300">User ID: {user?.id || 'N/A'}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
          
          <button
            onClick={testCreate}
            disabled={loading || !user}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Test Create Event
          </button>
          
          <button
            onClick={deleteTestEvents}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Delete Test Events
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
            Error: {error}
          </div>
        )}

        {testResult && (
          <div className="p-3 bg-blue-900/50 border border-blue-500 rounded text-blue-200">
            {testResult}
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Live Events ({eventTasks.length})</h3>
          <div className="space-y-2">
            {eventTasks.map(event => (
              <div key={event.id} className="p-2 bg-slate-700 rounded text-sm">
                <p className="text-white font-medium">{event.name}</p>
                <p className="text-slate-300">{event.description}</p>
                <p className="text-slate-400">ID: {event.id}</p>
              </div>
            ))}
            {eventTasks.length === 0 && (
              <p className="text-slate-400">No live events found</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">All Events ({allEventTasks.length})</h3>
          <div className="space-y-2">
            {allEventTasks.map(event => (
              <div key={event.id} className="p-2 bg-slate-700 rounded text-sm">
                <p className="text-white font-medium">{event.name} ({event.status})</p>
                <p className="text-slate-300">{event.description}</p>
                <p className="text-slate-400">ID: {event.id}</p>
              </div>
            ))}
            {allEventTasks.length === 0 && (
              <p className="text-slate-400">No events found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTaskDebug;
