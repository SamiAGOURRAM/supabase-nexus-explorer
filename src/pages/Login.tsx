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

            console.warn(`Profile check attempt ${retries + 1} error:`, profileError);

          } else if (profileData) {

            profile = profileData;

            break;

          }

          

          retries++;

        }



        // If profile still doesn't exist after retries, try to create it manually
        if (!profile) {
          console.warn('Profile not found after retries. Attempting to create profile...');
          
          try {
            // Try to create profile using the helper function
            // The function gets user data from auth.users table, so we only need the user ID
            const { error: createError } = await supabase.rpc('create_profile_for_user', {
              p_user_id: data.user.id
            } as any);
            
            if (createError) {
              console.error('Failed to create profile:', createError);
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
              console.error('Failed to fetch newly created profile:', newProfileError);
              navigate('/offers', { replace: true });
              return;
            }
            
            profile = newProfileData;
            console.log('✅ Profile created successfully');
          } catch (err) {
            console.error('Error creating profile:', err);
            // Redirect to offers as fallback
            navigate('/offers', { replace: true });
            return;
          }
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

          // Set loading to false before redirect to prevent further submissions
          setLoading(false);
          
          redirectUser(profile.role);
          
          // Return early to prevent any further execution
          return;

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

      <div className="relative min-h-screen bg-background">

        <div

          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(21,94,239,0.12),_transparent_55%)]"

          aria-hidden="true"

        />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">

          <Link

            to="/offers"

            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"

          >

            <ArrowLeft className="h-4 w-4" />

            Back to offers

          </Link>



          <div className="grid flex-1 gap-8 lg:grid-cols-[1.05fr,0.95fr]">

            <section className="hidden rounded-3xl border border-white/20 bg-gradient-to-br from-primary via-[hsl(var(--brand-secondary))] to-slate-900 p-8 text-white shadow-elegant lg:flex lg:flex-col">

              <div>

                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">

                  <Sparkles className="h-4 w-4" />

                  Unified access

                </p>

                <h1 className="mt-4 text-4xl font-semibold leading-tight">

                  Reconnect with your recruiting hub in seconds.

                </h1>

                <p className="mt-4 text-white/80">

                  One secure login routes you to the right dashboard—student, company, or administrator—without any extra clicks.

                </p>

              </div>



              <div className="mt-10 space-y-4">

                {LOGIN_HIGHLIGHTS.map((highlight) => {

                  const Icon = highlight.icon;

                  return (

                    <div

                      key={highlight.title}

                      className="flex gap-4 rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur"

                    >

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">

                        <Icon className="h-5 w-5" />

                      </div>

                      <div>

                        <p className="text-base font-semibold">{highlight.title}</p>

                        <p className="text-sm text-white/80">{highlight.description}</p>

                      </div>

                    </div>

                  );

                })}

              </div>



              <p className="mt-6 text-xs text-white/70">

                Need assistance? Contact the Nexus events team at

                <span className="font-semibold text-white"> nexus@um6p.ma</span>

              </p>

            </section>



            <section className="rounded-3xl border border-border/60 bg-card/95 p-8 shadow-elegant backdrop-blur">

              <div className="mb-8 text-center">

                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">

                  Secure sign in

                </p>

                <h2 className="mt-3 text-3xl font-bold text-foreground">Welcome back to INF Platform</h2>

                <p className="mt-2 text-sm text-muted-foreground">

                  Choose your workspace and continue where you left off.

                </p>

              </div>



              <div className="mb-6 flex gap-2 rounded-2xl bg-muted p-1">

                <button

                  type="button"

                  onClick={() => setLoginAs('student')}

                  aria-pressed={loginAs === 'student'}

                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${

                    loginAs === 'student'

                      ? 'bg-primary text-primary-foreground shadow-soft'

                      : 'text-muted-foreground hover:text-foreground'

                  }`}

                >

                  Student

                </button>

                <button

                  type="button"

                  onClick={() => setLoginAs('company')}

                  aria-pressed={loginAs === 'company'}

                  className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-all ${

                    loginAs === 'company'

                      ? 'bg-primary text-primary-foreground shadow-soft'

                      : 'text-muted-foreground hover:text-foreground'

                  }`}

                >

                  Company

                </button>

              </div>



              {error && (

                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive animate-in">

                  <AlertCircle className="h-5 w-5 flex-shrink-0" />

                  <span className="text-sm">{error}</span>

                </div>

              )}



              <form onSubmit={handleEmailLogin} className="space-y-5">

                <div className="space-y-2">

                  <label htmlFor="email" className="text-sm font-semibold text-foreground">

                    {loginAs === 'student' ? 'UM6P email (@um6p.ma)' : 'Company email'}

                  </label>

                  <input

                    id="email"

                    type="email"

                    required

                    value={email}

                    onChange={(e) => setEmail(e.target.value)}

                    placeholder={loginAs === 'student' ? 'prenom.nom@um6p.ma' : 'talent@company.com'}

                    className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm shadow-soft transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"

                  />

                  <p className="text-xs text-muted-foreground">

                    {loginAs === 'student'

                      ? 'Use your UM6P student address. Gmail works for official testing accounts.'

                      : 'Sign in with the company profile that was invited to Nexus.'}

                  </p>

                </div>



                <div className="space-y-2">

                  <label htmlFor="password" className="text-sm font-semibold text-foreground">

                    Password

                  </label>

                  <div className="relative">

                    <input

                      id="password"

                      type={showPassword ? 'text' : 'password'}

                      required

                      value={password}

                      onChange={(e) => setPassword(e.target.value)}

                      className="w-full rounded-2xl border border-input bg-background px-4 py-3.5 text-sm shadow-soft transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"

                    />

                    <button

                      type="button"

                      onClick={() => setShowPassword((prev) => !prev)}

                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition hover:text-foreground"

                    >

                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}

                    </button>

                  </div>

                </div>



                <button

                  type="submit"

                  disabled={loading}

                  className="w-full rounded-2xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-elegant disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {loading ? 'Signing in…' : 'Sign in'}

                </button>

              </form>



              {captchaConfig.enabled && (

                <div className="mt-5 text-center">

                  <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">

                    <Shield className="h-3.5 w-3.5" />

                    Protected by reCAPTCHA

                  </p>

                  <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">

                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">

                      Privacy

                    </a>

                    <span className="text-border">|</span>

                    <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">

                      Terms

                    </a>

                  </p>

                </div>

              )}



              <div className="mt-8 space-y-4 text-sm text-muted-foreground">

                <div className="flex flex-wrap items-center justify-between gap-2">

                  <Link to="/forgot-password" className="font-semibold text-primary hover:underline">

                    Forgot password?

                  </Link>

                  <p>

                    Need an account?{' '}

                    <Link to="/signup" className="font-semibold text-primary hover:underline">

                      Student signup

                    </Link>

                  </p>

                </div>

                <p className="text-xs">

                  Companies are onboarded by invitation. Reach out to your UM6P contact if you need access.

                </p>

                <div className="pt-4 border-t border-border">

                  <p className="text-xs text-muted-foreground text-center">

                    By signing in, you agree to our{' '}

                    <Link to="/privacy-policy" className="text-primary hover:underline font-medium">

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



