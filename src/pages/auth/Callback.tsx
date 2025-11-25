import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying your email...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if session exists (user has been redirected from email)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (session && session.user) {
          console.log('✅ User verified:', session.user.id);
          setStatus('success');
          setMessage('✨ Email verified successfully!');

          // Wait 2 seconds then redirect
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          throw new Error('No session found. Please try again.');
        }
      } catch (error: any) {
        console.error('Callback error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Verification failed. Please try again or contact support.');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen dark bg-background flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-card/50 backdrop-blur-xl border-border/50">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-6">
              {/* Processing State */}
              {status === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="flex justify-center"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center border border-primary/50">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Verifying Email</h2>
                    <p className="text-muted-foreground mt-2">{message}</p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Please wait while we confirm your email address...
                  </p>
                </motion.div>
              )}

              {/* Success State */}
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
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
                    <h2 className="text-2xl font-bold text-foreground">✨ All Set!</h2>
                    <p className="text-muted-foreground mt-2">{message}</p>
                  </div>

                  <p className="text-sm text-green-600">
                    Redirecting to your dashboard...
                  </p>
                </motion.div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Verification Failed</h2>
                    <p className="text-muted-foreground mt-2">{errorMessage}</p>
                  </div>

                  <Button
                    onClick={() => navigate('/auth/signup', { replace: true })}
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    Return to Signup
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
