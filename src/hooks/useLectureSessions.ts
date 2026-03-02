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

      // STEP 1: Fetch timetable IDs for this section (optional, special classes may not have timetables)
      console.log('\n📍 STEP 1: Fetching timetables for section...');
      console.log('Query: SELECT id, start_time, end_time, course_id, room_id, instructor_ids FROM timetables WHERE section_id = ?', options.sectionId);
      
      const { data: timetables, error: timetableError } = await supabase
        .from('timetables')
        .select('id, start_time, end_time, course_id, room_id, instructor_ids, day_of_week, university_id')
        .eq('section_id', options.sectionId);

      if (timetableError) {
        console.warn('⚠️ STEP 1 WARNING - Timetable fetch error (continuing for special classes):', timetableError);
      }

      if (!timetables || timetables.length === 0) {
        console.warn('⚠️ STEP 1 RESULT: No timetables found for section:', options.sectionId, '(special classes may still exist)');
      }

      console.log('✅ STEP 1 RESULT: Found timetables', {
        count: timetables?.length || 0,
        timetables: timetables?.map(t => ({
          id: t.id,
          time: `${t.start_time} - ${t.end_time}`,
          course_id: t.course_id,
          instructor_ids: t.instructor_ids,
          room_id: t.room_id,
          day_of_week: t.day_of_week,
        })) || [],
      });

      // STEP 1b: Fetch course details for these timetables
      console.log('\n📍 STEP 1b: Fetching course details...');
      const courseIds = [...new Set((timetables || []).map(t => t.course_id).filter(Boolean))];
      
      // Collect all instructor IDs from instructor_ids array
      const instructorIdSet = new Set<string>();
      (timetables || []).forEach(t => {
        if (Array.isArray(t.instructor_ids) && t.instructor_ids.length > 0) {
          t.instructor_ids.forEach((id: string) => instructorIdSet.add(id));
        }
      });
      const instructorIds = Array.from(instructorIdSet);
      
      console.log('Course IDs to fetch:', courseIds);
      console.log('Instructor IDs to fetch (from instructor_ids array):', instructorIds);

      let coursesData: any[] = [];
      let usersData: any[] = [];

      if (courseIds.length > 0) {
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, code, name, course_type, credit_hours')
          .in('id', courseIds);

        if (coursesError) {
          console.warn('⚠️ Course fetch error (non-blocking):', coursesError);
        } else {
          // Map columns to expected names for UI
          coursesData = (courses || []).map(c => ({
            ...c,
            course_code: c.code,
            course_name: c.name,
            credits: c.credit_hours,
          }));
          console.log('✅ Found courses:', coursesData.length);
        }
      }

      if (instructorIds.length > 0) {
        const { data: instructors, error: instructorsError } = await supabase
          .from('instructors')
          .select('id, name, code, email')
          .in('id', instructorIds);

        if (instructorsError) {
          console.warn('⚠️ Instructor fetch error (non-blocking):', instructorsError);
        } else {
          // Map instructor columns to expected names for UI
          usersData = (instructors || []).map(i => ({
            ...i,
            full_name: i.name,
            id: i.id,
            name: i.name,
            code: i.code,
            email: i.email,
          }));
          console.log('✅ Found instructors:', usersData.length);
        }
      }

      // Create lookup maps for quick access
      const courseMap = Object.fromEntries(coursesData.map(c => [c.id, c]));
      const userMap = Object.fromEntries(usersData.map(u => [u.id, u]));

      // Enrich timetables with course and instructor data (if timetables exist)
      const enrichedTimetables = (timetables || []).map(t => {
        // Collect instructor data for this timetable from instructor_ids array
        const instructorsForThisTimetable = [];
        if (Array.isArray(t.instructor_ids) && t.instructor_ids.length > 0) {
          t.instructor_ids.forEach((id: string) => {
            if (userMap[id]) {
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

      const timetableIds = timetables?.map(t => t.id) || [];
      console.log('Extracted Timetable IDs:', timetableIds);
      const timetableMap = Object.fromEntries(enrichedTimetables.map(t => [t.id, t]));

      // STEP 2: Fetch lecture sessions for these timetable IDs AND fetch special class sessions (timetable_id = NULL)
      console.log('\n📍 STEP 2: Fetching lecture sessions (timetable-based + special classes)...');
      
      let sessionsData: any[] = [];

      // If we have timetable IDs, fetch timetable-based sessions
      if (timetableIds.length > 0) {
        console.log('STEP 2a: Fetching timetable-based sessions WHERE timetable_id IN (...)...');
        let query = supabase
          .from('lecture_sessions')
          .select('*')
          .in('timetable_id', timetableIds);

        // Apply date filter if provided
        if (options.date) {
          query = query.eq('session_date', options.date);
          console.log('Applied date filter:', options.date);
        }

        // Apply status filter if provided
        if (options.statusFilter) {
          query = query.eq('is_cancelled', options.statusFilter === 'cancelled');
        }

        const { data: timetableBasedSessions, error: timetableSessionsError } = await query
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (timetableSessionsError) {
          console.warn('⚠️ STEP 2a WARNING - Timetable sessions fetch error:', timetableSessionsError);
        } else {
          sessionsData = timetableBasedSessions || [];
          console.log('✅ STEP 2a RESULT: Found timetable-based sessions:', sessionsData.length);
        }
      }

      // Always fetch special class sessions for this section (timetable_id IS NULL + is_special_class = true)
      console.log('STEP 2b: Fetching special class sessions WHERE section_id = ? AND timetable_id IS NULL AND is_special_class = true...');
      let specialClassQuery = supabase
        .from('lecture_sessions')
        .select('*')
        .eq('section_id', options.sectionId)
        .is('timetable_id', null)
        .eq('is_special_class', true);

      // Apply date filter if provided
      if (options.date) {
        specialClassQuery = specialClassQuery.eq('session_date', options.date);
      }

      // Apply status filter if provided
      if (options.statusFilter) {
        specialClassQuery = specialClassQuery.eq('is_cancelled', options.statusFilter === 'cancelled');
      }

      const { data: specialClassSessions, error: specialClassError } = await specialClassQuery
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (specialClassError) {
        console.warn('⚠️ STEP 2b WARNING - Special class sessions fetch error:', specialClassError);
      } else {
        const specialSessions = specialClassSessions || [];
        console.log('✅ STEP 2b RESULT: Found special class sessions:', specialSessions.length);
        
        // Merge special class sessions with timetable-based sessions
        sessionsData = [...sessionsData, ...specialSessions];
        
        // Re-sort after merging
        sessionsData.sort((a, b) => {
          const dateCompare = new Date(a.session_date).getTime() - new Date(b.session_date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.start_time.localeCompare(b.start_time);
        });
      }

      console.log('✅ STEP 2 RESULT: Combined sessions (timetable-based + special classes)', {
        timetable_based: timetableIds.length > 0 ? 'fetched' : 'skipped',
        special_classes: 'fetched',
        total_sessions: sessionsData.length,
      });

      // STEP 3: Attach timetable data to sessions for UI rendering (if applicable)
      // STEP 3a: For special classes, fetch course and room details
      console.log('\n📍 STEP 3: Enriching sessions with course/room data...');
      
      const specialSessions = sessionsData.filter(s => s.is_special_class);
      const specialCourseIds = [...new Set(specialSessions.map(s => s.course_id).filter(Boolean))];
      const specialRoomIds = [...new Set(specialSessions.map(s => s.room_id).filter(Boolean))];
      const specialInstructorIds = [...new Set(specialSessions.flatMap((s: any) => s.instructor_ids || []))];
      
      let specialCoursesData: any[] = [];
      let specialRoomsData: any[] = [];
      let specialUsersData: any[] = [];
      
      // Fetch courses for special classes
      if (specialCourseIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, code, name, course_type, credit_hours')
          .in('id', specialCourseIds);
        
        if (courses) {
          specialCoursesData = courses.map(c => ({
            ...c,
            course_code: c.code,
            course_name: c.name,
            credits: c.credit_hours,
          }));
          console.log('✅ Found special class courses:', specialCoursesData.length);
        }
      }
      
      // Fetch rooms for special classes
      if (specialRoomIds.length > 0) {
        const { data: rooms } = await supabase
          .from('rooms')
          .select('id, room_number, room_name, capacity')
          .in('id', specialRoomIds);
        
        if (rooms) {
          specialRoomsData = rooms;
          console.log('✅ Found special class rooms:', specialRoomsData.length);
        }
      }
      
      // Fetch instructors for special classes
      if (specialInstructorIds.length > 0) {
        const { data: instructors } = await supabase
          .from('instructors')
          .select('id, name, code, email')
          .in('id', specialInstructorIds);
        
        if (instructors) {
          specialUsersData = instructors.map(i => ({
            ...i,
            full_name: i.name,
            id: i.id,
            name: i.name,
            code: i.code,
            email: i.email,
          }));
          console.log('✅ Found special class instructors:', specialUsersData.length);
        }
      }
      
      // Create lookup maps
      const specialCourseMap = Object.fromEntries(specialCoursesData.map(c => [c.id, c]));
      const specialRoomMap = Object.fromEntries(specialRoomsData.map(r => [r.id, r]));
      const specialUserMap = Object.fromEntries(specialUsersData.map(u => [u.id, u]));
      
      const enrichedSessions = (sessionsData || []).map(session => {
        if (session.timetable_id && timetableMap[session.timetable_id]) {
          const timetable = timetableMap[session.timetable_id];
          console.log(`Enriching timetable-based session ${session.id}:`, {
            session_id: session.id,
            timetable_id: session.timetable_id,
            timetable_data: {
              time: `${timetable.start_time} - ${timetable.end_time}`,
              course_id: timetable.course_id,
              room_id: timetable.room_id,
            },
          });
          return {
            ...session,
            timetables: timetable,
          };
        } else if (session.is_special_class) {
          // Special class session - enrich with course, room, and instructor data
          const course = specialCourseMap[session.course_id];
          const room = session.room_id ? specialRoomMap[session.room_id] : null;
          const instructors = Array.isArray(session.instructor_ids) 
            ? session.instructor_ids.map((id: string) => specialUserMap[id]).filter(Boolean)
            : [];
          
          console.log(`Enriching special class session ${session.id}:`, {
            session_id: session.id,
            is_special_class: session.is_special_class,
            course_id: session.course_id,
            room_id: session.room_id,
            has_course: !!course,
            has_room: !!room,
            instructor_count: instructors.length,
          });
          
          return {
            ...session,
            timetables: {
              start_time: session.start_time,
              end_time: session.end_time,
              courses: course,
              rooms: room,
              users: instructors.length > 0 ? instructors : null,
            },
          };
        } else {
          // Fallback for any other sessions
          console.log(`Session ${session.id}: No timetable and not special class`);
          return {
            ...session,
            timetables: null,
          };
        }
      });

      console.log('✅ STEP 3 RESULT: Enriched sessions ready for rendering', {
        total_enriched: enrichedSessions.length,
        with_timetable_data: enrichedSessions.filter(s => s.timetables).length,
        special_class_sessions: enrichedSessions.filter(s => s.is_special_class).length,
      });

      console.log('\n🎉 FETCH COMPLETE:', {
        summary: {
          timetables_fetched: timetableIds.length,
          timetable_based_sessions: sessionsData.filter(s => s.timetable_id).length,
          special_class_sessions: sessionsData.filter(s => s.is_special_class).length,
          total_enriched_sessions: enrichedSessions.length,
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

  const fetchSemesters = useCallback(async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, number, academic_year')
        .eq('program_id', programId)
        .eq('is_active', true)
        .order('academic_year', { ascending: false })
        .order('number', { ascending: true });

      if (!error) {
        setYears(data || []); // Reusing state for backward compatibility
      }
    } catch (err) {
      console.error('Error fetching semesters:', err);
    }
  }, []);

  const fetchSections = useCallback(async (branchId: string, semesterId: string) => {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name')
        .eq('branch_id', branchId)
        .eq('semester_id', semesterId)
        .eq('is_active', true)
        .order('name');

      if (!error) {
        setSections(data || []);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  }, []);

  // New function to get semester details by ID
  const getSemesterById = useCallback(async (semesterId: string) => {
    try {
      const { data: dataArray, error } = await supabase
        .from('semesters')
        .select('id, name, number, academic_year, start_date, end_date')
        .eq('id', semesterId)
        .limit(1);

      const data = dataArray && dataArray.length > 0 ? dataArray[0] : null;
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('Error fetching semester details:', err);
    }
    return null;
  }, []);

  return {
    programs,
    branches,
    years, // This is now semesters data
    sections,
    loading,
    fetchBranches,
    fetchSemesters, // Changed from fetchYears
    fetchSections,
    getSemesterById, // New function to get semester details
  };
};

export const useHolidays = (universityId?: string, semesterId?: string) => {
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!universityId || !semesterId) return;

    const fetchHolidays = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('academic_calendar')
          .select('event_date, event_type')
          .eq('university_id', universityId)
          .eq('semester_id', semesterId)
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
  }, [universityId, semesterId]);

  return { holidays, loading, isHoliday: (date: string) => holidays.has(date) };
};
