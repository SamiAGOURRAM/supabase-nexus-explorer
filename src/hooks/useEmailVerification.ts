/**
 * Email Verification Hook
 * 
 * Ensures users have verified their email before accessing the application.
 * Automatically signs out unverified users and redirects them to the verification page.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export const useEmailVerification = () => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkEmailVerification();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await checkEmailVerification();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkEmailVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsVerified(false);
        setIsLoading(false);
        return;
      }

      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        console.warn('⚠️ Email not verified for user:', user.email);
        
        // Sign out unverified user
        await supabase.auth.signOut();
        
        // Redirect to verification page
        navigate('/verify-email', {
          state: {
            email: user.email,
            message: 'Please verify your email before accessing your account.',
          },
        });
        
        setIsVerified(false);
        setIsLoading(false);
        return;
      }

      setIsVerified(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking email verification:', error);
      setIsVerified(false);
      setIsLoading(false);
    }
  };

  return { isVerified, isLoading, checkEmailVerification };
};
