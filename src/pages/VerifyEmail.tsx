import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const customMessage = location.state?.message;

  useEffect(() => {
    // Check if user came from a confirmation link
    const checkEmailConfirmation = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session) {
          // User is authenticated, email is verified
          setSuccess(true);
          setLoading(false);
          
          // Redirect to login after a short delay
          setTimeout(() => {
            navigate('/login', { state: { verified: true } });
          }, 2000);
        } else {
          // No session yet, waiting for user to click confirmation link
          setLoading(false);
        }
      } catch (err: any) {
        console.error('❌ Session check error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    checkEmailConfirmation();

    // Listen for auth state changes (when user clicks the confirmation link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { state: { verified: true } });
        }, 2000);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!email && !success) {
      // Only redirect if we don't have email and haven't succeeded
      const timer = setTimeout(() => {
        navigate('/signup');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [email, success, navigate]);

  const handleResend = async () => {
    if (!email) {
      setError('Email address not found. Please sign up again.');
      return;
    }

    setResending(true);
    setError('');
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });
      
      if (resendError) throw resendError;
      alert('✅ Confirmation link resent to your email!');
      
    } catch (err: any) {
      setError('Failed to resend confirmation link: ' + err.message);
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

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking verification status...</p>
          </div>
        ) : success ? (
          <>
            {/* Success Icon */}
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>

            {/* Success Message */}
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              Email Verified!
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Your email has been successfully verified.
              <br />
              Redirecting you to login...
            </p>
          </>
        ) : (
          <>
            {/* Icon */}
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground text-center mb-2">
              Check Your Email
            </h2>
            {customMessage && (
              <div className="mb-4 bg-warning/10 border border-warning/20 text-warning px-4 py-3 rounded-lg text-center">
                <p className="text-sm font-medium">{customMessage}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center mb-6">
              We sent a confirmation link to
              <br />
              <span className="font-mono text-foreground">{email}</span>
            </p>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-foreground mb-2">Next Steps:</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Open your email inbox</li>
                <li>Look for our confirmation email</li>
                <li>Click the confirmation link in the email</li>
                <li>You'll be automatically signed in</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-primary/20">
                <p className="text-xs text-primary font-medium">🧪 Local Development:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check <a href="http://localhost:54324" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">http://localhost:54324</a> (Inbucket) to view test emails
                </p>
              </div>
            </div>

            {/* Resend */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Didn't receive the email?
              </p>
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend confirmation link'}
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                Check your spam folder if you don't see it
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}