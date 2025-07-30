-- STEP 1: Check current status values in events_tasks table
SELECT 
    'Current Status Values' as check_name,
    status,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as event_names
FROM events_tasks 
GROUP BY status
ORDER BY count DESC;
