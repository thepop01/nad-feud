-- Simple voting table creation script
-- Run this in Supabase SQL Editor

-- 1. Create the voting table
CREATE TABLE IF NOT EXISTS event_submission_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES event_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, user_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_submission_votes_submission_id ON event_submission_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_event_submission_votes_user_id ON event_submission_votes(user_id);

-- 3. Enable RLS
ALTER TABLE event_submission_votes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Allow public read access to votes" ON event_submission_votes;
DROP POLICY IF EXISTS "Allow authenticated users to vote" ON event_submission_votes;
DROP POLICY IF EXISTS "Allow users to delete own votes" ON event_submission_votes;

CREATE POLICY "Allow public read access to votes" ON event_submission_votes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to vote" ON event_submission_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete own votes" ON event_submission_votes FOR DELETE USING (auth.uid() = user_id);

-- 5. Grant permissions
GRANT SELECT ON event_submission_votes TO anon, authenticated;
GRANT INSERT ON event_submission_votes TO authenticated;
GRANT DELETE ON event_submission_votes TO authenticated;
GRANT ALL ON event_submission_votes TO service_role;

-- 6. Test the table
SELECT 'Voting table created successfully!' as status;
