/**
 * CAPTCHA Hook
 * 
 * Provides Google reCAPTCHA v3 integration for bot protection.
 * Uses invisible reCAPTCHA - no user interaction required.
 */

import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useCallback } from 'react';

interface CaptchaVerification {
  token: string;
  score?: number;
}

export function useCaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  /**
   * Execute CAPTCHA verification
   * @param action - The action being performed (e.g., 'signup', 'login')
   * @returns Promise with CAPTCHA token
   */
  const verifyCaptcha = useCallback(
    async (action: string = 'submit'): Promise<CaptchaVerification | null> => {
      if (!executeRecaptcha) {
        console.warn('reCAPTCHA not yet available');
        return null;
      }

      try {
        const token = await executeRecaptcha(action);
        
        return {
          token,
          // Note: score evaluation happens on server-side
          // Google recommends scores >= 0.5 as legitimate
        };
      } catch (error) {
        console.error('CAPTCHA verification failed:', error);
        return null;
      }
    },
    [executeRecaptcha]
  );

  /**
   * Verify CAPTCHA token on server-side
   * This should be called from your backend/Edge Function
   */
  const verifyCaptchaToken = async (
    token: string,
    remoteip?: string
  ): Promise<{ success: boolean; score?: number; error?: string }> => {
    try {
      const secretKey = import.meta.env.VITE_RECAPTCHA_SECRET_KEY;
      
      if (!secretKey) {
        console.error('CAPTCHA secret key not configured');
        return { success: false, error: 'CAPTCHA not configured' };
      }

      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            secret: secretKey,
            response: token,
            ...(remoteip && { remoteip }),
          }),
        }
      );

      const data = await response.json();

      return {
        success: data.success,
        score: data.score,
        error: data['error-codes']?.[0],
      };
    } catch (error) {
      console.error('CAPTCHA token verification failed:', error);
      return { success: false, error: 'Verification failed' };
    }
  };

  return {
    verifyCaptcha,
    verifyCaptchaToken,
  };
}

/**
 * Validate CAPTCHA score
 * @param score - Score from 0.0 (bot) to 1.0 (human)
 * @param threshold - Minimum acceptable score (default: 0.5)
 */
export function isValidCaptchaScore(
  score: number | undefined,
  threshold: number = 0.5
): boolean {
  return score !== undefined && score >= threshold;
}

/**
 * Get CAPTCHA configuration from environment
 */
export function getCaptchaConfig() {
  return {
    siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
    secretKey: import.meta.env.VITE_RECAPTCHA_SECRET_KEY || '',
    enabled: !!import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  };
}
