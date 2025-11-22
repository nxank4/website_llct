-- Migration: Add content_html column to products table
-- Run this SQL script in Supabase SQL Editor or via psql

-- Check if column already exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'content_html'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN content_html TEXT NULL;
        
        RAISE NOTICE 'Column content_html added to products table';
    ELSE
        RAISE NOTICE 'Column content_html already exists in products table';
    END IF;
END $$;

