-- Migration: Add department field to offers table
-- Created: 2025-01-11
-- Description: Add department/division column to categorize internship offers

-- Add department column only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offers' AND column_name = 'department'
    ) THEN
        ALTER TABLE offers ADD COLUMN department TEXT;
    END IF;
END $$;

-- Add index for faster filtering (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'offers' AND indexname = 'idx_offers_department'
    ) THEN
        CREATE INDEX idx_offers_department ON offers(department);
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN offers.department IS 'Department or division (e.g., Rooms Division, F&B, HR, IT)';
