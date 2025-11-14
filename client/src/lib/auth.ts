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
  // Get session - NextAuth will automatically refresh tokens if needed
  const session = await getSession();
  // Type-safe access to session with extended properties
  const typedSession = session as
    | {
        supabaseAccessToken?: string;
      }
    | null
    | undefined;
  const token = typedSession?.supabaseAccessToken;

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

  // Type-safe access to session with extended properties
  const typedSession = session as
    | {
        supabaseAccessToken?: string;
        error?: string;
      }
    | null
    | undefined;

  return useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let token = typedSession?.supabaseAccessToken;

      // Check if session has error (token expired)
      if (typedSession?.error === "RefreshAccessTokenError") {
        // Try to refresh the session
        const refreshed = await updateSession();
        const typedRefreshed = refreshed as
          | {
              supabaseAccessToken?: string;
              error?: string;
            }
          | null
          | undefined;
        if (typedRefreshed?.error) {
          throw new Error("Session expired. Please log in again.");
        }
        // Get token from refreshed session
        token = typedRefreshed?.supabaseAccessToken;
      }

      // If no token, try to refresh session once
      if (!token) {
        const refreshed = await updateSession();
        const typedRefreshed = refreshed as
          | {
              supabaseAccessToken?: string;
            }
          | null
          | undefined;
        token = typedRefreshed?.supabaseAccessToken;
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
      if (response.status === 401 && !typedSession?.error) {
        const refreshed = await updateSession();
        const typedRefreshed = refreshed as
          | {
              supabaseAccessToken?: string;
            }
          | null
          | undefined;
        const newToken = typedRefreshed?.supabaseAccessToken;
        
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
    [typedSession?.supabaseAccessToken, typedSession?.error, updateSession]
  );
}

/**
 * Check if user has a specific role
 * Accepts both NextAuth Session and custom session types
 * Uses type assertion to handle NextAuth Session type compatibility
 */
export function hasRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any,
  role: "admin" | "instructor" | "student"
): boolean {
  if (!session?.user) return false;
  
  // Type-safe access to user roles
  // Cast to our expected type since NextAuth Session user type includes roles/role
  // The type definition in next-auth.d.ts extends Session.user with roles/role
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
