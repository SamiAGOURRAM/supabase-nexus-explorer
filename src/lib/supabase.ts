/**
 * Supabase client configuration
 * 
 * Creates and exports the Supabase client instance used throughout the application.
 * Uses environment variables for URL and API key, with fallback values for development.
 * 
 * Configuration:
 * - Uses localStorage for session persistence
 * - Auto-refreshes tokens for seamless authentication
 * - Maintains session across page reloads
 */
import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
// Fallback values are for development only - should use .env in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iwsrbinrafpexyarjdew.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3JiaW5yYWZwZXh5YXJqZGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDY4OTYsImV4cCI6MjA3NzU4Mjg5Nn0.8VB8ueq3-po12Eko6wwMfKH7YX2_LYzdelwrVO6-DsE';

// Create and export Supabase client with authentication configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,        // Persist sessions in browser localStorage
    persistSession: true,         // Keep user logged in across page reloads
    autoRefreshToken: true,       // Automatically refresh expired tokens
  }
});