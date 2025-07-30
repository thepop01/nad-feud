-- Find your Discord ID (1172958200455245827) in the database
-- This will search all possible locations

-- 1. First, let's see the structure of the users table
SELECT 
    'Users Table Structure' as check_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Search for your username 'sikdar_11426' in users table
SELECT 
    'Search by Username' as check_name,
    *
FROM users
WHERE username = 'sikdar_11426'
LIMIT 1;

-- 3. Search for any record containing your Discord ID in users table
-- (trying all text columns that might contain it)
SELECT 
    'Search Users for Discord ID' as check_name,
    *
FROM users
WHERE 
    username LIKE '%1172958200455245827%' OR
    CAST(id AS TEXT) LIKE '%1172958200455245827%' OR
    (avatar_url IS NOT NULL AND avatar_url LIKE '%1172958200455245827%')
LIMIT 5;

-- 4. Check event_submissions table structure
SELECT 
    'Event Submissions Structure' as check_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'event_submissions'
ORDER BY ordinal_position;

-- 5. Search event_submissions for your data
SELECT 
    'Search Event Submissions' as check_name,
    *
FROM event_submissions
WHERE 
    username LIKE '%sikdar%' OR
    (discord_user_id IS NOT NULL AND discord_user_id LIKE '%1172958200455245827%')
LIMIT 5;

-- 6. Check if there are any other tables that might contain Discord IDs
SELECT 
    'Tables with Discord Columns' as check_name,
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name LIKE '%discord%'
ORDER BY table_name, column_name;

-- 7. Show all users to see the pattern
SELECT
    'All Users Sample' as check_name,
    *
FROM users
LIMIT 5;
