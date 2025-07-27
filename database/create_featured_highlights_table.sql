-- Create featured_highlights table (separate from community_highlights)
CREATE TABLE IF NOT EXISTS featured_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'gif')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  embedded_link TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_size BIGINT,
  view_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_featured_highlights_active ON featured_highlights(is_active);
CREATE INDEX IF NOT EXISTS idx_featured_highlights_display_order ON featured_highlights(display_order);
CREATE INDEX IF NOT EXISTS idx_featured_highlights_created_at ON featured_highlights(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE featured_highlights ENABLE ROW LEVEL SECURITY;

-- Create policies for featured_highlights
CREATE POLICY "Featured highlights are viewable by everyone" ON featured_highlights
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert featured highlights" ON featured_highlights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update featured highlights" ON featured_highlights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete featured highlights" ON featured_highlights
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_featured_highlights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_featured_highlights_updated_at
  BEFORE UPDATE ON featured_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_featured_highlights_updated_at();

-- Insert some sample data (optional)
INSERT INTO featured_highlights (title, description, media_type, media_url, is_active, display_order, uploaded_by, created_by)
SELECT 
  'Sample Featured Highlight',
  'This is a sample featured highlight for the homepage',
  'image',
  'https://via.placeholder.com/800x400/6366f1/ffffff?text=Featured+Highlight',
  true,
  1,
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1)
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1);
