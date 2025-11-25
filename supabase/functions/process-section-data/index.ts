import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TimetableEntry {
  day: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  instructorCode?: string;
  room: string;
  semester?: number;
}

interface StudentEnrollment {
  studentId: string;
  rollNumber: string;
  name: string;
  email?: string;
  regMailId?: string;
  phone?: string;
  year?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      sectionId,
      universityId,
      userId,
      timetableData,
      enrollmentData,
      uploadInfo 
    = await req.json()

    console.log('Processing section data:', { sectionId, universityId, userId })

    // Start transaction-like operations
    const results = {
      timetableProcessed: 0,
      enrollmentProcessed: 0,
      instructorsCreated: 0,
      lectureSessionsCreated: 0,
      errors: []
    }

    // 1. Process enrollment data first (create/link students)
    if (enrollmentData && enrollmentData.length > 0) {
      console.log('Processing enrollment data:', enrollmentData.length, 'students')
      
      for (const student of enrollmentData) {
        try {
          // Check if student already exists by roll number
          const { data: existingStudent } = await supabaseClient
            .from('users')
            .select('id')
            .eq('email', student.email)
            .eq('university_id', universityId)
            .single()

          let studentId = existingStudent?.id

          if (!studentId) {
            // Create new student user
            const { data: newStudent, error: createError } = await supabaseClient
              .from('users')
              .insert({
                university_id: universityId,
                enrollment_id: student.rollNumber,
                full_name: student.name,
                email: student.email,
                phone: student.phone,
                role: 'student',
                is_active: true
              })
              .select('id')
              .single()

            if (createError) {
              console.error('Error creating student:', createError)
              results.errors.push(`Failed to create student ${student.name}: ${createError.message}`)
              continue
            }
            studentId = newStudent.id
          }

          // Create enrollment record with reg_mail_id
          const { error: enrollError } = await supabaseClient
            .from('student_enrollments')
            .insert({
              student_id: studentId,
              section_id: sectionId,
              reg_mail_id: student.regMailId || student.email,
              enrollment_date: new Date().toISOString().split('T')[0],
              is_active: true
            })
            .select()

          if (enrollError && !enrollError.message?.includes('duplicate')) {
            console.error('Error creating enrollment:', enrollError)
            results.errors.push(`Failed to enroll student ${student.name}: ${enrollError.message}`)
          } else {
            results.enrollmentProcessed++
          }

        } catch (error) {
          console.error('Error processing student:', error)
          results.errors.push(`Error processing student ${student.name}: ${(error as Error).message}`)
        }
      }
    }

    // 2. Process timetable data (create instructors, courses, and timetable entries)
    if (timetableData && timetableData.length > 0) {
      console.log('Processing timetable data:', timetableData.length, 'entries')

      // Get section details for branch_id
      const { data: section } = await supabaseClient
        .from('sections')
        .select('branch_id, year_id')
        .eq('id', sectionId)
        .single()

      if (!section) {
        results.errors.push('Section not found')
        return new Response(JSON.stringify({ success: false, results }), { 
          headers: corsHeaders,
          status: 400
        })
      }

      // Keep track of processed instructors to avoid duplicates
      const processedInstructors = new Map<string, string>()

      for (const entry of timetableData) {
        try {
          // 2a. Find or create instructor (using instructor code)
          let instructorId = null
          const instructorCode = entry.instructorCode?.trim() || entry.instructor?.trim().split(' ')[0]

          if (instructorCode) {
            // Check if instructor already exists
            const { data: existingInstructor } = await supabaseClient
              .from('instructors')
              .select('id')
              .eq('instructor_code', instructorCode)
              .eq('university_id', universityId)
              .single()

            if (existingInstructor) {
              instructorId = existingInstructor.id
              processedInstructors.set(instructorCode, instructorId)
            } else if (!processedInstructors.has(instructorCode)) {
              // Create new instructor
              const { data: newInstructor, error: instructorError } = await supabaseClient
                .from('instructors')
                .insert({
                  university_id: universityId,
                  code: instructorCode,
                  name: entry.instructor || `Instructor ${instructorCode}`,
                  is_active: true
                })
                .select('id')
                .single()

              if (instructorError) {
                console.error('Error creating instructor:', instructorError)
                results.errors.push(`Failed to create instructor ${instructorCode}: ${instructorError.message}`)
              } else {
                instructorId = newInstructor.id
                processedInstructors.set(instructorCode, instructorId)
                results.instructorsCreated++
              }
            } else {
              instructorId = processedInstructors.get(instructorCode) || null
            }
          }

          // 2b. Find or create course
          let courseId
          const { data: existingCourse } = await supabaseClient
            .from('courses')
            .select('id')
            .eq('branch_id', section.branch_id)
            .eq('course_code', entry.courseCode)
            .single()

          if (existingCourse) {
            courseId = existingCourse.id
          } else {
            // Create new course
            const { data: newCourse, error: courseError } = await supabaseClient
              .from('courses')
              .insert({
                branch_id: section.branch_id,
                course_code: entry.courseCode,
                course_name: entry.courseName || entry.courseCode,
                credits: 3, // Default
                course_type: 'theory', // Default
                is_active: true
              })
              .select('id')
              .single()

            if (courseError) {
              console.error('Error creating course:', courseError)
              results.errors.push(`Failed to create course ${entry.courseCode}: ${courseError.message}`)
              continue
            }
            courseId = newCourse.id
          }

          // 2c. Find or create room
          let roomId
          if (entry.room) {
            const { data: existingRoom } = await supabaseClient
              .from('rooms')
              .select('id')
              .limit(1)
              .eq('room_number', entry.room)
              .single()

            if (existingRoom) {
              roomId = existingRoom.id
            }
          }

          // 2d. Convert day name to number (1 = Monday, 7 = Sunday)
          const dayMap = {
            'monday': 1, 'tue': 2, 'tuesday': 2, 'wed': 3, 'wednesday': 3, 
            'thursday': 4, 'thu': 4, 'friday': 5, 'fri': 5, 'saturday': 6, 'sat': 6, 
            'sunday': 7, 'sun': 7
          }
          const dayOfWeek = dayMap[entry.day.toLowerCase() as keyof typeof dayMap] || 1

          // 2e. Create timetable entry with instructor_code
          const { error: timetableError } = await supabaseClient
            .from('timetables')
            .insert({
              section_id: sectionId,
              course_id: courseId,
              instructor_id: instructorId, // Keep for backward compatibility
              instructor_code: instructorCode, // New instructor code field
              room_id: roomId,
              day_of_week: dayOfWeek,
              start_time: entry.startTime,
              end_time: entry.endTime,
              academic_year: new Date().getFullYear().toString(),
              semester: entry.semester || 1,
              is_active: true
            })

          if (timetableError) {
            console.error('Error creating timetable entry:', timetableError)
            results.errors.push(`Failed to create timetable entry for ${entry.courseCode}: ${timetableError.message}`)
          } else {
            results.timetableProcessed++
          }

        } catch (error) {
          console.error('Error processing timetable entry:', error)
          results.errors.push(`Error processing timetable entry ${entry.courseCode}: ${(error as Error).message}`)
        }
      }
    }

    // 3. Create upload tracking records
    if (uploadInfo) {
      if (uploadInfo.timetable) {
        await supabaseClient.from('timetable_uploads').insert({
          section_id: sectionId,
          file_id: uploadInfo.timetable.fileId,
          upload_type: 'timetable',
          original_filename: uploadInfo.timetable.filename,
          parsing_status: 'completed',
          total_records_found: timetableData?.length || 0,
          total_records_processed: results.timetableProcessed,
          uploaded_by: userId
        })
      }

      if (uploadInfo.enrollment) {
        await supabaseClient.from('enrollment_uploads').insert({
          section_id: sectionId,
          file_id: uploadInfo.enrollment.fileId,
          original_filename: uploadInfo.enrollment.filename,
          parsing_status: 'completed',
          total_students_found: enrollmentData?.length || 0,
          total_students_processed: results.enrollmentProcessed,
          uploaded_by: userId
        })
      }
    }

    // 4. Generate initial lecture sessions for the current semester
    if (results.timetableProcessed > 0) {
      const { data: timetables } = await supabaseClient
        .from('timetables')
        .select('*')
        .eq('section_id', sectionId)
        .eq('is_active', true)

      if (timetables) {
        const today = new Date()
        const semesterStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const semesterEnd = new Date(today.getFullYear(), today.getMonth() + 4, 0)

        for (const timetable of timetables) {
          const sessions = []
          const currentDate = new Date(semesterStart)

          while (currentDate <= semesterEnd) {
            // Adjust for JavaScript's getDay (0 = Sunday) vs our day_of_week (1 = Monday)
            const jsDay = currentDate.getDay()
            const ourDayFormat = jsDay === 0 ? 7 : jsDay
            
            if (ourDayFormat === timetable.day_of_week) {
              sessions.push({
                timetable_id: timetable.id,
                scheduled_date: currentDate.toISOString().split('T')[0],
                session_status: 'scheduled',
                attendance_open: false,
                max_late_minutes: 15
              })
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }

          if (sessions.length > 0) {
            const { error } = await supabaseClient
              .from('lecture_sessions')
              .insert(sessions)

            if (!error) {
              results.lectureSessionsCreated += sessions.length
            }
          }
        }
      }
    }

    console.log('Processing completed:', results)

    return new Response(JSON.stringify({
      success: true,
      results
    }), { headers: corsHeaders })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), { 
      status: 500,
      headers: corsHeaders 
    })
  }
})
