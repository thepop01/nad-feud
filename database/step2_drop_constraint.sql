-- STEP 2: Drop the existing status constraint
ALTER TABLE events_tasks DROP CONSTRAINT IF EXISTS events_tasks_status_check;
