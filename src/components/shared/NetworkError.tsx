/**
 * NetworkError - Network connection error component
 * 
 * Displays a message when network connection fails.
 * 
 * @component
 * @example
 * <NetworkError onRetry={handleRetry} />
 */

import { WifiOff, RefreshCw } from 'lucide-react';

interface NetworkErrorProps {
  onRetry?: () => void;
}

export default function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8 text-center">
      <WifiOff className="w-12 h-12 text-destructive mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-destructive mb-2">
        Connection Error
      </h3>
      <p className="text-sm text-destructive/90 mb-6">
        Unable to connect to the server. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}

