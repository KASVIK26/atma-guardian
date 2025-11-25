import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function ResetCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your password reset...');

  useEffect(() => {
    // Check URL params for reset token
    const hash = window.location.hash;
    
    if (hash.includes('access_token')) {
      // Token is present in URL (from magic link)
      setStatus('success');
      setMessage('Password reset link verified! Redirecting...');
      
      // Redirect to forgot password page after 2 seconds
      setTimeout(() => {
        navigate('/auth/forgot-password', { replace: true });
      }, 2000);
    } else {
      setStatus('error');
      setMessage('Invalid or expired reset link. Please request a new one.');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Loader className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Processing</h2>
              <p className="text-slate-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Reset Link Verified</h2>
              <p className="text-slate-400 mb-6">{message}</p>
              <button
                onClick={() => navigate('/auth/forgot-password')}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105"
              >
                Continue to Password Reset
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Invalid Link</h2>
              <p className="text-slate-400 mb-6">{message}</p>
              <button
                onClick={() => navigate('/auth/forgot-password')}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-105 mb-3"
              >
                Request New Reset Link
              </button>
              <button
                onClick={() => navigate('/auth/login')}
                className="w-full bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-lg transition"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
