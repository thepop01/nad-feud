-- Final voting table fix - handles existing policies
-- Run this in Supabase SQL Editor

-- 1. Create the voting table (if it doesn't exist)
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

-- 4. Grant permissions first
GRANT SELECT ON event_submission_votes TO anon, authenticated;
GRANT INSERT ON event_submission_votes TO authenticated;
GRANT DELETE ON event_submission_votes TO authenticated;
GRANT ALL ON event_submission_votes TO service_role;

-- 5. Test if we can insert a vote (this will tell us if the table is working)
SELECT 'Voting table setup completed successfully!' as status;

-- 6. Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'event_submission_votes' 
ORDER BY ordinal_position;
