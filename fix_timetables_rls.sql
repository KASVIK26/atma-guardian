-- =============================================
-- FIX TIMETABLES RLS POLICIES
-- =============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "admin_manage_timetables" ON timetables;
DROP POLICY IF EXISTS "user_view_timetables" ON timetables;

-- Create new, permissive policies for timetable management

-- Policy 1: Allow users to view timetables for their university
CREATE POLICY "users_view_timetables"
ON timetables
FOR SELECT
USING (
  section_id IN (
    SELECT s.id FROM sections s
    JOIN branches b ON s.branch_id = b.id
    JOIN programs p ON b.program_id = p.id
    JOIN users u ON p.university_id = u.university_id
    WHERE u.id = auth.uid()
  )
);

-- Policy 2: Allow admins and teachers to INSERT timetables
CREATE POLICY "users_insert_timetables"
ON timetables
FOR INSERT
WITH CHECK (
  section_id IN (
    SELECT s.id FROM sections s
    JOIN branches b ON s.branch_id = b.id
    JOIN programs p ON b.program_id = p.id
    JOIN users u ON p.university_id = u.university_id
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'teacher')
  )
);

-- Policy 3: Allow admins and teachers to UPDATE timetables
CREATE POLICY "users_update_timetables"
ON timetables
FOR UPDATE
USING (
  section_id IN (
    SELECT s.id FROM sections s
    JOIN branches b ON s.branch_id = b.id
    JOIN programs p ON b.program_id = p.id
    JOIN users u ON p.university_id = u.university_id
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'teacher')
  )
)
WITH CHECK (
  section_id IN (
    SELECT s.id FROM sections s
    JOIN branches b ON s.branch_id = b.id
    JOIN programs p ON b.program_id = p.id
    JOIN users u ON p.university_id = u.university_id
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'teacher')
  )
);

-- Policy 4: Allow admins and teachers to DELETE timetables
CREATE POLICY "users_delete_timetables"
ON timetables
FOR DELETE
USING (
  section_id IN (
    SELECT s.id FROM sections s
    JOIN branches b ON s.branch_id = b.id
    JOIN programs p ON b.program_id = p.id
    JOIN users u ON p.university_id = u.university_id
    WHERE u.id = auth.uid() AND u.role IN ('admin', 'teacher')
  )
);

-- =============================================
-- VERIFY POLICIES
-- =============================================
SELECT 
    policyname, 
    cmd, 
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'timetables'
ORDER BY policyname;
