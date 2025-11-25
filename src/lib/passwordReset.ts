import { supabase } from './supabase'

// Password Reset Functions Module
export const passwordResetHelpers = {
  async sendPasswordResetOTP(email: string) {
    try {
      console.log('Sending password reset OTP to:', email)
      
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
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

  async resetPassword(email: string, newPassword: string, token?: string) {
    try {
      console.log('Resetting password for:', email)

      const { data: userData, error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('Direct update failed:', updateError)
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

export default passwordResetHelpers
