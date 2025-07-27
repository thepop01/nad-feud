-- Check if get_ended_questions RPC function exists and create it if needed

-- First, let's check if the function exists
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'get_ended_questions';

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_ended_questions();

-- Create the get_ended_questions RPC function with correct return type
CREATE OR REPLACE FUNCTION get_ended_questions()
RETURNS TABLE (
    question jsonb,
    groups jsonb[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(q.*) as question,
        COALESCE(
            array_agg(
                to_jsonb(ga.*)
                ORDER BY ga.percentage DESC
            ) FILTER (WHERE ga.id IS NOT NULL),
            ARRAY[]::jsonb[]
        ) as groups
    FROM questions q
    LEFT JOIN grouped_answers ga ON q.id = ga.question_id
    WHERE q.status = 'ended'
    GROUP BY q.id, q.question_text, q.image_url, q.status, q.created_at, q.updated_at
    ORDER BY q.created_at DESC;
END;
$$;

-- Test the function
SELECT * FROM get_ended_questions();

-- Also check if there are any ended questions directly
SELECT 
    id,
    question_text,
    status,
    created_at
FROM questions 
WHERE status = 'ended'
ORDER BY created_at DESC;

-- Check if there are any grouped answers
SELECT 
    ga.id,
    ga.question_id,
    ga.group_text,
    ga.percentage,
    q.question_text
FROM grouped_answers ga
JOIN questions q ON ga.question_id = q.id
WHERE q.status = 'ended'
ORDER BY ga.question_id, ga.percentage DESC;
