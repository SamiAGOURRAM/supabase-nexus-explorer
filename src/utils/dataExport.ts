/**
 * Data Export Utility
 * 
 * Provides functions to export user data in GDPR-compliant format
 */

import { supabase } from '@/lib/supabase';

export interface UserDataExport {
  exported_at: string;
  profile: any;
  bookings?: any[];
  preferences?: any;
  metadata: {
    export_version: string;
    user_id: string;
    export_format: 'json';
  };
}

/**
 * Export all user data for GDPR data portability
 */
export async function exportUserData(userId: string): Promise<UserDataExport | null> {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Get bookings (for students)
    let bookings = null;
    if (profile.role === 'student') {
      const { data: bookingsData, error: bookingsError } = await supabase
        .rpc('fn_get_student_bookings', {
          p_student_id: userId,
        });

      if (!bookingsError && bookingsData) {
        bookings = bookingsData;
      }
    }

    // Get company data (for companies)
    let companyData = null;
    if (profile.role === 'company') {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('profile_id', userId)
        .single();

      if (!companyError && company) {
        companyData = company;
      }
    }

    const exportData: UserDataExport = {
      exported_at: new Date().toISOString(),
      profile: {
        ...profile,
        // Remove sensitive fields if needed
        // password_hash: undefined, // Already not in profile
      },
      bookings: bookings || undefined,
      preferences: {
        is_deprioritized: profile.is_deprioritized,
        // Add other preferences here
      },
      metadata: {
        export_version: '1.0',
        user_id: userId,
        export_format: 'json',
      },
    };

    // Add company data if exists
    if (companyData) {
      (exportData as any).company = companyData;
    }

    return exportData;
  } catch (error) {
    console.error('Error exporting user data:', error);
    return null;
  }
}

/**
 * Download user data as JSON file
 */
export function downloadUserDataAsJson(data: UserDataExport, filename?: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

