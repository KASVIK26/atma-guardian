import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

// Usage: export default withAuth(MyPageComponent)
export function withAuth<T>(Component: React.ComponentType<T>) {
  return function AuthProtected(props: T) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      const checkAuth = async () => {
        try {
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ Session found, user authenticated');
            setIsAuthenticated(true);
          } else {
            console.log('❌ No session found, redirecting to login');
            navigate('/auth/login', { replace: true });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          navigate('/auth/login', { replace: true });
        } finally {
          setLoading(false);
        }
      };

      checkAuth();
    }, [navigate]);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Checking authentication...</p>
          </div>
        </div>
      );
    }
    
    if (!isAuthenticated) return null;
    
    return <Component {...props} />;
  };
}
