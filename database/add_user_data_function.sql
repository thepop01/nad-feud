-- Create function to get user data with aggregated stats
-- This function returns user information along with their total score and number of questions answered

CREATE OR REPLACE FUNCTION get_user_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'user_id', u.id,
            'username', u.username,
            'discord_id', u.discord_id,
            'discord_role', u.discord_role,
            'total_score', COALESCE(u.total_score, 0),
            'questions_answered', COALESCE(answer_counts.count, 0)
        )
        ORDER BY COALESCE(u.total_score, 0) DESC, u.username ASC
    ) INTO result
    FROM users u
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as count
        FROM answers
        GROUP BY user_id
    ) answer_counts ON u.id = answer_counts.user_id;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Test the function
SELECT 'Testing get_user_data function:' as test;
SELECT get_user_data();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ User data function created successfully!';
    RAISE NOTICE '📊 Function: get_user_data() returns user stats with scores and question counts';
    RAISE NOTICE '🚀 Ready for use in the admin panel User Data section!';
END $$;
