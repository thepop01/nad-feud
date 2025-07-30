-- Create event_submissions table for user submissions to events
CREATE TABLE IF NOT EXISTS event_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  discord_user_id TEXT,
  avatar_url TEXT, -- User's profile picture
  submission_link TEXT NOT NULL,
  submission_media TEXT, -- URL to uploaded media file
  description TEXT,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one submission per user per event
  UNIQUE(event_id, user_id)
);

-- Create event_submission_votes table for tracking votes
CREATE TABLE IF NOT EXISTS event_submission_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES event_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one vote per user per submission
  UNIQUE(submission_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_submissions_event_id ON event_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_submissions_user_id ON event_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_event_submissions_created_at ON event_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_submission_votes_submission_id ON event_submission_votes(submission_id);
CREATE INDEX IF NOT EXISTS idx_event_submission_votes_user_id ON event_submission_votes(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE event_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_submission_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_submissions
-- Allow everyone to read submissions
CREATE POLICY "Allow public read access to event_submissions" ON event_submissions
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own submissions
CREATE POLICY "Allow authenticated users to insert submissions" ON event_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own submissions
CREATE POLICY "Allow users to update own submissions" ON event_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own submissions
CREATE POLICY "Allow users to delete own submissions" ON event_submissions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for event_submission_votes
-- Allow everyone to read votes
CREATE POLICY "Allow public read access to votes" ON event_submission_votes
  FOR SELECT USING (true);

-- Allow authenticated users to vote
CREATE POLICY "Allow authenticated users to vote" ON event_submission_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own votes (unvote)
CREATE POLICY "Allow users to delete own votes" ON event_submission_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT ON event_submissions TO anon, authenticated;
GRANT ALL ON event_submissions TO service_role;
GRANT SELECT ON event_submission_votes TO anon, authenticated;
GRANT ALL ON event_submission_votes TO service_role;

-- Create storage bucket for submission media
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-submission-media', 'event-submission-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public read access
CREATE POLICY "Allow public read access to submission media" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-submission-media');

-- Create storage policy for authenticated users to upload
CREATE POLICY "Allow authenticated users to upload submission media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-submission-media'
    AND auth.role() = 'authenticated'
  );

-- Function to update vote counts when votes are added/removed
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

-- Create trigger to automatically update vote counts
CREATE TRIGGER trigger_update_submission_vote_count
  AFTER INSERT OR DELETE ON event_submission_votes
  FOR EACH ROW EXECUTE FUNCTION update_submission_vote_count();

-- Clean up any mock/test submissions that might exist
DELETE FROM event_submissions WHERE
  username ILIKE '%test%' OR
  username ILIKE '%mock%' OR
  username ILIKE '%sample%' OR
  submission_link ILIKE '%example.com%' OR
  submission_link ILIKE '%placeholder%';

-- Verify the setup
SELECT 
  'event_submissions' as table_name,
  COUNT(*) as row_count
FROM event_submissions
UNION ALL
SELECT 
  'event_submission_votes' as table_name,
  COUNT(*) as row_count
FROM event_submission_votes;
