-- =============================================
-- SCHEMA UPDATES FOR FILE PARSING SYSTEM
-- Single file with all necessary changes
-- =============================================

-- 1. CREATE INSTRUCTORS TABLE
CREATE TABLE IF NOT EXISTS instructors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    department TEXT,
    qualifications TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instructors_code ON instructors(instructor_code);

-- 2. UPDATE TIMETABLES TABLE
-- First, drop dependent policies
DROP POLICY IF EXISTS "user_view_courses" ON courses;
DROP POLICY IF EXISTS "user_view_timetables" ON timetables;
DROP POLICY IF EXISTS "teacher_manage_sessions" ON lecture_sessions;
DROP POLICY IF EXISTS "teacher_manage_attendance" ON attendance_records;
DROP POLICY IF EXISTS "user_view_enrollments" ON student_enrollments;
DROP POLICY IF EXISTS "teacher_view_reports" ON attendance_reports;
DROP POLICY IF EXISTS "teacher_manage_totp" ON totp_sessions;
DROP POLICY IF EXISTS "teacher_view_students" ON users;

-- Now drop and recreate the column
ALTER TABLE timetables DROP CONSTRAINT IF EXISTS fk_timetables_instructor;
ALTER TABLE timetables DROP COLUMN IF EXISTS instructor_id CASCADE;
ALTER TABLE timetables ADD COLUMN instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL;

-- 3. ADD reg_mail_id TO STUDENT_ENROLLMENTS
ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS reg_mail_id TEXT;
CREATE INDEX IF NOT EXISTS idx_student_enrollments_reg_mail ON student_enrollments(reg_mail_id);

-- 4. ENABLE RLS ON INSTRUCTORS
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_instructors" ON instructors
FOR SELECT USING (true);

CREATE POLICY "admin_can_manage_instructors" ON instructors
FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 5. CREATE HELPER VIEW
CREATE OR REPLACE VIEW timetables_with_instructors AS
SELECT 
    t.id,
    t.section_id,
    t.course_id,
    t.instructor_id,
    t.room_id,
    t.day_of_week,
    t.start_time,
    t.end_time,
    t.academic_year,
    t.semester,
    t.is_active,
    i.instructor_code,
    i.full_name as instructor_name,
    i.email as instructor_email,
    c.course_code,
    c.course_name,
    s.name as section_name,
    r.room_number
FROM timetables t
LEFT JOIN instructors i ON t.instructor_id = i.id
LEFT JOIN courses c ON t.course_id = c.id
LEFT JOIN sections s ON t.section_id = s.id
LEFT JOIN rooms r ON t.room_id = r.id;

-- 6. RECREATE SIMPLIFIED DEPENDENT POLICIES
CREATE POLICY "user_view_timetables" ON timetables
FOR SELECT USING (true);

CREATE POLICY "teacher_manage_sessions" ON lecture_sessions
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM timetables t
        WHERE t.id = lecture_sessions.timetable_id 
        AND t.instructor_id = (SELECT id FROM instructors WHERE id IN (
            SELECT id FROM instructors LIMIT 1
        ))
    )
);

CREATE POLICY "teacher_manage_attendance" ON attendance_records
FOR ALL USING (true);

CREATE POLICY "user_view_enrollments" ON student_enrollments
FOR SELECT USING (true);

CREATE POLICY "teacher_view_reports" ON attendance_reports
FOR SELECT USING (true);
