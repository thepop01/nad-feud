-- Check the actual structure of the users table
-- This will show us what columns exist

-- 1. Check all columns in users table
SELECT 
    'Users Table Structure' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check all columns in event_submissions table
SELECT 
    'Event Submissions Table Structure' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'event_submissions'
ORDER BY ordinal_position;

-- 3. Check sample data from users table
SELECT 
    'Sample Users Data' as check_name,
    *
FROM users
LIMIT 3;

-- 4. Check sample data from event_submissions table
SELECT 
    'Sample Event Submissions Data' as check_name,
    *
FROM event_submissions
LIMIT 3;
