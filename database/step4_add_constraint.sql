-- STEP 4: Add the new status constraint
ALTER TABLE events_tasks ADD CONSTRAINT events_tasks_status_check 
  CHECK (status IN ('running', 'ended'));
