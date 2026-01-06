/**
 * Email Service Utilities
 * 
 * Handles sending emails via Supabase Edge Functions
 */

import { supabase } from '@/lib/supabase';

export interface SendCredentialsEmailParams {
  email: string;
  password: string;
  companyName: string;
  companyCode?: string;
  eventName?: string;
  adminName?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

/**
 * Send login credentials to company via email
 * @param params - Email parameters
 * @returns Promise with email response
 */
export async function sendCredentialsEmail(
  params: SendCredentialsEmailParams
): Promise<EmailResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-company-credentials', {
      body: params,
    });

    if (error) {
      console.error('Error calling send-company-credentials function:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    return data as EmailResponse;
  } catch (err: any) {
    console.error('Exception sending credentials email:', err);
    return {
      success: false,
      error: err.message || 'Unknown error sending email',
    };
  }
}

/**
 * Send credentials email with retry logic
 * @param params - Email parameters
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @returns Promise with email response
 */
export async function sendCredentialsEmailWithRetry(
  params: SendCredentialsEmailParams,
  maxRetries: number = 2
): Promise<EmailResponse> {
  let lastError: string = '';
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await sendCredentialsEmail(params);
    
    if (response.success) {
      return response;
    }
    
    lastError = response.error || 'Unknown error';
    
    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return {
    success: false,
    error: `Failed after ${maxRetries + 1} attempts. Last error: ${lastError}`,
  };
}
