-- ============================================
-- Supabase Storage: Create "lectures" bucket and policies
-- ============================================
-- 
-- This script creates:
-- 1. A new storage bucket named "lectures"
-- 2. RLS policies for upload, read, and delete operations
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Step 1: Create the "lectures" bucket (if it doesn't exist)
-- Note: Bucket creation might need to be done via Supabase Dashboard → Storage → New Bucket
-- But we can try to insert it directly:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lectures',
  'lectures',
  true, -- Public bucket (files are accessible via public URL)
  524288000, -- 500MB file size limit (same as LECTURE_MAX_FILE_SIZE)
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- .pptx
    'video/mp4',
    'video/x-msvideo', -- .avi
    'video/quicktime', -- .mov
    'video/webm',
    'audio/mpeg', -- .mp3
    'audio/wav',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Step 2: Drop existing policies (if any) to avoid conflicts
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to upload lectures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to lectures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read lectures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own lecture files" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin to delete any lecture file" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own lecture files" ON storage.objects;

-- ============================================
-- Step 3: Create RLS Policies for storage.objects
-- ============================================

-- Policy 1: Allow authenticated users to upload files
-- Any authenticated user can upload (role check is handled by application logic)
-- Files are organized by user ID in path: lectures/{user_id}/{filename}
CREATE POLICY "Allow authenticated users to upload lectures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lectures' AND
  -- Ensure file path starts with user's ID for security
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow public read access to lectures
-- Anyone can view/download lecture files
CREATE POLICY "Allow public read access to lectures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'lectures');

-- Policy 3: Allow authenticated users to read lectures
-- Additional policy for authenticated users (redundant but explicit)
CREATE POLICY "Allow authenticated users to read lectures"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'lectures');

-- Policy 4: Allow users to update their own uploaded files
-- Users can only update files they uploaded (in their own folder)
CREATE POLICY "Allow users to update their own lecture files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lectures' AND
  -- Check if file path starts with user's ID
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'lectures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 5: Allow users to delete their own files (admin check handled by app)
-- Note: For admin to delete any file, you may need to add a separate policy
-- or handle it via service role key in backend

-- Policy 6: Allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own lecture files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lectures' AND
  -- Check if file path starts with user's ID
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- Verification Queries
-- ============================================

-- Check if bucket was created
SELECT * FROM storage.buckets WHERE id = 'lectures';

-- Check all policies for lectures bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%lecture%'
ORDER BY policyname;
