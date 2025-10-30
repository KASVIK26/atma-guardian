-- =============================================
-- ATMA (Automated Attendance Management System)
-- Complete Database Schema for Supabase
-- Version: 1.0
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =============================================
-- CUSTOM ENUMS
-- =============================================

CREATE TYPE user_role AS ENUM (
    'admin', 
    'teacher',
    'student'
);

CREATE TYPE room_type_enum AS ENUM (
    'lecture_hall',
    'lab',
    'seminar_room',
    'auditorium',
    'classroom'
);

CREATE TYPE program_type_enum AS ENUM (
    'undergraduate',
    'postgraduate',
    'diploma',
    'certificate'
);

CREATE TYPE course_type_enum AS ENUM (
    'theory',
    'practical',
    'project',
    'seminar'
);

CREATE TYPE session_status_enum AS ENUM (
    'scheduled',
    'active',
    'completed',
    'cancelled',
    'rescheduled'
);

CREATE TYPE attendance_status_enum AS ENUM (
    'present',
    'absent',
    'late',
    'excused'
);

CREATE TYPE marking_method_enum AS ENUM (
    'student_app',
    'teacher_manual',
    'admin_override',
    'system_auto'
);

CREATE TYPE file_type_enum AS ENUM (
    'timetable',
    'enrollment_list',
    'student_photo',
    'building_map',
    'document',
    'report'
);

CREATE TYPE notification_type_enum AS ENUM (
    'attendance_warning',
    'session_start',
    'schedule_change',
    'system_alert',
    'low_attendance',
    'proxy_detected',
    'session_cancelled'
);

CREATE TYPE delivery_method_enum AS ENUM (
    'push',
    'email',
    'sms',
    'all'
);

CREATE TYPE calendar_event_enum AS ENUM (
    'holiday',
    'exam',
    'semester_start',
    'semester_end',
    'vacation',
    'special_event',
    'makeup_class'
);

CREATE TYPE audit_action_enum AS ENUM (
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'attendance_mark',
    'session_start',
    'session_end',
    'totp_generate'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- Universities Table
CREATE TABLE universities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    location TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Users Table (Supabase Auth Integration)
CREATE TABLE users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    enrollment_id TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    profile_image_url TEXT,
    fcm_token TEXT,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    
    -- Removed university constraint to allow admin registration before university creation
);

-- Academic Years Table
CREATE TABLE years (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL, -- '2024-25'
    year_number INTEGER NOT NULL, -- 1, 2, 3, 4
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(university_id, academic_year, year_number)
);

-- Programs Table
CREATE TABLE programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    duration_years INTEGER NOT NULL,
    program_type program_type_enum NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(university_id, code)
);

-- Branches Table
CREATE TABLE branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(program_id, code)
);

-- Sections Table
CREATE TABLE sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    year_id UUID NOT NULL REFERENCES years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_students INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(branch_id, year_id, name)
);

-- Buildings Table (Critical for Geofencing)
CREATE TABLE buildings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude_meters DECIMAL(8, 2),
    geofence_radius_meters INTEGER DEFAULT 50,
    geofence_geojson JSONB DEFAULT NULL,
    floor_count INTEGER DEFAULT 1,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(university_id, code)
);

-- Rooms Table (Essential for Pressure Estimation)
CREATE TABLE rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_name TEXT,
    floor_number INTEGER NOT NULL,
    room_type room_type_enum NOT NULL,
    capacity INTEGER,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    baseline_pressure_hpa DECIMAL(7, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(building_id, room_number)
);

-- Courses Table
CREATE TABLE courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    course_name TEXT NOT NULL,
    credits INTEGER DEFAULT 3,
    course_type course_type_enum,
    semester INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(branch_id, course_code)
);

-- Timetables Table
CREATE TABLE timetables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id),
    instructor_id UUID NOT NULL REFERENCES users(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    academic_year TEXT NOT NULL,
    semester INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CHECK (start_time < end_time)
);

-- Lecture Sessions Table (Enhanced with TOTP)
CREATE TABLE lecture_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timetable_id UUID NOT NULL REFERENCES timetables(id),
    scheduled_date DATE NOT NULL,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    
    -- TOTP System
    totp_secret TEXT,
    current_totp TEXT,
    totp_generated_at TIMESTAMPTZ,
    totp_expires_at TIMESTAMPTZ,
    totp_refresh_interval INTEGER DEFAULT 30,
    
    session_status session_status_enum DEFAULT 'scheduled',
    attendance_open BOOLEAN DEFAULT false,
    attendance_close_time TIMESTAMPTZ,
    max_late_minutes INTEGER DEFAULT 15,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Enrollments Table
CREATE TABLE student_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id),
    section_id UUID NOT NULL REFERENCES sections(id),
    enrollment_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, section_id)
);

-- Attendance Records Table (Main Attendance Data)
CREATE TABLE attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecture_session_id UUID NOT NULL REFERENCES lecture_sessions(id),
    student_id UUID NOT NULL REFERENCES users(id),
    attendance_status attendance_status_enum DEFAULT 'absent',
    marked_at TIMESTAMPTZ,
    marking_method marking_method_enum,
    
    -- Validation Scores
    validation_score DECIMAL(5, 2),
    geofence_valid BOOLEAN,
    barometer_valid BOOLEAN,
    totp_valid BOOLEAN,
    ble_valid BOOLEAN,
    
    -- Security Flags
    is_proxy_suspected BOOLEAN DEFAULT false,
    confidence_level DECIMAL(5, 2),
    
    -- Manual Override Fields
    overridden_by UUID REFERENCES users(id),
    override_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lecture_session_id, student_id)
);

-- Sensor Data Table (ML Analysis & Proxy Detection)
CREATE TABLE sensor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attendance_record_id UUID REFERENCES attendance_records(id),
    student_id UUID NOT NULL REFERENCES users(id),
    session_id UUID REFERENCES lecture_sessions(id),
    
    -- Location Data
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    gps_accuracy DECIMAL(8, 2),
    altitude DECIMAL(8, 2),
    
    -- Barometric Data
    pressure_hpa DECIMAL(7, 2),
    temperature_celsius DECIMAL(5, 2),
    humidity_percent DECIMAL(5, 2),
    
    -- Motion Data
    accelerometer_x DECIMAL(10, 6),
    accelerometer_y DECIMAL(10, 6),
    accelerometer_z DECIMAL(10, 6),
    gyroscope_x DECIMAL(10, 6),
    gyroscope_y DECIMAL(10, 6),
    gyroscope_z DECIMAL(10, 6),
    
    -- Device Info
    device_id TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,
    battery_level INTEGER,
    network_type TEXT,
    signal_strength INTEGER,
    
    -- Bluetooth Data
    ble_beacons JSONB,
    wifi_networks JSONB,
    
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic Calendar Table
CREATE TABLE academic_calendar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    semester INTEGER,
    event_date DATE NOT NULL,
    event_type calendar_event_enum NOT NULL,
    event_name TEXT NOT NULL,
    description TEXT,
    is_university_wide BOOLEAN DEFAULT true,
    affects_attendance BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(university_id, event_date, event_name)
);

-- Pressure Calibration Table
CREATE TABLE pressure_calibration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id),
    reference_pressure_hpa DECIMAL(7, 2) NOT NULL,
    measured_pressure_hpa DECIMAL(7, 2) NOT NULL,
    calibration_offset DECIMAL(7, 4),
    temperature_celsius DECIMAL(5, 2),
    humidity_percent DECIMAL(5, 2),
    weather_conditions JSONB,
    calibrated_at TIMESTAMPTZ DEFAULT NOW(),
    calibrated_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true
);

-- Files Table (Supabase Storage Integration)
CREATE TABLE files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID REFERENCES universities(id),
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type file_type_enum NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    bucket_name TEXT DEFAULT 'atma-files',
    uploaded_by UUID REFERENCES users(id),
    related_entity_id UUID,
    related_entity_type TEXT,
    is_processed BOOLEAN DEFAULT false,
    processing_status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Settings Table
CREATE TABLE notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type notification_type_enum NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    threshold_value INTEGER,
    delivery_method delivery_method_enum DEFAULT 'push',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, notification_type)
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type_enum NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action audit_action_enum NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    api_endpoint TEXT,
    university_id UUID REFERENCES universities(id),
    session_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TOTP Sessions Table
CREATE TABLE totp_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecture_session_id UUID NOT NULL REFERENCES lecture_sessions(id),
    totp_code TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    max_usage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mobile App Sessions Table (for push notifications and device management)
CREATE TABLE mobile_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_type TEXT, -- 'ios', 'android'
    app_version TEXT,
    os_version TEXT,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, device_id)
);

-- University Invitations Table (for SMTP-based registration)
CREATE TABLE university_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    invitation_code TEXT UNIQUE NOT NULL,
    section_id UUID REFERENCES sections(id), -- for students
    enrollment_id TEXT, -- for students
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(university_id, email)
);

-- Attendance Reports Table (pre-generated reports for performance)
CREATE TABLE attendance_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'semester'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    section_id UUID REFERENCES sections(id),
    course_id UUID REFERENCES courses(id),
    student_id UUID REFERENCES users(id),
    report_data JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),
    is_cached BOOLEAN DEFAULT true,
    
    INDEX(university_id, report_type, start_date, end_date)
);

-- System Settings Table (for app configuration)
CREATE TABLE system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    university_id UUID REFERENCES universities(id), -- NULL for global settings
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_editable BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(university_id, setting_key)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users
CREATE INDEX idx_users_university_id ON users(university_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_enrollment_id ON users(enrollment_id) WHERE enrollment_id IS NOT NULL;

-- Attendance Records
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, created_at);
CREATE INDEX idx_attendance_session_id ON attendance_records(lecture_session_id);
CREATE INDEX idx_attendance_status ON attendance_records(attendance_status);
CREATE INDEX idx_attendance_proxy_suspected ON attendance_records(is_proxy_suspected) WHERE is_proxy_suspected = true;

-- Lecture Sessions
CREATE INDEX idx_lecture_sessions_date ON lecture_sessions(scheduled_date, session_status);
CREATE INDEX idx_lecture_sessions_timetable ON lecture_sessions(timetable_id);
CREATE INDEX idx_lecture_sessions_status ON lecture_sessions(session_status);

-- Timetables
CREATE INDEX idx_timetable_section_day ON timetables(section_id, day_of_week);
CREATE INDEX idx_timetable_instructor ON timetables(instructor_id);
CREATE INDEX idx_timetable_room ON timetables(room_id);

-- Sensor Data
CREATE INDEX idx_sensor_data_session ON sensor_data(session_id, recorded_at);
CREATE INDEX idx_sensor_data_student ON sensor_data(student_id, recorded_at);
CREATE INDEX idx_sensor_data_attendance ON sensor_data(attendance_record_id);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE is_sent = false;

-- Audit Logs
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_university ON audit_logs(university_id, created_at);

-- Academic Calendar
CREATE INDEX idx_academic_calendar_date ON academic_calendar(university_id, event_date);
CREATE INDEX idx_academic_calendar_affects_attendance ON academic_calendar(affects_attendance, event_date) WHERE affects_attendance = true;

-- =============================================
-- STORAGE BUCKETS INITIALIZATION
-- =============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('atma-files', 'atma-files', false),
    ('profile-images', 'profile-images', true),
    ('university-logos', 'university-logos', true),
    ('reports', 'reports', false)
ON CONFLICT DO NOTHING;

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to calculate attendance percentage
CREATE OR REPLACE FUNCTION calculate_attendance_percentage(
    p_student_id UUID,
    p_course_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_sessions INTEGER;
    present_sessions INTEGER;
    attendance_percent DECIMAL(5,2);
BEGIN
    -- Get total and present sessions
    SELECT 
        COUNT(*) FILTER (WHERE ar.id IS NOT NULL),
        COUNT(*) FILTER (WHERE ar.attendance_status = 'present')
    INTO total_sessions, present_sessions
    FROM lecture_sessions ls
    JOIN timetables t ON ls.timetable_id = t.id
    JOIN student_enrollments se ON t.section_id = se.section_id
    LEFT JOIN attendance_records ar ON ls.id = ar.lecture_session_id AND ar.student_id = p_student_id
    WHERE se.student_id = p_student_id
    AND ls.session_status = 'completed'
    AND (p_course_id IS NULL OR t.course_id = p_course_id)
    AND (p_start_date IS NULL OR ls.scheduled_date >= p_start_date)
    AND (p_end_date IS NULL OR ls.scheduled_date <= p_end_date);
    
    IF total_sessions = 0 THEN
        RETURN 0;
    END IF;
    
    attendance_percent := ROUND((present_sessions * 100.0) / total_sessions, 2);
    RETURN attendance_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate TOTP for lecture session
CREATE OR REPLACE FUNCTION generate_session_totp(session_id UUID)
RETURNS TABLE(totp_code TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
    new_code TEXT;
    expiry_time TIMESTAMPTZ;
BEGIN
    -- Generate 6-digit code
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    expiry_time := NOW() + INTERVAL '30 seconds';
    
    -- Update lecture session
    UPDATE lecture_sessions 
    SET 
        current_totp = new_code,
        totp_generated_at = NOW(),
        totp_expires_at = expiry_time
    WHERE id = session_id;
    
    -- Insert into TOTP sessions
    INSERT INTO totp_sessions (lecture_session_id, totp_code, expires_at)
    VALUES (session_id, new_code, expiry_time);
    
    RETURN QUERY SELECT new_code, expiry_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate attendance marking
CREATE OR REPLACE FUNCTION validate_attendance_marking(
    p_session_id UUID,
    p_student_id UUID,
    p_latitude DECIMAL(10,8),
    p_longitude DECIMAL(11,8),
    p_pressure_hpa DECIMAL(7,2),
    p_totp_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    session_record RECORD;
    room_record RECORD;
    building_record RECORD;
    validation_result JSONB := '{}';
    distance_meters DECIMAL(10,2);
    pressure_diff DECIMAL(7,2);
    total_score DECIMAL(5,2) := 0;
BEGIN
    -- Get session, room, and building data
    SELECT ls.*, t.room_id INTO session_record
    FROM lecture_sessions ls
    JOIN timetables t ON ls.timetable_id = t.id
    WHERE ls.id = p_session_id;
    
    SELECT r.*, b.latitude as building_lat, b.longitude as building_lng, 
           b.geofence_radius_meters
    INTO room_record, building_record
    FROM rooms r
    JOIN buildings b ON r.building_id = b.id
    WHERE r.id = session_record.room_id;
    
    -- Validate geofence (40 points)
    distance_meters := 111320 * SQRT(
        POW(p_latitude - building_record.latitude, 2) + 
        POW(p_longitude - building_record.longitude, 2)
    );
    
    IF distance_meters <= building_record.geofence_radius_meters THEN
        validation_result := validation_result || '{"geofence_valid": true}';
        total_score := total_score + 40;
    ELSE
        validation_result := validation_result || '{"geofence_valid": false}';
    END IF;
    
    -- Validate pressure (30 points)
    IF room_record.baseline_pressure_hpa IS NOT NULL AND p_pressure_hpa IS NOT NULL THEN
        pressure_diff := ABS(p_pressure_hpa - room_record.baseline_pressure_hpa);
        IF pressure_diff <= 2.0 THEN
            validation_result := validation_result || '{"barometer_valid": true}';
            total_score := total_score + 30;
        ELSE
            validation_result := validation_result || '{"barometer_valid": false}';
        END IF;
    END IF;
    
    -- Validate TOTP (30 points)
    IF session_record.current_totp = p_totp_code AND 
       session_record.totp_expires_at > NOW() THEN
        validation_result := validation_result || '{"totp_valid": true}';
        total_score := total_score + 30;
    ELSE
        validation_result := validation_result || '{"totp_valid": false}';
    END IF;
    
    validation_result := validation_result || jsonb_build_object('total_score', total_score);
    validation_result := validation_result || jsonb_build_object('distance_meters', distance_meters);
    validation_result := validation_result || jsonb_build_object('pressure_diff', pressure_diff);
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if date is holiday
CREATE OR REPLACE FUNCTION is_holiday(p_university_id UUID, p_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM academic_calendar 
        WHERE university_id = p_university_id 
        AND event_date = p_date 
        AND affects_attendance = true
        AND event_type IN ('holiday', 'vacation')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecture_sessions_updated_at 
    BEFORE UPDATE ON lecture_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trail trigger
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_attendance_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_lecture_sessions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON lecture_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Notification trigger for low attendance
CREATE OR REPLACE FUNCTION check_attendance_threshold()
RETURNS TRIGGER AS $$
DECLARE
    attendance_percent DECIMAL(5,2);
BEGIN
    -- Only check when attendance is marked as present or late
    IF NEW.attendance_status IN ('present', 'late') THEN
        attendance_percent := calculate_attendance_percentage(NEW.student_id);
        
        -- If attendance drops below 75%, create notification
        IF attendance_percent < 75 THEN
            INSERT INTO notifications (
                user_id, 
                title, 
                message, 
                notification_type, 
                data
            )
            VALUES (
                NEW.student_id,
                'Attendance Warning',
                'Your attendance is ' || attendance_percent || '%. Minimum required is 75%.',
                'attendance_warning',
                jsonb_build_object('attendance_percent', attendance_percent)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER attendance_threshold_trigger
    AFTER INSERT OR UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION check_attendance_threshold();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES - SIMPLIFIED
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Users can see their own data
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (id = auth.uid());

-- Users can update their own profile (except role and university_id)
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() AND
        role = (SELECT role FROM users WHERE id = auth.uid()) AND
        university_id = (SELECT university_id FROM users WHERE id = auth.uid())
    );

-- Admins can manage users within their university
CREATE POLICY "admin_manage_users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND (
                u.university_id = users.university_id OR
                (u.university_id IS NULL AND users.university_id IS NULL)
            )
        )
    );

-- Teachers can view students in their sections
CREATE POLICY "teacher_view_students" ON users
    FOR SELECT USING (
        users.role = 'student' AND
        EXISTS (
            SELECT 1 FROM users teacher
            JOIN timetables t ON teacher.id = t.instructor_id
            JOIN student_enrollments se ON t.section_id = se.section_id
            WHERE teacher.id = auth.uid()
            AND teacher.role = 'teacher'
            AND se.student_id = users.id
        )
    );

-- =============================================
-- UNIVERSITIES TABLE POLICIES
-- =============================================

-- Admins can see their own university
CREATE POLICY "admin_view_university" ON universities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND (university_id = universities.id OR university_id IS NULL)
        )
    );

-- Only admin without university can create university
CREATE POLICY "admin_create_university" ON universities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND university_id IS NULL
        )
    );

-- Admin can update their university
CREATE POLICY "admin_update_university" ON universities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND university_id = universities.id
        )
    );

-- =============================================
-- UNIVERSITY STRUCTURE POLICIES (Programs, Branches, Sections)
-- =============================================

-- Admin can manage all university structure
CREATE POLICY "admin_manage_programs" ON programs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND u.university_id = programs.university_id
        )
    );

CREATE POLICY "admin_manage_branches" ON branches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND p.id = branches.program_id
        )
    );

CREATE POLICY "admin_manage_sections" ON sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            JOIN branches b ON p.id = b.program_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND b.id = sections.branch_id
        )
    );

-- Students and teachers can view their relevant structure
CREATE POLICY "user_view_structure" ON sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN student_enrollments se ON u.id = se.student_id
            WHERE u.id = auth.uid() AND se.section_id = sections.id
        ) OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN timetables t ON u.id = t.instructor_id
            WHERE u.id = auth.uid() AND t.section_id = sections.id
        )
    );

-- =============================================
-- BUILDINGS AND ROOMS POLICIES
-- =============================================

CREATE POLICY "admin_manage_buildings" ON buildings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND university_id = buildings.university_id
        )
    );

CREATE POLICY "user_view_buildings" ON buildings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND university_id = buildings.university_id
        )
    );

CREATE POLICY "admin_manage_rooms" ON rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN buildings b ON u.university_id = b.university_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND b.id = rooms.building_id
        )
    );

CREATE POLICY "user_view_rooms" ON rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN buildings b ON u.university_id = b.university_id
            WHERE u.id = auth.uid() 
            AND b.id = rooms.building_id
        )
    );

-- =============================================
-- COURSES AND TIMETABLES POLICIES
-- =============================================

CREATE POLICY "admin_manage_courses" ON courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            JOIN branches b ON p.id = b.program_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND b.id = courses.branch_id
        )
    );

CREATE POLICY "user_view_courses" ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN student_enrollments se ON u.id = se.student_id
            JOIN sections s ON se.section_id = s.id
            WHERE u.id = auth.uid() AND s.branch_id = courses.branch_id
        ) OR
        EXISTS (
            SELECT 1 FROM users u
            JOIN timetables t ON u.id = t.instructor_id
            WHERE u.id = auth.uid() AND t.course_id = courses.id
        )
    );

CREATE POLICY "admin_manage_timetables" ON timetables
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            JOIN branches b ON p.id = b.program_id
            JOIN sections s ON b.id = s.branch_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND s.id = timetables.section_id
        )
    );

CREATE POLICY "user_view_timetables" ON timetables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN student_enrollments se ON u.id = se.student_id
            WHERE u.id = auth.uid() AND se.section_id = timetables.section_id
        ) OR
        timetables.instructor_id = auth.uid()
    );

-- =============================================
-- LECTURE SESSIONS POLICIES
-- =============================================

CREATE POLICY "teacher_manage_sessions" ON lecture_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM timetables t
            WHERE t.id = lecture_sessions.timetable_id
            AND t.instructor_id = auth.uid()
        )
    );

CREATE POLICY "admin_manage_sessions" ON lecture_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            JOIN branches b ON p.id = b.program_id
            JOIN sections s ON b.id = s.branch_id
            JOIN timetables t ON s.id = t.section_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND t.id = lecture_sessions.timetable_id
        )
    );

CREATE POLICY "student_view_sessions" ON lecture_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN student_enrollments se ON u.id = se.student_id
            JOIN timetables t ON se.section_id = t.section_id
            WHERE u.id = auth.uid() 
            AND t.id = lecture_sessions.timetable_id
        )
    );

-- =============================================
-- ATTENDANCE RECORDS POLICIES
-- =============================================

-- Students can only see their own attendance
CREATE POLICY "student_view_own_attendance" ON attendance_records
    FOR SELECT USING (student_id = auth.uid());

-- Students can mark their own attendance
CREATE POLICY "student_mark_attendance" ON attendance_records
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Teachers can view and manage attendance for their courses
CREATE POLICY "teacher_manage_attendance" ON attendance_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM timetables t
            JOIN lecture_sessions ls ON t.id = ls.timetable_id
            WHERE t.instructor_id = auth.uid()
            AND ls.id = attendance_records.lecture_session_id
        )
    );

-- Admins can manage all attendance in their university
CREATE POLICY "admin_manage_attendance" ON attendance_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            JOIN branches b ON p.id = b.program_id
            JOIN sections s ON b.id = s.branch_id
            JOIN timetables t ON s.id = t.section_id
            JOIN lecture_sessions ls ON t.id = ls.timetable_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND ls.id = attendance_records.lecture_session_id
        )
    );

-- =============================================
-- STUDENT ENROLLMENTS POLICIES
-- =============================================

CREATE POLICY "admin_manage_enrollments" ON student_enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            JOIN branches b ON p.id = b.program_id
            JOIN sections s ON b.id = s.branch_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND s.id = student_enrollments.section_id
        )
    );

CREATE POLICY "user_view_enrollments" ON student_enrollments
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM timetables t
            WHERE t.instructor_id = auth.uid()
            AND t.section_id = student_enrollments.section_id
        )
    );

-- =============================================
-- SENSOR DATA POLICIES
-- =============================================

-- Students can only insert their own sensor data
CREATE POLICY "student_insert_sensor_data" ON sensor_data
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Students can view their own sensor data
CREATE POLICY "student_view_sensor_data" ON sensor_data
    FOR SELECT USING (student_id = auth.uid());

-- Admins can view all sensor data in their university
CREATE POLICY "admin_view_sensor_data" ON sensor_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users student
            JOIN users admin ON student.university_id = admin.university_id
            WHERE admin.id = auth.uid() 
            AND admin.role = 'admin'
            AND student.id = sensor_data.student_id
        )
    );

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can view their own notifications
CREATE POLICY "user_view_notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "user_update_notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Admins can create notifications for users in their university
CREATE POLICY "admin_create_notifications" ON notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users target_user
            JOIN users admin ON target_user.university_id = admin.university_id
            WHERE admin.id = auth.uid() 
            AND admin.role = 'admin'
            AND target_user.id = notifications.user_id
        )
    );

-- =============================================
-- FILES POLICIES
-- =============================================

CREATE POLICY "admin_manage_files" ON files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND (university_id = files.university_id OR files.university_id IS NULL)
        )
    );

-- =============================================
-- AUDIT LOGS POLICIES
-- =============================================

-- =============================================
-- RLS POLICIES FOR NEW TABLES
-- =============================================

ALTER TABLE mobile_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE totp_sessions ENABLE ROW LEVEL SECURITY;

-- Mobile Sessions Policies
CREATE POLICY "user_manage_own_sessions" ON mobile_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "admin_view_mobile_sessions" ON mobile_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users owner
            JOIN users admin ON owner.university_id = admin.university_id
            WHERE admin.id = auth.uid() 
            AND admin.role = 'admin'
            AND owner.id = mobile_sessions.user_id
        )
    );

-- University Invitations Policies
CREATE POLICY "admin_manage_invitations" ON university_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND university_id = university_invitations.university_id
        )
    );

-- Anyone can view invitation by code (for registration)
CREATE POLICY "public_view_invitation_by_code" ON university_invitations
    FOR SELECT USING (
        invitation_code IS NOT NULL AND
        expires_at > NOW() AND
        is_used = false
    );

-- Attendance Reports Policies
CREATE POLICY "admin_manage_reports" ON attendance_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND university_id = attendance_reports.university_id
        )
    );

CREATE POLICY "teacher_view_reports" ON attendance_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'teacher'
            AND university_id = (
                SELECT university_id FROM users WHERE id = auth.uid()
            )
        ) AND (
            attendance_reports.section_id IN (
                SELECT DISTINCT t.section_id FROM timetables t 
                WHERE t.instructor_id = auth.uid()
            ) OR
            attendance_reports.course_id IN (
                SELECT DISTINCT t.course_id FROM timetables t 
                WHERE t.instructor_id = auth.uid()
            )
        )
    );

CREATE POLICY "student_view_own_reports" ON attendance_reports
    FOR SELECT USING (student_id = auth.uid());

-- System Settings Policies
CREATE POLICY "admin_manage_settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND (
                university_id = system_settings.university_id OR
                system_settings.university_id IS NULL
            )
        )
    );

-- TOTP Sessions Policies
CREATE POLICY "teacher_manage_totp" ON totp_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM timetables t
            JOIN lecture_sessions ls ON t.id = ls.timetable_id
            WHERE t.instructor_id = auth.uid()
            AND ls.id = totp_sessions.lecture_session_id
        )
    );

CREATE POLICY "admin_view_totp" ON totp_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN programs p ON u.university_id = p.university_id
            JOIN branches b ON p.id = b.program_id
            JOIN sections s ON b.id = s.branch_id
            JOIN timetables t ON s.id = t.section_id
            JOIN lecture_sessions ls ON t.id = ls.timetable_id
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
            AND ls.id = totp_sessions.lecture_session_id
        )
    );

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Profile images - users can upload their own
CREATE POLICY "Profile image upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Profile image access" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

-- University logos - admin only
CREATE POLICY "University logo upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'university-logos' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "University logo access" ON storage.objects
    FOR SELECT USING (bucket_id = 'university-logos');

-- ATMA files - university isolation
CREATE POLICY "ATMA files upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'atma-files' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin')
        )
    );

CREATE POLICY "ATMA files access" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'atma-files' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()
        )
    );

-- Reports - admin access
CREATE POLICY "Reports access" ON storage.objects
    FOR ALL USING (
        bucket_id = 'reports' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- Attendance statistics view
CREATE MATERIALIZED VIEW attendance_statistics AS
SELECT
    s.id as student_id,
    s.full_name as student_name,
    s.enrollment_id,
    c.id as course_id,
    c.course_name,
    c.course_code,
    COUNT(ls.id) as total_sessions,
    COUNT(CASE WHEN ar.attendance_status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN ar.attendance_status = 'late' THEN 1 END) as late_count,
    COUNT(CASE WHEN ar.attendance_status = 'absent' THEN 1 END) as absent_count,
    ROUND(
        (COUNT(CASE WHEN ar.attendance_status = 'present' THEN 1 END) * 100.0) / 
        NULLIF(COUNT(ls.id), 0), 2
    ) as attendance_percentage,
    s.university_id
FROM users s
JOIN student_enrollments se ON s.id = se.student_id
JOIN sections sec ON se.section_id = sec.id
JOIN timetables t ON sec.id = t.section_id
JOIN courses c ON t.course_id = c.id
JOIN lecture_sessions ls ON t.id = ls.timetable_id
LEFT JOIN attendance_records ar ON ls.id = ar.lecture_session_id AND s.id = ar.student_id
WHERE s.role = 'student' 
AND ls.session_status = 'completed'
AND se.is_active = true
GROUP BY s.id, s.full_name, s.enrollment_id, c.id, c.course_name, c.course_code, s.university_id;

-- Create index on materialized view
CREATE INDEX idx_attendance_stats_student ON attendance_statistics(student_id);
CREATE INDEX idx_attendance_stats_course ON attendance_statistics(course_id);
CREATE INDEX idx_attendance_stats_university ON attendance_statistics(university_id);
CREATE INDEX idx_attendance_stats_percentage ON attendance_statistics(attendance_percentage);

-- =============================================
-- SCHEDULED FUNCTIONS (CRON JOBS)
-- =============================================

-- Function to auto-generate daily lecture sessions
CREATE OR REPLACE FUNCTION generate_daily_sessions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    session_count INTEGER := 0;
    timetable_record RECORD;
    day_of_week INTEGER;
BEGIN
    -- Get day of week (1=Monday, 7=Sunday)
    day_of_week := EXTRACT(DOW FROM target_date);
    IF day_of_week = 0 THEN day_of_week := 7; END IF;
    
    -- Check if target date is a holiday
    IF EXISTS (
        SELECT 1 FROM academic_calendar 
        WHERE event_date = target_date 
        AND affects_attendance = true
        AND event_type IN ('holiday', 'vacation')
    ) THEN
        -- Mark as holiday, don't generate sessions
        RETURN 0;
    END IF;
    
    -- Generate sessions for all active timetables
    FOR timetable_record IN 
        SELECT t.* FROM timetables t
        WHERE t.day_of_week = day_of_week
        AND t.is_active = true
    LOOP
        -- Insert lecture session if not exists
        INSERT INTO lecture_sessions (
            timetable_id,
            scheduled_date,
            session_status,
            max_late_minutes
        )
        VALUES (
            timetable_record.id,
            target_date,
            'scheduled',
            timetable_record.max_late_minutes
        )
        ON CONFLICT DO NOTHING;
        
        session_count := session_count + 1;
    END LOOP;
    
    RETURN session_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send pending notifications
CREATE OR REPLACE FUNCTION process_pending_notifications()
RETURNS INTEGER AS $$
DECLARE
    notification_count INTEGER := 0;
    notification_record RECORD;
BEGIN
    -- Get pending notifications
    FOR notification_record IN
        SELECT * FROM notifications
        WHERE is_sent = false
        AND scheduled_for <= NOW()
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY scheduled_for
        LIMIT 100
    LOOP
        -- Mark as sent (actual sending would be handled by application)
        UPDATE notifications
        SET is_sent = true, sent_at = NOW()
        WHERE id = notification_record.id;
        
        notification_count := notification_count + 1;
    END LOOP;
    
    RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete old sensor data (older than 6 months)
    DELETE FROM sensor_data 
    WHERE created_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete read notifications older than 30 days
    DELETE FROM notifications 
    WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete expired TOTP sessions
    DELETE FROM totp_sessions 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    -- Archive old audit logs (move to separate table or delete)
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_statistics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY attendance_statistics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INVITATION SYSTEM FUNCTIONS
-- =============================================

-- Function to create invitation
CREATE OR REPLACE FUNCTION create_invitation(
    p_university_id UUID,
    p_email TEXT,
    p_role user_role,
    p_section_id UUID DEFAULT NULL,
    p_enrollment_id TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    invitation_code TEXT;
BEGIN
    -- Generate unique invitation code
    invitation_code := encode(gen_random_bytes(16), 'hex');
    
    -- Insert invitation
    INSERT INTO university_invitations (
        university_id,
        email,
        role,
        invited_by,
        invitation_code,
        section_id,
        enrollment_id,
        expires_at
    ) VALUES (
        p_university_id,
        p_email,
        p_role,
        auth.uid(),
        invitation_code,
        p_section_id,
        p_enrollment_id,
        NOW() + INTERVAL '7 days'
    );
    
    RETURN invitation_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use invitation
CREATE OR REPLACE FUNCTION use_invitation(
    p_invitation_code TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM university_invitations
    WHERE invitation_code = p_invitation_code
    AND expires_at > NOW()
    AND is_used = false;
    
    IF invitation_record IS NULL THEN
        RETURN '{"success": false, "error": "Invalid or expired invitation"}';
    END IF;
    
    -- Update user with invitation details
    UPDATE users SET
        university_id = invitation_record.university_id,
        role = invitation_record.role,
        enrollment_id = invitation_record.enrollment_id
    WHERE id = p_user_id;
    
    -- Create enrollment if student
    IF invitation_record.role = 'student' AND invitation_record.section_id IS NOT NULL THEN
        INSERT INTO student_enrollments (student_id, section_id)
        VALUES (p_user_id, invitation_record.section_id)
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Mark invitation as used
    UPDATE university_invitations SET
        is_used = true,
        used_at = NOW(),
        used_by = p_user_id
    WHERE id = invitation_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'university_id', invitation_record.university_id,
        'role', invitation_record.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTIONS FOR MOBILE APP (UPDATED)
-- =============================================

-- Function to get student's current attendance status
CREATE OR REPLACE FUNCTION get_student_attendance_summary(p_student_id UUID)
RETURNS TABLE(
    course_name TEXT,
    course_code TEXT,
    total_sessions INTEGER,
    present_count INTEGER,
    attendance_percentage DECIMAL(5,2),
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.course_name,
        c.course_code,
        COUNT(ls.id)::INTEGER as total_sessions,
        COUNT(CASE WHEN ar.attendance_status = 'present' THEN 1 END)::INTEGER as present_count,
        ROUND(
            (COUNT(CASE WHEN ar.attendance_status = 'present' THEN 1 END) * 100.0) / 
            NULLIF(COUNT(ls.id), 0), 2
        ) as attendance_percentage,
        CASE 
            WHEN ROUND(
                (COUNT(CASE WHEN ar.attendance_status = 'present' THEN 1 END) * 100.0) / 
                NULLIF(COUNT(ls.id), 0), 2
            ) >= 75 THEN 'Good'
            WHEN ROUND(
                (COUNT(CASE WHEN ar.attendance_status = 'present' THEN 1 END) * 100.0) / 
                NULLIF(COUNT(ls.id), 0), 2
            ) >= 60 THEN 'Warning'
            ELSE 'Critical'
        END as status
    FROM student_enrollments se
    JOIN sections sec ON se.section_id = sec.id
    JOIN timetables t ON sec.id = t.section_id
    JOIN courses c ON t.course_id = c.id
    JOIN lecture_sessions ls ON t.id = ls.timetable_id
    LEFT JOIN attendance_records ar ON ls.id = ar.lecture_session_id AND ar.student_id = p_student_id
    WHERE se.student_id = p_student_id
    AND ls.session_status = 'completed'
    AND se.is_active = true
    GROUP BY c.id, c.course_name, c.course_code
    ORDER BY c.course_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get today's schedule for a student
CREATE OR REPLACE FUNCTION get_student_today_schedule(p_student_id UUID)
RETURNS TABLE(
    session_id UUID,
    course_name TEXT,
    course_code TEXT,
    instructor_name TEXT,
    room_number TEXT,
    building_name TEXT,
    start_time TIME,
    end_time TIME,
    session_status session_status_enum,
    attendance_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ls.id as session_id,
        c.course_name,
        c.course_code,
        u.full_name as instructor_name,
        r.room_number,
        b.name as building_name,
        t.start_time,
        t.end_time,
        ls.session_status,
        COALESCE(ar.attendance_status::TEXT, 'not_marked') as attendance_status
    FROM student_enrollments se
    JOIN sections sec ON se.section_id = sec.id
    JOIN timetables t ON sec.id = t.section_id
    JOIN courses c ON t.course_id = c.id
    JOIN users u ON t.instructor_id = u.id
    JOIN rooms r ON t.room_id = r.id
    JOIN buildings b ON r.building_id = b.id
    JOIN lecture_sessions ls ON t.id = ls.timetable_id
    LEFT JOIN attendance_records ar ON ls.id = ar.lecture_session_id AND ar.student_id = p_student_id
    WHERE se.student_id = p_student_id
    AND ls.scheduled_date = CURRENT_DATE
    AND t.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)
    AND se.is_active = true
    ORDER BY t.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark attendance with validation
CREATE OR REPLACE FUNCTION mark_attendance(
    p_session_id UUID,
    p_student_id UUID,
    p_latitude DECIMAL(10,8),
    p_longitude DECIMAL(11,8),
    p_pressure_hpa DECIMAL(7,2),
    p_totp_code TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    validation_result JSONB;
    attendance_record_id UUID;
    final_status attendance_status_enum;
    is_late BOOLEAN := false;
    session_info RECORD;
BEGIN
    -- Get session information
    SELECT ls.*, t.start_time, t.end_time
    INTO session_info
    FROM lecture_sessions ls
    JOIN timetables t ON ls.timetable_id = t.id
    WHERE ls.id = p_session_id;
    
    -- Check if session exists and is active
    IF session_info IS NULL THEN
        RETURN '{"success": false, "error": "Session not found"}';
    END IF;
    
    IF session_info.session_status != 'active' THEN
        RETURN '{"success": false, "error": "Session is not active"}';
    END IF;
    
    -- Check if attendance is already marked
    IF EXISTS(
        SELECT 1 FROM attendance_records 
        WHERE lecture_session_id = p_session_id AND student_id = p_student_id
    ) THEN
        RETURN '{"success": false, "error": "Attendance already marked"}';
    END IF;
    
    -- Validate attendance
    validation_result := validate_attendance_marking(
        p_session_id, p_student_id, p_latitude, p_longitude, p_pressure_hpa, p_totp_code
    );
    
    -- Determine attendance status
    IF (validation_result->>'total_score')::DECIMAL >= 70 THEN
        -- Check if student is late
        IF NOW()::TIME > (session_info.start_time + (session_info.max_late_minutes || ' minutes')::INTERVAL) THEN
            final_status := 'late';
            is_late := true;
        ELSE
            final_status := 'present';
        END IF;
    ELSE
        final_status := 'absent';
    END IF;
    
    -- Insert attendance record
    INSERT INTO attendance_records (
        lecture_session_id,
        student_id,
        attendance_status,
        marked_at,
        marking_method,
        validation_score,
        geofence_valid,
        barometer_valid,
        totp_valid,
        is_proxy_suspected
    ) VALUES (
        p_session_id,
        p_student_id,
        final_status,
        NOW(),
        'student_app',
        (validation_result->>'total_score')::DECIMAL,
        (validation_result->>'geofence_valid')::BOOLEAN,
        (validation_result->>'barometer_valid')::BOOLEAN,
        (validation_result->>'totp_valid')::BOOLEAN,
        (validation_result->>'total_score')::DECIMAL < 50
    )
    RETURNING id INTO attendance_record_id;
    
    -- Insert sensor data
    INSERT INTO sensor_data (
        attendance_record_id,
        student_id,
        session_id,
        latitude,
        longitude,
        pressure_hpa,
        device_id,
        recorded_at
    ) VALUES (
        attendance_record_id,
        p_student_id,
        p_session_id,
        p_latitude,
        p_longitude,
        p_pressure_hpa,
        p_device_id,
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'attendance_status', final_status,
        'validation_score', (validation_result->>'total_score')::DECIMAL,
        'is_late', is_late,
        'record_id', attendance_record_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Create admin user function (to be called after user registration)
CREATE OR REPLACE FUNCTION create_admin_user(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO users (
        id,
        email,
        full_name,
        role,
        university_id,
        is_active
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        'admin',
        NULL,
        true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE users IS 'Enhanced users table with Supabase Auth integration and role-based access';
COMMENT ON TABLE universities IS 'University master data with timezone and contact information';
COMMENT ON TABLE buildings IS 'Physical buildings with geofencing coordinates for attendance validation';
COMMENT ON TABLE rooms IS 'Individual rooms with barometric pressure baselines for location verification';
COMMENT ON TABLE lecture_sessions IS 'Real-time lecture sessions with TOTP system for secure attendance';
COMMENT ON TABLE attendance_records IS 'Main attendance tracking with multi-layer validation scores';
COMMENT ON TABLE sensor_data IS 'Mobile sensor data for ML-based proxy detection and validation';
COMMENT ON TABLE academic_calendar IS 'Holiday and event management affecting attendance scheduling';

COMMENT ON FUNCTION calculate_attendance_percentage IS 'Calculates attendance percentage for a student with optional filters';
COMMENT ON FUNCTION generate_session_totp IS 'Generates time-based one-time password for lecture sessions';
COMMENT ON FUNCTION validate_attendance_marking IS 'Multi-layer validation for attendance marking including geofence, pressure, and TOTP';
COMMENT ON FUNCTION mark_attendance IS 'Complete attendance marking function with validation and sensor data logging';

-- =============================================
-- PERFORMANCE MONITORING
-- =============================================

-- Create performance monitoring view
CREATE VIEW performance_stats AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- =============================================
-- BACKUP AND MAINTENANCE
-- =============================================

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE(
    table_name TEXT,
    row_count BIGINT,
    total_size TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        t.n_tup_ins - t.n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
        pg_size_pretty(pg_indexes_size(c.oid)) as index_size
    FROM pg_stat_user_tables t
    JOIN pg_class c ON c.relname = t.relname
    WHERE t.schemaname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FINAL SETUP COMMANDS
-- =============================================

-- Refresh materialized view initially
REFRESH MATERIALIZED VIEW attendance_statistics;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Enable real-time for critical tables
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE attendance_records REPLICA IDENTITY FULL;
ALTER TABLE lecture_sessions REPLICA IDENTITY FULL;

-- =============================================
-- END OF SCHEMA
-- =============================================

-- Usage Examples:
-- SELECT generate_daily_sessions(CURRENT_DATE);
-- SELECT * FROM get_student_today_schedule('student-uuid-here');
-- SELECT * FROM get_student_attendance_summary('student-uuid-here');
-- SELECT mark_attendance('session-uuid', 'student-uuid', 12.345678, 77.123456, 1013.25, '123456', 'device123');