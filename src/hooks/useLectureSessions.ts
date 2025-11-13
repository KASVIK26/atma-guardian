import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { LectureSession, Timetable } from '@/types/database';

interface UseLecrureSessionsOptions {
  sectionId?: string;
  date?: string;
  statusFilter?: string;
}

export const useLectureSessions = (options: UseLecrureSessionsOptions) => {
  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!options.sectionId) {
      console.warn('⚠️ No sectionId provided to useLectureSessions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.group('📋 LECTURE SESSIONS FETCH - Step-by-Step');
      console.log('🔍 Input Parameters:', {
        sectionId: options.sectionId,
        date: options.date || 'Not specified',
        statusFilter: options.statusFilter || 'None',
      });

      // STEP 1: Fetch timetable IDs for this section
      console.log('\n📍 STEP 1: Fetching timetables for section...');
      console.log('Query: SELECT id, start_time, end_time, course_id, room_id, instructor_id, instructor_ids FROM timetables WHERE section_id = ?', options.sectionId);
      
      const { data: timetables, error: timetableError } = await supabase
        .from('timetables')
        .select('id, start_time, end_time, course_id, room_id, instructor_id, instructor_ids')
        .eq('section_id', options.sectionId);

      if (timetableError) {
        console.error('❌ STEP 1 FAILED - Timetable fetch error:', timetableError);
        throw timetableError;
      }

      if (!timetables || timetables.length === 0) {
        console.warn('⚠️ STEP 1 RESULT: No timetables found for section:', options.sectionId);
        setSessions([]);
        console.groupEnd();
        return;
      }

      console.log('✅ STEP 1 RESULT: Found timetables', {
        count: timetables.length,
        timetables: timetables.map(t => ({
          id: t.id,
          time: `${t.start_time} - ${t.end_time}`,
          course_id: t.course_id,
          instructor_id: t.instructor_id,
          instructor_ids: t.instructor_ids,
          room_id: t.room_id,
        })),
      });

      // STEP 1b: Fetch course details for these timetables
      console.log('\n📍 STEP 1b: Fetching course details...');
      const courseIds = [...new Set(timetables.map(t => t.course_id).filter(Boolean))];
      
      // Collect all instructor IDs from both instructor_id and instructor_ids
      const instructorIdSet = new Set<string>();
      timetables.forEach(t => {
        if (t.instructor_id) instructorIdSet.add(t.instructor_id);
        if (Array.isArray(t.instructor_ids) && t.instructor_ids.length > 0) {
          t.instructor_ids.forEach((id: string) => instructorIdSet.add(id));
        }
      });
      const instructorIds = Array.from(instructorIdSet);
      
      console.log('Course IDs to fetch:', courseIds);
      console.log('Instructor IDs to fetch (from both instructor_id and instructor_ids):', instructorIds);

      let coursesData: any[] = [];
      let usersData: any[] = [];

      if (courseIds.length > 0) {
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, course_code, course_name, course_type, credits')
          .in('id', courseIds);

        if (coursesError) {
          console.warn('⚠️ Course fetch error (non-blocking):', coursesError);
        } else {
          coursesData = courses || [];
          console.log('✅ Found courses:', coursesData.length);
        }
      }

      if (instructorIds.length > 0) {
        const { data: instructors, error: instructorsError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', instructorIds);

        if (instructorsError) {
          console.warn('⚠️ Instructor fetch error (non-blocking):', instructorsError);
        } else {
          usersData = instructors || [];
          console.log('✅ Found instructors:', usersData.length);
        }
      }

      // Create lookup maps for quick access
      const courseMap = Object.fromEntries(coursesData.map(c => [c.id, c]));
      const userMap = Object.fromEntries(usersData.map(u => [u.id, u]));

      // Enrich timetables with course and instructor data
      const enrichedTimetables = timetables.map(t => {
        // Collect instructor data for this timetable
        const instructorsForThisTimetable = [];
        if (t.instructor_id && userMap[t.instructor_id]) {
          instructorsForThisTimetable.push(userMap[t.instructor_id]);
        }
        if (Array.isArray(t.instructor_ids) && t.instructor_ids.length > 0) {
          t.instructor_ids.forEach((id: string) => {
            if (userMap[id] && !instructorsForThisTimetable.find(inst => inst.id === id)) {
              instructorsForThisTimetable.push(userMap[id]);
            }
          });
        }
        
        return {
          ...t,
          courses: courseMap[t.course_id] || null,
          users: instructorsForThisTimetable.length > 0 ? instructorsForThisTimetable : null,
        };
      });

      console.log('✅ STEP 1b RESULT: Enriched timetables with course and instructor data', {
        timetables_with_courses: enrichedTimetables.filter(t => t.courses).length,
        timetables_with_instructors: enrichedTimetables.filter(t => t.users).length,
      });

      const timetableIds = timetables.map(t => t.id);
      console.log('Extracted Timetable IDs:', timetableIds);
      const timetableMap = Object.fromEntries(enrichedTimetables.map(t => [t.id, t]));

      // STEP 2: Fetch lecture sessions for these timetable IDs
      console.log('\n📍 STEP 2: Fetching lecture sessions for timetable IDs...');
      let query = supabase
        .from('lecture_sessions')
        .select('*')
        .in('timetable_id', timetableIds);

      console.log('Base Query: SELECT * FROM lecture_sessions WHERE timetable_id IN (...)', {
        timetable_ids: timetableIds,
      });

      // STEP 3: Apply date filter if provided
      if (options.date) {
        query = query.eq('scheduled_date', options.date);
        console.log('STEP 3: Applied date filter', {
          date_filter: options.date,
        });
      } else {
        console.log('STEP 3: No date filter applied');
      }

      // STEP 4: Apply status filter if provided
      if (options.statusFilter) {
        query = query.eq('session_status', options.statusFilter);
        console.log('STEP 4: Applied status filter', {
          status_filter: options.statusFilter,
        });
      } else {
        console.log('STEP 4: No status filter applied');
      }

      // STEP 5: Order by date and time
      query = query.order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true });
      console.log('STEP 5: Applied ordering - by scheduled_date ASC, then scheduled_start_time ASC');

      const { data: sessionsData, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ STEP 2 FAILED - Session fetch error:', fetchError);
        throw fetchError;
      }

      console.log('✅ STEP 2 RESULT: Found sessions', {
        count: sessionsData?.length || 0,
        sessions: sessionsData?.map(s => ({
          id: s.id,
          timetable_id: s.timetable_id,
          scheduled_date: s.scheduled_date,
          scheduled_start_time: s.scheduled_start_time,
          scheduled_end_time: s.scheduled_end_time,
          session_status: s.session_status,
          attendance_open: s.attendance_open,
          notes: s.notes || 'None',
        })) || [],
      });

      // STEP 6: Attach timetable data to sessions for UI rendering
      console.log('\n📍 STEP 6: Enriching sessions with timetable data...');
      const enrichedSessions = (sessionsData || []).map(session => {
        const timetable = timetableMap[session.timetable_id];
        console.log(`Enriching session ${session.id}:`, {
          session_id: session.id,
          timetable_id: session.timetable_id,
          timetable_data: timetable ? {
            time: `${timetable.start_time} - ${timetable.end_time}`,
            course_id: timetable.course_id,
            instructor_id: timetable.instructor_id,
            room_id: timetable.room_id,
          } : 'NOT FOUND',
        });
        return {
          ...session,
          timetables: timetable,
        };
      });

      console.log('✅ STEP 6 RESULT: Enriched sessions ready for rendering', {
        total_enriched: enrichedSessions.length,
      });

      console.log('\n🎉 FETCH COMPLETE:', {
        summary: {
          timetables_fetched: timetables.length,
          sessions_fetched: sessionsData?.length || 0,
          enriched_sessions: enrichedSessions.length,
          filters_applied: {
            date: !!options.date,
            status: !!options.statusFilter,
          },
        },
      });

      setSessions(enrichedSessions);
      console.groupEnd();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sessions';
      setError(message);
      console.error('\n❌ ERROR FETCHING LECTURE SESSIONS:', {
        error: err,
        message: message,
        section_id: options.sectionId,
      });
      console.groupEnd();
    } finally {
      setLoading(false);
    }
  }, [options.sectionId, options.date, options.statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
};

interface UseFilterOptionsOptions {
  universityId?: string;
}

export const useFilterOptions = (options: UseFilterOptionsOptions) => {
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [years, setYears] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch programs
  useEffect(() => {
    if (!options.universityId) return;

    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('id, name, code')
          .eq('university_id', options.universityId)
          .eq('is_active', true)
          .order('name');

        if (!error) {
          setPrograms(data || []);
        }
      } catch (err) {
        console.error('Error fetching programs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [options.universityId]);

  const fetchBranches = useCallback(async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('program_id', programId)
        .eq('is_active', true)
        .order('name');

      if (!error) {
        setBranches(data || []);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  }, []);

  const fetchYears = useCallback(async (universityId: string) => {
    try {
      const { data, error } = await supabase
        .from('years')
        .select('id, academic_year, year_number')
        .eq('university_id', universityId)
        .eq('is_active', true)
        .order('year_number');

      if (!error) {
        setYears(data || []);
      }
    } catch (err) {
      console.error('Error fetching years:', err);
    }
  }, []);

  const fetchSections = useCallback(async (branchId: string, yearId: string) => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name')
        .eq('branch_id', branchId)
        .eq('year_id', yearId)
        .eq('is_active', true)
        .order('name');

      if (!error) {
        setSections(data || []);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  }, []);

  return {
    programs,
    branches,
    years,
    sections,
    loading,
    fetchBranches,
    fetchYears,
    fetchSections,
  };
};

export const useHolidays = (universityId?: string, academicYear?: string) => {
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!universityId || !academicYear) return;

    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('academic_calendar')
          .select('event_date, event_type')
          .eq('university_id', universityId)
          .eq('academic_year', academicYear)
          .in('event_type', ['holiday', 'vacation', 'exam', 'semester_end']);

        if (!error && data) {
          const holidayDates = new Set(data.map(h => h.event_date));
          setHolidays(holidayDates);
        }
      } catch (err) {
        console.error('Error fetching holidays:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
  }, [universityId, academicYear]);

  return { holidays, loading, isHoliday: (date: string) => holidays.has(date) };
};
