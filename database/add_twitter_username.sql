-- Add twitter_username column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twitter_username TEXT;

-- Add avatar_url column to event_submissions table if not exists
ALTER TABLE event_submissions 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing submissions with avatar URLs from users table
UPDATE event_submissions 
SET avatar_url = users.avatar_url
FROM users 
WHERE event_submissions.user_id = users.id 
AND event_submissions.avatar_url IS NULL;

-- Verify the updates
SELECT 
  id,
  username,
  discord_user_id,
  twitter_username,
  avatar_url,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

SELECT 
  id,
  username,
  discord_user_id,
  avatar_url,
  created_at
FROM event_submissions
ORDER BY created_at DESC
LIMIT 5;
