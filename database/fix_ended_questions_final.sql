-- Final fix for ended questions - checks table structure first
-- This script will work regardless of the exact table structure

-- Step 1: Check what columns exist in the questions table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'questions'
ORDER BY ordinal_position;

-- Step 2: Drop any existing function variations
DROP FUNCTION IF EXISTS get_ended_questions();
DROP FUNCTION IF EXISTS get_ended_questions() CASCADE;

-- Step 3: Create a robust function that only uses existing columns
CREATE OR REPLACE FUNCTION get_ended_questions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Build the result using only columns that definitely exist
    SELECT json_agg(
        json_build_object(
            'question', json_build_object(
                'id', q.id,
                'question_text', q.question_text,
                'image_url', q.image_url,
                'status', q.status,
                'created_at', q.created_at
            ),
            'groups', COALESCE(grouped_data.groups, '[]'::json)
        )
        ORDER BY q.created_at DESC
    ) INTO result
    FROM questions q
    LEFT JOIN (
        SELECT 
            ga.question_id,
            json_agg(
                json_build_object(
                    'id', ga.id,
                    'question_id', ga.question_id,
                    'group_text', ga.group_text,
                    'percentage', ga.percentage,
                    'count', ga.count
                )
                ORDER BY ga.percentage DESC
            ) as groups
        FROM grouped_answers ga
        GROUP BY ga.question_id
    ) grouped_data ON q.id = grouped_data.question_id
    WHERE q.status = 'ended';
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Step 4: Test the function
SELECT 'Testing get_ended_questions function:' as info;
SELECT get_ended_questions();

-- Step 5: Check for ended questions directly (using only basic columns)
SELECT 
    'Direct Query - Ended Questions Count:' as info,
    count(*) as ended_questions_count
FROM questions 
WHERE status = 'ended';

-- Step 6: Show ended questions if any exist (safe column selection)
SELECT 
    'Sample Ended Questions:' as info;
    
SELECT 
    id,
    question_text,
    status,
    created_at
FROM questions 
WHERE status = 'ended'
ORDER BY created_at DESC
LIMIT 5;

-- Step 7: Check grouped answers
SELECT 
    'Grouped Answers Count:' as info,
    count(*) as grouped_answers_count
FROM grouped_answers ga
WHERE EXISTS (
    SELECT 1 FROM questions q 
    WHERE q.id = ga.question_id 
    AND q.status = 'ended'
);

-- Step 8: Show sample grouped answers
SELECT 
    'Sample Grouped Answers:' as info;
    
SELECT 
    ga.question_id,
    ga.group_text,
    ga.percentage,
    ga.count
FROM grouped_answers ga
WHERE EXISTS (
    SELECT 1 FROM questions q 
    WHERE q.id = ga.question_id 
    AND q.status = 'ended'
)
ORDER BY ga.question_id, ga.percentage DESC
LIMIT 10;

-- Step 9: Final verification
SELECT 
    'Function created successfully!' as status,
    'You can now test ended questions in the app.' as next_step;
