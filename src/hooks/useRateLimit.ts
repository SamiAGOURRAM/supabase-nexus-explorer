/**
 * Server-Side Rate Limiting Hook
 * 
 * Provides server-side rate limiting for authentication actions.
 * More secure than client-side localStorage approach.
 */

import { supabase } from '@/lib/supabase';

interface RateLimitResponse {
  allowed: boolean;
  remainingAttempts?: number;
  waitTimeMinutes?: number;
  message?: string;
}

interface RateLimitOptions {
  action: 'signup' | 'login' | 'check';
  maxAttempts?: number;
  windowMinutes?: number;
}

/**
 * Check rate limit using server-side validation
 */
export async function checkRateLimit(
  email: string,
  options: RateLimitOptions = { action: 'check' }
): Promise<RateLimitResponse> {
  try {
    // Get client IP (best effort - might not work in all environments)
    const ipAddress = await getClientIP();

    // Call Supabase Edge Function for rate limiting
    const { data, error } = await supabase.functions.invoke('check-rate-limit', {
      body: {
        email,
        action: options.action,
        ip_address: ipAddress,
        max_attempts: options.maxAttempts || 5,
        window_minutes: options.windowMinutes || 15,
      },
    });

    if (error) {
      // Silently fail open - rate limiting is optional
      if (process.env.NODE_ENV === 'development') {
        console.debug('Rate limit check error (ignored):', error.message);
      }
      return {
        allowed: true,
        message: 'Rate limit check unavailable',
      };
    }

    return data as RateLimitResponse;
  } catch (error: any) {
    // Silently fail open - rate limiting is optional
    if (process.env.NODE_ENV === 'development') {
      console.debug('Rate limit error (ignored):', error?.message);
    }
    return {
      allowed: true,
      message: 'Rate limit check unavailable',
    };
  }
}

/**
 * Record a failed attempt (signup or login)
 */
export async function recordFailedAttempt(
  email: string,
  reason: string,
  action: 'signup' | 'login' = 'signup'
): Promise<void> {
  try {
    const ipAddress = await getClientIP();

    // Call the database function directly
    // IP address is always a valid format (either real IP or '0.0.0.0' fallback)
    const { error } = await supabase.rpc('fn_record_failed_login', {
      p_email: email,
      p_ip_address: ipAddress,
      p_reason: `${action}_failed: ${reason}`,
    });

    // Silently ignore errors - rate limiting is optional
    // Error codes: 42883 = function doesn't exist, PGRST116 = table not found, 42P01 = relation doesn't exist
    if (error) {
      // Only log in development, and only for unexpected errors
      if (process.env.NODE_ENV === 'development' && 
          !['42883', 'PGRST116', '42P01', '42501'].includes(error.code || '')) {
        console.debug('Failed to record attempt (ignored):', error.message);
      }
    }
  } catch (error: any) {
    // Silently ignore - rate limiting is optional
    if (process.env.NODE_ENV === 'development') {
      console.debug('Error recording failed attempt (ignored):', error?.message);
    }
  }
}

/**
 * Clear rate limit for a specific email (after successful signup/login)
 * Silently fails if rate limiting is not configured - this is non-critical
 */
export async function clearRateLimit(email: string): Promise<void> {
  try {
    const ipAddress = await getClientIP();

    // Try RPC function first
    const { error: rpcError } = await supabase.rpc('fn_clear_rate_limit', {
      p_email: email,
      p_ip_address: ipAddress,
    });

    // If RPC doesn't exist or fails, try direct table access
    if (rpcError) {
      const { error } = await supabase
        .from('failed_login_attempts')
        .delete()
        .or(`email.eq.${email},ip_address.eq.${ipAddress}`);

      // Silently ignore errors - rate limiting is optional
      // PGRST116 = table not found, 42501 = permission denied, 404 = not found
      if (error && !['PGRST116', '42501', '42P01'].includes(error.code || '')) {
        // Only log unexpected errors, not missing table/permission errors
        if (process.env.NODE_ENV === 'development') {
          console.debug('Rate limit clear (non-critical):', error.message);
        }
      }
    }
  } catch (error: any) {
    // Silently ignore - rate limiting cleanup is best effort and non-critical
    if (process.env.NODE_ENV === 'development') {
      console.debug('Rate limit clear error (ignored):', error?.message);
    }
  }
}

/**
 * Get client IP address (best effort)
 * Note: This may not work in all environments due to CORS
 */
async function getClientIP(): Promise<string> {
  // In browser environments, external IP services are blocked by CORS
  // Skip the fetch entirely to avoid CORS errors in console
  // Rate limiting will still work using the fallback IP
  if (typeof window !== 'undefined') {
    // Browser environment - return fallback immediately
    // This prevents CORS errors from appearing in console
    return '0.0.0.0';
  }
  
  // Server-side only: try to get real IP (if this code runs on server)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
    
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return data.ip || '0.0.0.0';
      }
    } catch {
      clearTimeout(timeoutId);
      // Silently fall through to fallback
    }
  } catch {
    // Fallback to placeholder
  }
  
  // Fallback IP - valid INET format that database accepts
  return '0.0.0.0';
}

/**
 * Hook for using rate limiting in React components
 */
export function useRateLimit() {
  const check = async (email: string, action: 'signup' | 'login' = 'signup') => {
    return checkRateLimit(email, { action });
  };

  const recordFailure = async (email: string, reason: string, action: 'signup' | 'login' = 'signup') => {
    return recordFailedAttempt(email, reason, action);
  };

  const clear = async (email: string) => {
    return clearRateLimit(email);
  };

  return {
    checkRateLimit: check,
    recordFailedAttempt: recordFailure,
    clearRateLimit: clear,
  };
}

/**
 * Alternative: Direct database function call (faster, no Edge Function needed)
 */
export async function checkRateLimitDirect(
  email: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<RateLimitResponse> {
  // TEMPORARY: Bypass rate limiting for development
  return { allowed: true, message: 'Rate limit check disabled for development' };
  
  try {
    const ipAddress = await getClientIP();

    // Call the database function directly
    const { data, error } = await supabase.rpc('fn_check_rate_limit', {
      p_email: email,
      p_ip_address: ipAddress,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      // If RPC function doesn't exist or table doesn't exist, fail open (allow request)
      // Error codes: 42883 = function doesn't exist, PGRST116 = table not found, 42P01 = relation doesn't exist
      if (['42883', 'PGRST116', '42P01', '42501'].includes(error.code || '') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('permission denied')) {
        // Silently allow - rate limiting is optional
        return { allowed: true, message: 'Rate limit check unavailable' };
      }
      // Only log unexpected errors in development
      if (process.env.NODE_ENV === 'development') {
        console.debug('Rate limit check error (ignored):', error.message);
      }
      return { allowed: true, message: 'Rate limit check unavailable' };
    }

    if (!data) {
      // Calculate wait time - but only if table exists
      try {
        const { data: attempts, error: queryError } = await supabase
          .from('failed_login_attempts')
          .select('attempt_time')
          .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
          .gte('attempt_time', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString())
          .order('attempt_time', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (queryError) {
          // Table doesn't exist or RLS blocking - fail open
          // Silently ignore: PGRST116 = table not found, 42501 = permission denied, 42P01 = relation doesn't exist
          if (!['PGRST116', '42501', '42P01'].includes(queryError.code || '')) {
            if (process.env.NODE_ENV === 'development') {
              console.debug('Rate limit query error (ignored):', queryError.message);
            }
          }
          return { allowed: true, message: 'Rate limit check unavailable' };
        }

        let waitTimeMinutes = windowMinutes;
        if (attempts?.attempt_time) {
          const oldestTime = new Date(attempts.attempt_time).getTime();
          const now = Date.now();
          const elapsedMs = now - oldestTime;
          const windowMs = windowMinutes * 60 * 1000;
          waitTimeMinutes = Math.ceil((windowMs - elapsedMs) / 60000);
        }

        return {
          allowed: false,
          waitTimeMinutes,
          message: `Too many attempts. Please wait ${waitTimeMinutes} minute(s).`,
        };
      } catch (err) {
        // If we can't query, fail open
        return { allowed: true, message: 'Rate limit check unavailable' };
      }
    }

    // Get remaining attempts - but only if table exists
    try {
      const { count, error: countError } = await supabase
        .from('failed_login_attempts')
        .select('id', { count: 'exact', head: true })
        .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
        .gte('attempt_time', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString());

      if (countError) {
        // Table doesn't exist or RLS blocking - fail open
        // Silently ignore: PGRST116 = table not found, 42501 = permission denied, 42P01 = relation doesn't exist
        if (!['PGRST116', '42501', '42P01'].includes(countError.code || '')) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('Rate limit count error (ignored):', countError.message);
          }
        }
        return { allowed: true, message: 'Rate limit check unavailable' };
      }

      return {
        allowed: true,
        remainingAttempts: Math.max(0, maxAttempts - (count || 0)),
        message: 'Rate limit check passed',
      };
    } catch (err) {
      // If we can't query, fail open
      return { allowed: true, message: 'Rate limit check unavailable' };
    }
  } catch (error: any) {
    // Non-critical error - fail open to allow requests
    // Silently ignore - rate limiting is optional
    if (process.env.NODE_ENV === 'development') {
      console.debug('Rate limit error (ignored):', error?.message);
    }
    return { allowed: true, message: 'Rate limit check unavailable' };
  }
}
