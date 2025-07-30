-- Step-by-step fix for events_tasks status and RLS policies
-- Run each section separately to avoid constraint conflicts

-- STEP 1: Check current status values
SELECT 
    'Current Status Values' as check_name,
    status,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as event_names
FROM events_tasks 
GROUP BY status;

-- STEP 2: Drop the existing constraint first (run this separately)
-- ALTER TABLE events_tasks DROP CONSTRAINT IF EXISTS events_tasks_status_check;

-- STEP 3: Update any non-standard status values (run this after step 2)
-- UPDATE events_tasks SET status = 'running' WHERE status NOT IN ('running', 'ended');

-- STEP 4: Add the new constraint (run this after step 3)
-- ALTER TABLE events_tasks ADD CONSTRAINT events_tasks_status_check CHECK (status IN ('running', 'ended'));

-- STEP 5: Fix RLS policies (run this after step 4)
-- DROP POLICY IF EXISTS "Allow public read access to live events_tasks" ON events_tasks;
-- DROP POLICY IF EXISTS "Allow admin full access to events_tasks" ON events_tasks;
-- DROP POLICY IF EXISTS "events_tasks_select_policy" ON events_tasks;
-- DROP POLICY IF EXISTS "events_tasks_insert_policy" ON events_tasks;
-- DROP POLICY IF EXISTS "events_tasks_update_policy" ON events_tasks;
-- DROP POLICY IF EXISTS "events_tasks_delete_policy" ON events_tasks;

-- CREATE POLICY "Allow public read access to running events_tasks" ON events_tasks
--   FOR SELECT USING (status = 'running');

-- CREATE POLICY "Allow public read access to ended events_tasks" ON events_tasks
--   FOR SELECT USING (status = 'ended');

-- CREATE POLICY "Allow admin full access to events_tasks" ON events_tasks
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE users.id = auth.uid() 
--       AND users.discord_role = 'Admin'
--     )
--   );

-- GRANT SELECT ON events_tasks TO anon, authenticated;
-- GRANT ALL ON events_tasks TO service_role;
