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
      console.error('Rate limit check error:', error);
      // Fail open - allow the request if rate limit check fails
      return {
        allowed: true,
        message: 'Rate limit check unavailable',
      };
    }

    return data as RateLimitResponse;
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open for better UX
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
    const { error } = await supabase.rpc('fn_record_failed_login', {
      p_email: email,
      p_ip_address: ipAddress,
      p_reason: `${action}_failed: ${reason}`,
    });

    if (error) {
      console.error('Failed to record attempt:', error);
    }
  } catch (error) {
    console.error('Error recording failed attempt:', error);
  }
}

/**
 * Clear rate limit for a specific email (after successful signup/login)
 */
export async function clearRateLimit(email: string): Promise<void> {
  try {
    const ipAddress = await getClientIP();

    // Delete failed attempts for this email/IP
    const { error } = await supabase
      .from('failed_login_attempts')
      .delete()
      .or(`email.eq.${email},ip_address.eq.${ipAddress}`);

    if (error) {
      console.error('Failed to clear rate limit:', error);
    }
  } catch (error) {
    console.error('Error clearing rate limit:', error);
  }
}

/**
 * Get client IP address (best effort)
 * Note: This may not work in all environments
 */
async function getClientIP(): Promise<string> {
  try {
    // Try to get IP from various sources
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    // Fallback to a placeholder if we can't get the real IP
    return 'unknown';
  }
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
      console.error('Rate limit check error:', error);
      return { allowed: true, message: 'Rate limit check unavailable' };
    }

    if (!data) {
      // Calculate wait time
      const { data: attempts } = await supabase
        .from('failed_login_attempts')
        .select('attempt_time')
        .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
        .gte('attempt_time', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString())
        .order('attempt_time', { ascending: true })
        .limit(1)
        .single();

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
    }

    // Get remaining attempts
    const { count } = await supabase
      .from('failed_login_attempts')
      .select('id', { count: 'exact', head: true })
      .or(`email.eq.${email},ip_address.eq.${ipAddress}`)
      .gte('attempt_time', new Date(Date.now() - windowMinutes * 60 * 1000).toISOString());

    return {
      allowed: true,
      remainingAttempts: Math.max(0, maxAttempts - (count || 0)),
      message: 'Rate limit check passed',
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true, message: 'Rate limit check unavailable' };
  }
}
