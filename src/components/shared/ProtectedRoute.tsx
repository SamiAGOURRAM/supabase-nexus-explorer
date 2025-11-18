/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication and email verification.
 * Prevents unverified users from accessing protected content.
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import LoadingScreen from './LoadingScreen';
import { error as logError } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireEmailVerification = true 
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        setIsEmailVerified(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(user.email || '');

      // Check email verification status
      // email_confirmed_at is set by Supabase when user verifies their email
      const verified = !!user.email_confirmed_at;
      setIsEmailVerified(verified);
      setLoading(false);
    } catch (error) {
      logError('Auth check error:', error);
      setIsAuthenticated(false);
      setIsEmailVerified(false);
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireEmailVerification && !isEmailVerified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ 
          email: userEmail,
          message: 'Please verify your email to access this page.' 
        }} 
        replace 
      />
    );
  }

  return <>{children}</>;
}
