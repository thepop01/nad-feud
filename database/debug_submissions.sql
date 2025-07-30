-- Debug script to check event submissions

-- Check if event_submissions table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'event_submissions'
ORDER BY ordinal_position;

-- Check if there are any submissions
SELECT COUNT(*) as total_submissions FROM event_submissions;

-- Show all submissions with user and event details
SELECT 
    es.id,
    es.username,
    es.discord_user_id,
    es.avatar_url,
    es.submission_link,
    es.votes,
    es.created_at,
    et.name as event_name,
    et.id as event_id
FROM event_submissions es
LEFT JOIN events_tasks et ON es.event_id = et.id
ORDER BY es.created_at DESC
LIMIT 10;

-- Check if events_tasks table has data
SELECT COUNT(*) as total_events FROM events_tasks;

-- Show recent events
SELECT 
    id,
    name,
    description,
    submission_type,
    is_active,
    created_at
FROM events_tasks
ORDER BY created_at DESC
LIMIT 5;

-- Check users table for discord_user_id
SELECT 
    id,
    username,
    discord_user_id,
    avatar_url
FROM users
WHERE discord_user_id IS NOT NULL
LIMIT 5;
