-- OPTIONAL: These are performance optimizations, not required for basic functionality

-- 1. Index on created_at for faster time-based queries (if not already exists)
CREATE INDEX IF NOT EXISTS idx_community_highlights_created_at 
ON community_highlights(created_at DESC);

-- 2. Optional: Database view for daily highlights
CREATE OR REPLACE VIEW daily_highlights AS
SELECT * FROM community_highlights 
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- 3. Optional: Database view for weekly highlights  
CREATE OR REPLACE VIEW weekly_highlights AS
SELECT * FROM community_highlights 
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 4. Optional: Database function to get highlights by time period
CREATE OR REPLACE FUNCTION get_highlights_by_period(period_days INTEGER)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  media_url TEXT,
  media_type TEXT,
  category TEXT,
  is_featured BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.title,
    h.description,
    h.media_url,
    h.media_type,
    h.category,
    h.is_featured,
    h.created_at
  FROM community_highlights h
  WHERE h.created_at >= NOW() - (period_days || ' days')::INTERVAL
  ORDER BY h.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Usage examples:
-- SELECT * FROM get_highlights_by_period(1);  -- Daily
-- SELECT * FROM get_highlights_by_period(7);  -- Weekly
