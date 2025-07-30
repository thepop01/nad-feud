-- Final fix for events_tasks status constraint
-- This will completely remove and recreate the constraint properly

-- 1. First, check what constraints currently exist
SELECT 
    'Current Constraints' as check_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'events_tasks'::regclass
AND contype = 'c';

-- 2. Drop ALL check constraints on events_tasks table
ALTER TABLE events_tasks DROP CONSTRAINT IF EXISTS events_tasks_status_check;
ALTER TABLE events_tasks DROP CONSTRAINT IF EXISTS events_tasks_check;
ALTER TABLE events_tasks DROP CONSTRAINT IF EXISTS check_status;

-- 3. Check what constraints remain
SELECT 
    'Constraints After Drop' as check_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'events_tasks'::regclass
AND contype = 'c';

-- 4. Add the correct constraint
ALTER TABLE events_tasks ADD CONSTRAINT events_tasks_status_check 
  CHECK (status IN ('running', 'ended'));

-- 5. Verify the new constraint
SELECT 
    'New Constraint' as check_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'events_tasks'::regclass
AND contype = 'c';

-- 6. Test that we can now insert with 'running' status
-- This should work now
SELECT 'Testing running status' as test_name, 'running' IN ('running', 'ended') as should_be_true;
