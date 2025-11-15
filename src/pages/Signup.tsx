import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Info, Mail } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    is_deprioritized: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate email domain
      if (!formData.email.endsWith('@um6p.ma')) {
        throw new Error('Student email must be from UM6P domain (@um6p.ma)');
      }

      // Validate password length
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'student',
            phone: formData.phone || null,
            is_deprioritized: formData.is_deprioritized,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Log for debugging
      console.log('✅ User created:', authData.user.id);
      console.log('📧 Email confirmation required:', !authData.user.confirmed_at);

      setSuccess(true);
      // Don't auto-redirect - let user read the instructions
    } catch (err: any) {
      console.error('❌ Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  // Success screen with clear instructions
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-elegant p-8 border border-border">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground text-center mb-4">
            Account Created Successfully!
          </h2>

          {/* Email Verification Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  📧 Verification Email Sent
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  We sent a confirmation link to:
                </p>
                <p className="text-sm font-mono bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-blue-900 dark:text-blue-100 break-all">
                  {formData.email}
                </p>
              </div>
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <p className="text-sm font-semibold text-foreground mb-2">
              Next Steps:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>Click the "Confirm Email" link in the email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>Return here and login with your credentials</span>
              </li>
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg mb-4">
            <p className="text-xs text-warning-foreground">
              ⚠️ <strong>Important:</strong> You cannot login until you verify your email address.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-200"
            >
              Go to Login Page
            </button>
            
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  email: '',
                  password: '',
                  full_name: '',
                  phone: '',
                  is_deprioritized: false,
                });
              }}
              className="w-full py-2 px-4 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80 transition-all duration-200"
            >
              Sign up with different email
            </button>
          </div>

          {/* Help text */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            Didn't receive the email?{' '}
            <button
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: formData.email,
                  });
                  if (error) throw error;
                  alert('Verification email resent! Please check your inbox.');
                } catch (err: any) {
                  alert('Failed to resend email: ' + err.message);
                }
              }}
              className="text-primary hover:underline font-medium"
            >
              Resend verification email
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Signup form
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-2xl shadow-elegant p-8 border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Account</h1>
            <p className="text-muted-foreground">INF Platform 2.0 - Student Registration</p>
          </div>

          {/* Info Banner */}
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg mb-6 flex gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-primary font-medium">UM6P Students Only</p>
              <p className="text-xs text-primary/80 mt-1">
                Companies: Registration is by invitation only. Contact the event administrator.
              </p>
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
                UM6P Email <span className="text-destructive">*</span>
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
                Must be a valid @um6p.ma email address
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password <span className="text-destructive">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 6 characters
              </p>
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
                placeholder="+212 6XX XXX XXX"
                className="w-full px-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
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

          {/* Additional Links */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-primary hover:underline font-medium"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}