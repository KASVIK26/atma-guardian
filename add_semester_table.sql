-- =============================================
-- SEMESTER TABLE - Stores semester date ranges
-- =============================================

-- Create Semesters Table
CREATE TABLE IF NOT EXISTS semesters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL, -- '2024-25'
    semester_number INTEGER NOT NULL, -- 1, 2, 3, etc.
    semester_name TEXT NOT NULL, -- 'Semester 1', 'Semester 2'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Calculated fields (updated via trigger)
    total_days INTEGER,
    working_days INTEGER, -- Excluding weekends
    class_days INTEGER, -- Excluding weekends and holidays
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'planned', -- 'planned', 'ongoing', 'completed'
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(university_id, academic_year, semester_number),
    CHECK (start_date < end_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_semesters_university_year ON semesters(university_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_semesters_university_year_number ON semesters(university_id, academic_year, semester_number);
CREATE INDEX IF NOT EXISTS idx_semesters_date_range ON semesters(university_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_semesters_active ON semesters(is_active) WHERE is_active = true;

-- Function to calculate working days (excluding weekends)
CREATE OR REPLACE FUNCTION calculate_working_days(p_start_date DATE, p_end_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_current_date DATE;
BEGIN
    v_current_date := p_start_date;
    
    WHILE v_current_date <= p_end_date LOOP
        -- 0 = Sunday, 6 = Saturday
        IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
            v_count := v_count + 1;
        END IF;
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate class days (excluding weekends and holidays)
CREATE OR REPLACE FUNCTION calculate_class_days(p_semester_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_semester RECORD;
    v_current_date DATE;
BEGIN
    -- Get semester details
    SELECT * INTO v_semester FROM semesters WHERE id = p_semester_id;
    
    IF v_semester IS NULL THEN
        RETURN 0;
    END IF;
    
    v_current_date := v_semester.start_date;
    
    WHILE v_current_date <= v_semester.end_date LOOP
        -- Check if it's a weekday AND not a holiday
        IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
            -- Check if there's a holiday on this date
            IF NOT EXISTS(
                SELECT 1 FROM academic_calendar 
                WHERE university_id = v_semester.university_id
                AND event_date = v_current_date 
                AND affects_attendance = true
            ) THEN
                v_count := v_count + 1;
            END IF;
        END IF;
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update semester calculations
CREATE OR REPLACE FUNCTION update_semester_calculations()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_days := (NEW.end_date - NEW.start_date) + 1;
    NEW.working_days := calculate_working_days(NEW.start_date, NEW.end_date);
    NEW.class_days := calculate_class_days(NEW.id);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update semester calculations
DROP TRIGGER IF NOT EXISTS update_semester_calculations_trigger ON semesters;
CREATE TRIGGER update_semester_calculations_trigger
BEFORE INSERT OR UPDATE ON semesters
FOR EACH ROW
EXECUTE FUNCTION update_semester_calculations();

-- Function to recalculate class days when academic calendar changes
CREATE OR REPLACE FUNCTION recalculate_affected_semesters()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all affected semesters when a holiday is added/removed
    UPDATE semesters
    SET class_days = calculate_class_days(id)
    WHERE university_id = NEW.university_id
    AND NEW.event_date BETWEEN start_date AND end_date
    AND affects_attendance = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on academic_calendar to auto-update semester class days
DROP TRIGGER IF NOT EXISTS recalculate_semesters_trigger ON academic_calendar;
CREATE TRIGGER recalculate_semesters_trigger
AFTER INSERT OR UPDATE OR DELETE ON academic_calendar
FOR EACH ROW
EXECUTE FUNCTION recalculate_affected_semesters();

-- Add semester_id column to timetables if not exists
ALTER TABLE timetables 
ADD COLUMN IF  EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE;

-- Add semester_id column to lecture_sessions if not exists
ALTER TABLE lecture_sessions 
ADD COLUMN IF  EXISTS semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE;

-- Create index on new columns
CREATE INDEX IF NOT EXISTS idx_timetables_semester ON timetables(semester_id);
CREATE INDEX IF NOT EXISTS idx_lecture_sessions_semester ON lecture_sessions(semester_id);

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View to show semester statistics
CREATE OR REPLACE VIEW semester_statistics AS
SELECT 
    s.id,
    s.university_id,
    s.academic_year,
    s.semester_number,
    s.semester_name,
    s.start_date,
    s.end_date,
    s.total_days,
    s.working_days,
    s.class_days,
    ROUND((s.class_days::numeric / NULLIF(s.working_days, 0)) * 100, 2) AS effective_percentage,
    (s.working_days - s.class_days) AS holiday_count,
    s.is_active,
    s.status,
    s.created_at
FROM semesters s;

-- View to show timetables with semester info
CREATE OR REPLACE VIEW timetable_with_semester AS
SELECT 
    t.id,
    t.section_id,
    t.course_id,
    t.instructor_id,
    t.room_id,
    t.day_of_week,
    t.start_time,
    t.end_time,
    t.semester_id,
    s.academic_year,
    s.semester_number,
    s.start_date,
    s.end_date,
    s.class_days,
    t.is_active,
    t.created_at
FROM timetables t
LEFT JOIN semesters s ON t.semester_id = s.id;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE semesters IS 'Stores semester date ranges and calculated working/class days';
COMMENT ON COLUMN semesters.total_days IS 'Total calendar days including weekends';
COMMENT ON COLUMN semesters.working_days IS 'Weekdays only (Mon-Fri), excluding weekends';
COMMENT ON COLUMN semesters.class_days IS 'Actual teaching days (working_days - holidays)';
COMMENT ON COLUMN semesters.status IS 'planned: Not started, ongoing: Currently active, completed: Finished';
COMMENT ON FUNCTION calculate_working_days IS 'Calculates weekdays between two dates (excludes Sat-Sun)';
COMMENT ON FUNCTION calculate_class_days IS 'Calculates teaching days (working days minus holidays)';
