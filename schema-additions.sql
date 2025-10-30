-- =============================================
-- FILE UPLOAD TRACKING TABLES
-- =============================================

-- Track uploaded timetable files
CREATE TABLE timetable_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    upload_type TEXT NOT NULL CHECK (upload_type IN ('timetable', 'enrollment')),
    original_filename TEXT NOT NULL,
    parsed_at TIMESTAMPTZ,
    parsing_status TEXT DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
    parsing_errors JSONB DEFAULT '{}',
    total_records_found INTEGER DEFAULT 0,
    total_records_processed INTEGER DEFAULT 0,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track enrollment uploads
CREATE TABLE enrollment_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    parsed_at TIMESTAMPTZ,
    parsing_status TEXT DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
    parsing_errors JSONB DEFAULT '{}',
    total_students_found INTEGER DEFAULT 0,
    total_students_processed INTEGER DEFAULT 0,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_timetable_uploads_section ON timetable_uploads(section_id);
CREATE INDEX idx_timetable_uploads_status ON timetable_uploads(parsing_status);
CREATE INDEX idx_enrollment_uploads_section ON enrollment_uploads(section_id);
CREATE INDEX idx_enrollment_uploads_status ON enrollment_uploads(parsing_status);