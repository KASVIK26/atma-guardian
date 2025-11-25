import { createClient } from '@supabase/supabase-js'
import type { University, User, SignupData } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Always enable session persistence (Remember Me will be handled via redirect)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,  // Always persist to localStorage
    detectSessionInUrl: true
  }
})

// Export the SignupData type for use in components
export type { SignupData }

// Auth helper functions
export const authHelpers = {
  // Step 1: Send magic link for email verification
  async sendMagicLink(email: string) {
    try {
      console.log('Step 1: Sending magic link...', { email })
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true
        }
      })

      if (error) {
        console.error('Magic link send error:', error)
        throw error
      }

      console.log('✅ Magic link sent to:', email)
      return { success: true, email }
    } catch (error) {
      console.error('Magic link error:', error)
      throw error
    }
  },

  // Poll to wait for user email verification
  async waitForUserVerification(email: string, maxWaitTime: number = 600000) {
    try {
      console.log('Waiting for email verification...', { email, maxWaitTime })
      
      const startTime = Date.now()
      const pollInterval = 2000 // Check every 2 seconds
      let lastError = null

      while (Date.now() - startTime < maxWaitTime) {
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser()

          if (userError) {
            lastError = userError
            console.log('Not verified yet, checking again...')
            await new Promise(resolve => setTimeout(resolve, pollInterval))
            continue
          }

          if (user && user.email_confirmed_at) {
            console.log('✅ Email verified:', user.id)
            return { verified: true, user, error: null }
          }

          console.log('Email not confirmed yet, polling...')
        } catch (err) {
          console.log('Verification check failed, retrying...', err)
          lastError = err
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }

      console.log('❌ Email verification timeout')
      return { verified: false, user: null, error: 'Email verification timeout after 10 minutes' }
    } catch (error) {
      console.error('Verification wait error:', error)
      return { verified: false, user: null, error }
    }
  },

  // Resend magic link
  async resendMagicLink(email: string) {
    try {
      console.log('Resending magic link...', { email })
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true
        }
      })

      if (error) {
        console.error('Resend magic link error:', error)
        throw error
      }

      console.log('✅ Magic link resent to:', email)
      return { success: true }
    } catch (error) {
      console.error('Resend error:', error)
      throw error
    }
  },

  // Send OTP verification code
  async sendOTP(email: string) {
    try {
      console.log('Sending OTP...', { email })
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true
        }
      })

      if (error) {
        console.error('OTP send error:', error)
        throw error
      }

      console.log('✅ OTP sent to:', email)
      return { success: true }
    } catch (error) {
      console.error('OTP send error:', error)
      throw error
    }
  },

  // Verify OTP token
  async verifyOTP(email: string, token: string) {
    try {
      console.log('Verifying OTP...', { email })
      
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
      })

      if (error) {
        console.error('OTP verification error:', error)
        throw error
      }

      if (!data.user) {
        throw new Error('No user returned from OTP verification')
      }

      console.log('✅ OTP verified:', data.user.id)
      return { verified: true, user: data.user, error: null }
    } catch (error) {
      console.error('OTP verification error:', error)
      return { verified: false, user: null, error }
    }
  },

  // Resend OTP
  async resendOTP(email: string) {
    try {
      console.log('Resending OTP...', { email })
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true
        }
      })

      if (error) {
        console.error('Resend OTP error:', error)
        throw error
      }

      console.log('✅ OTP resent to:', email)
      return { success: true }
    } catch (error) {
      console.error('Resend OTP error:', error)
      throw error
    }
  },

  // Step 1: Create auth user only (password-based, legacy)
  async createAuthUser(email: string, password: string, firstName: string, lastName: string) {
    try {
      console.log('Step 1: Creating auth user...', { email })
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`,
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

      console.log('✅ Auth user created:', authData.user.id)
      return { user: authData.user, session: authData.session }
    } catch (error) {
      console.error('Auth creation error:', error)
      throw error
    }
  },

  // Step 2: Create user profile in database
  async createUserProfile(userId: string, email: string, firstName: string, lastName: string, universityId: string) {
    try {
      console.log('Step 2: Creating user profile...', { userId, universityId })

      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          university_id: universityId,
          is_active: true
        })

      if (userError) {
        console.error('User profile creation error:', userError)
        throw userError
      }

      console.log('✅ User profile created successfully')
      return { success: true }
    } catch (error) {
      console.error('User creation error:', error)
      throw error
    }
  },

  // Step 3: Create university
  async createUniversity(data: SignupData) {
    try {
      console.log('Step 3: Creating university...', { name: data.universityName })

      // First, insert the university (don't select back yet)
      const { error: universityError } = await supabase
        .from('universities')
        .insert({
          name: data.universityName,
          short_code: data.universityCode,
          address: data.location,
          email: data.contactEmail,
          phone_number: data.contactPhone,
          timezone: data.timezone || 'Asia/Kolkata',
          is_active: true
        })

      if (universityError) {
        console.error('University creation error:', universityError)
        throw universityError
      }

      // Then, fetch it back using a query (in case SELECT policy is different)
      const { data: universityData, error: fetchError } = await supabase
        .from('universities')
        .select('*')
        .eq('short_code', data.universityCode)
        .single()

      if (fetchError) {
        console.error('University fetch error:', fetchError)
        throw fetchError
      }

      console.log('✅ University created:', universityData.id)
      return universityData
    } catch (error) {
      console.error('University creation error:', error)
      throw error
    }
  },

  // Complete registration flow: Auth → User → University
  async registerAdmin(data: SignupData) {
    try {
      console.log('Starting complete admin registration...')
      
      // Step 1: Create auth user
      const { user: authUser, session } = await this.createAuthUser(
        data.email,
        data.password,
        data.firstName,
        data.lastName
      )

      console.log('Waiting for database sync...')
      // Small delay to ensure auth propagates
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Step 2: Create university (with user already existing, RLS should allow this)
      const university = await this.createUniversity(data)

      // Step 3: Create user profile linked to university
      await this.createUserProfile(
        authUser.id,
        data.email,
        data.firstName,
        data.lastName,
        university.id
      )

      console.log('✅ Registration complete!')
      return { 
        user: authUser, 
        university,
        session
      }
    } catch (error) {
      console.error('Complete registration error:', error)
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
  async getTodaysSchedule(studentId: string) {
    const { data, error } = await supabase.rpc('get_todays_schedule', {
      p_student_id: studentId
    })
    
    return { data, error }
  },

  // PASSWORD RESET FUNCTIONS
  
  // Send password reset OTP to email
  async sendPasswordResetOTP(email: string) {
    try {
      console.log('Sending password reset OTP to:', email)
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // Don't create user if doesn't exist
          emailRedirectTo: `${window.location.origin}/auth/reset-callback`
        }
      })

      if (error) {
        console.error('Password reset OTP send error:', error)
        throw error
      }

      console.log('✅ Password reset OTP sent to:', email)
      return { success: true, email }
    } catch (error) {
      console.error('Password reset OTP error:', error)
      throw error
    }
  },

  // Verify password reset OTP
  async verifyPasswordResetOTP(email: string, token: string) {
    try {
      console.log('Verifying password reset OTP...', { email })

      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: token,
        type: 'email'
      })

      if (error) {
        console.error('Password reset OTP verification error:', error)
        throw error
      }

      console.log('✅ Password reset OTP verified')
      return { 
        session: data.session,
        user: data.user,
        token: token
      }
    } catch (error) {
      console.error('Password reset verification error:', error)
      throw error
    }
  },

  // Resend password reset OTP
  async resendPasswordResetOTP(email: string) {
    try {
      console.log('Resending password reset OTP to:', email)

      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/reset-callback`
        }
      })

      if (error) {
        console.error('Resend password reset OTP error:', error)
        throw error
      }

      console.log('✅ Password reset OTP resent to:', email)
      return { success: true, email }
    } catch (error) {
      console.error('Resend password reset OTP error:', error)
      throw error
    }
  },

  // Reset password with new password
  async resetPassword(email: string, newPassword: string, token?: string) {
    try {
      console.log('Resetting password for:', email)

      // If we have a session from OTP verification, use updateUser
      const { data: userData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        // If that fails, try with admin API (requires user to be logged in)
        console.error('Direct update failed, trying alternative method:', updateError)
        throw updateError
      }

      console.log('✅ Password reset successful')
      return { success: true }
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }
}

export default supabase
