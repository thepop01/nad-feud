-- Comprehensive RLS (Row Level Security) Check for All Tables
-- This script checks which tables have RLS enabled and shows their policies

-- Step 1: Check RLS status for all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'questions',
    'answers', 
    'suggestions',
    'users',
    'user_roles',
    'community_highlights',
    'all_time_community_highlights',
    'featured_highlights',
    'highlight_suggestions',
    'wallets'
)
ORDER BY tablename;

-- Step 2: Show all RLS policies for our main tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ Read'
        WHEN 'INSERT' THEN '➕ Create'
        WHEN 'UPDATE' THEN '✏️ Update'
        WHEN 'DELETE' THEN '🗑️ Delete'
        WHEN 'ALL' THEN '🔓 All Operations'
        ELSE cmd
    END as operation_icon
FROM pg_policies 
WHERE tablename IN (
    'questions',
    'answers', 
    'suggestions',
    'users',
    'user_roles',
    'community_highlights',
    'all_time_community_highlights',
    'featured_highlights',
    'highlight_suggestions',
    'wallets'
)
ORDER BY tablename, cmd, policyname;

-- Step 3: Identify tables without RLS policies
WITH tables_with_rls AS (
    SELECT DISTINCT tablename
    FROM pg_policies 
    WHERE tablename IN (
        'questions',
        'answers', 
        'suggestions',
        'users',
        'user_roles',
        'community_highlights',
        'all_time_community_highlights',
        'featured_highlights',
        'highlight_suggestions',
        'wallets'
    )
),
all_tables AS (
    SELECT tablename
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename IN (
        'questions',
        'answers', 
        'suggestions',
        'users',
        'user_roles',
        'community_highlights',
        'all_time_community_highlights',
        'featured_highlights',
        'highlight_suggestions',
        'wallets'
    )
)
SELECT 
    'Tables without RLS policies:' as info,
    string_agg(at.tablename, ', ') as tables_needing_policies
FROM all_tables at
LEFT JOIN tables_with_rls tr ON at.tablename = tr.tablename
WHERE tr.tablename IS NULL;

-- Step 4: Security recommendations
DO $$
BEGIN
    RAISE NOTICE '🔒 SECURITY RECOMMENDATIONS:';
    RAISE NOTICE '';
    RAISE NOTICE '1. All tables should have RLS enabled';
    RAISE NOTICE '2. Each table should have appropriate policies for:';
    RAISE NOTICE '   - SELECT (who can read data)';
    RAISE NOTICE '   - INSERT (who can create records)';
    RAISE NOTICE '   - UPDATE (who can modify records)';
    RAISE NOTICE '   - DELETE (who can remove records)';
    RAISE NOTICE '';
    RAISE NOTICE '3. Common policy patterns:';
    RAISE NOTICE '   - Public read: FOR SELECT USING (true)';
    RAISE NOTICE '   - Own records only: USING (auth.uid() = user_id)';
    RAISE NOTICE '   - Admin only: USING (EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ''admin''))';
    RAISE NOTICE '';
    RAISE NOTICE '4. To fix "RLS disabled" warnings:';
    RAISE NOTICE '   - Run: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;';
    RAISE NOTICE '   - Create appropriate policies for each operation';
END $$;
