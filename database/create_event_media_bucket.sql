-- Create storage bucket for event task media uploads
-- Run this in Supabase SQL Editor

-- Create the bucket (this needs to be done via Supabase Dashboard Storage section)
-- Go to Storage > Create Bucket > Name: "event-task-media" > Public: true

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Allow public read access to event media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload event media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own event media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own event media" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access to event media" ON storage.objects;

-- Create RLS policies for the bucket
-- Allow public read access to event media
CREATE POLICY "Allow public read access to event media" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-task-media');

-- Allow authenticated users to upload event media
CREATE POLICY "Allow authenticated users to upload event media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-task-media'
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own uploads
CREATE POLICY "Allow users to update their own event media" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'event-task-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own uploads
CREATE POLICY "Allow users to delete their own event media" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-task-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow admins full access to event media
CREATE POLICY "Allow admin full access to event media" ON storage.objects
  FOR ALL USING (
    bucket_id = 'event-task-media'
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.discord_role = 'Admin'
    )
  );
