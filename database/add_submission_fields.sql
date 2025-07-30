-- Add submission fields to existing events_tasks table
-- Run this if you already have the events_tasks table created

-- Add new columns for submission functionality
ALTER TABLE events_tasks 
ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'none' CHECK (submission_type IN ('none', 'link', 'link_media'));

ALTER TABLE events_tasks 
ADD COLUMN IF NOT EXISTS submission_title TEXT;

ALTER TABLE events_tasks 
ADD COLUMN IF NOT EXISTS submission_description TEXT;

-- Update any existing events to have default submission_type
UPDATE events_tasks 
SET submission_type = 'none' 
WHERE submission_type IS NULL;
