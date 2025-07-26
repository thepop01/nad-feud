-- OPTIONAL: Database-level automation for weekly highlights
-- This would run automatically in the database

-- 1. Create a materialized view that refreshes automatically
CREATE MATERIALIZED VIEW weekly_highlights_cache AS
SELECT * FROM community_highlights 
WHERE is_active = true 
AND created_at >= (NOW() - INTERVAL '7 days')
ORDER BY created_at DESC;

-- 2. Refresh the view automatically when data changes
CREATE OR REPLACE FUNCTION refresh_weekly_highlights()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW weekly_highlights_cache;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to refresh when community_highlights changes
CREATE TRIGGER trigger_refresh_weekly_highlights
  AFTER INSERT OR UPDATE OR DELETE ON community_highlights
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_weekly_highlights();

-- 4. Schedule daily cleanup (requires pg_cron extension)
-- SELECT cron.schedule('daily-highlights-cleanup', '0 0 * * *', 
--   'REFRESH MATERIALIZED VIEW weekly_highlights_cache;');

-- Usage in your app:
-- SELECT * FROM weekly_highlights_cache; -- Super fast, pre-computed
