-- =====================================================
-- RESET AND FIX HIGHLIGHTS SYSTEM
-- This script will clean up any mismatches and properly
-- set up the featured highlights system
-- =====================================================

-- Step 1: Add is_featured column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_highlights' 
        AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE community_highlights 
        ADD COLUMN is_featured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_featured column to community_highlights table';
    ELSE
        RAISE NOTICE 'is_featured column already exists';
    END IF;
END $$;

-- Step 2: Ensure all existing records have is_featured = false by default
UPDATE community_highlights 
SET is_featured = false 
WHERE is_featured IS NULL;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_highlights_is_featured 
ON community_highlights(is_featured);

CREATE INDEX IF NOT EXISTS idx_community_highlights_active_featured 
ON community_highlights(is_active, is_featured);

-- Step 4: Verify the table structure
DO $$
DECLARE
    col_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_highlights' 
        AND column_name = 'is_featured'
    ) INTO col_exists;
    
    IF col_exists THEN
        RAISE NOTICE 'SUCCESS: is_featured column exists and is ready to use';
    ELSE
        RAISE NOTICE 'ERROR: is_featured column was not created properly';
    END IF;
END $$;

-- Step 5: Show current table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'community_highlights'
ORDER BY ordinal_position;

-- Step 6: Show current data summary
SELECT 
    'Total Records' as category,
    COUNT(*) as count
FROM community_highlights
UNION ALL
SELECT 
    'Featured Highlights' as category,
    COUNT(*) as count
FROM community_highlights 
WHERE is_featured = true
UNION ALL
SELECT 
    'Community Highlights' as category,
    COUNT(*) as count
FROM community_highlights 
WHERE is_featured = false OR is_featured IS NULL
UNION ALL
SELECT 
    'Active Featured' as category,
    COUNT(*) as count
FROM community_highlights 
WHERE is_featured = true AND is_active = true
UNION ALL
SELECT 
    'Active Community' as category,
    COUNT(*) as count
FROM community_highlights 
WHERE (is_featured = false OR is_featured IS NULL) AND is_active = true;

-- Step 7: Clean up any potential duplicates or issues
-- Remove any records that might have been created incorrectly
-- (This is optional - only run if you suspect there are issues)

-- Uncomment the following lines if you want to reset all highlights:
-- UPDATE community_highlights SET is_featured = false;
-- RAISE NOTICE 'Reset all highlights to community highlights (not featured)';

-- Step 8: Verify RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'community_highlights';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Database setup complete! You can now use the featured highlights system.';
    RAISE NOTICE 'Featured highlights will have is_featured = true';
    RAISE NOTICE 'Community highlights will have is_featured = false';
END $$;
