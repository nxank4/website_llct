/**
 * Supabase Client Library for Frontend
 * 
 * This uses the Supabase Data API (via @supabase/supabase-js) which is the
 * recommended approach for frontend applications on Vercel.
 * 
 * Benefits:
 * - Automatically handles authentication
 * - Respects Row Level Security (RLS)
 * - Safe for client-side usage
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './env';

// Validate Supabase configuration
if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.ANON_KEY) {
  console.warn(
    'Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.'
  );
}

// Create Supabase client
export const supabase = createClient(
  SUPABASE_CONFIG.URL || '',
  SUPABASE_CONFIG.ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// Type-safe database types (can be extended later)
export type Database = Record<string, unknown>;

// Helper function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY);
}

