-- Add answer type categorization to questions table
-- This allows questions to be categorized as expecting username answers or general answers

-- Step 1: Add answer_type column to questions table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'answer_type'
    ) THEN
        ALTER TABLE questions 
        ADD COLUMN answer_type TEXT NOT NULL DEFAULT 'general' 
        CHECK (answer_type IN ('username', 'general'));
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_questions_answer_type 
        ON questions(answer_type);
        
        -- Create composite index for filtering by status and answer type
        CREATE INDEX IF NOT EXISTS idx_questions_status_answer_type 
        ON questions(status, answer_type);
        
        RAISE NOTICE 'Added answer_type column to questions table';
    ELSE
        RAISE NOTICE 'answer_type column already exists in questions table';
    END IF;
END $$;

-- Step 2: Update existing questions to have default answer_type
UPDATE questions 
SET answer_type = 'general' 
WHERE answer_type IS NULL;

-- Step 3: Update the get_ended_questions function to include answer_type
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
            'question', json_build_object(
                'id', q.id,
                'question_text', q.question_text,
                'image_url', q.image_url,
                'status', q.status,
                'answer_type', q.answer_type,
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
    WHERE q.status = 'ended' AND (q.is_approved = true OR q.is_approved IS NULL);
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Step 4: Update the get_all_ended_questions_for_admin function to include answer_type
CREATE OR REPLACE FUNCTION get_all_ended_questions_for_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'question', json_build_object(
                'id', q.id,
                'question_text', q.question_text,
                'image_url', q.image_url,
                'status', q.status,
                'answer_type', q.answer_type,
                'is_approved', COALESCE(q.is_approved, false),
                'created_at', q.created_at
            ),
            'groups', COALESCE(grouped_data.groups, '[]'::json)
        )
        ORDER BY COALESCE(q.is_approved, false) ASC, q.created_at DESC
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

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Question answer type categorization setup complete!';
    RAISE NOTICE '📝 Answer types available: username, general';
    RAISE NOTICE '🎯 Database functions updated to include answer_type';
    RAISE NOTICE '📊 Use answer_type column to categorize questions by expected answer format';
    RAISE NOTICE '🚀 Ready for use in the application!';
END $$;
