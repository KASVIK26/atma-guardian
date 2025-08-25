import { createClient } from '@supabase/supabase-js'
import type { University, User, SignupData } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Export the SignupData type for use in components
export type { SignupData }

// Auth helper functions
export const authHelpers = {
  // Register admin user and create university
  async registerAdmin(data: SignupData) {
    try {
      console.log('Starting admin registration...', { email: data.email })
      
      // First, create the auth user with role in metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: `${data.firstName} ${data.lastName}`,
            role: 'admin'
          }
        }
      })

      if (authError) {
        console.error('Auth signup error:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('No user returned from signup')
      }

      console.log('Auth user created:', authData.user.id)

      // Create university first - try with service role if regular fails
      let universityData, universityError
      
      // First attempt with authenticated user
      const universityInsert = await supabase
        .from('universities')
        .insert({
          name: data.universityName,
          code: data.universityCode,
          location: data.location,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone,
          timezone: data.timezone,
          is_active: true,
          settings: {}
        })
        .select()
        .single()

      universityData = universityInsert.data
      universityError = universityInsert.error

      if (universityError) {
        console.error('University creation error:', universityError)
        
        // If it's an RLS error, provide helpful message
        if (universityError.code === '42501' || universityError.message?.includes('row-level security')) {
          throw new Error(`RLS Policy Error: The database policies are still blocking university creation. 
          
Please run this in your Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Run the 'disable-rls-completely.sql' script
3. Try signup again

Error details: ${universityError.message}`)
        }
        
        throw universityError
      }

      console.log('University created:', universityData.id)

      // Now create the user profile with university_id
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: data.email,
          full_name: `${data.firstName} ${data.lastName}`,
          role: 'admin',
          university_id: universityData.id,
          is_active: true,
          login_count: 0,
          preferences: {}
        })

      if (userError) {
        console.error('User profile creation error:', userError)
        throw userError
      }

      console.log('User profile created successfully')

      return { 
        user: authData.user, 
        university: universityData,
        session: authData.session
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Sign in user
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get user profile
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        universities (*)
      `)
      .eq('id', userId)
      .single()
    
    return { data, error }
  }
}

// Database helper functions
export const dbHelpers = {
  // Create invitation
  async createInvitation(universityId: string, email: string, role: 'teacher' | 'student', sectionId?: string, enrollmentId?: string) {
    const { data, error } = await supabase.rpc('create_invitation', {
      p_university_id: universityId,
      p_email: email,
      p_role: role,
      p_section_id: sectionId,
      p_enrollment_id: enrollmentId
    })
    
    return { data, error }
  },

  // Use invitation (for registration)
  async useInvitation(invitationCode: string, userId: string) {
    const { data, error } = await supabase.rpc('use_invitation', {
      p_invitation_code: invitationCode,
      p_user_id: userId
    })
    
    return { data, error }
  },

  // Get student attendance summary
  async getStudentAttendanceSummary(studentId: string) {
    const { data, error } = await supabase.rpc('get_student_attendance_summary', {
      p_student_id: studentId
    })
    
    return { data, error }
  },

  // Get today's schedule for student
  async getStudentTodaySchedule(studentId: string) {
    const { data, error } = await supabase.rpc('get_student_today_schedule', {
      p_student_id: studentId
    })
    
    return { data, error }
  }
}

export default supabase
