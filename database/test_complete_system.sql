-- Complete system test for voting limits and user profiles
-- Run this after creating the voting tables

-- 1. Check if voting tables exist
SELECT 
    'Table Existence Check' as test_name,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('event_submission_votes', 'event_submissions', 'events_tasks', 'users')
ORDER BY table_name;

-- 2. Check if new columns were added to events_tasks
SELECT 
    'Events Tasks Columns' as test_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'events_tasks' 
AND column_name IN ('max_votes_per_user', 'max_submissions_per_user')
ORDER BY column_name;

-- 3. Check current events with their limits
SELECT 
    'Current Events with Limits' as test_name,
    id,
    name,
    status,
    max_votes_per_user,
    max_submissions_per_user,
    submission_type
FROM events_tasks
ORDER BY display_order;

-- 4. Check voting triggers exist
SELECT 
    'Voting Triggers' as test_name,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_check_voting_limits', 'trigger_check_submission_limits', 'trigger_update_submission_vote_count')
ORDER BY trigger_name;

-- 5. Check RLS policies for voting
SELECT 
    'Voting RLS Policies' as test_name,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'event_submission_votes'
ORDER BY policyname;

-- 6. Check current submissions (without Discord ID for now)
SELECT
    'Current Submissions' as test_name,
    es.id,
    es.username,
    es.votes,
    et.name as event_name,
    et.max_votes_per_user,
    et.max_submissions_per_user
FROM event_submissions es
JOIN events_tasks et ON es.event_id = et.id
ORDER BY et.name, es.votes DESC;

-- 7. Check users table structure first
SELECT
    'Users Table Columns' as test_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 8. Test voting limit function (simulation)
-- This shows what would happen if we tried to vote
SELECT 
    'Voting Limit Test' as test_name,
    'If user votes more than limit, trigger will prevent it' as result;

-- 9. Check permissions on tables
SELECT
    'Table Permissions' as test_name,
    table_schema,
    table_name,
    grantor,
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('event_submission_votes', 'event_submissions')
AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- 10. Check for your specific Discord ID in the data
SELECT
    'Your Discord ID Check' as test_name,
    'Checking for Discord ID: 1172958200455245827' as info;

-- Check in users table (trying different possible column names)
SELECT
    'Users Table Search' as test_name,
    *
FROM users
WHERE username LIKE '%sikdar%' OR username LIKE '%1172958200455245827%'
LIMIT 5;

-- Check in event_submissions table
SELECT
    'Event Submissions Search' as test_name,
    *
FROM event_submissions
WHERE username LIKE '%sikdar%' OR discord_user_id LIKE '%1172958200455245827%'
LIMIT 5;
