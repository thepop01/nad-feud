-- Debug script for events_tasks table issues

-- 1. Check if table exists and view structure
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'events_tasks'
ORDER BY ordinal_position;

-- 2. Check current data in events_tasks table
SELECT * FROM events_tasks ORDER BY created_at DESC;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'events_tasks';

-- 4. Delete any existing mock/sample events (run this to clean up)
DELETE FROM events_tasks 
WHERE name = 'Sample Event' 
   OR description LIKE '%sample%' 
   OR description LIKE '%testing purposes%'
   OR media_url LIKE '%placeholder%';

-- 5. Check storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'event-task-media';

-- 6. Check storage policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%event%';

-- 7. Test insert (replace with your actual user ID)
-- First, get your user ID:
SELECT id, email FROM auth.users LIMIT 5;

-- Then test insert (replace 'YOUR_USER_ID_HERE' with actual ID from above):
/*
INSERT INTO events_tasks (
  name, 
  description, 
  media_type, 
  media_url, 
  link_url, 
  status, 
  display_order, 
  uploaded_by, 
  created_by
) VALUES (
  'Test Event',
  'This is a test event to verify creation works',
  'image',
  'https://via.placeholder.com/800x400/10b981/ffffff?text=Test+Event',
  'https://example.com',
  'live',
  1,
  'YOUR_USER_ID_HERE',
  'YOUR_USER_ID_HERE'
);
*/

-- 8. Check if the test event was created
SELECT * FROM events_tasks WHERE name = 'Test Event';
