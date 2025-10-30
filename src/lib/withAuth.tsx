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
      const session = supabase.auth.getSession();
      session.then(({ data }) => {
        if (data.session) {
          setIsAuthenticated(true);
        } else {
          navigate('/auth/Login');
        }
        setLoading(false);
      });
    }, [navigate]);

    if (loading) return <div className="flex items-center justify-center h-screen">Checking authentication...</div>;
    if (!isAuthenticated) return null;
    return <Component {...props} />;
  };
}
