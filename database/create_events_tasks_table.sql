-- Create events_tasks table for managing ongoing events, tasks, and missions
CREATE TABLE IF NOT EXISTS events_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'gif')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  display_order INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_size BIGINT,
  view_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_tasks_status ON events_tasks(status);
CREATE INDEX IF NOT EXISTS idx_events_tasks_display_order ON events_tasks(display_order);
CREATE INDEX IF NOT EXISTS idx_events_tasks_created_at ON events_tasks(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE events_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow everyone to read live events/tasks
CREATE POLICY "Allow public read access to live events_tasks" ON events_tasks
  FOR SELECT USING (status = 'live');

-- Allow admins to do everything
CREATE POLICY "Allow admin full access to events_tasks" ON events_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.discord_role = 'Admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER events_tasks_updated_at_trigger
  BEFORE UPDATE ON events_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_events_tasks_updated_at();

-- Grant necessary permissions
GRANT SELECT ON events_tasks TO anon, authenticated;
GRANT ALL ON events_tasks TO service_role;

-- Insert sample data (optional)
INSERT INTO events_tasks (name, description, media_type, media_url, link_url, status, display_order, uploaded_by, created_by)
SELECT 
  'Sample Event',
  'This is a sample ongoing event for testing purposes',
  'image',
  'https://via.placeholder.com/800x400/6366f1/ffffff?text=Sample+Event',
  'https://example.com',
  'live',
  1,
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);
