-- Remove old files table and atma-files storage bucket
-- This script cleans up the old file management system

-- 1. Drop the old files table
DROP TABLE IF EXISTS "public"."files" CASCADE;

-- 2. Remove the old storage bucket
DELETE FROM storage.buckets WHERE id = 'atma-files';

-- 3. Remove any storage policies for the old bucket
DROP POLICY IF EXISTS "Files are viewable by university users" ON storage.objects;
DROP POLICY IF EXISTS "Files are uploadable by admins" ON storage.objects;
DROP POLICY IF EXISTS "Files are updatable by admins" ON storage.objects;
DROP POLICY IF EXISTS "Files are deletable by admins" ON storage.objects;

-- Note: The above policies might have different names, so check your storage policies
-- and remove any that reference 'atma-files' bucket

-- 4. Clean up any orphaned storage objects (optional - be careful with this)
-- DELETE FROM storage.objects WHERE bucket_id = 'atma-files';

-- Verification queries (run these to confirm cleanup)
-- SELECT * FROM storage.buckets WHERE id = 'atma-files'; -- Should return no rows
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'files'; -- Should return no rows
