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
    export_format: 'csv';
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
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Continue anyway - might be a company user without profile entry
    }

    // Get company data (check if user is a company, even if profile doesn't exist)
    let companyData = null;
    let companyOffers = null;
    let companySlots = null;
    let companyRepresentatives = null;
    
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle();

    if (companyError) {
      console.error('Error fetching company data:', companyError);
    } else if (company) {
      companyData = company;

      // Get company offers
      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('company_id', company.id);

      if (!offersError && offers) {
        companyOffers = offers;
      }

      // Get company slots
      const { data: slots, error: slotsError } = await supabase
        .from('event_slots')
        .select('*')
        .eq('company_id', company.id);

      if (!slotsError && slots) {
        companySlots = slots;
      }

      // Get company representatives
      const { data: reps, error: repsError } = await supabase
        .from('company_representatives')
        .select('*')
        .eq('company_id', company.id);

      if (!repsError && reps) {
        companyRepresentatives = reps;
      }
    }

    // If no profile and no company data, return null
    if (!profile && !companyData) {
      console.error('No profile or company data found for user:', userId);
      return null;
    }

    // Get bookings (for students)
    let bookings = null;
    if (profile && profile.role === 'student') {
      const { data: bookingsData, error: bookingsError } = await supabase
        .rpc('fn_get_student_bookings', {
          p_student_id: userId,
        });

      if (!bookingsError && bookingsData) {
        bookings = bookingsData;
      }
    }

    // Create profile object if it doesn't exist (for company users)
    const profileData = profile || {
      id: userId,
      role: 'company',
      email: companyData?.contact_email || null,
      created_at: companyData?.created_at || new Date().toISOString(),
    };

    const exportData: UserDataExport = {
      exported_at: new Date().toISOString(),
      profile: {
        ...profileData,
        // Remove sensitive fields if needed
        // password_hash: undefined, // Already not in profile
      },
      bookings: bookings || undefined,
      preferences: {
        is_deprioritized: profile?.is_deprioritized || false,
        // Add other preferences here
      },
      metadata: {
        export_version: '1.0',
        user_id: userId,
        export_format: 'csv',
      },
    };

    // Add company data if exists
    if (companyData) {
      (exportData as any).company = {
        ...companyData,
        offers: companyOffers || [],
        slots: companySlots || [],
        representatives: companyRepresentatives || [],
      };
    }

    return exportData;
  } catch (error) {
    console.error('Error exporting user data:', error);
    return null;
  }
}

/**
 * Convert object/array to CSV format
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });

  const keys = Array.from(allKeys);

  // Create header row
  const header = keys.map(key => `"${String(key).replace(/"/g, '""')}"`).join(',');

  // Create data rows
  const rows = data.map(item => {
    return keys.map(key => {
      const value = item?.[key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'object') {
        // Convert objects/arrays to JSON string
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Flatten nested object for CSV
 */
function flattenObject(obj: any, prefix = ''): Record<string, any> {
  const flattened: Record<string, any> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];
      
      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (Array.isArray(value)) {
        // For arrays, convert to JSON string or create indexed keys
        if (value.length === 0) {
          flattened[newKey] = '';
        } else if (value.length === 1) {
          // If single item, flatten it
          Object.assign(flattened, flattenObject(value[0], newKey));
        } else {
          // Multiple items - convert to JSON
          flattened[newKey] = JSON.stringify(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
  }
  
  return flattened;
}

/**
 * Download user data as CSV file
 */
export function downloadUserDataAsCsv(data: UserDataExport, filename?: string): void {
  const csvSections: string[] = [];
  const dateStr = new Date().toISOString().split('T')[0];

  // Add metadata section
  csvSections.push('=== METADATA ===');
  csvSections.push(convertToCSV([flattenObject(data.metadata)]));
  csvSections.push('');

  // Add profile section
  csvSections.push('=== PROFILE ===');
  csvSections.push(convertToCSV([flattenObject(data.profile)]));
  csvSections.push('');

  // Add preferences section
  if (data.preferences) {
    csvSections.push('=== PREFERENCES ===');
    csvSections.push(convertToCSV([flattenObject(data.preferences)]));
    csvSections.push('');
  }

  // Add bookings section (for students)
  if (data.bookings && data.bookings.length > 0) {
    csvSections.push('=== BOOKINGS ===');
    csvSections.push(convertToCSV(data.bookings.map(b => flattenObject(b))));
    csvSections.push('');
  }

  // Add company section (for companies)
  if ((data as any).company) {
    const company = (data as any).company;
    csvSections.push('=== COMPANY PROFILE ===');
    const { offers, slots, representatives, ...companyProfile } = company;
    csvSections.push(convertToCSV([flattenObject(companyProfile)]));
    csvSections.push('');

    if (offers && offers.length > 0) {
      csvSections.push('=== COMPANY OFFERS ===');
      csvSections.push(convertToCSV(offers.map((o: any) => flattenObject(o))));
      csvSections.push('');
    }

    if (slots && slots.length > 0) {
      csvSections.push('=== COMPANY SLOTS ===');
      csvSections.push(convertToCSV(slots.map((s: any) => flattenObject(s))));
      csvSections.push('');
    }

    if (representatives && representatives.length > 0) {
      csvSections.push('=== COMPANY REPRESENTATIVES ===');
      csvSections.push(convertToCSV(representatives.map((r: any) => flattenObject(r))));
      csvSections.push('');
    }
  }

  const csvContent = csvSections.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `user-data-export-${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * @deprecated Use downloadUserDataAsCsv instead
 * Download user data as JSON file (kept for backward compatibility)
 */
export function downloadUserDataAsJson(data: UserDataExport, filename?: string): void {
  // Redirect to CSV download
  downloadUserDataAsCsv(data, filename);
}

