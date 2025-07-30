-- Debug RLS policies for events_tasks table
-- This will help us see what policies are currently active

-- 1. Check all RLS policies for events_tasks table
SELECT 
    'Events Tasks RLS Policies' as check_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'events_tasks'
ORDER BY policyname;

-- 2. Check if RLS is enabled on events_tasks
SELECT 
    'RLS Status Check' as check_name,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'events_tasks';

-- 3. Test direct query as anonymous user (this simulates what the frontend sees)
-- This should return running events if RLS policies are correct
SELECT 
    'Direct Query Test' as check_name,
    id,
    name,
    status,
    submission_type,
    created_at
FROM events_tasks 
WHERE status = 'running'
ORDER BY display_order;

-- 4. Check current user context
SELECT 
    'Current User Context' as check_name,
    current_user as current_user,
    session_user as session_user,
    current_role as current_role;

-- 5. Test with explicit role context
SET ROLE anon;
SELECT 
    'Anonymous Role Test' as check_name,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as event_names
FROM events_tasks 
WHERE status = 'running';
RESET ROLE;
