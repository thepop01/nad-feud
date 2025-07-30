import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import { Copy, ExternalLink, Database, CheckCircle } from 'lucide-react';

const ManualFixGuide: React.FC = () => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const sqlCommands = [
    {
      title: "Add submission columns",
      sql: `ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'none';
ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_title TEXT;
ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_description TEXT;`
    },
    {
      title: "Add check constraint",
      sql: `DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'events_tasks_submission_type_check'
    ) THEN
        ALTER TABLE events_tasks ADD CONSTRAINT events_tasks_submission_type_check 
        CHECK (submission_type IN ('none', 'link', 'link_media'));
    END IF;
END $$;`
    },
    {
      title: "Update existing events",
      sql: `UPDATE events_tasks SET submission_type = 'none' WHERE submission_type IS NULL;`
    },
    {
      title: "Clean up sample events",
      sql: `DELETE FROM events_tasks WHERE 
    name ILIKE '%sample%' OR 
    name ILIKE '%test%' OR 
    name ILIKE '%debug%' OR
    description ILIKE '%sample%' OR
    description ILIKE '%test%' OR
    description ILIKE '%debug%';`
    },
    {
      title: "Verify changes",
      sql: `SELECT 
    id, 
    name, 
    status, 
    submission_type, 
    submission_title,
    created_at
FROM events_tasks 
ORDER BY created_at DESC;`
    }
  ];

  const copyToClipboard = async (text: string, stepIndex: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStep(stepIndex);
      setTimeout(() => setCopiedStep(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard', '_blank');
  };

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Database className="text-blue-400" size={24} />
          <h3 className="text-xl font-bold text-white">Manual Database Fix Guide</h3>
        </div>
        
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="text-yellow-400" size={16} />
            <span className="text-yellow-300 font-medium">Instructions</span>
          </div>
          <p className="text-yellow-200 text-sm">
            Run these SQL commands in your Supabase SQL Editor to fix all database issues.
            Go to your Supabase dashboard → SQL Editor → New Query, then copy and paste each command.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={openSupabase}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ExternalLink size={16} />
            Open Supabase Dashboard
          </Button>
        </div>

        <div className="space-y-4">
          {sqlCommands.map((command, index) => (
            <div key={index} className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">
                  Step {index + 1}: {command.title}
                </h4>
                <Button
                  onClick={() => copyToClipboard(command.sql, index)}
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {copiedStep === index ? (
                    <>
                      <CheckCircle size={14} className="text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="bg-slate-800 p-3 rounded text-sm text-slate-300 overflow-x-auto">
                <code>{command.sql}</code>
              </pre>
            </div>
          ))}
        </div>

        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="text-green-400" size={16} />
            <span className="text-green-300 font-medium">After Running Commands</span>
          </div>
          <p className="text-green-200 text-sm">
            Once you've run all the SQL commands, refresh this page and all issues should be resolved:
          </p>
          <ul className="text-green-200 text-sm mt-2 ml-4 list-disc">
            <li>Sample events will be deleted</li>
            <li>New events can be created</li>
            <li>Submission options will show on homepage</li>
            <li>Leaderboard access will work with proper roles</li>
            <li>Highlight popups will work</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default ManualFixGuide;
