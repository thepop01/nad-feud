-- TEMPORARY: Disable RLS on events_tasks to test if that's the issue
-- This is just for testing - we'll re-enable it after confirming the issue

-- Disable RLS temporarily
ALTER TABLE events_tasks DISABLE ROW LEVEL SECURITY;

-- Test query - this should now return events
SELECT 
    'Test After Disabling RLS' as check_name,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as event_names
FROM events_tasks 
WHERE status = 'running';

-- IMPORTANT: After testing, re-enable RLS and fix policies
-- ALTER TABLE events_tasks ENABLE ROW LEVEL SECURITY;
