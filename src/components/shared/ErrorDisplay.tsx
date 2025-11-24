/**
 * ErrorDisplay - Reusable error display component
 * 
 * Displays user-friendly error messages with optional retry functionality.
 * 
 * @component
 * @example
 * <ErrorDisplay error={error} onRetry={handleRetry} />
 */

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

export default function ErrorDisplay({
  error,
  onRetry,
  title = 'Something went wrong',
  className = '',
}: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage =
    typeof error === 'string' ? error : error?.message || 'An unexpected error occurred';

  return (
    <div
      className={`bg-destructive/10 border border-destructive/20 rounded-xl p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-destructive mb-2">{title}</h3>
          <p className="text-sm text-destructive/90 mb-4">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

