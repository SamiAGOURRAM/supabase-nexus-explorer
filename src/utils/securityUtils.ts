/**
 * Security Utilities
 * 
 * Provides security-related functions for input validation,
 * sanitization, and protection against common vulnerabilities.
 */

// Email validation with comprehensive checks
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmedEmail = email.trim().toLowerCase();
  
  // Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  // Check for dangerous characters
  if (/[<>()[\]\\,;:]/.test(trimmedEmail)) {
    return { isValid: false, error: 'Email contains invalid characters' };
  }
  
  // Check length
  if (trimmedEmail.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true };
}

// XSS protection - sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

// SQL injection protection (additional layer)
export function sanitizeForDatabase(input: string): string {
  return input
    .trim()
    .replace(/['";\\]/g, ''); // Remove quotes and backslashes
}

// Password strength checker
export interface PasswordStrengthResult {
  score: number; // 0-6
  strength: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  isSecure: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const feedback: string[] = [];
  
  // Length check
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  else feedback.push('Use at least 12 characters');
  
  // Uppercase check
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  // Lowercase check
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  // Number check
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  // Common password check
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'abc123', 'password123'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common passwords');
  }
  
  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid repeated characters');
  }
  
  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'fair';
  else if (score <= 5) strength = 'good';
  else strength = 'strong';
  
  return {
    score,
    strength,
    feedback,
    isSecure: score >= 5 && feedback.length === 0,
  };
}

// Phone number validation (international format)
export function validatePhoneNumber(
  phone: string,
  countryCode: 'MA' | 'INTERNATIONAL' = 'MA'
): { isValid: boolean; error?: string } {
  const trimmed = phone.trim();
  
  if (countryCode === 'MA') {
    // Moroccan phone format: +212 6XX XXX XXX or 06XX XXX XXX
    const moroccanRegex = /^(\+212|0)[5-7][0-9]{8}$/;
    if (!moroccanRegex.test(trimmed.replace(/\s/g, ''))) {
      return { 
        isValid: false, 
        error: 'Invalid Moroccan phone number. Format: +212 6XX XXX XXX' 
      };
    }
  } else {
    // Basic international format
    const intlRegex = /^\+?[1-9]\d{1,14}$/;
    if (!intlRegex.test(trimmed.replace(/\s/g, ''))) {
      return { 
        isValid: false, 
        error: 'Invalid phone number format' 
      };
    }
  }
  
  return { isValid: true };
}

// Rate limiting utilities
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  storageKey: string;
}

export class RateLimiter {
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  check(): { allowed: boolean; remainingTime?: number } {
    const attempts = this.getAttempts();
    const recentAttempts = attempts.filter(
      timestamp => Date.now() - timestamp < this.config.windowMs
    );
    
    if (recentAttempts.length >= this.config.maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const remainingTime = Math.ceil(
        (this.config.windowMs - (Date.now() - oldestAttempt)) / 60000
      );
      return { allowed: false, remainingTime };
    }
    
    return { allowed: true };
  }
  
  recordAttempt(): void {
    const attempts = this.getAttempts();
    const recentAttempts = attempts.filter(
      timestamp => Date.now() - timestamp < this.config.windowMs
    );
    recentAttempts.push(Date.now());
    localStorage.setItem(this.config.storageKey, JSON.stringify(recentAttempts));
  }
  
  reset(): void {
    localStorage.removeItem(this.config.storageKey);
  }
  
  private getAttempts(): number[] {
    const stored = localStorage.getItem(this.config.storageKey);
    return stored ? JSON.parse(stored) : [];
  }
}

// CSRF token generator (for additional API protection)
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Content Security Policy helpers
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust for production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// Session timeout handler
export class SessionManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private warningTimeoutId: NodeJS.Timeout | null = null;
  
  constructor(
    private sessionTimeout: number = 30 * 60 * 1000, // 30 minutes
    private warningTime: number = 5 * 60 * 1000 // 5 minutes before
  ) {}
  
  startSession(onTimeout: () => void, onWarning?: () => void): void {
    this.clearTimers();
    
    // Set warning timer
    if (onWarning) {
      this.warningTimeoutId = setTimeout(() => {
        onWarning();
      }, this.sessionTimeout - this.warningTime);
    }
    
    // Set timeout timer
    this.timeoutId = setTimeout(() => {
      onTimeout();
    }, this.sessionTimeout);
  }
  
  resetSession(onTimeout: () => void, onWarning?: () => void): void {
    this.startSession(onTimeout, onWarning);
  }
  
  clearTimers(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);
  }
}

// Secure random string generator
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Email domain whitelist checker
export function validateEmailDomain(
  email: string,
  allowedDomains: string[]
): { isValid: boolean; error?: string } {
  const domain = email.toLowerCase().split('@')[1];
  
  if (!domain) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (!allowedDomains.includes(domain)) {
    return { 
      isValid: false, 
      error: `Email must be from: ${allowedDomains.join(', ')}` 
    };
  }
  
  return { isValid: true };
}
