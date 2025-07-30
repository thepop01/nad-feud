-- Comprehensive debug for events_tasks table
-- This will help us understand what's actually in the database

-- 1. Check ALL events regardless of status
SELECT 
    'ALL Events in Database' as check_name,
    id,
    name,
    status,
    submission_type,
    display_order,
    created_at
FROM events_tasks 
ORDER BY created_at DESC;

-- 2. Count events by status
SELECT 
    'Events Count by Status' as check_name,
    status,
    COUNT(*) as count
FROM events_tasks 
GROUP BY status;

-- 3. Check specifically for 'running' status (exact match)
SELECT 
    'Running Status Events (Exact Match)' as check_name,
    id,
    name,
    status,
    LENGTH(status) as status_length,
    ASCII(SUBSTRING(status FROM 1 FOR 1)) as first_char_ascii
FROM events_tasks 
WHERE status = 'running';

-- 4. Check for any status that contains 'running' (in case of whitespace issues)
SELECT 
    'Status Contains Running' as check_name,
    id,
    name,
    status,
    LENGTH(status) as status_length,
    '"' || status || '"' as status_with_quotes
FROM events_tasks 
WHERE status LIKE '%running%';

-- 5. Check the exact query that the frontend is using
SELECT 
    'Frontend Query Simulation' as check_name,
    *
FROM events_tasks 
WHERE status = 'running'
ORDER BY display_order ASC;

-- 6. Check if there are any hidden characters in status
SELECT 
    'Status Character Analysis' as check_name,
    id,
    name,
    status,
    encode(status::bytea, 'hex') as status_hex,
    LENGTH(status) as status_length
FROM events_tasks;

-- 7. Try updating one event to 'running' status to test
-- UPDATE events_tasks SET status = 'running' WHERE id = (SELECT id FROM events_tasks LIMIT 1);

-- 8. Check table permissions
SELECT 
    'Table Permissions' as check_name,
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'events_tasks';
