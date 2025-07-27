-- Add is_featured column to community_highlights table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'community_highlights' 
        AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE community_highlights 
        ADD COLUMN is_featured BOOLEAN DEFAULT false;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_community_highlights_is_featured 
        ON community_highlights(is_featured);
        
        -- Update existing records to ensure they are not featured by default
        UPDATE community_highlights 
        SET is_featured = false 
        WHERE is_featured IS NULL;
        
        RAISE NOTICE 'Added is_featured column to community_highlights table';
    ELSE
        RAISE NOTICE 'is_featured column already exists in community_highlights table';
    END IF;
END $$;
