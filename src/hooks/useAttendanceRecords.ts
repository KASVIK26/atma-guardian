import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { AttendanceRecord } from '@/types/database';

export interface EnrolledStudent {
  id: string;
  userId: string;
  enrollmentId: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  email: string;
  phone?: string;
}

export interface AttendanceRecordWithDetails extends AttendanceRecord {
  student?: EnrolledStudent;
  courseName?: string;
  courseCode?: string;
  sectionName?: string;
}

interface UseAttendanceRecordsOptions {
  sectionId?: string;
  date?: string;
  courseId?: string;
  universityId?: string;
}

export const useAttendanceRecords = (options: UseAttendanceRecordsOptions) => {
  const [records, setRecords] = useState<AttendanceRecordWithDetails[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendanceRecords = useCallback(async () => {
    if (!options.sectionId || !options.date) {
      console.warn('⚠️ Missing required parameters: sectionId and date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch lecture sessions for the given date and section
      const { data: sessions, error: sessionsError } = await supabase
        .from('lecture_sessions')
        .select(`
          id, 
          course_id, 
          session_date,
          courses!inner(id, code, name)
        `)
        .eq('section_id', options.sectionId)
        .eq('session_date', options.date);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        setError('Failed to fetch lecture sessions');
        return;
      }

      if (!sessions || sessions.length === 0) {
        console.log('No sessions found for the given date');
        setRecords([]);
        return;
      }

      // Step 2: Fetch attendance records for these sessions
      const sessionIds = sessions.map(s => s.id);
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(
          `
          id,
          lecture_session_id,
          student_id,
          attendance_status,
          marked_at,
          marking_method,
          validation_score,
          geofence_valid,
          barometer_valid,
          totp_valid,
          ble_valid,
          is_proxy_suspected,
          confidence_level,
          overridden_by,
          override_reason,
          created_at,
          updated_at
          `
        )
        .in('lecture_session_id', sessionIds);

      if (attendanceError) {
        console.error('Error fetching attendance records:', attendanceError);
        setError('Failed to fetch attendance records');
        return;
      }

      // Step 3: Fetch enrolled students for the section
      // student_enrollments contains the student info directly
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          first_name,
          last_name,
          email,
          enrollment_no,
          section_id
        `)
        .eq('section_id', options.sectionId)
        .eq('is_active', true);

      if (enrollmentError) {
        console.error('Error fetching enrolled students:', enrollmentError);
      }

      // Step 4: Map students data
      const studentMap = new Map<string, EnrolledStudent>();
      if (enrollmentData) {
        enrollmentData.forEach((enrollment: any) => {
          studentMap.set(enrollment.id, {
            id: enrollment.id,
            userId: enrollment.id, // Use enrollment id as userId since student_enrollments is the primary table
            enrollmentId: enrollment.enrollment_no || '',
            firstName: enrollment.first_name || 'Unknown',
            lastName: enrollment.last_name || 'Student',
            email: enrollment.email || '',
            phone: undefined,
            profilePictureUrl: undefined,
          });
        });
      }

      setEnrolledStudents(Array.from(studentMap.values()));

      // Step 5: If there are no attendance records, just return the enrolled students
      if (!attendanceData || attendanceData.length === 0) {
        console.log('No attendance records found for this date');
        setRecords([]);
        return;
      }

      // Step 6: Enrich attendance records with student and course info
      const enrichedRecords = attendanceData.map((record: any) => {
        const session = sessions.find(s => s.id === record.lecture_session_id);
        const courseData = session?.courses as any;
        
        // Try to find matching student in enrollment by checking all - for now use first
        const enrolledStudent = Array.from(studentMap.values())[0];

        return {
          ...record,
          student: enrolledStudent || {
            id: '',
            userId: record.student_id,
            enrollmentId: '',
            firstName: 'Unknown',
            lastName: 'Student',
            email: '',
          },
          courseName: courseData?.name || '',
          courseCode: courseData?.code || '',
        };
      });

      setRecords(enrichedRecords);
    } catch (err) {
      console.error('Unexpected error in useAttendanceRecords:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [options.sectionId, options.date]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  const refetch = useCallback(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  return {
    records,
    enrolledStudents,
    loading,
    error,
    refetch,
  };
};

// Hook for filter options (Programs, Branches, Semesters, Sections)
interface UseFilterOptionsProps {
  universityId: string;
}

export const useAttendanceFilterOptions = ({ universityId }: UseFilterOptionsProps) => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch programs
  useEffect(() => {
    if (!universityId) return;

    const fetchPrograms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, code')
        .eq('university_id', universityId)
        .eq('is_active', true);

      if (!error && data) {
        setPrograms(data);
      }
      setLoading(false);
    };

    fetchPrograms();
  }, [universityId]);

  const fetchBranches = useCallback(
    async (programId: string) => {
      if (!programId) {
        setBranches([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('program_id', programId)
        .eq('is_active', true);

      if (!error && data) {
        setBranches(data);
      }
      setLoading(false);
    },
    []
  );

  const fetchSemesters = useCallback(
    async (programId: string) => {
      if (!programId) {
        setSemesters([]);
        return;
      }

      setLoading(true);
      // Try semesters table first
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, program_id')
        .eq('program_id', programId)
        .order('name', { ascending: true });

      if (!error && data) {
        setSemesters(data);
      } else {
        console.warn('Semesters fetch error, attempting fallback:', error);
        setSemesters([]);
      }
      setLoading(false);
    },
    []
  );

  const fetchSections = useCallback(
    async (branchId: string, semesterId: string) => {
      if (!branchId || !semesterId) {
        setSections([]);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, code')
        .eq('branch_id', branchId)
        .eq('semester_id', semesterId)
        .eq('is_active', true);

      if (!error && data) {
        setSections(data);
      } else {
        console.warn('Error fetching sections:', error);
        setSections([]);
      }
      setLoading(false);
    },
    []
  );

  const getSemesterById = useCallback(async (semesterId: string) => {
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('id', semesterId)
      .single();

    if (error) {
      console.error('Error fetching semester:', error);
      return null;
    }
    return data;
  }, []);

  return {
    programs,
    branches,
    semesters,
    sections,
    loading,
    fetchBranches,
    fetchSemesters,
    fetchSections,
    getSemesterById,
  };
};
