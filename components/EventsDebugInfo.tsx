import React, { useState, useEffect } from 'react';
import { supaclient } from '../services/supabase';
import { EventTask } from '../types';
import Card from './Card';
import { Database, Info } from 'lucide-react';

const EventsDebugInfo: React.FC = () => {
  const [events, setEvents] = useState<EventTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const allEvents = await supaclient.getAllEventsTasks();
        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Database className="text-blue-400" size={20} />
          <h3 className="text-lg font-bold text-white">Events Debug Info</h3>
        </div>
        <p className="text-slate-400">Loading events...</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Database className="text-blue-400" size={20} />
        <h3 className="text-lg font-bold text-white">Events Debug Info</h3>
      </div>
      
      <div className="space-y-4">
        <div className="text-slate-300">
          <strong>Total Events:</strong> {events.length}
        </div>
        
        {events.length === 0 ? (
          <div className="text-slate-400">No events found</div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div key={event.id} className="bg-slate-700/50 p-3 rounded-lg">
                <div className="text-white font-medium mb-2">Event #{index + 1}: {event.name}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-300">
                    <strong>ID:</strong> {event.id}
                  </div>
                  <div className="text-slate-300">
                    <strong>Status:</strong> {event.status}
                  </div>
                  <div className="text-slate-300">
                    <strong>Submission Type:</strong> {event.submission_type || 'undefined'}
                  </div>
                  <div className="text-slate-300">
                    <strong>Submission Title:</strong> {event.submission_title || 'undefined'}
                  </div>
                </div>
                <div className="mt-2 text-slate-400 text-xs">
                  <strong>Description:</strong> {event.description || 'No description'}
                </div>
                
                {/* Show if this event would display submission bar */}
                <div className="mt-2 flex items-center gap-2">
                  <Info size={14} />
                  <span className="text-xs">
                    Submission Bar: {
                      event.submission_type && event.submission_type !== 'none' 
                        ? <span className="text-green-400">Would Show</span>
                        : <span className="text-red-400">Hidden</span>
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default EventsDebugInfo;
