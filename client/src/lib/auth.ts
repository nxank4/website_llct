/**
 * Auth utilities for NextAuth.js
 * Replaces AuthContext functionality
 */

import { getSession, useSession } from "next-auth/react";
import { useCallback } from "react";

/**
 * Fetch with automatic authentication token injection
 * Replaces authFetch from AuthContext
 * Automatically refreshes token if expired
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Force refresh session to ensure token is up-to-date
  // This triggers NextAuth's JWT callback which will refresh expired tokens
  const session = await getSession({ trigger: true });
  const token = session?.supabaseAccessToken;

  if (!token) {
    throw new Error("No authentication token available");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  
  // Don't set Content-Type for FormData - browser will set it automatically with boundary
  const isFormData = options.body instanceof FormData;
  if (!headers.has("Content-Type") && !isFormData) {
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
 * Automatically refreshes token if expired
 */
export function useAuthFetch() {
  const { data: session, update: updateSession } = useSession();

  return useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let token = session?.supabaseAccessToken;

      // Check if session has error (token expired)
      if (session?.error === "RefreshAccessTokenError") {
        // Try to refresh the session
        const refreshed = await updateSession();
        if (refreshed?.error) {
          throw new Error("Session expired. Please log in again.");
        }
        // Get token from refreshed session
        token = refreshed?.supabaseAccessToken;
      }

      // If no token, try to refresh session once
      if (!token) {
        const refreshed = await updateSession();
        token = refreshed?.supabaseAccessToken;
      }

      if (!token) {
        throw new Error("No authentication token available");
      }

      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${token}`);
      
      // Don't set Content-Type for FormData - browser will set it automatically with boundary
      const isFormData = options.body instanceof FormData;
      if (!headers.has("Content-Type") && !isFormData) {
        headers.set("Content-Type", "application/json");
      }

      // Make the request
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If we get 401, token might have expired - try to refresh once
      if (response.status === 401 && !session?.error) {
        const refreshed = await updateSession();
        const newToken = refreshed?.supabaseAccessToken;
        
        if (newToken && newToken !== token) {
          // Retry the request with new token
          headers.set("Authorization", `Bearer ${newToken}`);
          return fetch(url, {
            ...options,
            headers,
          });
        }
      }

      return response;
    },
    [session?.supabaseAccessToken, session?.error, updateSession]
  );
}

/**
 * Check if user has a specific role
 */
export function hasRole(
  session: { user?: { roles?: string[]; role?: string } } | null | undefined,
  role: "admin" | "instructor" | "student"
): boolean {
  if (!session?.user) return false;
  // Check roles array first, then fallback to single role
  const user = session.user as { roles?: string[]; role?: string };
  const roles = user.roles || [];
  const singleRole = user.role;
  
  // If roles array exists, check it
  if (roles.length > 0) {
    return roles.includes(role);
  }
  
  // Otherwise check single role
  if (singleRole) {
    return singleRole === role;
  }
  
  return false;
}
