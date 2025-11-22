-- Add thumbnail_url column to products table
-- This column stores the URL of the product thumbnail image

ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR NULL;

