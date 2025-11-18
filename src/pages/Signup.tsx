import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Shield,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { checkRateLimitDirect, recordFailedAttempt, clearRateLimit } from '@/hooks/useRateLimit';
import { useCaptcha, getCaptchaConfig } from '@/hooks/useCaptcha';

// Password validation regex patterns
const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/,
};

// Phone number validation (Moroccan format)
const PHONE_REGEX = /^(\+212|0)[5-7][0-9]{8}$/;

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    is_deprioritized: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isValid: false,
  });
  const navigate = useNavigate();
  
  // CAPTCHA integration
  const { verifyCaptcha } = useCaptcha();
  const captchaConfig = getCaptchaConfig();

  // Server-side rate limiting check
  const checkRateLimit = async (email: string): Promise<{ allowed: boolean; message?: string }> => {
    try {
      const result = await checkRateLimitDirect(email, 5, 15);
      
      if (!result.allowed) {
        setError(result.message || 'Too many signup attempts. Please try again later.');
        return { allowed: false, message: result.message };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow signup if rate limit check fails
      return { allowed: true };
    }
  };

  // Password strength validation
  const validatePasswordStrength = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= PASSWORD_REQUIREMENTS.minLength) {
      score += 2;
    } else {
      feedback.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters`);
    }

    if (PASSWORD_REQUIREMENTS.hasUppercase.test(password)) {
      score += 1;
    } else {
      feedback.push('One uppercase letter');
    }

    if (PASSWORD_REQUIREMENTS.hasLowercase.test(password)) {
      score += 1;
    } else {
      feedback.push('One lowercase letter');
    }

    if (PASSWORD_REQUIREMENTS.hasNumber.test(password)) {
      score += 1;
    } else {
      feedback.push('One number');
    }

    if (PASSWORD_REQUIREMENTS.hasSpecialChar.test(password)) {
      score += 1;
    } else {
      feedback.push('One special character (!@#$%^&*)');
    }

    // Check for common passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      feedback.push('Avoid common passwords');
      score = Math.max(0, score - 2);
    }

    return {
      score,
      feedback,
      isValid: score >= 6 && feedback.length === 0,
    };
  };

  // Handle password change with real-time validation
  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordStrength(validatePasswordStrength(password));
  };

  // Sanitize input to prevent XSS
  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  };

  // Validate phone number
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    return PHONE_REGEX.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sanitize inputs
      const sanitizedName = sanitizeInput(formData.full_name);
      const sanitizedEmail = sanitizeInput(formData.email.toLowerCase());
      const sanitizedPhone = sanitizeInput(formData.phone);

      // Validate full name
      if (!sanitizedName || sanitizedName.length < 2) {
        throw new Error('Please enter a valid full name (at least 2 characters)');
      }

      // CAPTCHA verification (if enabled)
      if (captchaConfig.enabled) {
        const captchaResult = await verifyCaptcha('signup');
        if (!captchaResult || !captchaResult.token) {
          await recordFailedAttempt(sanitizedEmail, 'CAPTCHA verification failed', 'signup');
          throw new Error('Security verification failed. Please try again.');
        }
        console.log('✅ CAPTCHA verified');
      }

      // Check server-side rate limiting BEFORE validation
      const rateLimitCheck = await checkRateLimit(sanitizedEmail);
      if (!rateLimitCheck.allowed) {
        setLoading(false);
        return;
      }

      // Validate email domain - allow UM6P and Gmail (for testing)
      const isUM6P = sanitizedEmail.endsWith('@um6p.ma');
      const isGmail = sanitizedEmail.endsWith('@gmail.com');
      
      if (!isUM6P && !isGmail) {
        await recordFailedAttempt(sanitizedEmail, 'Invalid email domain', 'signup');
        throw new Error('Email must be from UM6P (@um6p.ma) or Gmail (@gmail.com) for testing.');
      }

      // Validate password strength
      const strength = validatePasswordStrength(formData.password);
      if (!strength.isValid) {
        await recordFailedAttempt(sanitizedEmail, 'Weak password', 'signup');
        throw new Error(`Password must meet requirements: ${strength.feedback.join(', ')}`);
      }

      // Validate password confirmation
      if (formData.password !== formData.confirmPassword) {
        await recordFailedAttempt(sanitizedEmail, 'Password mismatch', 'signup');
        throw new Error('Passwords do not match');
      }

      // Validate phone number if provided
      if (sanitizedPhone && !validatePhone(sanitizedPhone)) {
        await recordFailedAttempt(sanitizedEmail, 'Invalid phone number', 'signup');
        throw new Error('Invalid phone number format. Use format: +212 6XX XXX XXX or 06XX XXX XXX');
      }

      // Determine role based on email domain
      // Note: Database enum only supports 'student', 'company', 'admin'
      // We use 'student' for both UM6P and Gmail accounts
      const role = 'student';

      // Sign up with enhanced security
      const { data, error: signupError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: sanitizedName,
            role: role,
            phone: sanitizedPhone || null,
            is_deprioritized: formData.is_deprioritized,
          },
        },
      });

      if (signupError) {
        // Record failed attempt
        await recordFailedAttempt(sanitizedEmail, signupError.message, 'signup');
        
        // Handle specific Supabase errors with user-friendly messages
        if (signupError.message.includes('already registered') || signupError.message.includes('already exists')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        
        if (signupError.message.includes('Database error') || signupError.message.includes('saving new user')) {
          console.error('Database error during signup - trigger may have failed:', signupError);
          throw new Error('Account creation failed. Please try again or contact support if the issue persists.');
        }
        
        if (signupError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid credentials. Please check your email and password.');
        }
        
        // Generic error fallback
        throw new Error(signupError.message || 'An error occurred during signup. Please try again.');
      }

      // Check if user was created
      if (!data.user) {
        throw new Error('Failed to create user account');
      }

      console.log('✅ Account created successfully for:', sanitizedEmail);
      console.log('📧 Check your email for verification link');
      
      // Clear rate limit on success
      await clearRateLimit(sanitizedEmail);
      
      // Navigate to verification page
      navigate('/verify-email', { 
        state: { 
          message: 'Account created! Please check your email to verify your account.',
          email: sanitizedEmail,
        } 
      });
      
    } catch (err: any) {
      console.error('❌ Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  // Signup form
  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(21,94,239,0.08),_transparent_60%)]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/login"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Already registered? Sign in
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="hidden rounded-3xl border border-white/15 bg-gradient-to-br from-primary via-[hsl(var(--brand-secondary))] to-slate-900 p-10 text-white shadow-elegant lg:flex lg:flex-col">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
              <Sparkles className="h-4 w-4" />
              Student onboarding
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight">
              Your Nexus profile starts here.
            </h1>
            <p className="mt-4 text-white/80">
              Complete the secure signup once to unlock priority booking, personalized schedules, and curated employer updates for each Nexus hiring sprint.
            </p>
            <ul className="mt-8 space-y-4 text-sm text-white/85">
              <li className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-white/80" />
                Email verification + reCAPTCHA guard every account.
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-white/80" />
                @um6p.ma or @gmail.com (for testing) email addresses are accepted.
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-white/80" />
                Update your booking priority any time inside the portal.
              </li>
            </ul>

            <div className="mt-auto flex items-center gap-3 pt-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Need help?</p>
                <p className="text-base font-semibold">nexus@um6p.ma</p>
              </div>
              <ArrowRight className="h-5 w-5 text-white/70" />
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card/95 p-8 shadow-elegant backdrop-blur">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
              <p className="text-muted-foreground">INF Platform 2.0 - Student Registration</p>
            </div>

          {/* Info Banner */}
          <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/5 p-5">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">UM6P students only</p>
                <p className="text-xs text-primary/80">
                  Companies join by invitation—contact the Nexus administrator for partner access.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-primary/90">
              <span className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                Enhanced security: email verification {captchaConfig.enabled && '+ reCAPTCHA'}
              </span>
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                @um6p.ma or @gmail.com (for testing) accepted
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-start gap-3 animate-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-2">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address <span className="text-destructive">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="firstname.lastname@um6p.ma"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              <p className="text-xs text-muted-foreground mt-1">
                @um6p.ma or @gmail.com (for testing) email addresses are allowed
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={PASSWORD_REQUIREMENTS.minLength}
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder={`At least ${PASSWORD_REQUIREMENTS.minLength} characters`}
                  className="w-full px-4 py-3 pr-12 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-destructive'
                              : passwordStrength.score <= 4
                              ? 'bg-warning'
                              : 'bg-green-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Password Requirements Checklist */}
                  {passwordStrength.feedback.length > 0 && (
                    <div className="space-y-1">
                      {passwordStrength.feedback.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <XCircle className="w-3 h-3 text-destructive" />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {passwordStrength.isValid && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Strong password!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-3 pr-12 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+212 6XX XXX XXX or 06XX XXX XXX"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              {formData.phone && !validatePhone(formData.phone) && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Invalid phone format
                </p>
              )}
            </div>

            {/* Deprioritized Warning */}
            <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_deprioritized}
                  onChange={(e) => setFormData({ ...formData, is_deprioritized: e.target.checked })}
                  className="mt-1 mr-3 w-4 h-4 text-primary border-input rounded focus:ring-ring"
                />
                <div>
                  <div className="font-medium text-foreground">I already have an internship</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ⚠️ IMPORTANT: If you check this box, you will NOT be able to book during Phase 1.
                    You can only book during Phase 2.
                  </div>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium shadow-soft hover:shadow-elegant transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* reCAPTCHA Badge Info */}
          {captchaConfig.enabled && (
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                Protected by reCAPTCHA
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-2">
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

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary hover:underline font-medium"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </section>
      </div>
    </div>
  </div>
  );
}
