/**
 * ErrorBoundary - React Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * @component
 * @example
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { error as logError } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error (in production, send to error reporting service)
    logError('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to error reporting service (e.g., Sentry)
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { contexts: { react: errorInfo } });
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorFallback - Default error display component
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const isDevelopment = import.meta.env.DEV;

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card rounded-xl border border-destructive/20 shadow-elegant p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
            </p>
          </div>
        </div>

        {isDevelopment && error && (
          <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
            <h2 className="text-sm font-semibold text-foreground mb-2">
              Error Details (Development Only)
            </h2>
            <pre className="text-xs text-foreground overflow-auto max-h-48">
              <code>{error.toString()}</code>
              {errorInfo && (
                <code className="block mt-2 text-muted-foreground">
                  {errorInfo.componentStack}
                </code>
              )}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ErrorBoundary - Wrapper component with hooks support
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export default function ErrorBoundary({ children, fallback }: Props) {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>;
}

