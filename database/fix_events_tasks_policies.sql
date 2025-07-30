-- Fix Row Level Security policies for events_tasks table
-- This will allow authenticated users to create, read, update, and delete events

-- First, check if RLS is enabled (it should be)
-- If you need to enable RLS: ALTER TABLE events_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "events_tasks_select_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_insert_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_update_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_delete_policy" ON events_tasks;

-- Allow everyone to read events (for homepage display)
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

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'events_tasks';
