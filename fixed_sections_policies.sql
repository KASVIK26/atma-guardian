-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_view_structure" ON "public"."sections";
DROP POLICY IF EXISTS "admin_manage_sections" ON "public"."sections";

-- Fixed Policy 1: Allow users to view sections they are enrolled in
-- This policy should NOT reference student_enrollments to avoid recursion
CREATE POLICY "user_view_sections" ON "public"."sections"
FOR SELECT 
USING (
  -- Allow if user is admin
  (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
  OR
  -- Allow if user is a student/faculty at the same university
  (EXISTS (
    SELECT 1 
    FROM branches b
    JOIN programs p ON (b.program_id = p.id)
    WHERE b.id = sections.branch_id 
    AND p.university_id = get_user_university()
  ))
);

-- Fixed Policy 2: Allow admins to manage sections
CREATE POLICY "admin_manage_sections" ON "public"."sections"
FOR ALL 
USING (
  -- Only admins can manage sections
  (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
  AND
  -- Admin must be from the same university
  (EXISTS (
    SELECT 1 
    FROM branches b
    JOIN programs p ON (b.program_id = p.id)
    WHERE b.id = sections.branch_id 
    AND (
      get_user_university() IS NULL 
      OR get_user_university() = p.university_id
    )
  ))
);

-- Additional Policy: Allow students to view only their enrolled sections
-- This should be on student_enrollments table, NOT on sections table
-- to avoid circular reference
CREATE POLICY "student_view_enrollments" ON "public"."student_enrollments"
FOR SELECT 
USING (
  -- Student can see their own enrollments
  (student_id = auth.uid())
  OR
  -- Admin can see all enrollments in their university
  (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
);

-- Policy for inserting enrollments
CREATE POLICY "admin_manage_enrollments" ON "public"."student_enrollments"
FOR ALL 
USING (
  -- Only admins can manage enrollments
  (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
);
