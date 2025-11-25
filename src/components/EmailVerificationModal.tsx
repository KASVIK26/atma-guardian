import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Mail, Clock, AlertCircle, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerificationComplete?: (user: any) => void;
  onCancel?: () => void;
  onTimeout?: () => void;
  waitForVerification: (email: string, maxWaitTime: number) => Promise<{ verified: boolean; user: any; error: any }>;
  resendMagicLink: (email: string) => Promise<{ success: boolean }>;
}

export function EmailVerificationModal({
  isOpen,
  email,
  onVerificationComplete,
  onCancel,
  onTimeout,
  waitForVerification,
  resendMagicLink
}: EmailVerificationModalProps) {
  const [verificationStatus, setVerificationStatus] = useState<'waiting' | 'verified' | 'timeout' | 'error'>('waiting');
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [isResending, setIsResending] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<any>(null);

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

  // Start verification polling
  useEffect(() => {
    if (!isOpen || verificationStatus !== 'waiting') return;

    const pollVerification = async () => {
      try {
        console.log('Starting verification poll...');
        const result = await waitForVerification(email, timeRemaining * 1000);

        if (result.verified && result.user) {
          console.log('✅ Email verified successfully');
          setVerificationStatus('verified');
          setVerifiedUser(result.user);
          
          // Show success and auto-call callback after 2 seconds
          setTimeout(() => {
            onVerificationComplete?.(result.user);
          }, 2000);
        } else if (result.error) {
          console.error('Verification error:', result.error);
          setVerificationStatus('error');
        }
      } catch (error) {
        console.error('Verification poll error:', error);
        setVerificationStatus('error');
      }
    };

    pollVerification();
  }, [isOpen, email, timeRemaining, verificationStatus, waitForVerification, onVerificationComplete]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendMagicLink(email);
      toast.success('Magic link resent! Check your email.');
      setTimeRemaining(600); // Reset timer
      setVerificationStatus('waiting');
    } catch (error) {
      console.error('Resend error:', error);
      toast.error('Failed to resend magic link. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Verify Your Email</DialogTitle>
          <DialogDescription>
            We've sent a magic link to verify your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Waiting State */}
          {verificationStatus === 'waiting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Mail className="w-12 h-12 text-primary" />
                </motion.div>
              </div>

              <Card className="p-4 bg-muted/50 border-border/50">
                <p className="text-center text-sm text-muted-foreground">
                  Click the magic link in your email to verify your account.
                </p>
                <p className="text-center text-sm font-semibold mt-2 text-foreground">
                  {email}
                </p>
              </Card>

              <div className="flex items-center justify-center gap-2 py-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-mono text-amber-600">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Didn't receive the email?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Magic Link
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                ⏳ Checking for verification... Do not close this window.
              </p>
            </motion.div>
          )}

          {/* Verified State */}
          {verificationStatus === 'verified' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4 text-center"
            >
              <div className="flex justify-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </motion.div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Email Verified! ✨
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Great! Your email has been confirmed. Completing your setup...
                </p>
              </div>

              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            </motion.div>
          )}

          {/* Timeout State */}
          {verificationStatus === 'timeout' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-amber-500" />
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">
                  Verification Timeout
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  We didn't receive your verification within 10 minutes. Please try again.
                </p>
              </div>

              <Button
                onClick={handleResend}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Magic Link
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full"
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
              className="space-y-4"
            >
              <div className="flex justify-center">
                <AlertCircle className="w-12 h-12 text-red-500" />
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
                onClick={handleResend}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resending...
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
                className="w-full"
              >
                Cancel & Go Back
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
