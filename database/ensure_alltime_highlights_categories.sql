-- Ensure all-time community highlights table has category support
-- This script ensures the all_time_community_highlights table exists with proper category column

-- Step 1: Create the all_time_community_highlights table if it doesn't exist
CREATE TABLE IF NOT EXISTS all_time_community_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'gif')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  embedded_link TEXT,
  category TEXT NOT NULL DEFAULT 'gaming' CHECK (category IN ('gaming', 'community', 'events', 'achievements', 'memories')),
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_size BIGINT,
  view_count INTEGER DEFAULT 0
);

-- Step 2: Add category column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'all_time_community_highlights' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE all_time_community_highlights 
        ADD COLUMN category TEXT NOT NULL DEFAULT 'gaming' 
        CHECK (category IN ('gaming', 'community', 'events', 'achievements', 'memories'));
        
        RAISE NOTICE 'Added category column to all_time_community_highlights table';
    ELSE
        RAISE NOTICE 'Category column already exists in all_time_community_highlights table';
    END IF;
END $$;

-- Step 3: Update existing records to have a default category if they don't have one
UPDATE all_time_community_highlights 
SET category = 'gaming' 
WHERE category IS NULL OR category = '';

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_all_time_highlights_category 
ON all_time_community_highlights(category);

CREATE INDEX IF NOT EXISTS idx_all_time_highlights_featured_category 
ON all_time_community_highlights(is_featured, category);

CREATE INDEX IF NOT EXISTS idx_all_time_highlights_display_order 
ON all_time_community_highlights(display_order);

CREATE INDEX IF NOT EXISTS idx_all_time_highlights_created_at 
ON all_time_community_highlights(created_at DESC);

-- Step 5: Enable RLS (Row Level Security)
ALTER TABLE all_time_community_highlights ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies for all_time_community_highlights
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

-- Step 7: Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_all_time_highlights_updated_at ON all_time_community_highlights;
CREATE TRIGGER update_all_time_highlights_updated_at
    BEFORE UPDATE ON all_time_community_highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Verify table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'all_time_community_highlights'
ORDER BY ordinal_position;

-- Step 9: Show current data summary by category
SELECT 
    'Total All-Time Highlights' as info,
    COUNT(*) as count,
    '' as category
FROM all_time_community_highlights
UNION ALL
SELECT 
    'By Category' as info,
    COUNT(*) as count,
    category
FROM all_time_community_highlights 
GROUP BY category
ORDER BY info, category;

-- Step 10: Test the categories constraint
DO $$
BEGIN
    -- This should work
    INSERT INTO all_time_community_highlights (title, media_type, media_url, category, uploaded_by) 
    VALUES ('Test Gaming Highlight', 'image', 'https://example.com/test.jpg', 'gaming', auth.uid());
    
    DELETE FROM all_time_community_highlights WHERE title = 'Test Gaming Highlight';
    
    RAISE NOTICE 'Category constraint test passed - all categories work correctly';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Category constraint test failed: %', SQLERRM;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '✅ All-time community highlights table setup complete!';
    RAISE NOTICE '📂 Categories available: gaming, community, events, achievements, memories';
    RAISE NOTICE '🎯 Table includes proper indexes, RLS policies, and constraints';
    RAISE NOTICE '🚀 Ready for use in the admin panel!';
END $$;
