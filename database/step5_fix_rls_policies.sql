-- STEP 5: Fix RLS policies for events_tasks table

-- Drop existing policies that might be blocking access
DROP POLICY IF EXISTS "Allow public read access to live events_tasks" ON events_tasks;
DROP POLICY IF EXISTS "Allow admin full access to events_tasks" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_select_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_insert_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_update_policy" ON events_tasks;
DROP POLICY IF EXISTS "events_tasks_delete_policy" ON events_tasks;

-- Create new policies that work with 'running' status
-- Allow everyone to read running events (for homepage and leaderboard display)
CREATE POLICY "Allow public read access to running events_tasks" ON events_tasks
  FOR SELECT USING (status = 'running');

-- Allow everyone to read ended events (for leaderboard ended events)
CREATE POLICY "Allow public read access to ended events_tasks" ON events_tasks
  FOR SELECT USING (status = 'ended');

-- Allow admins to do everything with events_tasks
CREATE POLICY "Allow admin full access to events_tasks" ON events_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.discord_role = 'Admin'
    )
  );

-- Grant necessary permissions
GRANT SELECT ON events_tasks TO anon, authenticated;
GRANT ALL ON events_tasks TO service_role;
