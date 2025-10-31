-- =============================================
-- NUCLEAR CLEANUP - REMOVE ALL REFERENCES
-- =============================================

-- Step 1: Drop all views that might reference academic_calendar
DROP VIEW IF EXISTS semester_statistics CASCADE;
DROP VIEW IF EXISTS timetable_with_semester CASCADE;

-- Step 2: Drop all functions that reference academic_calendar or affects_attendance
DROP FUNCTION IF EXISTS recalculate_affected_semesters() CASCADE;
DROP FUNCTION IF EXISTS calculate_class_days(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_class_days_on_holiday() CASCADE;

-- Step 3: Drop all triggers on academic_calendar
DROP TRIGGER IF EXISTS holiday_update_class_days_trigger ON academic_calendar CASCADE;
DROP TRIGGER IF EXISTS recalculate_semesters_trigger ON academic_calendar CASCADE;

-- Step 4: Disable RLS completely
ALTER TABLE academic_calendar DISABLE ROW LEVEL SECURITY;

-- Step 5: Drop all policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'academic_calendar') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON academic_calendar CASCADE';
    END LOOP;
END $$;

-- Step 6: Completely recreate the table
DROP TABLE IF EXISTS academic_calendar CASCADE;

CREATE TABLE academic_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type calendar_event_enum NOT NULL,
    event_name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(semester_id, event_date, event_name)
);

-- Step 7: Create simple indexes
CREATE INDEX idx_academic_calendar_semester ON academic_calendar(semester_id);
CREATE INDEX idx_academic_calendar_university ON academic_calendar(university_id);
CREATE INDEX idx_academic_calendar_date ON academic_calendar(event_date);
CREATE INDEX idx_academic_calendar_type ON academic_calendar(event_type);

-- Step 8: Create calculate_class_days function FIRST (before trigger)
CREATE OR REPLACE FUNCTION calculate_class_days(p_semester_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_class_days INTEGER := 0;
    v_current_date DATE;
BEGIN
    -- Get semester dates
    SELECT start_date, end_date INTO v_start_date, v_end_date
    FROM semesters
    WHERE id = p_semester_id;
    
    IF v_start_date IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Count weekdays (Mon-Fri) minus holidays
    v_current_date := v_start_date;
    WHILE v_current_date <= v_end_date LOOP
        -- Check if it's a weekday (Mon-Fri)
        IF EXTRACT(DOW FROM v_current_date) BETWEEN 1 AND 5 THEN
            -- Check if it's NOT a holiday
            IF NOT EXISTS (
                SELECT 1 FROM academic_calendar
                WHERE semester_id = p_semester_id
                AND event_date = v_current_date
                AND event_type = 'holiday'
            ) THEN
                v_class_days := v_class_days + 1;
            END IF;
        END IF;
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN v_class_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 9: Create trigger function
CREATE OR REPLACE FUNCTION update_semester_class_days()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'holiday' THEN
        UPDATE semesters
        SET class_days = calculate_class_days(NEW.semester_id),
            updated_at = NOW()
        WHERE id = NEW.semester_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger
CREATE TRIGGER academic_calendar_update_class_days
AFTER INSERT OR UPDATE OR DELETE ON academic_calendar
FOR EACH ROW
EXECUTE FUNCTION update_semester_class_days();

-- Step 11: Enable RLS with minimal policies
ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_university" ON academic_calendar
FOR SELECT USING (university_id IN (SELECT university_id FROM users WHERE id = auth.uid()));

CREATE POLICY "insert_own_university" ON academic_calendar
FOR INSERT WITH CHECK (university_id IN (SELECT university_id FROM users WHERE id = auth.uid()));

CREATE POLICY "update_own_university" ON academic_calendar
FOR UPDATE USING (university_id IN (SELECT university_id FROM users WHERE id = auth.uid()))
WITH CHECK (university_id IN (SELECT university_id FROM users WHERE id = auth.uid()));

CREATE POLICY "delete_own_university" ON academic_calendar
FOR DELETE USING (university_id IN (SELECT university_id FROM users WHERE id = auth.uid()));

-- Step 12: Verify
SELECT 'Table created successfully' as status,
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'academic_calendar') as column_count,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'academic_calendar') as index_count;
