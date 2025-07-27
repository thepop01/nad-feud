-- Add approval system for ended questions
-- This ensures ended questions are reviewed by admin before appearing on homepage

-- Step 1: Add is_approved column to questions table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'is_approved'
    ) THEN
        ALTER TABLE questions 
        ADD COLUMN is_approved BOOLEAN DEFAULT false;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_questions_status_approved 
        ON questions(status, is_approved);
        
        RAISE NOTICE 'Added is_approved column to questions table';
    ELSE
        RAISE NOTICE 'is_approved column already exists in questions table';
    END IF;
END $$;

-- Step 2: Set existing ended questions as not approved (need admin review)
UPDATE questions 
SET is_approved = false 
WHERE status = 'ended' AND is_approved IS NULL;

-- Step 3: Live and pending questions don't need approval
UPDATE questions 
SET is_approved = true 
WHERE status IN ('live', 'pending') AND is_approved IS NULL;

-- Step 4: Update the get_ended_questions function to only return approved ended questions for homepage
DROP FUNCTION IF EXISTS get_ended_questions();

CREATE OR REPLACE FUNCTION get_ended_questions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Only return approved ended questions for homepage display
    SELECT json_agg(
        json_build_object(
            'question', json_build_object(
                'id', q.id,
                'question_text', q.question_text,
                'image_url', q.image_url,
                'status', q.status,
                'created_at', q.created_at,
                'is_approved', q.is_approved
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
    WHERE q.status = 'ended' AND q.is_approved = true;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Step 5: Create function for admin panel to get all ended questions (approved and unapproved)
CREATE OR REPLACE FUNCTION get_all_ended_questions_for_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Return all ended questions for admin review (both approved and unapproved)
    SELECT json_agg(
        json_build_object(
            'question', json_build_object(
                'id', q.id,
                'question_text', q.question_text,
                'image_url', q.image_url,
                'status', q.status,
                'created_at', q.created_at,
                'is_approved', q.is_approved
            ),
            'groups', COALESCE(grouped_data.groups, '[]'::json)
        )
        ORDER BY q.is_approved ASC, q.created_at DESC
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

-- Step 6: Test the functions
SELECT 'Testing get_ended_questions (homepage - approved only):' as info;
SELECT get_ended_questions();

SELECT 'Testing get_all_ended_questions_for_admin (admin panel - all):' as info;
SELECT get_all_ended_questions_for_admin();

-- Step 7: Show current status
SELECT 
    'Current Questions Status:' as info,
    status,
    is_approved,
    count(*) as count
FROM questions 
GROUP BY status, is_approved
ORDER BY status, is_approved;

-- Final success messages
DO $$
BEGIN
    RAISE NOTICE 'Ended question approval system setup complete!';
    RAISE NOTICE 'Ended questions now require admin approval before appearing on homepage';
    RAISE NOTICE 'Use get_all_ended_questions_for_admin() for admin panel';
    RAISE NOTICE 'Use get_ended_questions() for homepage (approved only)';
END $$;
