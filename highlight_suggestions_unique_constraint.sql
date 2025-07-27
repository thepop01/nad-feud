-- OPTIONAL: Add unique constraint to prevent duplicate Twitter URLs in highlight_suggestions table
-- This ensures database-level uniqueness for Twitter URLs

-- Add unique constraint on twitter_url column
ALTER TABLE highlight_suggestions 
ADD CONSTRAINT unique_twitter_url UNIQUE (twitter_url);

-- Optional: Create index for better performance on twitter_url lookups
CREATE INDEX IF NOT EXISTS idx_highlight_suggestions_twitter_url 
ON highlight_suggestions(twitter_url);

-- Optional: Create index on created_at for better performance on time-based queries
CREATE INDEX IF NOT EXISTS idx_highlight_suggestions_created_at 
ON highlight_suggestions(created_at DESC);

-- Note: If you already have duplicate URLs in your database, you'll need to clean them up first:
-- 
-- 1. Find duplicates:
-- SELECT twitter_url, COUNT(*) 
-- FROM highlight_suggestions 
-- GROUP BY twitter_url 
-- HAVING COUNT(*) > 1;
--
-- 2. Remove duplicates (keeping the oldest one):
-- DELETE FROM highlight_suggestions 
-- WHERE id NOT IN (
--   SELECT MIN(id) 
--   FROM highlight_suggestions 
--   GROUP BY twitter_url
-- );
--
-- 3. Then run the ALTER TABLE command above
