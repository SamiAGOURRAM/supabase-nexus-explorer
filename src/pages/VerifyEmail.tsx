import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { error as logError } from '@/utils/logger';

export default function VerifyEmail() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleResend = async () => {
    if (!email) {
      setError('Email address not found. Please go back and sign up again.');
      return;
    }

    setResending(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Attempting to resend confirmation email to:', email);
      
      // Resend confirmation email
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (resendError) {
        console.error('Resend error:', resendError);
        throw resendError;
      }
      
      console.log('Confirmation email resent successfully');
      
      // Show success message
      setSuccess('A new confirmation link has been sent to your email! Check your inbox and spam folder.');
      // Clear success message after 10 seconds
      setTimeout(() => setSuccess(''), 10000);
      
    } catch (err: any) {
      logError('Resend error:', err);
      
      // Handle specific error cases
      if (err.message?.includes('rate limit')) {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else if (err.message?.includes('not found')) {
        setError('Email not found. Please sign up again.');
      } else {
        setError('Failed to resend link: ' + (err.message || 'Unknown error. Please try again later.'));
      }
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

        {/* Icon */}
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground text-center mb-2">
          Check Your Email
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          We sent a confirmation link to
          <br />
          <span className="font-mono text-foreground">{email}</span>
          <br />
          <span className="text-xs text-muted-foreground mt-2 block">
            Click the link in the email to verify your account. Check your spam folder if you don't see it.
          </span>
        </p>

        {/* Success Message */}
        {success && (
          <div className="mb-4 bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p className="text-sm text-foreground">Open your email inbox</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p className="text-sm text-foreground">Find the email from UM6P Nexus Explorer</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p className="text-sm text-foreground">Click the confirmation link</p>
          </div>
        </div>

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the email?
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-primary hover:underline font-medium disabled:opacity-50"
          >
            {resending ? 'Sending...' : 'Resend confirmation link'}
          </button>
        </div>
      </div>
    </div>
  );
}