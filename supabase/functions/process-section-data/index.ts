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
  room: string;
  semester?: number;
}

interface StudentEnrollment {
  studentId: string;
  rollNumber: string;
  name: string;
  email?: string;
  phone?: string;
  year?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
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
    } = await req.json()

    console.log('Processing section data:', { sectionId, universityId, userId })

    // Start transaction-like operations
    const results = {
      timetableProcessed: 0,
      enrollmentProcessed: 0,
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
            .eq('roll_number', student.rollNumber)
            .eq('university_id', universityId)
            .single()

          let studentId = existingStudent?.id

          if (!studentId) {
            // Create new student user
            const { data: newStudent, error: createError } = await supabaseClient
              .from('users')
              .insert({
                university_id: universityId,
                roll_number: student.rollNumber,
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

          // Create enrollment record
          const { error: enrollError } = await supabaseClient
            .from('student_enrollments')
            .insert({
              student_id: studentId,
              section_id: sectionId,
              enrollment_date: new Date().toISOString().split('T')[0],
              is_active: true
            })
            .onConflict('student_id, section_id')

          if (enrollError && !enrollError.message.includes('duplicate')) {
            console.error('Error creating enrollment:', enrollError)
            results.errors.push(`Failed to enroll student ${student.name}: ${enrollError.message}`)
          } else {
            results.enrollmentProcessed++
          }

        } catch (error) {
          console.error('Error processing student:', error)
          results.errors.push(`Error processing student ${student.name}: ${error.message}`)
        }
      }
    }

    // 2. Process timetable data (create courses and timetable entries)
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
        return Response.json({ success: false, results }, { headers: corsHeaders })
      }

      for (const entry of timetableData) {
        try {
          // Find or create course
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

          // Find or create instructor
          let instructorId
          if (entry.instructor) {
            const { data: existingInstructor } = await supabaseClient
              .from('users')
              .select('id')
              .eq('full_name', entry.instructor)
              .eq('university_id', universityId)
              .eq('role', 'teacher')
              .single()

            if (existingInstructor) {
              instructorId = existingInstructor.id
            } else {
              // Create placeholder instructor
              const { data: newInstructor, error: instructorError } = await supabaseClient
                .from('users')
                .insert({
                  university_id: universityId,
                  full_name: entry.instructor,
                  role: 'teacher',
                  is_active: true
                })
                .select('id')
                .single()

              if (!instructorError) {
                instructorId = newInstructor.id
              }
            }
          }

          // Find or create room
          let roomId
          if (entry.room) {
            const { data: existingRoom } = await supabaseClient
              .from('rooms')
              .select('id')
              .eq('room_number', entry.room)
              .limit(1)
              .single()

            if (existingRoom) {
              roomId = existingRoom.id
            }
          }

          // Convert day name to number (1 = Monday, 7 = Sunday)
          const dayMap = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
            'friday': 5, 'saturday': 6, 'sunday': 7
          }
          const dayOfWeek = dayMap[entry.day.toLowerCase()] || 1

          // Create timetable entry
          const { error: timetableError } = await supabaseClient
            .from('timetables')
            .insert({
              section_id: sectionId,
              course_id: courseId,
              instructor_id: instructorId,
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
          results.errors.push(`Error processing timetable entry ${entry.courseCode}: ${error.message}`)
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
        const semesterStart = new Date(today.getFullYear(), today.getMonth(), 1) // Start of current month
        const semesterEnd = new Date(today.getFullYear(), today.getMonth() + 4, 0) // 4 months ahead

        for (const timetable of timetables) {
          // Generate sessions for each week
          const sessions = []
          const currentDate = new Date(semesterStart)

          while (currentDate <= semesterEnd) {
            if (currentDate.getDay() === timetable.day_of_week % 7) {
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

    return Response.json({
      success: true,
      results
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('Edge function error:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { 
      status: 500,
      headers: corsHeaders 
    })
  }
})