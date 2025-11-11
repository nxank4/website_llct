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

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './env';

// Validate Supabase configuration
// For client-side, we use NEXT_PUBLIC_ prefix (exposed via next.config.ts)
// For server-side, we use SUPABASE_URL và SUPABASE_PUBLISHABLE_KEY trực tiếp
const supabaseUrl = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_CONFIG.URL)
  : SUPABASE_CONFIG.URL;

const supabasePublishableKey = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_CONFIG.PUBLISHABLE_KEY)
  : SUPABASE_CONFIG.PUBLISHABLE_KEY;

const hasSupabaseConfig = !!(supabaseUrl && supabasePublishableKey);

if (!hasSupabaseConfig) {
  console.warn(
    'Supabase configuration is missing. Please set SUPABASE_URL và SUPABASE_PUBLISHABLE_KEY trong biến môi trường.'
  );
}

// Create Supabase client only if configuration is available
// If not configured, create a client with minimal config to prevent runtime errors
// The client will fail gracefully when used without proper config
let supabaseInstance: SupabaseClient | null = null;

if (hasSupabaseConfig) {
  supabaseInstance = createClient(
    supabaseUrl!,
    supabasePublishableKey!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
} else {
  // Create a minimal client to prevent runtime errors
  // This will fail when actually used, but won't crash on initialization
  supabaseInstance = createClient(
    'https://placeholder.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export const supabase = supabaseInstance;

// Type-safe database types (can be extended later)
export type Database = Record<string, unknown>;

// Helper function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  const url = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_CONFIG.URL)
    : SUPABASE_CONFIG.URL;
  const key = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_CONFIG.PUBLISHABLE_KEY)
    : SUPABASE_CONFIG.PUBLISHABLE_KEY;
  return !!(url && key);
}

