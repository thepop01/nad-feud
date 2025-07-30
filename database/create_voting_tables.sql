-- Create voting tables and implement voting limits
-- This creates the missing tables and adds voting/submission limits

-- 1. Create event_submission_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_submission_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES event_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one vote per user per submission
  UNIQUE(submission_id, user_id)
);

-- 2. Add voting limits to events_tasks table
ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS max_votes_per_user INTEGER DEFAULT 2;
ALTER TABLE events_tasks ADD COLUMN IF NOT EXISTS max_submissions_per_user INTEGER DEFAULT 1;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_submission_votes_submission_id ON event_submission_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_event_submission_votes_user_id ON event_submission_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_event_submission_votes_created_at ON event_submission_votes(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE event_submission_votes ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for event_submission_votes
-- Allow everyone to read votes (for vote counts)
CREATE POLICY "Allow public read access to votes" ON event_submission_votes
  FOR SELECT USING (true);

-- Allow authenticated users to insert votes (with limits checked by function)
CREATE POLICY "Allow authenticated users to vote" ON event_submission_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own votes (unvote)
CREATE POLICY "Allow users to delete own votes" ON event_submission_votes
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create function to check voting limits
CREATE OR REPLACE FUNCTION check_voting_limits()
RETURNS TRIGGER AS $$
DECLARE
  event_id UUID;
  max_votes INTEGER;
  current_votes INTEGER;
BEGIN
  -- Get the event_id and max_votes_per_user from the submission
  SELECT es.event_id, et.max_votes_per_user
  INTO event_id, max_votes
  FROM event_submissions es
  JOIN events_tasks et ON es.event_id = et.id
  WHERE es.id = NEW.submission_id;
  
  -- Count current votes by this user for this event
  SELECT COUNT(*)
  INTO current_votes
  FROM event_submission_votes esv
  JOIN event_submissions es ON esv.submission_id = es.id
  WHERE es.event_id = event_id AND esv.user_id = NEW.user_id;
  
  -- Check if user has reached voting limit
  IF current_votes >= max_votes THEN
    RAISE EXCEPTION 'You have reached the maximum number of votes (%) for this event', max_votes;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to enforce voting limits
CREATE TRIGGER trigger_check_voting_limits
  BEFORE INSERT ON event_submission_votes
  FOR EACH ROW EXECUTE FUNCTION check_voting_limits();

-- 8. Create function to check submission limits
CREATE OR REPLACE FUNCTION check_submission_limits()
RETURNS TRIGGER AS $$
DECLARE
  max_submissions INTEGER;
  current_submissions INTEGER;
BEGIN
  -- Get max_submissions_per_user for this event
  SELECT max_submissions_per_user
  INTO max_submissions
  FROM events_tasks
  WHERE id = NEW.event_id;
  
  -- Count current submissions by this user for this event
  SELECT COUNT(*)
  INTO current_submissions
  FROM event_submissions
  WHERE event_id = NEW.event_id AND user_id = NEW.user_id;
  
  -- Check if user has reached submission limit
  IF current_submissions >= max_submissions THEN
    RAISE EXCEPTION 'You have reached the maximum number of submissions (%) for this event', max_submissions;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to enforce submission limits
CREATE TRIGGER trigger_check_submission_limits
  BEFORE INSERT ON event_submissions
  FOR EACH ROW EXECUTE FUNCTION check_submission_limits();

-- 10. Update vote count trigger function
CREATE OR REPLACE FUNCTION update_submission_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment vote count
    UPDATE event_submissions 
    SET votes = votes + 1 
    WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement vote count
    UPDATE event_submissions 
    SET votes = votes - 1 
    WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to automatically update vote counts
DROP TRIGGER IF EXISTS trigger_update_submission_vote_count ON event_submission_votes;
CREATE TRIGGER trigger_update_submission_vote_count
  AFTER INSERT OR DELETE ON event_submission_votes
  FOR EACH ROW EXECUTE FUNCTION update_submission_vote_count();

-- 12. Grant necessary permissions
GRANT SELECT ON event_submission_votes TO anon, authenticated;
GRANT INSERT ON event_submission_votes TO authenticated;
GRANT DELETE ON event_submission_votes TO authenticated;
GRANT ALL ON event_submission_votes TO service_role;

-- 13. Update existing events with default limits
UPDATE events_tasks 
SET max_votes_per_user = 2, max_submissions_per_user = 1 
WHERE max_votes_per_user IS NULL OR max_submissions_per_user IS NULL;
