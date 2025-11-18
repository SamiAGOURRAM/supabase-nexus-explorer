/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication and email verification.
 * Prevents unverified users from accessing protected content.
 */
import { Navigate, useLocation } from 'react-router-dom';
import LoadingScreen from './LoadingScreen';
import { useUser } from '@/contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireEmailVerification = true 
}: ProtectedRouteProps) {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireEmailVerification && !user.email_confirmed_at) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ 
          email: user.email,
          message: 'Please verify your email to access this page.' 
        }} 
        replace 
      />
    );
  }

  return <>{children}</>;
}
