/**
 * Environment configuration utility
 * Helps manage environment variables and provides type-safe access
 */

// Get current environment
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

// API Configuration
// Backend server uses port 8000 to avoid conflict with AI server (port 8001)
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  IS_LOCAL: process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ?? true,
} as const;

// AI Server Configuration (Cloud Run)
// AI Server uses port 8001
export const AI_SERVER_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_AI_SERVER_URL || 'http://localhost:8001',
  IS_LOCAL: process.env.NEXT_PUBLIC_AI_SERVER_URL?.includes('localhost') ?? true,
} as const;

// NextAuth Configuration
export const AUTH_CONFIG = {
  URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  SECRET: process.env.NEXTAUTH_SECRET,
} as const;

// Supabase Configuration
// Supabase: dùng publishable key cho client, secret key cho server
export const SUPABASE_CONFIG = {
  URL: process.env.SUPABASE_URL,
  PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  CURRENT_KEY: process.env.SUPABASE_CURRENT_KEY,
  STANDBY_KEY: process.env.SUPABASE_STANDBY_KEY,
} as const;

// OAuth Providers
export const OAUTH_CONFIG = {
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
} as const;

// Feature Flags
export const FEATURES = {
  AI_CHAT: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true',
  DEBATE_ROOM: process.env.NEXT_PUBLIC_ENABLE_DEBATE_ROOM === 'true',
  SOCRATIC_BOT: process.env.NEXT_PUBLIC_ENABLE_SOCRATIC_BOT === 'true',
  AUTO_QUIZ: process.env.NEXT_PUBLIC_ENABLE_AUTO_QUIZ_GENERATION === 'true',
} as const;

/**
 * Get environment info for debugging
 * Only use in development mode
 */
export function getEnvInfo() {
  if (ENV.IS_PRODUCTION) {
    return {
      environment: 'production',
      apiUrl: API_CONFIG.BASE_URL,
      isLocal: API_CONFIG.IS_LOCAL,
    };
  }

  return {
    environment: ENV.NODE_ENV,
    apiUrl: API_CONFIG.BASE_URL,
    isLocal: API_CONFIG.IS_LOCAL,
    nextAuthUrl: AUTH_CONFIG.URL,
    hasSupabase: !!SUPABASE_CONFIG.URL,
    hasGoogleOAuth: !!OAUTH_CONFIG.GOOGLE.CLIENT_ID,
    features: FEATURES,
  };
}

/**
 * Log environment info (development only)
 */
export function logEnvInfo() {
  if (ENV.IS_DEVELOPMENT && typeof window !== 'undefined') {
    console.log('🔧 Environment Configuration:', getEnvInfo());
  }
}

