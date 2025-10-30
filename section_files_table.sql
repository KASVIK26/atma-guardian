-- Create section_files table for managing timetables and enrollment files
CREATE TABLE IF NOT EXISTS "public"."section_files" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('timetable', 'enrollment')),
    file_size BIGINT NOT NULL,
    mime_type TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_section_files_section_id ON section_files(section_id);
CREATE INDEX IF NOT EXISTS idx_section_files_type ON section_files(file_type);
CREATE INDEX IF NOT EXISTS idx_section_files_uploaded_by ON section_files(uploaded_by);

-- Enable RLS
ALTER TABLE "public"."section_files" ENABLE ROW LEVEL SECURITY;

-- Create policies for section_files
CREATE POLICY "users_can_view_section_files" ON "public"."section_files"
FOR SELECT 
USING (
  -- Allow if user is admin
  (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
  OR
  -- Allow if user is from the same university
  (EXISTS (
    SELECT 1 
    FROM sections s
    JOIN branches b ON s.branch_id = b.id
    JOIN programs p ON b.program_id = p.id
    WHERE s.id = section_files.section_id 
    AND p.university_id = get_user_university()
  ))
);

CREATE POLICY "admin_manage_section_files" ON "public"."section_files"
FOR ALL 
USING (
  -- Only admins can manage section files
  (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
  AND
  -- Admin must be from the same university
  (EXISTS (
    SELECT 1 
    FROM sections s
    JOIN branches b ON s.branch_id = b.id
    JOIN programs p ON b.program_id = p.id
    WHERE s.id = section_files.section_id 
    AND (
      get_user_university() IS NULL 
      OR get_user_university() = p.university_id
    )
  ))
);

-- Create storage bucket for section files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('section-files', 'section-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for section files
CREATE POLICY "Section files are viewable by university users" ON storage.objects
FOR SELECT USING (
  bucket_id = 'section-files' 
  AND (
    (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
    OR 
    (auth.uid() IS NOT NULL)
  )
);

CREATE POLICY "Section files are uploadable by admins" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'section-files' 
  AND (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
);

CREATE POLICY "Section files are updatable by admins" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'section-files' 
  AND (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
);

CREATE POLICY "Section files are deletable by admins" ON storage.objects
FOR DELETE USING (
  bucket_id = 'section-files' 
  AND (COALESCE(jwt_role(), get_user_role()) = 'admin'::user_role)
);
