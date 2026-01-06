import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
} from 'lucide-react';
import { checkRateLimitDirect, recordFailedAttempt, clearRateLimit } from '@/hooks/useRateLimit';
import { useCaptcha, getCaptchaConfig } from '@/hooks/useCaptcha';
import { debug, error as logError, warn } from '@/utils/logger';



export default function Login() {

    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    const [loginAs, setLoginAs] = useState<'student' | 'company'>('student');

    const [showPassword, setShowPassword] = useState(false);

    const [emailFocused, setEmailFocused] = useState(false);

    const [passwordFocused, setPasswordFocused] = useState(false);

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

        logError('Error checking user:', error);

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

      // Prevent multiple submissions
      if (loading) {
        return;
      }

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

          debug('✅ CAPTCHA verified');

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

          // Provide user-friendly error messages
          if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('Invalid credentials')) {
            throw new Error('Invalid email or password. Please check your credentials and try again.');
          }
          
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Please verify your email address before signing in. Check your inbox for the confirmation link.');
          }
          
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

            .select('role, account_approved, full_name')

            .eq('id', data.user.id)

            .maybeSingle(); // Use maybeSingle() to avoid 406 errors



          if (profileError) {

            warn(`Profile check attempt ${retries + 1} error:`, profileError);

          } else if (profileData) {

            profile = profileData;

            break;

          }

          

          retries++;

        }



        // If profile still doesn't exist after retries, try to create it manually
        if (!profile) {
          warn('Profile not found after retries. Attempting to create profile...');
          
          try {
            // Try to create profile using the helper function
            // The function gets user data from auth.users table, so we only need the user ID
            const { error: createError } = await supabase.rpc('create_profile_for_user', {
              p_user_id: data.user.id
            } as any);
            
            if (createError) {
              logError('Failed to create profile:', createError);
              // Still redirect to offers - user can browse but may have limited access
              navigate('/offers', { replace: true });
              return;
            }
            
            // Profile created, fetch it again
            const { data: newProfileData, error: newProfileError } = await supabase
              .from('profiles')
              .select('role, account_approved, full_name')
              .eq('id', data.user.id)
              .maybeSingle();
            
            if (newProfileError || !newProfileData) {
              logError('Failed to fetch newly created profile:', newProfileError);
              navigate('/offers', { replace: true });
              return;
            }
            
            profile = newProfileData;
            debug('✅ Profile created successfully');
          } catch (err) {
            logError('Error creating profile:', err);
            // Redirect to offers as fallback
            navigate('/offers', { replace: true });
            return;
          }
        }



        // If profile exists, check account approval status for students
        if (profile && 'role' in profile && profile.role === 'student' && 'account_approved' in profile && profile.account_approved === false) {
          // Sign out immediately to prevent access
          await supabase.auth.signOut();
          
          // Redirect to pending approval page
          navigate('/pending-approval', {
            state: {
              email: email,
              name: 'full_name' in profile ? profile.full_name || 'Student' : 'Student'
            }
          });
          return;
        }



        // If profile exists, redirect based on role

        if (profile && 'role' in profile && profile.role) {

          // Check role matches login type BEFORE logging success

          if (profile.role === 'admin') {

            debug('✅ Login successful, user role: admin');

            debug('Redirecting admin to dashboard');

            redirectUser(profile.role);

            return;

          }



          // Check if role matches login type

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

          

          // Role matches - log success and redirect

          debug('✅ Login successful, user role:', profile.role);

          debug('Redirecting user to role-based dashboard');

          // Set loading to false before redirect to prevent further submissions
          setLoading(false);
          
          redirectUser(profile.role as string);
          
          // Return early to prevent any further execution
          return;

        } else {

          // No profile found - redirect to offers page as fallback

          warn('Profile not found after all attempts, redirecting to offers page');

          navigate('/offers', { replace: true });

        }

      } catch (err: any) {

        logError('Login error:', err);

        setError(err.message || 'An error occurred during login. Please try again.');

        setLoading(false);

      }

    };



    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        {/* Simple header - absolute positioned */}
        <div className="absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#007e40] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>

        {/* Main content - centered */}
        <div className="w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Login card with two columns */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl shadow-gray-200/50 p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="grid md:grid-cols-5 gap-8 items-center">
              {/* Logo section - left side (2 columns) */}
              <div className="hidden md:flex md:col-span-2 flex-col items-center justify-center pr-8 border-r border-gray-200">
                <img
                  src="/logos/2.svg"
                  alt="UM6P Logo"
                  className="h-48 w-auto mb-4 drop-shadow-sm"
                />
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome Back</h2>
                <p className="text-sm text-gray-600 text-center">
                  Sign in to access your INF Platform
                </p>
              </div>

              {/* Mobile logo (shown only on mobile) */}
              <div className="md:hidden text-center mb-6">
                <img
                  src="/logos/2.svg"
                  alt="UM6P Logo"
                  className="h-32 w-auto mx-auto mb-3 drop-shadow-sm"
                />
                <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome Back</h2>
                <p className="text-xs text-gray-600">
                  Sign in to access your INF Platform
                </p>
              </div>

              {/* Form section - right side (3 columns) */}
              <div className="md:col-span-3">
              {/* Role selector */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  I am a
                </label>
                <div className="flex gap-3 p-1.5 bg-gray-100/70 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLoginAs('student')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      loginAs === 'student'
                        ? 'bg-[#007e40] text-white shadow-md shadow-[#007e40]/20 scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginAs('company')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      loginAs === 'company'
                        ? 'bg-[#007e40] text-white shadow-md shadow-[#007e40]/20 scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 hover:scale-102'
                    }`}
                  >
                    Company
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                      emailFocused ? 'text-[#007e40]' : 'text-gray-400'
                    }`}>
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      placeholder={loginAs === 'student' ? 'firstname.lastname@um6p.ma' : 'contact@company.com'}
                      className="w-full rounded-xl border-2 border-gray-200 pl-12 pr-4 py-3 text-sm placeholder:text-gray-400 focus:border-[#007e40] focus:outline-none focus:ring-4 focus:ring-[#007e40]/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                      passwordFocused ? 'text-[#007e40]' : 'text-gray-400'
                    }`}>
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      className="w-full rounded-xl border-2 border-gray-200 pl-12 pr-12 py-3 text-sm focus:border-[#007e40] focus:outline-none focus:ring-4 focus:ring-[#007e40]/10 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end text-sm">
                  <Link
                    to="/forgot-password"
                    className="text-[#007e40] hover:text-[#005a2d] font-semibold hover:underline transition-all"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#007e40] to-[#006633] px-4 py-3.5 text-base font-bold text-white hover:shadow-lg hover:shadow-[#007e40]/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all duration-200 relative overflow-hidden group"
                >
                  <span className={`flex items-center justify-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                    Sign in
                  </span>
                  {loading && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="ml-2">Signing in...</span>
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                </button>
              </form>

              {/* Sign up link */}
              {loginAs === 'student' && (
                <div className="mt-8 pt-8 border-t border-gray-200/60">
                  <p className="text-sm text-center text-gray-600">
                    Don't have an account?{' '}
                    <Link
                      to="/signup"
                      className="font-bold text-[#007e40] hover:text-[#005a2d] hover:underline transition-all"
                    >
                      Create account
                    </Link>
                  </p>
                </div>
              )}
              
              {loginAs === 'company' && (
                <div className="mt-8 pt-8 border-t border-gray-200/60">
                  <p className="text-xs text-center text-gray-500 bg-gray-50 rounded-lg py-2.5 px-4">
                    Companies join by invitation only
                  </p>
                  <p className="mt-3 text-xs text-center text-gray-600">
                    Contact us at{' '}
                    <a
                      href="mailto:inf.shbm@um6p.ma"
                      className="font-semibold text-[#007e40] hover:text-[#005a2d] hover:underline transition-all"
                    >
                      inf.shbm@um6p.ma
                    </a>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-10 space-y-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <Link
                  to="/offers"
                  className="text-gray-600 hover:text-[#007e40] font-medium transition-colors"
                >
                  Browse offers
                </Link>
                <span className="text-gray-300">•</span>
                <a
                  href="mailto:inf.shbm@um6p.ma"
                  className="text-gray-600 hover:text-[#007e40] font-medium transition-colors"
                >
                  Need help?
                </a>
              </div>
              
              {captchaConfig.enabled && (
                <p className="text-xs text-center text-gray-500">
                  This site is protected by reCAPTCHA
                </p>
              )}
              
              <p className="text-xs text-center text-gray-500">
                By signing in, you agree to our{' '}
                <Link to="/privacy-policy" className="font-medium text-gray-600 hover:text-[#007e40] transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  