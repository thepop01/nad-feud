-- Fix voting and user profile issues
-- This will fix RLS policies and ensure proper data access

-- 1. Check current RLS policies for event_submission_votes
SELECT 
    'Event Submission Votes RLS Policies' as check_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'event_submission_votes'
ORDER BY policyname;

-- 2. Drop and recreate RLS policies for event_submission_votes
DROP POLICY IF EXISTS "Allow public read access to votes" ON event_submission_votes;
DROP POLICY IF EXISTS "Allow authenticated users to vote" ON event_submission_votes;
DROP POLICY IF EXISTS "Allow users to delete own votes" ON event_submission_votes;

-- Create new policies that work properly
-- Allow everyone to read votes (for vote counts)
CREATE POLICY "Allow public read access to votes" ON event_submission_votes
  FOR SELECT USING (true);

-- Allow authenticated users to insert votes
CREATE POLICY "Allow authenticated users to vote" ON event_submission_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own votes (unvote)
CREATE POLICY "Allow users to delete own votes" ON event_submission_votes
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Check current RLS policies for event_submissions
SELECT 
    'Event Submissions RLS Policies' as check_name,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'event_submissions'
ORDER BY policyname;

-- 4. Fix RLS policies for event_submissions to allow public read
DROP POLICY IF EXISTS "Allow public read access to submissions" ON event_submissions;
DROP POLICY IF EXISTS "Allow authenticated users to submit" ON event_submissions;
DROP POLICY IF EXISTS "Allow users to update own submissions" ON event_submissions;

-- Create new policies
-- Allow everyone to read submissions (for leaderboard display)
CREATE POLICY "Allow public read access to submissions" ON event_submissions
  FOR SELECT USING (true);

-- Allow authenticated users to insert submissions
CREATE POLICY "Allow authenticated users to submit" ON event_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own submissions
CREATE POLICY "Allow users to update own submissions" ON event_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. Grant necessary permissions
GRANT SELECT ON event_submissions TO anon, authenticated;
GRANT INSERT ON event_submissions TO authenticated;
GRANT UPDATE ON event_submissions TO authenticated;
GRANT ALL ON event_submissions TO service_role;

GRANT SELECT ON event_submission_votes TO anon, authenticated;
GRANT INSERT ON event_submission_votes TO authenticated;
GRANT DELETE ON event_submission_votes TO authenticated;
GRANT ALL ON event_submission_votes TO service_role;

-- 6. Test voting functionality
SELECT 
    'Test Voting Query' as check_name,
    COUNT(*) as total_votes
FROM event_submission_votes;

-- 7. Test submissions query
SELECT 
    'Test Submissions Query' as check_name,
    COUNT(*) as total_submissions,
    COUNT(DISTINCT discord_user_id) as unique_discord_users
FROM event_submissions;
