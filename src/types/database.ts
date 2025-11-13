// Database types based on the ATMA schema
export type UserRole = 'admin' | 'teacher' | 'student';

export type RoomType = 'lecture_hall' | 'lab' | 'seminar_room' | 'auditorium' | 'classroom';

export type ProgramType = 'undergraduate' | 'postgraduate' | 'diploma' | 'certificate';

export type CourseType = 'theory' | 'practical' | 'project' | 'seminar';

export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'rescheduled';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type MarkingMethod = 'student_app' | 'teacher_manual' | 'admin_override' | 'system_auto';

export type NotificationType = 
  | 'attendance_warning' 
  | 'session_start' 
  | 'schedule_change' 
  | 'system_alert' 
  | 'low_attendance' 
  | 'proxy_detected' 
  | 'session_cancelled';

// Core database interfaces
export interface University {
  id: string;
  name: string;
  code: string;
  location: string;
  contact_email?: string;
  contact_phone?: string;
  timezone: string;
  logo_url?: string;
  is_active: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  university_id?: string;
  enrollment_id?: string;
  phone?: string;
  is_active: boolean;
  profile_image_url?: string;
  fcm_token?: string;
  last_login?: string;
  login_count: number;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  universities?: University;
}

export interface Program {
  id: string;
  university_id: string;
  name: string;
  code: string;
  duration_years: number;
  program_type: ProgramType;
  is_active: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  program_id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  // Relations
  programs?: Program;
}

export interface Year {
  id: string;
  university_id: string;
  academic_year: string;
  year_number: number;
  is_active: boolean;
  created_at: string;
}

export interface Section {
  id: string;
  branch_id: string;
  year_id: string;
  name: string;
  max_students: number;
  is_active: boolean;
  created_at: string;
  // Relations
  branches?: Branch;
  years?: Year;
}

export interface Building {
  id: string;
  university_id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  altitude_meters?: number;
  geofence_radius_meters: number;
  floor_count: number;
  address?: string;
  is_active: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  building_id: string;
  room_number: string;
  room_name?: string;
  floor_number: number;
  room_type: RoomType;
  capacity?: number;
  latitude?: number;
  longitude?: number;
  baseline_pressure_hpa?: number;
  is_active: boolean;
  created_at: string;
  // Relations
  buildings?: Building;
}

export interface Course {
  id: string;
  branch_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  course_type?: CourseType;
  semester?: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  // Relations
  branches?: Branch;
}

export interface Timetable {
  id: string;
  section_id: string;
  course_id: string;
  instructor_id: string;
  room_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year: string;
  semester?: number;
  is_active: boolean;
  created_at: string;
  // Relations
  sections?: Section;
  courses?: Course;
  users?: User;
  rooms?: Room;
}

export interface LectureSession {
  id: string;
  timetable_id: string;
  scheduled_date: string;
  actual_start_time?: string;
  actual_end_time?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  totp_secret?: string;
  current_totp?: string;
  totp_generated_at?: string;
  totp_expires_at?: string;
  totp_refresh_interval: number;
  session_status: SessionStatus;
  attendance_open: boolean;
  attendance_close_time?: string;
  max_late_minutes: number;
  notes?: string;
  semester_id?: string;
  is_special_class?: boolean;
  otp_mode?: string;
  created_at: string;
  updated_at: string;
  // Relations
  timetables?: Timetable;
}

export interface AttendanceRecord {
  id: string;
  lecture_session_id: string;
  student_id: string;
  attendance_status: AttendanceStatus;
  marked_at?: string;
  marking_method?: MarkingMethod;
  validation_score?: number;
  geofence_valid?: boolean;
  barometer_valid?: boolean;
  totp_valid?: boolean;
  ble_valid?: boolean;
  is_proxy_suspected: boolean;
  confidence_level?: number;
  overridden_by?: string;
  override_reason?: string;
  created_at: string;
  updated_at: string;
  // Relations
  lecture_sessions?: LectureSession;
  users?: User;
}

export interface SensorData {
  id: string;
  attendance_record_id?: string;
  student_id: string;
  session_id?: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  altitude?: number;
  pressure_hpa?: number;
  temperature_celsius?: number;
  humidity_percent?: number;
  accelerometer_x?: number;
  accelerometer_y?: number;
  accelerometer_z?: number;
  gyroscope_x?: number;
  gyroscope_y?: number;
  gyroscope_z?: number;
  device_id?: string;
  device_model?: string;
  os_version?: string;
  app_version?: string;
  battery_level?: number;
  network_type?: string;
  signal_strength?: number;
  ble_beacons?: Record<string, any>;
  wifi_networks?: Record<string, any>;
  recorded_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  data: Record<string, any>;
  is_read: boolean;
  is_sent: boolean;
  sent_at?: string;
  scheduled_for: string;
  expires_at?: string;
  created_at: string;
}

// Form interfaces
export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  universityName: string;
  universityCode: string;
  location: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  universityName: string;
  universityCode: string;
  location: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AttendanceSummary {
  course_name: string;
  course_code: string;
  total_sessions: number;
  present_count: number;
  attendance_percentage: number;
  status: string;
}

export interface TodaySchedule {
  session_id: string;
  course_name: string;
  course_code: string;
  instructor_name: string;
  room_number: string;
  building_name: string;
  start_time: string;
  end_time: string;
  session_status: SessionStatus;
  attendance_status: string;
}

// Dashboard interfaces
export interface DashboardStats {
  totalStudents: number;
  activeTeachers: number;
  liveSessions: number;
  attendanceRate: number;
}

export interface QuickAction {
  title: string;
  description: string;
  icon: any;
  action: string;
  color: string;
}

// Validation interfaces
export interface ValidationResult {
  geofence_valid: boolean;
  barometer_valid: boolean;
  totp_valid: boolean;
  total_score: number;
  distance_meters?: number;
  pressure_diff?: number;
}

export interface AttendanceMarkingData {
  sessionId: string;
  studentId: string;
  latitude: number;
  longitude: number;
  pressureHpa?: number;
  totpCode: string;
  deviceId?: string;
  sensorData?: Partial<SensorData>;
}
