  import { useState, useEffect } from 'react';
  import { useNavigate, useSearchParams, Link } from 'react-router-dom';
  import { supabase } from '@/lib/supabase';
  import { Building2, GraduationCap, AlertCircle } from 'lucide-react';

  export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [loginAs, setLoginAs] = useState<'student' | 'company'>('student');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
      checkUser();
    }, []);

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          redirectUser(profile.role);
        }
      }
    };

    const redirectUser = (role: string) => {
      const redirect = searchParams.get('redirect');
      if (redirect) {
        navigate(redirect);
      } else if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'company') {
        navigate('/company');
      } else {
        navigate('/student');
      }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error('⚠️ Email not verified! Please check your inbox and click the confirmation link before you can sign in.');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          if (profile.role === 'admin') {
            redirectUser(profile.role);
            return;
          }

          if (loginAs === 'student' && profile.role !== 'student') {
            await supabase.auth.signOut();
            throw new Error('This account is not a student account. Please use Company Login.');
          }
          if (loginAs === 'company' && profile.role !== 'company') {
            await supabase.auth.signOut();
            throw new Error('This account is not a company account. Please use Student Login.');
          }
          
          redirectUser(profile.role);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
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