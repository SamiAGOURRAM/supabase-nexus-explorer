/**
 * Supabase client configuration
 * 
 * Re-exports the Supabase client from the integrations directory.
 * This provides a consistent import path throughout the application.
 * 
 * All files should import from this file:
 * import { supabase } from '@/lib/supabase';
 * 
 * The actual client is defined in @/integrations/supabase/client.ts
 * which includes proper environment variable validation.
 */
export { supabase } from '@/integrations/supabase/client';