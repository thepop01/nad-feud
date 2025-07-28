-- Debug query to check user data and Discord IDs
-- Run this to see what's actually stored in your users table

-- Check the users table structure and data
SELECT 
    id,
    username,
    discord_id,
    discord_role,
    total_score,
    created_at
FROM users 
ORDER BY created_at DESC
LIMIT 10;

-- Check if discord_id column exists and has data
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('discord_id', 'id', 'username');

-- Test the get_user_data function specifically
SELECT get_user_data();

-- Check a specific user (replace with your user ID if you know it)
-- SELECT * FROM users WHERE username = 'your_username_here';
