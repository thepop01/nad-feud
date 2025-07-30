-- Add avatar_url column to event_submissions table
ALTER TABLE event_submissions 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing submissions with avatar URLs from users table
UPDATE event_submissions 
SET avatar_url = users.avatar_url
FROM users 
WHERE event_submissions.user_id = users.id 
AND event_submissions.avatar_url IS NULL;

-- Verify the update
SELECT 
  id,
  username,
  discord_user_id,
  avatar_url,
  created_at
FROM event_submissions
ORDER BY created_at DESC
LIMIT 10;
