/**
 * Password Utilities
 * 
 * Handles password generation and credentials management for company invitations
 */

/**
 * Generate a default password based on the email address
 * Format: email prefix (before @) + "@2026" suffix
 * Example: company@example.com -> company@2026
 * @param email - The email address to generate password from
 * @returns A default password derived from the email
 */
export function generateDefaultPasswordFromEmail(email: string): string {
  // Extract the part before @ from email
  const emailPrefix = email.split('@')[0] || 'default';
  
  // Clean the prefix: remove special characters except letters and numbers
  const cleanPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, '');
  
  // Create password: prefix + @2026
  // Ensure minimum length for security (at least 8 characters)
  const basePassword = cleanPrefix.length >= 4 ? cleanPrefix : cleanPrefix + 'user';
  
  return `${basePassword}@2026`;
}

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 16)
 * @returns A secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const array = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(array);
  
  const hexPart = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  const timestampPart = Date.now().toString(36);
  
  // Combine hex and timestamp, then take required length
  const combined = hexPart + timestampPart;
  return combined.substring(0, length);
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when copied successfully
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text:', err);
    return false;
  }
}

/**
 * Format credentials message for display
 * @param email - Company email
 * @param password - Generated password
 * @param companyName - Optional company name
 * @returns Formatted credentials string
 */
export function formatCredentialsMessage(
  email: string,
  password: string,
  companyName?: string
): string {
  const header = companyName 
    ? `Credentials for ${companyName}` 
    : 'Company Credentials';
    
  return `${header}

📧 Email: ${email}
🔑 Password: ${password}

⚠️ Security Notice:
- Share these credentials securely (encrypted email, secure messaging)
- Company should change password after first login
- Do not share via unencrypted channels`;
}

/**
 * Format credentials for copying to clipboard
 * @param email - Company email
 * @param password - Generated password
 * @returns Plain text credentials
 */
export function formatCredentialsForClipboard(
  email: string,
  password: string
): string {
  return `Email: ${email}\nPassword: ${password}`;
}
