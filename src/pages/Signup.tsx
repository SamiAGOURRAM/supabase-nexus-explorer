import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Info } from 'lucide-react';

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
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate email domain - allow UM6P or Gmail for testing
      const isUM6P = formData.email.endsWith('@um6p.ma');
      const isGmail = formData.email.endsWith('@gmail.com');
      
      if (!isUM6P && !isGmail) {
        throw new Error('Email must be from UM6P (@um6p.ma) or Gmail (@gmail.com) for testing');
      }

      // Validate password length
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Determine role based on email domain
      const role = isGmail ? 'test_student' : 'student';

      // Use signUp with email confirmation instead of OTP
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: formData.full_name,
            role: role,
            phone: formData.phone || null,
            is_deprioritized: formData.is_deprioritized,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Log signup status for debugging
      console.log('✅ Signup successful for:', formData.email);
      console.log('📧 Email confirmation required - Check your inbox');
      
      // Important: Sign out immediately to prevent auto-login
      await supabase.auth.signOut();
      
      // Redirect to verification page with email
      navigate('/verify-email', { 
        state: { 
          email: formData.email,
          isNewUser: true,
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
              <p className="text-xs text-orange-600 mt-1 font-medium">
                🧪 Testing: Gmail accounts allowed with test_student role
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
                @um6p.ma for students or @gmail.com for testing
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