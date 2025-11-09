"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  is_superuser: boolean;
  roles: string[];
  avatar_url?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: "admin" | "instructor" | "student") => boolean;
  authFetch: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response>;
  syncFromToken: (token: string) => Promise<void>;
}

interface RegisterData {
  full_name: string;
  email: string;
  username: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  const hasRole = (role: "admin" | "instructor" | "student"): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    if (!refreshToken) return null;
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", data.access_token);
        }
        return data.access_token;
      }
    } catch {}
    return null;
  };

  const authFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    let currentToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null);

    // For development, use mock token if no real token available
    if (!currentToken && process.env.NODE_ENV === "development") {
      currentToken = "mock_token_123";
    }

    const headers = new Headers(init?.headers || {});
    if (currentToken) headers.set("Authorization", `Bearer ${currentToken}`);

    let res = await fetch(input, { ...init, headers });
    if (res.status === 401 && refreshToken) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        res = await fetch(input, { ...init, headers });
      }
    }
    return res;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try Backend API first
      try {
        const response = await fetch(
          "http://localhost:8000/api/v1/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `username=${encodeURIComponent(
              email
            )}&password=${encodeURIComponent(password)}`,
          }
        );

        const data = await response.json();

        if (response.ok) {
          console.log("Backend login successful for:", email);
          console.log("Backend response data:", data);
          console.log("Backend user data:", data.user);
          setToken(data.access_token);
          setRefreshToken(data.refresh_token);
          setUser(data.user);
          console.log("AuthContext: User state set to:", data.user);
          if (typeof window !== "undefined") {
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
            localStorage.setItem("user", JSON.stringify(data.user));
            console.log("AuthContext: User saved to localStorage");
          }
          return true;
        } else {
          console.error(
            "Backend login failed:",
            data.detail || data.message || "Unknown error"
          );
          // Fall back to mock login
        }
      } catch {
        console.log("Backend API not available, using mock login");
      }

      // Mock login fallback
      // Default demo users
      const defaultUsers = {
        "admin@demo.com": {
          id: 1,
          email: "admin@demo.com",
          username: "admin",
          full_name: "Admin User",
          is_superuser: true,
          roles: ["admin"],
        },
        admin: {
          id: 1,
          email: "admin@demo.com",
          username: "admin",
          full_name: "Admin User",
          is_superuser: true,
          roles: ["admin"],
        },
        "instructor@demo.com": {
          id: 2,
          email: "instructor@demo.com",
          username: "instructor",
          full_name: "Instructor User",
          is_superuser: false,
          roles: ["instructor"],
        },
        instructor: {
          id: 2,
          email: "instructor@demo.com",
          username: "instructor",
          full_name: "Instructor User",
          is_superuser: false,
          roles: ["instructor"],
        },
        "student@demo.com": {
          id: 3,
          email: "student@demo.com",
          username: "student",
          full_name: "Student User",
          is_superuser: false,
          roles: ["student"],
        },
        student: {
          id: 3,
          email: "student@demo.com",
          username: "student",
          full_name: "Student User",
          is_superuser: false,
          roles: ["student"],
        },
      };

      const defaultPasswords = {
        "admin@demo.com": "demo123",
        admin: "demo123",
        "instructor@demo.com": "demo123",
        instructor: "demo123",
        "student@demo.com": "demo123",
        student: "demo123",
      };

      // Get users from localStorage (registered users)
      let mockUsers = defaultUsers;
      let mockPasswords = defaultPasswords;

      if (typeof window !== "undefined") {
        const storedUsers = localStorage.getItem("mockUsers");
        const storedPasswords = localStorage.getItem("mockPasswords");

        if (storedUsers) {
          mockUsers = { ...defaultUsers, ...JSON.parse(storedUsers) };
        }
        if (storedPasswords) {
          mockPasswords = {
            ...defaultPasswords,
            ...JSON.parse(storedPasswords),
          };
        }
      }

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Login attempt for:", email);
      console.log("Available users:", Object.keys(mockUsers));
      console.log("Available passwords:", Object.keys(mockPasswords));
      console.log(
        "Password check:",
        mockPasswords[email as keyof typeof mockPasswords] === password
      );

      if (mockPasswords[email as keyof typeof mockPasswords] === password) {
        const user = mockUsers[email as keyof typeof mockUsers];
        // Use a static token for mock login to avoid hydration issues
        const token = `mock_token_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;

        setToken(token);
        setRefreshToken(token);
        setUser(user);
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", token);
          localStorage.setItem("refresh_token", token);
          localStorage.setItem("user", JSON.stringify(user));
        }
        return true;
      } else {
        console.error("Login failed: Invalid credentials");
        return false;
      }

      // Real API call (commented out for now)
      /*
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.access_token);
        setRefreshToken(data.refresh_token || data.access_token);
        setUser(data.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token || data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return true;
      } else {
        console.error('Login failed:', data.detail);
        return false;
      }
      */
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      // Try Backend API first
      try {
        const response = await fetch(
          "http://localhost:8000/api/v1/auth/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          }
        );

        const data = await response.json();

        if (response.ok) {
          console.log("Registration successful for:", userData.email);
          return true;
        } else {
          console.error("Registration failed:", data.detail);
          // Fall back to mock registration
        }
      } catch {
        console.log("Backend API not available, using mock registration");
      }

      // Mock registration fallback
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save new user to localStorage
      if (typeof window !== "undefined") {
        const existingUsers = JSON.parse(
          localStorage.getItem("mockUsers") || "{}"
        );
        const existingPasswords = JSON.parse(
          localStorage.getItem("mockPasswords") || "{}"
        );

        // Check if email already exists
        if (
          existingUsers[userData.email] ||
          existingPasswords[userData.email]
        ) {
          console.error("Mock registration failed: Email already registered");
          return false;
        }

        // Check if username already exists
        const usernameExists = Object.values(existingUsers).some(
          (user): user is User =>
            typeof user === "object" &&
            user !== null &&
            "username" in user &&
            (user as User).username === userData.username
        );
        if (usernameExists) {
          console.error("Mock registration failed: Username already taken");
          return false;
        }

        // Generate new user ID
        const userId = Date.now();

        // Save user data - all new users are students
        existingUsers[userData.email] = {
          id: userId,
          email: userData.email,
          username: userData.username,
          full_name: userData.full_name,
          is_superuser: false,
          roles: ["student"],
          is_active: true,
          created_at: new Date().toISOString(),
        };

        // Save password for both email and username
        existingPasswords[userData.email] = userData.password;
        existingPasswords[userData.username] = userData.password;

        // Also save user by username for login
        existingUsers[userData.username] = existingUsers[userData.email];

        // Store in localStorage
        localStorage.setItem("mockUsers", JSON.stringify(existingUsers));
        localStorage.setItem(
          "mockPasswords",
          JSON.stringify(existingPasswords)
        );

        console.log("Mock registration successful for:", userData.email);
        console.log(
          "User saved to localStorage:",
          existingUsers[userData.email]
        );
      }

      return true;

      // Real API call (commented out for now)
      /*
      const response = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        return true;
      } else {
        console.error('Registration failed:', data.detail);
        return false;
      }
      */
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  const syncFromToken = async (token: string): Promise<void> => {
    try {
      // Fetch user data from backend using the token
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("AuthContext: User data received:", userData);
        
        // Ensure user has roles array
        if (!userData.roles) {
          userData.roles = [];
          if (userData.is_superuser) {
            userData.roles.push("admin");
          }
          if (userData.is_instructor) {
            userData.roles.push("instructor");
          }
          if (userData.roles.length === 0) {
            userData.roles.push("student");
          }
        }
        
        setToken(token);
        setUser(userData);
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", token);
          localStorage.setItem("user", JSON.stringify(userData));
        }
        console.log("AuthContext: Synced from token successfully");
      } else {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}` };
        }
        console.error("AuthContext: Failed to fetch user data from token", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        
        // If token verification failed (401), clear the invalid token
        if (response.status === 401) {
          console.warn("AuthContext: Token verification failed, clearing invalid token");
          if (typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            localStorage.removeItem("user");
          }
          setToken(null);
          setUser(null);
          setRefreshToken(null);
        }
      }
    } catch (error) {
      console.error("AuthContext: Error syncing from token:", error);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  };

  useEffect(() => {
    const initAuth = () => {
      try {
        if (typeof window !== "undefined") {
          const storedToken = localStorage.getItem("access_token");
          const storedRefresh = localStorage.getItem("refresh_token");
          const storedUser = localStorage.getItem("user");

          if (storedToken && storedUser) {
            console.log(
              "AuthContext: Loading user from localStorage:",
              storedUser
            );
            const parsedUser = JSON.parse(storedUser);
            console.log("AuthContext: Parsed user:", parsedUser);
            setToken(storedToken);
            setRefreshToken(storedRefresh);
            setUser(parsedUser);
            console.log(
              "AuthContext: User loaded from localStorage successfully"
            );
          } else {
            console.log("AuthContext: No stored user found in localStorage");
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    token,
    refreshToken,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated,
    hasRole,
    authFetch,
    syncFromToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
