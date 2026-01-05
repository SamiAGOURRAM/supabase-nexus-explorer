import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');
        const errorCode = params.get('error_code');

        if (errorParam) {
          console.error('Auth error:', errorParam, errorDescription, errorCode);
          
          // Handle specific error cases
          if (errorCode === 'otp_expired') {
            setError('This confirmation link has expired. Please request a new one.');
          } else {
            setError(errorDescription || errorParam);
          }
          
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Exchange the code in the URL for a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!session || !session.user) {
          console.error('No session found');
          setError('Authentication failed. No session found.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        const user = session.user;
        console.log('User authenticated:', user.email);

        // Verify the user has an email address
        if (!user.email) {
          console.error('No email address provided');
          setError('Unable to retrieve email address. Please contact support.');
          await supabase.auth.signOut();
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Check if user profile exists (with retries)
        let profile = null;
        let retries = 0;
        const maxRetries = 5;

        while (retries < maxRetries && !profile) {
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500 * retries));
          }

          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
          } else if (profileData) {
            profile = profileData;
            break;
          }

          retries++;
        }

        if (!profile) {
          console.error('Profile not found after retries');
          setError('Profile creation failed. Please contact support at inf.shbm@um6p.ma');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Success! Redirect based on role
        console.log('Login successful, redirecting to dashboard');
        
        if (profile.role === 'admin') {
          navigate('/admin', { replace: true });
        } else if (profile.role === 'company') {
          navigate('/company', { replace: true });
        } else {
          navigate('/student', { replace: true });
        }

      } catch (err: any) {
        console.error('Callback error:', err);
        setError(err.message || 'An unexpected error occurred');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border-2 border-red-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Authentication Failed</h2>
          <p className="mb-6 text-sm text-gray-600">{error}</p>
          <p className="text-xs text-gray-500">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Completing sign-in...</h2>
        <p className="text-sm text-gray-600">
          Please wait while we verify your UM6P credentials
        </p>
      </div>
    </div>
  );
}
