import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function VerifyEmail() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const password = location.state?.password;
  const isNewUser = location.state?.isNewUser;

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Verify the OTP code
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      });

      if (verifyError) {
        throw verifyError;
      }

      if (!data.session) {
        throw new Error('Verification failed - no session created');
      }

      console.log('✅ Email verified successfully');
      
      // Wait for profile to be created by database trigger
      // Retry up to 5 times with increasing delays
      let profile = null;
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries && !profile) {
        // Wait before checking (exponential backoff)
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
        }
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors

        if (profileError) {
          console.warn(`Profile check attempt ${retries + 1} error:`, profileError);
        } else if (profileData) {
          profile = profileData;
          break;
        }
        
        retries++;
      }

      // Redirect based on user role
      if (profile && profile.role) {
        if (profile.role === 'admin') {
          navigate('/admin');
        } else if (profile.role === 'company') {
          navigate('/company');
        } else {
          navigate('/student');
        }
      } else {
        // If profile doesn't exist yet after retries, redirect to login
        // The user can log in and the profile should be created by then
        console.warn('Profile not found after verification, redirecting to login');
        navigate('/login', { 
          state: { 
            verified: true, 
            email: email,
            message: 'Email verified! Please sign in to continue.'
          } 
        });
      }
      
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(err.message || 'Invalid verification code. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setSuccess(''); // Clear any previous success message
    
    try {
      // For new users, resend OTP using signInWithOtp
      // For existing users trying to verify, also use signInWithOtp
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // Don't create new user, just resend OTP
        },
      });
      
      if (resendError) {
        // If signInWithOtp fails (user doesn't exist), try resending via resend endpoint
        // This handles the case where user was created but needs OTP resent
        const { error: resendError2 } = await supabase.auth.resend({
          type: 'signup',
          email: email,
        });
        
        if (resendError2) throw resendError2;
      }
      
      // Show success message
      setError('');
      setSuccess('New verification code sent to your email!');
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err: any) {
      console.error('Resend error:', err);
      setError('Failed to resend code: ' + (err.message || 'Unknown error'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-elegant p-8 border border-border">
        
        {/* Back button */}
        <button
          onClick={() => navigate('/signup')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to signup
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground text-center mb-2">
          Verify Your Email
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          We sent a 6-digit code to
          <br />
          <span className="font-mono text-foreground">{email}</span>
          <br />
          <span className="text-xs text-muted-foreground mt-2 block">
            Check your inbox and spam folder. The code expires in 10 minutes.
          </span>
        </p>

        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-2">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow text-center text-2xl font-mono tracking-widest"
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium shadow-soft hover:shadow-elegant transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend verification code'}
          </button>
        </div>
      </div>
    </div>
  );
}