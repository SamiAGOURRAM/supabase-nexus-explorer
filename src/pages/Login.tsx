  import { useState, useEffect } from 'react';
  import { useNavigate, useSearchParams, Link } from 'react-router-dom';
  import { supabase } from '@/lib/supabase';
  import { Building2, GraduationCap, AlertCircle, Shield } from 'lucide-react';
  import { checkRateLimitDirect, recordFailedAttempt, clearRateLimit } from '@/hooks/useRateLimit';
  import { useCaptcha, getCaptchaConfig } from '@/hooks/useCaptcha';

  export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginAs, setLoginAs] = useState<'student' | 'company'>('student');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // CAPTCHA integration
    const { verifyCaptcha } = useCaptcha();
    const captchaConfig = getCaptchaConfig();

    useEffect(() => {
      checkUser();
    }, []);

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email_confirmed_at) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle() to avoid 406 errors if profile doesn't exist

          if (profile && profile.role) {
            redirectUser(profile.role);
          } else {
            // If no profile, redirect to offers
            navigate('/offers', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error checking user:', error);
        // Don't redirect on error, let user login manually
      }
    };

    const redirectUser = (role: string) => {
      const redirect = searchParams.get('redirect');
      
      // If there's a redirect parameter, use it
      if (redirect) {
        navigate(redirect, { replace: true });
        return;
      }
      
      // Otherwise, redirect based on role
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'company') {
        navigate('/company', { replace: true });
      } else if (role === 'student') {
        navigate('/student', { replace: true });
      } else {
        // Fallback to offers page if role is unknown
        navigate('/offers', { replace: true });
      }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        // CAPTCHA verification (if enabled)
        if (captchaConfig.enabled) {
          const captchaResult = await verifyCaptcha('login');
          if (!captchaResult || !captchaResult.token) {
            await recordFailedAttempt(email, 'CAPTCHA verification failed', 'login');
            throw new Error('Security verification failed. Please try again.');
          }
          console.log('✅ CAPTCHA verified');
        }

        // Check server-side rate limiting
        const rateLimitCheck = await checkRateLimitDirect(email, 5, 15);
        if (!rateLimitCheck.allowed) {
          setError(rateLimitCheck.message || 'Too many login attempts. Please try again later.');
          setLoading(false);
          return;
        }

        // Sign in with email and password
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          // Record failed attempt
          await recordFailedAttempt(email, signInError.message, 'login');
          throw signInError;
        }

        if (!data.user) {
          throw new Error('Login failed. Please try again.');
        }

        // CRITICAL: Check if email is verified before allowing login
        if (!data.user.email_confirmed_at) {
          // Sign out immediately to prevent access
          await supabase.auth.signOut();
          
          // Redirect to verification page with email for easy resend
          navigate('/verify-email', {
            state: {
              email: email,
              message: 'Please verify your email address before signing in. Check your inbox for the confirmation link.'
            }
          });
          return;
        }

        // Clear rate limit on successful login
        await clearRateLimit(email);

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
            .maybeSingle(); // Use maybeSingle() to avoid 406 errors

          if (profileError) {
            console.warn(`Profile check attempt ${retries + 1} error:`, profileError);
          } else if (profileData) {
            profile = profileData;
            break;
          }
          
          retries++;
        }

        // If profile still doesn't exist after retries, redirect to offers
        // The profile should be created by the database trigger when email is confirmed
        // If it doesn't exist, the user can still browse offers and complete their profile later
        if (!profile) {
          console.warn('Profile not found after retries. Profile should be created by database trigger.');
          console.log('Redirecting to offers page - user can complete profile setup later');
          navigate('/offers', { replace: true });
          return;
        }

        // If profile exists, redirect based on role
        if (profile && profile.role) {
          console.log('✅ Login successful, user role:', profile.role);
          
          // Check role matches login type
          if (profile.role === 'admin') {
            console.log('Redirecting admin to dashboard');
            redirectUser(profile.role);
            return;
          }

          // Allow students to sign in
          if (loginAs === 'student' && profile.role !== 'student') {
            await supabase.auth.signOut();
            await recordFailedAttempt(email, 'Wrong account type', 'login');
            throw new Error('This account is not a student account. Please use Company Login.');
          }
          
          if (loginAs === 'company' && profile.role !== 'company') {
            await supabase.auth.signOut();
            await recordFailedAttempt(email, 'Wrong account type', 'login');
            throw new Error('This account is not a company account. Please use Student Login.');
          }
          
          // Redirect based on role
          console.log('Redirecting user to role-based dashboard');
          redirectUser(profile.role);
        } else {
          // No profile found - redirect to offers page as fallback
          console.warn('Profile not found after all attempts, redirecting to offers page');
          navigate('/offers', { replace: true });
        }
      } catch (err: any) {
        console.error('Login error:', err);
        setError(err.message || 'An error occurred during login. Please try again.');
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card rounded-2xl shadow-elegant p-8 border border-border">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
              <p className="text-muted-foreground">INF Platform 2.0 - Speed Recruiting</p>
            </div>

            {/* Login Type Selector */}
            <div className="flex gap-3 p-1.5 bg-muted rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setLoginAs('student')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  loginAs === 'student'
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                Student
              </button>
              <button
                type="button"
                onClick={() => setLoginAs('company')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  loginAs === 'company'
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="w-5 h-5" />
                Company
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-start gap-3 animate-in">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  {loginAs === 'student' ? 'UM6P Email (@um6p.ma)' : 'Company Email'}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={loginAs === 'student' ? 'prenom.nom@um6p.ma' : 'contact@company.com'}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium shadow-soft hover:shadow-elegant transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* reCAPTCHA Badge Info */}
            {captchaConfig.enabled && (
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Protected by reCAPTCHA
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Privacy
                  </a>
                  {' · '}
                  <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Terms
                  </a>
                </p>
              </div>
            )}

            {/* Additional Links */}
            <div className="mt-6 text-center space-y-3">
              <Link
                to="/forgot-password"
                className="block text-sm text-primary hover:underline font-medium"
              >
                Forgot Password?
              </Link>
              
              <p className="text-sm text-muted-foreground">Don't have an account?</p>
              <Link
                to="/signup"
                className="block text-sm text-primary hover:underline font-medium"
              >
                Student Signup
              </Link>
              <p className="text-xs text-muted-foreground">
                Companies: Registration is by invitation only
              </p>
              <Link
                to="/offers"
                className="inline-block text-sm text-muted-foreground hover:text-foreground mt-4"
              >
                ← Back to Offers
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }