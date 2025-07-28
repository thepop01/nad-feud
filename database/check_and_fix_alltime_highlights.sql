-- Check and fix all-time highlights data
-- This script will identify missing highlights and fix category issues

-- Step 1: Check if all_time_community_highlights table exists
SELECT 
    'Table Existence Check' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'all_time_community_highlights') 
        THEN 'all_time_community_highlights table EXISTS' 
        ELSE 'all_time_community_highlights table MISSING' 
    END as status;

-- Step 2: Check table structure
SELECT 
    'Column Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'all_time_community_highlights'
ORDER BY ordinal_position;

-- Step 3: Count total records in all_time_community_highlights
SELECT 
    'Total Records in all_time_community_highlights' as info,
    COUNT(*) as count
FROM all_time_community_highlights;

-- Step 4: Show all records with their categories
SELECT 
    'Current All-Time Highlights Data' as info,
    id,
    title,
    category,
    media_type,
    is_featured,
    created_at
FROM all_time_community_highlights
ORDER BY created_at DESC;

-- Step 5: Check if there are highlights in the regular community_highlights table
SELECT 
    'Regular Community Highlights Count' as info,
    COUNT(*) as count
FROM community_highlights;

-- Step 6: Show regular community highlights that might need to be moved
SELECT 
    'Regular Community Highlights Data' as info,
    id,
    title,
    COALESCE(category, 'NO CATEGORY') as category,
    media_type,
    is_featured,
    created_at
FROM community_highlights
ORDER BY created_at DESC;

-- Step 7: Check for highlights without categories in all_time_community_highlights
SELECT 
    'Highlights Missing Categories' as info,
    COUNT(*) as count
FROM all_time_community_highlights
WHERE category IS NULL OR category = '';

-- Step 8: Fix highlights without categories - set them to 'community'
UPDATE all_time_community_highlights 
SET category = 'community' 
WHERE category IS NULL OR category = '';

-- Step 9: Check if we need to migrate data from community_highlights to all_time_community_highlights
-- This will show highlights that exist in community_highlights but not in all_time_community_highlights
SELECT 
    'Highlights that may need migration' as info,
    ch.id,
    ch.title,
    ch.media_type,
    ch.created_at
FROM community_highlights ch
LEFT JOIN all_time_community_highlights ath ON ch.id = ath.id
WHERE ath.id IS NULL
ORDER BY ch.created_at DESC;

-- Step 10: If there are highlights in community_highlights that should be in all_time_community_highlights,
-- let's migrate them (this assumes they should all be in all-time highlights)
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
    COALESCE(ch.category, 'community') as category, -- Default to 'community' if no category
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
ON CONFLICT (id) DO NOTHING; -- Avoid duplicates if they already exist

-- Step 11: Final count check
SELECT 
    'Final Count Check' as info,
    'all_time_community_highlights' as table_name,
    COUNT(*) as count
FROM all_time_community_highlights
UNION ALL
SELECT 
    'Final Count Check' as info,
    'community_highlights' as table_name,
    COUNT(*) as count
FROM community_highlights;

-- Step 12: Show final data by category
SELECT 
    'Final Data by Category' as info,
    category,
    COUNT(*) as count
FROM all_time_community_highlights
GROUP BY category
ORDER BY category;

-- Step 13: Show all final records
SELECT 
    'Final All-Time Highlights' as info,
    id,
    title,
    category,
    media_type,
    is_featured,
    display_order,
    created_at
FROM all_time_community_highlights
ORDER BY is_featured DESC, display_order ASC, created_at DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All-time highlights data check and fix complete!';
    RAISE NOTICE '📊 Check the results above to see the current state';
    RAISE NOTICE '🔧 Any highlights without categories have been set to "community"';
    RAISE NOTICE '📦 Any missing highlights have been migrated from community_highlights';
END $$;
