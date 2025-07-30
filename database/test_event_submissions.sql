-- Test script to verify event submissions are working correctly
-- Run this after all fixes are applied

-- 1. Check if running events exist
SELECT 
    'Running Events Check' as test_name,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as event_names
FROM events_tasks 
WHERE status = 'running';

-- 2. Check if submissions exist for running events
SELECT 
    'Submissions for Running Events' as test_name,
    et.name as event_name,
    COUNT(es.id) as submission_count
FROM events_tasks et
LEFT JOIN event_submissions es ON et.id = es.event_id
WHERE et.status = 'running'
GROUP BY et.id, et.name
ORDER BY submission_count DESC;

-- 3. Check specific event submissions (replace with your event ID)
SELECT 
    'Detailed Submissions Check' as test_name,
    es.id,
    es.username,
    es.discord_user_id,
    es.submission_link,
    es.submission_media,
    es.votes,
    es.created_at,
    et.name as event_name
FROM event_submissions es
JOIN events_tasks et ON es.event_id = et.id
WHERE et.status = 'running'
ORDER BY es.votes DESC, es.created_at DESC;

-- 4. Check storage bucket policies
SELECT 
    'Storage Policies Check' as test_name,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND (policyname LIKE '%event%media%' OR policyname LIKE '%submission%media%')
ORDER BY policyname;

-- 5. Verify RLS policies for event_submissions table
SELECT 
    'Event Submissions RLS Check' as test_name,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'event_submissions'
ORDER BY policyname;
