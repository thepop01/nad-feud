-- Test the complete voting system functionality
-- Run this to verify everything is working

-- 1. Check if event submissions exist and have proper Discord IDs
SELECT 
    'Event Submissions Check' as test_name,
    es.id,
    es.username,
    es.discord_user_id,
    es.submission_link,
    es.votes,
    et.name as event_name
FROM event_submissions es
JOIN events_tasks et ON es.event_id = et.id
WHERE et.status = 'running'
ORDER BY es.votes DESC;

-- 2. Check if users table has proper Discord IDs
SELECT 
    'Users Table Check' as test_name,
    id,
    username,
    discord_user_id,
    avatar_url,
    total_score
FROM users
WHERE discord_user_id IS NOT NULL
ORDER BY username;

-- 3. Check voting permissions (RLS policies)
SELECT 
    'Voting RLS Policies' as test_name,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'event_submission_votes'
ORDER BY policyname;

-- 4. Check submission permissions (RLS policies)
SELECT 
    'Submission RLS Policies' as test_name,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'event_submissions'
ORDER BY policyname;

-- 5. Test vote count trigger functionality
SELECT 
    'Vote Count Trigger Check' as test_name,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'event_submission_votes';

-- 6. Check if there are any existing votes
SELECT 
    'Existing Votes Check' as test_name,
    COUNT(*) as total_votes,
    COUNT(DISTINCT user_id) as unique_voters,
    COUNT(DISTINCT submission_id) as submissions_with_votes
FROM event_submission_votes;

-- 7. Test a sample vote query (this simulates what the frontend does)
-- Replace with actual IDs from your database
/*
-- Example test vote (uncomment and replace IDs to test)
INSERT INTO event_submission_votes (submission_id, user_id) 
VALUES (
    (SELECT id FROM event_submissions LIMIT 1),
    (SELECT id FROM users LIMIT 1)
) ON CONFLICT (submission_id, user_id) DO NOTHING;
*/
