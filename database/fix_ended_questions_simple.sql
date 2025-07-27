-- Simple fix for ended questions issue
-- This script will drop and recreate the get_ended_questions function properly

-- Step 1: Drop any existing function variations
DROP FUNCTION IF EXISTS get_ended_questions();
DROP FUNCTION IF EXISTS get_ended_questions() CASCADE;

-- Step 2: Create a simple version that returns JSON
CREATE OR REPLACE FUNCTION get_ended_questions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'question', to_jsonb(q.*),
            'groups', COALESCE(grouped_data.groups, '[]'::json)
        )
        ORDER BY q.created_at DESC
    ) INTO result
    FROM questions q
    LEFT JOIN (
        SELECT 
            ga.question_id,
            json_agg(
                to_jsonb(ga.*) 
                ORDER BY ga.percentage DESC
            ) as groups
        FROM grouped_answers ga
        GROUP BY ga.question_id
    ) grouped_data ON q.id = grouped_data.question_id
    WHERE q.status = 'ended';
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Step 3: Test the function
SELECT get_ended_questions();

-- Step 4: Check for ended questions directly
SELECT 
    'Direct Query Results:' as info,
    count(*) as ended_questions_count
FROM questions 
WHERE status = 'ended';

-- Step 5: Show ended questions if any exist
SELECT
    id,
    question_text,
    status,
    created_at
FROM questions
WHERE status = 'ended'
ORDER BY created_at DESC
LIMIT 10;

-- Step 6: Check grouped answers
SELECT 
    'Grouped Answers:' as info,
    count(*) as grouped_answers_count
FROM grouped_answers ga
JOIN questions q ON ga.question_id = q.id
WHERE q.status = 'ended';

-- Step 7: Show sample grouped answers
SELECT 
    ga.question_id,
    q.question_text,
    ga.group_text,
    ga.percentage,
    ga.count
FROM grouped_answers ga
JOIN questions q ON ga.question_id = q.id
WHERE q.status = 'ended'
ORDER BY ga.question_id, ga.percentage DESC
LIMIT 20;
