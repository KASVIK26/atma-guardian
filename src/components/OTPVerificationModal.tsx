import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OTPVerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerificationComplete?: (user: any) => void;
  onCancel?: () => void;
  onTimeout?: () => void;
  verifyOTP: (email: string, token: string) => Promise<{ verified: boolean; user: any; error: any }>;
  resendOTP: (email: string) => Promise<{ success: boolean }>;
}

export function OTPVerificationModal({
  isOpen,
  email,
  onVerificationComplete,
  onCancel,
  onTimeout,
  verifyOTP,
  resendOTP
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [verificationStatus, setVerificationStatus] = useState<'waiting' | 'verifying' | 'verified' | 'timeout' | 'error'>('waiting');
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [isResending, setIsResending] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer effect
  useEffect(() => {
    if (!isOpen || verificationStatus !== 'waiting') return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setVerificationStatus('timeout');
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, verificationStatus, onTimeout]);

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setInterval(() => {
      setResendCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Focus first input on modal open
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isOpen]);

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setErrorMessage('');

    // Auto-focus next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 8 digits entered
    if (newOtp.every(digit => digit !== '')) {
      const otpString = newOtp.join('');
      handleVerifyOTP(otpString);
    }
  };

  const handleOTPBackspace = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpString: string) => {
    if (otpString.length !== 8) {
      setErrorMessage('Please enter an 8-digit code');
      return;
    }

    setVerificationStatus('verifying');
    setErrorMessage('');

    try {
      console.log('Verifying OTP...');
      const result = await verifyOTP(email, otpString);

      if (result.verified && result.user) {
        console.log('✅ OTP verified successfully');
        setVerificationStatus('verified');
        setVerifiedUser(result.user);

        // Show success and auto-call callback after 2 seconds
        setTimeout(() => {
          onVerificationComplete?.(result.user);
        }, 2000);
      } else {
        console.error('OTP verification failed:', result.error);
        setVerificationStatus('waiting');
        setErrorMessage(result.error?.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        toast.error('Invalid OTP code');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setVerificationStatus('waiting');
      setErrorMessage(error.message || 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.error('Verification failed');
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    try {
      await resendOTP(email);
      toast.success('OTP resent! Check your email.');
      setOtp(['', '', '', '', '', '', '', '']);
      setTimeRemaining(600);
      setVerificationStatus('waiting');
      setErrorMessage('');
      setResendCountdown(30); // 30 second cooldown
      inputRefs.current[0]?.focus();
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const otpString = otp.join('');
  const isOTPComplete = otpString.length === 6;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center p-4',
      isOpen ? 'bg-black/50' : 'pointer-events-none'
    )}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.95 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'w-full max-w-md',
          !isOpen && 'pointer-events-none'
        )}
      >
        <Card className="bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl">
          <div className="p-8 space-y-6">
            {/* Waiting/Verifying State */}
            {(verificationStatus === 'waiting' || verificationStatus === 'verifying') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="text-center space-y-2">
                  <motion.div
                    animate={{ rotate: verificationStatus === 'verifying' ? 360 : 0 }}
                    transition={{ duration: verificationStatus === 'verifying' ? 1.5 : 0.3, repeat: verificationStatus === 'verifying' ? Infinity : 0 }}
                    className="flex justify-center"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-red-500/20 rounded-full flex items-center justify-center border border-green-500/50">
                      <span className="text-xl">🔐</span>
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground">Verify Your Email</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to<br />
                    <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>

                {/* OTP Input Fields */}
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <motion.div
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileFocus={{ scale: 1.05 }}
                      >
                        <input
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOTPChange(index, e.target.value)}
                          onKeyDown={(e) => handleOTPBackspace(index, e)}
                          disabled={verificationStatus === 'verifying'}
                          className={cn(
                            'w-10 h-12 text-center text-xl font-bold rounded-lg',
                            'border-2 transition-all duration-200',
                            'bg-background/50 backdrop-blur-sm',
                            digit ? 'border-green-500/70 bg-green-500/5' : 'border-red-500/30 hover:border-red-500/50',
                            'focus:outline-none focus:ring-0 focus:border-green-500',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            errorMessage && !digit && 'border-red-500/70 bg-red-500/5',
                            verificationStatus === 'verifying' && 'border-blue-500/70'
                          )}
                          autoComplete="off"
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{errorMessage}</p>
                    </motion.div>
                  )}

                  {/* Success Message */}
                  {isOTPComplete && verificationStatus !== 'verifying' && !errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <p className="text-sm text-green-600">Code looks good! Verifying...</p>
                    </motion.div>
                  )}
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 py-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className={cn(
                    'text-sm font-mono font-bold',
                    timeRemaining < 60 ? 'text-red-500' : 'text-amber-600'
                  )}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>

                {/* Resend Button */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Didn't receive the code?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={isResending || resendCountdown > 0}
                    className="w-full border-amber-500/30 hover:bg-amber-500/10"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Resending...
                      </>
                    ) : resendCountdown > 0 ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        Resend in {resendCountdown}s
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend Code
                      </>
                    )}
                  </Button>
                </div>

                {/* Info Text */}
                <p className="text-xs text-muted-foreground text-center">
                  {verificationStatus === 'verifying' ? (
                    <>
                      <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                      Verifying your code...
                    </>
                  ) : (
                    '✓ Automatic verification when all 8 digits entered'
                  )}
                </p>

                {/* Cancel Button */}
                <Button
                  variant="ghost"
                  onClick={onCancel}
                  disabled={verificationStatus === 'verifying'}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
              </motion.div>
            )}

            {/* Verified State */}
            {verificationStatus === 'verified' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4 text-center py-4"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6 }}
                  className="flex justify-center"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </motion.div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground">Email Verified! ✨</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Great! Your email has been confirmed. Completing your setup...
                  </p>
                </div>

                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex justify-center"
                >
                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                </motion.div>
              </motion.div>
            )}

            {/* Timeout State */}
            {verificationStatus === 'timeout' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    Verification Timeout
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    We didn't receive your verification within 10 minutes. Please request a new code.
                  </p>
                </div>

                <Button
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Request New Code
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="w-full border-red-500/30 hover:bg-red-500/10"
                >
                  Cancel & Go Back
                </Button>
              </motion.div>
            )}

            {/* Error State */}
            {verificationStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    Verification Error
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Something went wrong. Please try again or contact support.
                  </p>
                </div>

                <Button
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="w-full border-red-500/30 hover:bg-red-500/10"
                >
                  Cancel & Go Back
                </Button>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
