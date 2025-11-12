/**
 * Auth utilities for NextAuth.js
 * Replaces AuthContext functionality
 */

import { getSession, useSession } from "next-auth/react";
import { useCallback } from "react";

/**
 * Fetch with automatic authentication token injection
 * Replaces authFetch from AuthContext
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const session = await getSession();
  const token = session?.supabaseAccessToken;

  if (!token) {
    throw new Error("No authentication token available");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Hook to get authFetch function for use in components
 * Replaces authFetch from useAuth hook
 */
export function useAuthFetch() {
  const { data: session } = useSession();

  return useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = session?.supabaseAccessToken;

      if (!token) {
        throw new Error("No authentication token available");
      }

      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [session?.supabaseAccessToken]
  );
}

/**
 * Check if user has a specific role
 */
export function hasRole(
  session: { user?: { roles?: string[] } } | null,
  role: "admin" | "instructor" | "student"
): boolean {
  if (!session?.user) return false;
  const roles = (session.user as any).roles || [];
  return roles.includes(role);
}
