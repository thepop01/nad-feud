-- Complete fix for events_tasks table
-- This includes RLS policies, submission fields, and constraints

-- Step 1: Fix Row Level Security policies (CRITICAL for event creation)
DROP POLICY IF EXISTS "events_tasks_select_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_insert_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_update_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_delete_policy" ON events_tasks;

-- Allow everyone to read events
CREATE POLICY "events_tasks_select_policy" ON events_tasks
    FOR SELECT USING (true);

-- Allow authenticated users to insert events
CREATE POLICY "events_tasks_insert_policy" ON events_tasks
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own events, or admins to update any
CREATE POLICY "events_tasks_update_policy" ON events_tasks
    FOR UPDATE USING (
        auth.uid() = uploaded_by OR
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Allow users to delete their own events, or admins to delete any
CREATE POLICY "events_tasks_delete_policy" ON events_tasks
    FOR DELETE USING (
        auth.uid() = uploaded_by OR
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- Step 2: Add submission fields
ALTER TABLE events_tasks
ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'none';

ALTER TABLE events_tasks
ADD COLUMN IF NOT EXISTS submission_title TEXT;

ALTER TABLE events_tasks
ADD COLUMN IF NOT EXISTS submission_description TEXT;

-- Step 3: Add constraint for submission_type (drop first if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'events_tasks_submission_type_check'
    ) THEN
        ALTER TABLE events_tasks DROP CONSTRAINT events_tasks_submission_type_check;
    END IF;

    ALTER TABLE events_tasks ADD CONSTRAINT events_tasks_submission_type_check
    CHECK (submission_type IN ('none', 'link', 'link_media'));
END $$;

-- Step 4: Update existing events to have default submission_type
UPDATE events_tasks
SET submission_type = 'none'
WHERE submission_type IS NULL;

-- Step 5: Clean up any test/sample events
DELETE FROM events_tasks WHERE
    name ILIKE '%sample%' OR
    name ILIKE '%test%' OR
    name ILIKE '%debug%' OR
    description ILIKE '%sample%' OR
    description ILIKE '%test%' OR
    description ILIKE '%debug%';

-- Step 6: Verify the setup
SELECT
    id,
    name,
    status,
    submission_type,
    submission_title,
    created_at
FROM events_tasks
ORDER BY created_at DESC;
