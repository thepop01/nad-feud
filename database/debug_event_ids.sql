-- Debug script to check event IDs and submissions

-- Show all events with their IDs
SELECT
    id,
    name,
    description,
    status,
    submission_type,
    created_at
FROM events_tasks
ORDER BY created_at DESC;

-- Show all submissions with their event IDs
SELECT 
    es.id as submission_id,
    es.event_id,
    es.username,
    es.discord_user_id,
    es.submission_link,
    es.votes,
    es.created_at,
    et.name as event_name,
    et.status as event_status
FROM event_submissions es
LEFT JOIN events_tasks et ON es.event_id = et.id
ORDER BY es.created_at DESC;

-- Check for any mismatched event IDs
SELECT 
    es.event_id,
    COUNT(*) as submission_count,
    et.name as event_name,
    et.status
FROM event_submissions es
LEFT JOIN events_tasks et ON es.event_id = et.id
GROUP BY es.event_id, et.name, et.status
ORDER BY submission_count DESC;

-- Show running events specifically
SELECT
    id,
    name,
    status,
    submission_type,
    created_at
FROM events_tasks
WHERE status = 'running'
ORDER BY created_at DESC;
