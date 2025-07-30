-- Check ALL constraints on events_tasks table to see what's blocking the insert

-- 1. Check ALL constraints (not just check constraints)
SELECT 
    'All Constraints on events_tasks' as check_name,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'events_tasks'::regclass
ORDER BY contype, conname;

-- 2. Check the table definition
SELECT 
    'Table Definition' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'events_tasks'
ORDER BY ordinal_position;

-- 3. Check if there are any triggers that might be causing issues
SELECT 
    'Triggers on events_tasks' as check_name,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'events_tasks';

-- 4. Try a simple test insert to see the exact error
-- This will help us identify which constraint is failing
-- (Comment out the INSERT if you don't want to actually insert)
/*
INSERT INTO events_tasks (
    name, 
    description, 
    media_type, 
    media_url, 
    status,
    display_order
) VALUES (
    'Test Event',
    'Test Description',
    'image',
    'https://example.com/test.jpg',
    'running',
    1
);
*/
