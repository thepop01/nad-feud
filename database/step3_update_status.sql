-- STEP 3: Update any non-standard status values to 'running'
UPDATE events_tasks 
SET status = 'running' 
WHERE status NOT IN ('running', 'ended');

-- Check the results
SELECT 
    'Updated Status Values' as check_name,
    status,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as event_names
FROM events_tasks 
GROUP BY status
ORDER BY count DESC;
