import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Custom hook for authentication checks
 * 
 * Verifies user authentication and role-based access.
 * Redirects to login if not authenticated.
 * 
 * @param requiredRole - Optional role requirement ('admin', 'company', 'student')
 * @returns Object with user, profile, loading state, and signOut function
 * 
 * @example
 * const { user, profile, loading, signOut } = useAuth('admin');
 */
export function useAuth(requiredRole?: 'admin' | 'company' | 'student') {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [requiredRole]);

  const checkAuth = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        navigate('/login');
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle(); // Use maybeSingle() to avoid 406 errors if profile doesn't exist

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        navigate('/login');
        return;
      }

      if (!userProfile) {
        navigate('/login');
        return;
      }

      // Check role requirement if specified
      if (requiredRole && userProfile.role !== requiredRole) {
        navigate('/offers');
        return;
      }

      setUser(currentUser);
      setProfile(userProfile);
    } catch (err) {
      console.error('Auth error:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return { user, profile, loading, signOut };
}


