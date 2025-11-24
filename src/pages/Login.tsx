import { useState, useEffect } from 'react';

import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { supabase } from '@/lib/supabase';

import {

  Building2,

  GraduationCap,

  AlertCircle,

  Shield,

  Sparkles,

  ArrowLeft,

  Eye,

  EyeOff,

} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { checkRateLimitDirect, recordFailedAttempt, clearRateLimit } from '@/hooks/useRateLimit';

import { useCaptcha, getCaptchaConfig } from '@/hooks/useCaptcha';
import { debug, error as logError, warn } from '@/utils/logger';



type Highlight = {

  icon: LucideIcon;

  title: string;

  description: string;

};



const LOGIN_HIGHLIGHTS: Highlight[] = [

  {

    icon: GraduationCap,

    title: 'Student cockpit',

    description: 'Track bookings, offers, and interview slots from one place.',

  },

  {

    icon: Building2,

    title: 'Company lounge',

    description: 'Manage posted offers and confirm interviews in real time.',

  },

  {

    icon: Shield,

    title: 'Secure by default',

    description: 'Email verification + reCAPTCHA keep data protected.',

  },

];



  export default function Login() {

    const [email, setEmail] = useState('');

    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');

    const [loginAs, setLoginAs] = useState<'student' | 'company'>('student');

    const [showPassword, setShowPassword] = useState(false);

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

            .select('role')

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
              .select('role')
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



        // If profile exists, redirect based on role

        if (profile && profile.role) {

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
          
          redirectUser(profile.role);
          
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

      <div className="relative min-h-screen bg-white">

        <div

          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ffb300]/5 via-white to-[#007e40]/5"

          aria-hidden="true"

        />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">

          <Link

            to="/offers"

            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-[#007e40] mb-4"

          >

            <ArrowLeft className="h-4 w-4" />

            Back to offers

          </Link>



          <div className="grid flex-1 gap-8 lg:grid-cols-[1.05fr,0.95fr]">

            <section className="hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-[#1a1f3a] via-[#007e40] to-[#1a1f3a] p-8 text-white shadow-xl lg:flex lg:flex-col relative overflow-hidden">

              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                    backgroundSize: "40px 40px",
                  }}
                />
              </div>

              <div className="relative z-10">

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6">

                  <Sparkles className="h-4 w-4 text-[#ffb300]" />

                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white">

                    Unified Access

                  </span>

                </div>

                <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">

                  Reconnect with your recruiting hub in seconds.

                </h1>

                <p className="text-lg text-white/90 leading-relaxed">

                  One secure login routes you to the right dashboard—student, company, or administrator—without any extra clicks.

                </p>

              </div>



              <div className="mt-10 space-y-4 relative z-10">

                {LOGIN_HIGHLIGHTS.map((highlight) => {

                  const Icon = highlight.icon;

                  return (

                    <div

                      key={highlight.title}

                      className="flex gap-4 rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-sm p-4 hover:bg-white/15 transition-all"

                    >

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ffb300]/20 flex-shrink-0">

                        <Icon className="h-6 w-6 text-[#ffb300]" />

                      </div>

                      <div>

                        <p className="text-base font-semibold text-white mb-1">{highlight.title}</p>

                        <p className="text-sm text-white/80 leading-relaxed">{highlight.description}</p>

                      </div>

                    </div>

                  );

                })}

              </div>



              <p className="mt-auto pt-6 text-xs text-white/70 relative z-10">

                Need assistance? Contact the Nexus events team at{' '}

                <a href="mailto:nexus@um6p.ma" className="font-semibold text-[#ffb300] hover:text-[#ffc940] transition-colors">nexus@um6p.ma</a>

              </p>

            </section>



            <section className="rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-xl">

              <div className="mb-8 text-center">

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#007e40]/10 rounded-full border border-[#007e40]/20 mb-4">

                  <Shield className="h-4 w-4 text-[#007e40]" />

                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[#007e40]">

                    Secure Sign In

                  </span>

                </div>

                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Welcome back to INF Platform</h2>

                <p className="text-base text-gray-600">

                  Choose your workspace and continue where you left off.

                </p>

              </div>



              <div className="mb-6 flex gap-2 rounded-xl bg-[#f5f5f0] p-1">

                <button

                  type="button"

                  onClick={() => setLoginAs('student')}

                  aria-pressed={loginAs === 'student'}

                  className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-all ${

                    loginAs === 'student'

                      ? 'bg-[#ffb300] text-white shadow-lg'

                      : 'text-gray-600 hover:text-gray-900'

                  }`}

                >

                  Student

                </button>

                <button

                  type="button"

                  onClick={() => setLoginAs('company')}

                  aria-pressed={loginAs === 'company'}

                  className={`flex-1 rounded-lg py-3 text-sm font-semibold transition-all ${

                    loginAs === 'company'

                      ? 'bg-[#ffb300] text-white shadow-lg'

                      : 'text-gray-600 hover:text-gray-900'

                  }`}

                >

                  Company

                </button>

              </div>



              {error && (

                <div className="mb-6 flex items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-700">

                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />

                  <span className="text-sm font-medium">{error}</span>

                </div>

              )}



              <form onSubmit={handleEmailLogin} className="space-y-5">

                <div className="space-y-2">

                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900">

                    {loginAs === 'student' ? 'UM6P email (@um6p.ma)' : 'Company email'}

                  </label>

                  <input

                    id="email"

                    type="email"

                    required

                    value={email}

                    onChange={(e) => setEmail(e.target.value)}

                    placeholder={loginAs === 'student' ? 'prenom.nom@um6p.ma' : 'talent@company.com'}

                    className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3.5 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"

                  />

                  <p className="text-xs text-gray-600">

                    {loginAs === 'student'

                      ? 'Use your UM6P student address. Gmail works for official testing accounts.'

                      : 'Sign in with the company profile that was invited to Nexus.'}

                  </p>

                </div>



                <div className="space-y-2">

                  <label htmlFor="password" className="block text-sm font-semibold text-gray-900">

                    Password

                  </label>

                  <div className="relative">

                    <input

                      id="password"

                      type={showPassword ? 'text' : 'password'}

                      required

                      value={password}

                      onChange={(e) => setPassword(e.target.value)}

                      className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3.5 pr-12 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"

                    />

                    <button

                      type="button"

                      onClick={() => setShowPassword((prev) => !prev)}

                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 transition hover:text-gray-700"

                    >

                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

                    </button>

                  </div>

                </div>



                <button

                  type="submit"

                  disabled={loading}

                  className="w-full rounded-lg bg-[#ffb300] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#e6a200] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {loading ? 'Signing in…' : 'Sign in'}

                </button>

              </form>



              {captchaConfig.enabled && (

                <div className="mt-5 text-center">

                  <p className="flex items-center justify-center gap-2 text-xs text-gray-600">

                    <Shield className="h-3.5 w-3.5 text-[#007e40]" />

                    Protected by reCAPTCHA

                  </p>

                  <p className="mt-1 flex items-center justify-center gap-2 text-xs text-gray-500">

                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#007e40] hover:underline transition-colors">

                      Privacy

                    </a>

                    <span className="text-gray-300">|</span>

                    <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#007e40] hover:underline transition-colors">

                      Terms

                    </a>

                  </p>

                </div>

              )}



              <div className="mt-8 space-y-4 text-sm text-gray-600">

                <div className="flex flex-wrap items-center justify-between gap-2">

                  <Link to="/forgot-password" className="font-semibold text-[#007e40] hover:text-[#005a2d] hover:underline transition-colors">

                    Forgot password?

                  </Link>

                  <p>

                    Need an account?{' '}

                    <Link to="/signup" className="font-semibold text-[#007e40] hover:text-[#005a2d] hover:underline transition-colors">

                      Student signup

                    </Link>

                  </p>

                </div>

                <p className="text-xs text-gray-500">

                  Companies are onboarded by invitation. Reach out to your UM6P contact if you need access.

                </p>

                <div className="pt-4 border-t border-gray-200">

                  <p className="text-xs text-gray-500 text-center">

                    By signing in, you agree to our{' '}

                    <Link to="/privacy-policy" className="text-[#007e40] hover:text-[#005a2d] hover:underline font-medium transition-colors">

                      Privacy Policy

                    </Link>

                  </p>

                </div>

              </div>

            </section>

          </div>

        </div>

      </div>

    );

  }



