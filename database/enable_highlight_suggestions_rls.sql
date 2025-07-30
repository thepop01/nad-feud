-- Enable Row Level Security (RLS) for highlight_suggestions table
-- This will fix the "RLS disabled" warning in the Supabase table editor

-- Step 1: Enable RLS on the highlight_suggestions table
ALTER TABLE highlight_suggestions ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policies for highlight_suggestions table

-- Policy 1: Everyone can view highlight suggestions (for admin panel)
DROP POLICY IF EXISTS "Highlight suggestions are viewable by everyone" ON highlight_suggestions;
CREATE POLICY "Highlight suggestions are viewable by everyone" ON highlight_suggestions
  FOR SELECT USING (true);

-- Policy 2: Authenticated users can insert their own suggestions
DROP POLICY IF EXISTS "Users can insert their own highlight suggestions" ON highlight_suggestions;
CREATE POLICY "Users can insert their own highlight suggestions" ON highlight_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own suggestions (optional - if you want to allow editing)
DROP POLICY IF EXISTS "Users can update their own highlight suggestions" ON highlight_suggestions;
CREATE POLICY "Users can update their own highlight suggestions" ON highlight_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy 4: Only admins can delete highlight suggestions
DROP POLICY IF EXISTS "Only admins can delete highlight suggestions" ON highlight_suggestions;
CREATE POLICY "Only admins can delete highlight suggestions" ON highlight_suggestions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Step 3: Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_highlight_suggestions_user_id ON highlight_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_highlight_suggestions_created_at ON highlight_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_highlight_suggestions_twitter_url ON highlight_suggestions(twitter_url);

-- Step 4: Verify RLS is enabled and policies are created
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'highlight_suggestions';

-- Step 5: Show all policies for highlight_suggestions table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'highlight_suggestions'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS enabled for highlight_suggestions table';
    RAISE NOTICE '🔒 Security policies created:';
    RAISE NOTICE '   - Everyone can view suggestions (for admin panel)';
    RAISE NOTICE '   - Users can insert their own suggestions';
    RAISE NOTICE '   - Users can update their own suggestions';
    RAISE NOTICE '   - Only admins can delete suggestions';
    RAISE NOTICE '📊 Performance indexes created for user_id, created_at, and twitter_url';
END $$;
