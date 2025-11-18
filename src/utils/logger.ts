/**
 * Logger Utility
 * 
 * Provides environment-aware logging that:
 * - Shows all logs in development
 * - Hides debug logs in production
 * - Always shows errors and warnings
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Debug log - only shown in development
 */
export function debug(...args: unknown[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

/**
 * Info log - only shown in development
 */
export function info(...args: unknown[]): void {
  if (isDevelopment) {
    console.info(...args);
  }
}

/**
 * Warning log - always shown
 */
export function warn(...args: unknown[]): void {
  console.warn(...args);
}

/**
 * Error log - always shown
 */
export function error(...args: unknown[]): void {
  console.error(...args);
}

/**
 * Log - only shown in development (alias for debug)
 */
export const log = debug;

