import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import type { User } from '@supabase/supabase-js';
import type { ProfileSummary } from '@/contexts/UserContext';

type UseAuthReturn = {
  user: User | null;
  profile: ProfileSummary | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

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
export function useAuth(requiredRole?: 'admin' | 'company' | 'student'): UseAuthReturn {
  const navigate = useNavigate();
  const { user, profile, loading, refresh } = useUser();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    if (!profile) {
      navigate('/login');
      return;
    }

    if (requiredRole && profile.role !== requiredRole) {
      navigate('/offers');
    }
  }, [loading, navigate, profile, requiredRole, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    await refresh();
    navigate('/');
  };

  return { user, profile, loading, signOut };
}


