-- Fix Database Script
-- Run this in your Supabase SQL Editor to fix all database issues

-- Step 1: Add submission columns to events_tasks table (if they don't exist)
ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'none';
ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_title TEXT;
ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS submission_description TEXT;

-- Step 2: Add check constraint for submission_type (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'events_tasks_submission_type_check'
    ) THEN
        ALTER TABLE events_tasks ADD CONSTRAINT events_tasks_submission_type_check 
        CHECK (submission_type IN ('none', 'link', 'link_media'));
    END IF;
END $$;

-- Step 3: Update existing events to have submission_type = 'none' if null
UPDATE events_tasks SET submission_type = 'none' WHERE submission_type IS NULL;

-- Step 4: Delete any sample/test events that might be causing issues
DELETE FROM events_tasks WHERE 
    name ILIKE '%sample%' OR 
    name ILIKE '%test%' OR 
    name ILIKE '%debug%' OR
    description ILIKE '%sample%' OR
    description ILIKE '%test%' OR
    description ILIKE '%debug%';

-- Step 5: Verify the changes
SELECT 
    id, 
    name, 
    status, 
    submission_type, 
    submission_title,
    created_at
FROM events_tasks 
ORDER BY created_at DESC;
