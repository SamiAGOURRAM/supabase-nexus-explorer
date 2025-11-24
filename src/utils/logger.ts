/**
 * Logger Utility
 * 
 * Provides development-only logging that is automatically disabled in production.
 * Use this instead of console.log for debug statements.
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Log debug information (only in development)
 */
export function debug(...args: any[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * Log warnings (always shown, but can be filtered in production)
 */
export function warn(...args: any[]): void {
  if (isDevelopment) {
    console.warn(...args);
  }
  // In production, you might want to send to error tracking service
}

/**
 * Log errors (always shown)
 * Use this for actual errors that need attention
 */
export function error(...args: any[]): void {
  console.error(...args);
  // In production, send to error tracking service (e.g., Sentry)
}

/**
 * Log info messages (only in development)
 */
export function info(...args: any[]): void {
  if (isDevelopment) {
    console.info(...args);
  }
}

// Re-export the existing logError function pattern for compatibility
export { error as logError };
