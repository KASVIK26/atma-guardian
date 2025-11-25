import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface TOTPState {
  code: string;
  generatedAt: number; // Unix timestamp in ms
  expiresAt: number; // Unix timestamp in ms
  mode: 'static' | 'dynamic';
  timeRemaining: number; // seconds 0-30
  isRefreshing: boolean;
}

/**
 * Microsoft Authenticator-style TOTP hook
 * Auto-refreshes every 30 seconds with live countdown
 */
export const useTOTP = (lectureSessionId?: string, initialMode: 'static' | 'dynamic' = 'dynamic') => {
  const [totp, setTotp] = useState<TOTPState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const intervalRef = useRef<NodeJS.Timeout>();
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch current TOTP code from totp_sessions table
  const fetchTOTP = useCallback(async () => {
    if (!lectureSessionId) {
      console.log('⏭️  No lectureSessionId provided to useTOTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔑 Fetching TOTP for session:', lectureSessionId);
      const { data, error: fetchError } = await supabase
        .from('totp_sessions')
        .select('code, generated_at, expires_at, totp_mode')
        .eq('lecture_session_id', lectureSessionId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is okay
        throw fetchError;
      }

      if (data && data.code) {
        const generatedAt = new Date(data.generated_at).getTime();
        const expiresAt = new Date(data.expires_at).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

        console.log('✅ TOTP fetched:', {
          code: data.code,
          timeRemaining,
          mode: data.totp_mode,
        });

        setTotp({
          code: data.code,
          generatedAt,
          expiresAt,
          mode: (data.totp_mode as 'static' | 'dynamic') || 'dynamic',
          timeRemaining,
          isRefreshing: false,
        });
      } else {
        console.log('⏭️  No TOTP session found for lecture_session:', lectureSessionId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch TOTP';
      setError(message);
      console.error('❌ Error fetching TOTP:', err);
    } finally {
      setLoading(false);
    }
  }, [lectureSessionId]);

  // Generate new TOTP code via edge function
  const generateTOTP = useCallback(async () => {
    if (!lectureSessionId) return;

    setTotp(prev => prev ? { ...prev, isRefreshing: true } : null);

    try {
      console.log('🔄 Calling generate-totp-code edge function for session:', lectureSessionId);
      const { data, error } = await supabase.functions.invoke('generate-totp-code', {
        body: {
          lecture_session_id: lectureSessionId,
          mode: totp?.mode || 'dynamic',
        },
      });

      if (error) {
        throw error;
      }

      if (data) {
        const generatedAt = new Date(data.generated_at).getTime();
        const expiresAt = new Date(data.expires_at).getTime();
        const now = Date.now();
        const timeRemaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));

        console.log('✅ TOTP generated:', {
          code: data.totp_code,
          timeRemaining,
        });

        setTotp(prev => prev ? {
          ...prev,
          code: data.totp_code,
          generatedAt,
          expiresAt,
          timeRemaining,
          isRefreshing: false,
        } : {
          code: data.totp_code,
          generatedAt,
          expiresAt,
          mode: data.mode || 'dynamic',
          timeRemaining,
          isRefreshing: false,
        });

        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate TOTP';
      setError(message);
      setTotp(prev => prev ? { ...prev, isRefreshing: false } : null);
      console.error('❌ Error generating TOTP:', err);
    }
  }, [lectureSessionId, totp?.mode]);

  // Update OTP mode for a TOTP session
  const toggleOTPMode = useCallback(async (newMode: 'static' | 'dynamic') => {
    if (!lectureSessionId) return;

    try {
      console.log('🔄 Toggling OTP mode to:', newMode);
      // Update the most recent totp_sessions record for this lecture_session
      const { error } = await supabase
        .from('totp_sessions')
        .update({ totp_mode: newMode })
        .eq('lecture_session_id', lectureSessionId)
        .order('generated_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      setTotp(prev => prev ? { ...prev, mode: newMode } : null);
      
      // Regenerate code in new mode
      await generateTOTP();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update OTP mode';
      setError(message);
      console.error('❌ Error toggling OTP mode:', err);
    }
  }, [lectureSessionId, generateTOTP]);

  // Update time remaining every 100ms for smooth countdown (like Microsoft Authenticator)
  useEffect(() => {
    if (!totp) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.ceil((totp.expiresAt - now) / 1000));

      setTotp(prev => prev ? { ...prev, timeRemaining } : null);

      // Auto-refresh when 2 seconds remaining
      if (timeRemaining === 2 && !totp.isRefreshing) {
        console.log('⏰ TOTP expiring in 2 seconds, auto-refreshing...');
        generateTOTP();
      }
    }, 100); // Update UI every 100ms for smooth animation

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [totp?.expiresAt, generateTOTP, totp?.isRefreshing]);

  // Initial fetch when sessionId changes
  useEffect(() => {
    if (lectureSessionId) {
      fetchTOTP();
    }
  }, [lectureSessionId, fetchTOTP]);

  // Calculate progress percentage (0-100)
  const progress = totp?.timeRemaining ? (totp.timeRemaining / 30) * 100 : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  return {
    totp,
    loading,
    error,
    generateTOTP,
    toggleOTPMode,
    refetch: fetchTOTP,
    progress: Math.round(progress),
  };
};

/**
 * Helper to calculate time remaining for TOTP expiry
 * @param expiresAt - Expiration time in milliseconds
 * @returns Time remaining in seconds
 */
export const getTimeRemaining = (expiresAt: number): number => {
  const now = Date.now();
  const remaining = Math.max(0, expiresAt - now);
  return Math.ceil(remaining / 1000); // Return in seconds
};
