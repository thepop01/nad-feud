-- Migrate existing community highlights to all-time highlights
-- This will ensure the admin panel shows all the highlights that appear on the highlights page

-- Step 1: Check current state
SELECT 'Current community_highlights count:' as info, COUNT(*) as count FROM community_highlights;
SELECT 'Current all_time_community_highlights count:' as info, COUNT(*) as count FROM all_time_community_highlights;

-- Step 2: Show what will be migrated
SELECT 
    'Highlights to migrate:' as info,
    ch.id,
    ch.title,
    COALESCE(ch.category, 'community') as category,
    ch.media_type,
    ch.created_at
FROM community_highlights ch
LEFT JOIN all_time_community_highlights ath ON ch.id = ath.id
WHERE ath.id IS NULL
ORDER BY ch.created_at DESC;

-- Step 3: Create all_time_community_highlights table if it doesn't exist
CREATE TABLE IF NOT EXISTS all_time_community_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'gif')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  embedded_link TEXT,
  category TEXT NOT NULL DEFAULT 'community' CHECK (category IN ('gaming', 'community', 'events', 'achievements', 'memories')),
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_size BIGINT,
  view_count INTEGER DEFAULT 0
);

-- Step 4: Enable RLS
ALTER TABLE all_time_community_highlights ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies
DROP POLICY IF EXISTS "All-time highlights are viewable by everyone" ON all_time_community_highlights;
CREATE POLICY "All-time highlights are viewable by everyone" ON all_time_community_highlights
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only authenticated users can insert all-time highlights" ON all_time_community_highlights;
CREATE POLICY "Only authenticated users can insert all-time highlights" ON all_time_community_highlights
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own all-time highlights" ON all_time_community_highlights;
CREATE POLICY "Users can update their own all-time highlights" ON all_time_community_highlights
  FOR UPDATE USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Users can delete their own all-time highlights" ON all_time_community_highlights;
CREATE POLICY "Users can delete their own all-time highlights" ON all_time_community_highlights
  FOR DELETE USING (auth.uid() = uploaded_by);

-- Step 6: Migrate data from community_highlights to all_time_community_highlights
INSERT INTO all_time_community_highlights (
    id,
    title,
    description,
    media_type,
    media_url,
    thumbnail_url,
    embedded_link,
    category,
    is_featured,
    display_order,
    uploaded_by,
    created_by,
    created_at,
    updated_at,
    file_size,
    view_count
)
SELECT 
    ch.id,
    ch.title,
    ch.description,
    ch.media_type,
    ch.media_url,
    ch.thumbnail_url,
    ch.embedded_link,
    CASE 
        WHEN ch.category IS NULL OR ch.category = '' THEN 'community'
        WHEN ch.category NOT IN ('gaming', 'community', 'events', 'achievements', 'memories') THEN 'community'
        ELSE ch.category
    END as category,
    COALESCE(ch.is_featured, false) as is_featured,
    COALESCE(ch.display_order, 1) as display_order,
    ch.uploaded_by,
    ch.created_by,
    ch.created_at,
    ch.updated_at,
    ch.file_size,
    ch.view_count
FROM community_highlights ch
LEFT JOIN all_time_community_highlights ath ON ch.id = ath.id
WHERE ath.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    media_type = EXCLUDED.media_type,
    media_url = EXCLUDED.media_url,
    thumbnail_url = EXCLUDED.thumbnail_url,
    embedded_link = EXCLUDED.embedded_link,
    category = EXCLUDED.category,
    is_featured = EXCLUDED.is_featured,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Step 7: Fix any existing records without proper categories
UPDATE all_time_community_highlights 
SET category = 'community' 
WHERE category IS NULL 
   OR category = '' 
   OR category NOT IN ('gaming', 'community', 'events', 'achievements', 'memories');

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_all_time_highlights_category ON all_time_community_highlights(category);
CREATE INDEX IF NOT EXISTS idx_all_time_highlights_featured ON all_time_community_highlights(is_featured);
CREATE INDEX IF NOT EXISTS idx_all_time_highlights_display_order ON all_time_community_highlights(display_order);
CREATE INDEX IF NOT EXISTS idx_all_time_highlights_created_at ON all_time_community_highlights(created_at DESC);

-- Step 9: Final verification
SELECT 'Final all_time_community_highlights count:' as info, COUNT(*) as count FROM all_time_community_highlights;

SELECT 
    'Final data by category:' as info,
    category,
    COUNT(*) as count
FROM all_time_community_highlights
GROUP BY category
ORDER BY category;

SELECT 
    'All migrated highlights:' as info,
    id,
    title,
    category,
    media_type,
    is_featured,
    created_at
FROM all_time_community_highlights
ORDER BY is_featured DESC, display_order ASC, created_at DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete!';
    RAISE NOTICE '📊 All community highlights have been migrated to all_time_community_highlights';
    RAISE NOTICE '🏷️ Any highlights without categories have been marked as "community"';
    RAISE NOTICE '🎯 Admin panel should now show all highlights that appear on the highlights page';
END $$;
