import { getSession } from "next-auth/react";
import { Session } from "next-auth";

/**
 * Get access token from NextAuth session or localStorage
 * Priority: localStorage (from backend API) > NextAuth session
 */
export async function getAccessToken(): Promise<string | undefined> {
  // First, try to get token from localStorage (set by login API)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      return token;
    }
  }

  // Fallback to NextAuth session
  const session = await getSession();
  return (session as Session | null)?.supabaseAccessToken;
}


