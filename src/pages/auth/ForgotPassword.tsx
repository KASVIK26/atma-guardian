import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { passwordResetHelpers } from '@/lib/passwordReset';

type ForgotPasswordStep = 'email' | 'otp' | 'reset' | 'success';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Sending password reset OTP to:', email);
      await passwordResetHelpers.sendPasswordResetOTP(email);
      console.log('✅ Password reset OTP sent');
      
      setStep('otp');
      setCanResend(false);
      setTimeLeft(30);

      toast.success('Reset code sent to your email');

      // Start countdown
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Password reset email error:', error);
      toast.error(error.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input change
  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 7) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Handle OTP submission
  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpString = otp.join('');
    if (otpString.length !== 8) {
      toast.error('Please enter all 8 digits');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Verifying password reset OTP...');
      const { session, token } = await passwordResetHelpers.verifyPasswordResetOTP(email, otpString);
      console.log('✅ OTP verified for password reset');
      
      setResetToken(token || '');
      setStep('reset');
      setOtp(['', '', '', '', '', '', '', '']);
      toast.success('Email verified! Now set your new password');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Invalid reset code');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      console.log('Resending password reset OTP...');
      await passwordResetHelpers.resendPasswordResetOTP(email);
      console.log('✅ Password reset OTP resent');
      
      setCanResend(false);
      setTimeLeft(30);
      setOtp(['', '', '', '', '', '', '', '']);

      toast.success('Reset code sent again');

      // Restart countdown
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Resetting password...');
      await passwordResetHelpers.resetPassword(email, newPassword, resetToken);
      console.log('✅ Password reset successful');
      
      setStep('success');
      toast.success('Password reset successfully!');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background gradient accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
            <p className="text-slate-400">
              {step === 'email' && 'Enter your email to receive a reset code'}
              {step === 'otp' && 'Enter the 8-digit code from your email'}
              {step === 'reset' && 'Create your new password'}
              {step === 'success' && 'Password reset complete!'}
            </p>
          </div>

          {/* Step: Email */}
          {step === 'email' && (
            <motion.form
              onSubmit={handleEmailSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-red-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:bg-slate-700 transition"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300 transition"
              >
                <ArrowLeft size={18} />
                Back to Login
              </button>
            </motion.form>
          )}

          {/* Step: OTP */}
          {step === 'otp' && (
            <motion.form
              onSubmit={handleOTPSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-4">
                  Enter 8-Digit Code
                </label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      className="w-10 h-12 text-center text-2xl font-bold bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-red-500 focus:bg-slate-700 transition"
                      disabled={isLoading}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join('').length !== 8}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-red-400 hover:text-red-300 transition disabled:text-slate-600"
                    >
                      Resend Code
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock size={16} />
                      Resend in {timeLeft}s
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setEmail('');
                    setOtp(['', '', '', '', '', '', '', '']);
                  }}
                  className="text-slate-400 hover:text-slate-300 transition"
                >
                  Change Email
                </button>
              </div>
            </motion.form>
          )}

          {/* Step: Reset Password */}
          {step === 'reset' && (
            <motion.form
              onSubmit={handlePasswordReset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:bg-slate-700 transition"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:bg-slate-700 transition"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300 transition"
              >
                <ArrowLeft size={18} />
                Back to Login
              </button>
            </motion.form>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 text-center"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Password Reset</h2>
                <p className="text-slate-400">
                  Your password has been successfully reset. Redirecting to login...
                </p>
              </div>

              <button
                onClick={() => navigate('/auth/login', { replace: true })}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105"
              >
                Go to Login
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-400 text-sm">
          <p>
            Remember your password?{' '}
            <button
              onClick={() => navigate('/auth/login')}
              className="text-red-400 hover:text-red-300 transition font-medium"
            >
              Login here
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
