-- Fixed debug script to check event submissions issue

-- 1. Check events_tasks table structure
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'events_tasks'
ORDER BY ordinal_position;

-- 2. Show all events with their actual columns
SELECT 
    id,
    name,
    description,
    status,
    submission_type,
    created_at
FROM events_tasks
ORDER BY created_at DESC;

-- 3. Show all submissions with their event IDs
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

-- 4. Check for running events specifically
SELECT 
    id,
    name,
    status,
    submission_type,
    created_at
FROM events_tasks
WHERE status = 'running'
ORDER BY created_at DESC;

-- 5. Count submissions per event
SELECT 
    es.event_id,
    COUNT(*) as submission_count,
    et.name as event_name,
    et.status
FROM event_submissions es
LEFT JOIN events_tasks et ON es.event_id = et.id
GROUP BY es.event_id, et.name, et.status
ORDER BY submission_count DESC;
