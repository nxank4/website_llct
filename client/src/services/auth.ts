// Auth service functions for login and register

import { API_ENDPOINTS, API_BASE_URL, handleApiError, getHttpErrorMessage, reportErrorToDev } from '@/lib/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  full_name: string;
  password: string;
  is_active?: boolean;
  is_instructor?: boolean;
  avatar_url?: string;
  bio?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_instructor: boolean;
  is_superuser: boolean;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string; // ISO datetime string
  updated_at?: string | null; // ISO datetime string
}

/**
 * Login user with email and password
 * Returns access token for future API requests
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    // Backend expects OAuth2PasswordRequestForm format (username, password)
    // username field should contain email
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      let errorMessage: string | null = null;
      try {
        const errorData = await response.json();

        // Try to extract error message from response
        if (errorData && typeof errorData === 'object') {
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            // Handle validation errors array
            errorMessage = errorData.errors.map((e: { msg?: string; message?: string }) => e.msg || e.message).join(', ');
          } else if (Object.keys(errorData).length === 0) {
            // Empty object - use status code based message
            errorMessage = null; // Will use getHttpErrorMessage below
          }
        } else if (typeof errorData === 'string' && errorData.trim()) {
          errorMessage = errorData;
        }
      } catch {
        // If JSON parsing fails, use status code based message
        errorMessage = null; // Will use getHttpErrorMessage below
      }

      // If no specific message found, use status code based message
      if (!errorMessage) {
        errorMessage = getHttpErrorMessage(response.status, response.statusText);
      }

      const error = new Error(errorMessage) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const data: LoginResponse = await response.json();

    // Store token in localStorage for authFetch to use
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token);
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);

    // Report error to developers
    if (error instanceof Error) {
      reportErrorToDev(error, {
        action: 'login',
        endpoint: `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`,
      });
    }

    // If error already has a specific message from backend, keep it
    if (error instanceof Error) {
      const isBackendMessage = error.message &&
        !error.message.includes('Failed to fetch') &&
        !error.message.includes('Network error') &&
        !error.message.includes('Request timeout') &&
        !error.message.includes('Lỗi kết nối') &&
        !error.message.includes('Hết thời gian chờ');

      if (isBackendMessage) {
        throw error;
      }
    }

    // Use enhanced error handler for network/timeout errors
    throw new Error(handleApiError(error));
  }
}

/**
 * Register new user with Supabase Auth
 * Returns success message and user data
 */
export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
  };
}

export async function register(userData: RegisterData): Promise<RegisterResponse> {
  const url = '/api/auth/register';
  const startTime = Date.now();

  console.log(`[Register] Starting request to: ${url}`);
  console.log(`[Register] Payload:`, {
    email: userData.email,
  });

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    console.log(`[Register] Response received in ${elapsed}ms:`, response.status, response.statusText);

    if (!response.ok) {
      let errorMessage: string | null = null;
      try {
        const errorData = await response.json();
        console.error(`[Register] Error response:`, errorData);

        // Try to extract error message from response
        if (errorData && typeof errorData === 'object') {
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            // Handle validation errors array
            errorMessage = errorData.errors.map((e: { msg?: string; message?: string }) => e.msg || e.message).join(', ');
          } else if (Object.keys(errorData).length === 0) {
            // Empty object - use status code based message
            errorMessage = null; // Will use getHttpErrorMessage below
          }
        } else if (typeof errorData === 'string' && errorData.trim()) {
          errorMessage = errorData;
        }
      } catch (parseError) {
        // If JSON parsing fails, use status code based message
        console.error(`[Register] Failed to parse error response:`, parseError);
        errorMessage = null; // Will use getHttpErrorMessage below
      }

      // If no specific message found, use status code based message
      if (!errorMessage) {
        errorMessage = getHttpErrorMessage(response.status, response.statusText);
      }

      // Create error with status code for better handling
      const error = new Error(errorMessage) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const data: RegisterResponse = await response.json();
    console.log(`[Register] Success:`, data);
    return data;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[Register] Error after ${elapsed}ms:`, error);

    // Report error to developers
    if (error instanceof Error) {
      reportErrorToDev(error, {
        action: 'register',
        url,
        elapsed,
        userData: {
          email: userData.email,
        },
      });
    }

    // If error already has a specific message from backend, keep it
    if (error instanceof Error) {
      // Check if error message is from backend (not generic network error)
      const isBackendMessage = error.message &&
        !error.message.includes('Failed to fetch') &&
        !error.message.includes('Network error') &&
        !error.message.includes('Request timeout') &&
        !error.message.includes('Lỗi kết nối') &&
        !error.message.includes('Hết thời gian chờ');

      if (isBackendMessage) {
        // Keep the original error message from backend
        throw error;
      }
    }

    // Use enhanced error handler for network/timeout errors
    throw new Error(handleApiError(error));
  }
}

/**
 * Logout user (clear token from localStorage)
 */
export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
  }
}

