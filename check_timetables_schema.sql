-- Check timetables table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'timetables'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_class 
WHERE relname = 'timetables';

-- Check all policies on timetables
SELECT 
    policyname, 
    cmd, 
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'timetables'
ORDER BY policyname;
