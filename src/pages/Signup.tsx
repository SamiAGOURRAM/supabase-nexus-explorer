import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Shield,
  ArrowLeft,
  Mail,
  Settings,
} from 'lucide-react';
import { checkRateLimitDirect, recordFailedAttempt, clearRateLimit } from '@/hooks/useRateLimit';
import { useCaptcha, getCaptchaConfig } from '@/hooks/useCaptcha';
import { debug, error as logError } from '@/utils/logger';

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
    consent: false, // GDPR consent
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
      }

      // Check server-side rate limiting BEFORE validation
      const rateLimitCheck = await checkRateLimit(sanitizedEmail);
      if (!rateLimitCheck.allowed) {
        setLoading(false);
        return;
      }

      // Validate email domain - only allow UM6P students
      const isUM6P = sanitizedEmail.endsWith('@um6p.ma');
      
      if (!isUM6P) {
        await recordFailedAttempt(sanitizedEmail, 'Invalid email domain', 'signup');
        throw new Error('Only UM6P email addresses (@um6p.ma) are allowed.');
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

      // GDPR: Validate consent
      if (!formData.consent) {
        throw new Error('You must consent to the processing of your data to create an account.');
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
            consent_given: true, // GDPR consent
            consent_version: '1.0', // Privacy policy version
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
          logError('Database error during signup - trigger may have failed:', signupError);
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

      // Update profile with consent information (after profile is created by trigger)
      // The trigger will create the profile, then we update it with consent
      if (data.user.id) {
        const { error: consentError } = await supabase
          .from('profiles')
          .update({
            consent_given: true,
            consent_date: new Date().toISOString(),
            consent_version: '1.0',
          })
          .eq('id', data.user.id);

        if (consentError) {
          logError('Error updating consent:', consentError);
          // Non-critical error, continue with signup
        }
      }

      debug('✅ Account created successfully for:', sanitizedEmail);
      debug('📧 Check your email for verification link');
      
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
      {/* Simple header - absolute positioned */}
      <div className="absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#007e40] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#007e40] transition-all"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-20">
        {/* Signup card */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xl shadow-gray-200/50 p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="grid md:grid-cols-5 gap-10 items-start">
            {/* Logo section - left side (2 columns) */}
            <div className="hidden md:flex md:col-span-2 flex-col pr-8 border-r border-gray-200">
              <img
                src="/logos/2.svg"
                alt="UM6P Logo"
                className="h-48 w-auto mb-6 drop-shadow-sm mx-auto"
              />
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Join INF Platform</h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                Create your account to access exclusive internship opportunities
              </p>
              
              {/* Feature highlights */}
              <div className="space-y-3 mt-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Shield className="h-5 w-5 text-[#007e40] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Secure by default</p>
                    <p className="text-xs text-gray-600">Email verification + reCAPTCHA protection</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Mail className="h-5 w-5 text-[#007e40] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">@um6p.ma only</p>
                    <p className="text-xs text-gray-600">Exclusive access for SHBM-UM6P students</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Settings className="h-5 w-5 text-[#007e40] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Full control</p>
                    <p className="text-xs text-gray-600">Manage your profile and bookings anytime</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile logo (shown only on mobile) */}
            <div className="md:hidden text-center mb-6">
              <img
                src="/logos/2.svg"
                alt="UM6P Logo"
                className="h-32 w-auto mx-auto mb-3 drop-shadow-sm"
              />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Join INF Platform</h2>
              <p className="text-xs text-gray-600">
                Create your account to access exclusive opportunities
              </p>
            </div>

            {/* Form section - right side (3 columns) */}
            <div className="md:col-span-3">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Create Your Account</h3>

              {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3.5 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="firstname.lastname@um6p.ma"
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3.5 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only @um6p.ma email addresses are allowed
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                Password <span className="text-red-500">*</span>
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
                  className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3.5 pr-12 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 transition hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                              ? 'bg-red-500'
                              : passwordStrength.score <= 4
                              ? 'bg-[#ffb300]'
                              : 'bg-[#007e40]'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  
                  {/* Password Requirements Checklist */}
                  {passwordStrength.feedback.length > 0 && (
                    <div className="space-y-1">
                      {passwordStrength.feedback.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                          <XCircle className="w-3 h-3 text-red-500" />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {passwordStrength.isValid && (
                    <div className="flex items-center gap-2 text-xs text-[#007e40]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Strong password!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3.5 pr-12 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 transition hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Passwords do not match
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+212 6XX XXX XXX or 06XX XXX XXX"
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3.5 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"
              />
              {formData.phone && !validatePhone(formData.phone) && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Invalid phone format. Use format: +212 6XX XXX XXX or 06XX XXX XXX
                </p>
              )}
            </div>

            {/* GDPR: Consent Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center h-5 mt-0.5">
                <input
                  id="consent"
                  name="consent"
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="w-4 h-4 text-[#007e40] border-gray-300 rounded focus:ring-[#007e40]"
                  required
                />
              </div>
              <div className="text-sm">
                <label htmlFor="consent" className="font-medium text-gray-900">
                  I agree to the processing of my personal data
                </label>
                <p className="text-gray-600 mt-1 text-xs">
                  By creating an account, you agree to our <Link to="/privacy-policy" className="text-[#007e40] hover:underline">Privacy Policy</Link> and consent to share your profile information with participating companies.
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#ffb300] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#e6a200] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
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
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" />
                Protected by reCAPTCHA
              </p>
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-2">
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Privacy
                </a>
                <span className="text-gray-300">|</span>
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Terms
                </a>
              </p>
            </div>
          )}

              {/* Footer - moved inside form section */}
              <div className="mt-10 space-y-4">
                {captchaConfig.enabled && (
                  <p className="text-xs text-center text-gray-500">
                    This site is protected by reCAPTCHA
                  </p>
                )}
                
                <p className="text-xs text-center text-gray-500">
                  By signing up, you agree to our{' '}
                  <Link to="/privacy-policy" className="font-medium text-gray-600 hover:text-[#007e40] transition-colors">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
