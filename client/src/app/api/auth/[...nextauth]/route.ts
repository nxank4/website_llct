import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import { createClient } from "@supabase/supabase-js";

interface ExtendedToken extends JWT {
  accessToken?: string;
  backendToken?: string;
  emailVerified?: boolean;
  isGoogleOAuth?: boolean;
  supabaseUserId?: string;
}

interface ExtendedSession extends Session {
  supabaseAccessToken?: string;
  user: Session["user"] & {
    id?: string;
    emailVerified?: boolean;
  };
}

interface ExtendedAccount extends AccountWithAccessToken {
  supabaseAccessToken?: string;
}

interface AccountWithAccessToken {
  provider?: string;
  type?: string;
  providerAccountId?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
  supabaseAccessToken?: string; // Custom field for Supabase JWT token
}

interface AdapterUserWithId extends AdapterUser {
  id: string;
}

const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

          if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase configuration is missing');
            return null;
          }

          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          if (error) {
            console.error('Supabase signInWithPassword error:', error.message);
            if (
              error.message.includes('Email not confirmed') ||
              error.message.includes('email not confirmed') ||
              error.message.includes('Email not verified')
            ) {
              throw new Error('EMAIL_NOT_VERIFIED');
            }
            return null;
          }

          if (!data.user || !data.session?.access_token) {
            console.error('Supabase signInWithPassword: No user or access_token returned');
            return null;
          }

          const emailVerified = data.user.email_confirmed_at != null;
          const accessToken = data.session.access_token;

          console.log('✅ Credentials login success - Got Supabase JWT token');

          return {
            id: data.user.id,
            email: data.user.email || credentials.email as string,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
            image: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
            emailVerified: emailVerified,
            accessToken: accessToken, // Store Supabase JWT token
          };
        } catch (error) {
          console.error('Login error:', error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }: {
      user?: AdapterUserWithId;
      account: AccountWithAccessToken | null;
      profile?: { name?: string; email?: string; picture?: string };
    }) {
      // Xử lý Google OAuth: Đổi Google id_token lấy Supabase JWT token
      if (account?.provider === "google" && account.id_token) {
        try {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

          if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase configuration is missing for Google OAuth');
            return false;
          }

          // Tạo Supabase client với Anon Key để lấy RS256 JWT token
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // ĐỔI Google id_token lấy Supabase session (chứa Access Token)
          // Đây là mấu chốt: signInWithIdToken sẽ tạo/link user và trả về Supabase JWT token
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: account.id_token,
          });

          if (error || !data.session?.access_token) {
            console.error('Error signing in with Google id_token:', error);
            return false;
          }

          // Gắn Supabase Access Token vào account object
          // jwt callback sẽ nhận token này từ account
          (account as AccountWithAccessToken).supabaseAccessToken = data.session.access_token;

          console.log('✅ Google OAuth - Got Supabase JWT token via signInWithIdToken');

          return true;
        } catch (error) {
          console.error('Error in Google OAuth signIn callback:', error);
          return false;
        }
      }

      // Allow other providers
      return true;
    },
    async jwt({ token, account, user }: {
      token: ExtendedToken;
      account: AccountWithAccessToken | null;
      user: AdapterUserWithId | undefined;
    }) {
      // Xử lý Google OAuth: Lấy Supabase JWT token từ account object
      if (account?.provider === "google") {
        token.isGoogleOAuth = true;
        token.emailVerified = true;

        // Lấy Supabase Access Token từ account (đã được set trong signIn callback)
        const accountWithToken = account as AccountWithAccessToken;
        if (accountWithToken.supabaseAccessToken) {
          token.accessToken = accountWithToken.supabaseAccessToken;
          token.sub = user?.id || token.sub; // Use user ID from Google
          console.log('✅ Google OAuth - Stored Supabase JWT token in JWT callback');
        } else {
          console.error('❌ Google OAuth - No Supabase token in account object!');
        }
      }

      // Xử lý Credentials: Lấy Supabase JWT token từ user object
      if (user && 'accessToken' in user) {
        const userWithToken = user as AdapterUserWithId & { accessToken?: string };
        if (userWithToken.accessToken) {
          token.accessToken = userWithToken.accessToken;
          token.sub = user.id;
          console.log('✅ Credentials - Stored Supabase JWT token in JWT callback');
        }
      }

      // Lưu user info
      if (user?.id && !token.sub) {
        token.sub = user.id;
      }
      if (user?.email) {
        token.email = user.email;
      }
      if (user && 'emailVerified' in user) {
        token.emailVerified = (user as AdapterUserWithId & { emailVerified?: boolean }).emailVerified || false;
      }

      return token;
    },
    async session({ session, token }: {
      session: ExtendedSession;
      token: ExtendedToken & { sub?: string; email?: string; emailVerified?: boolean };
    }) {
      // Đính kèm Supabase Access Token vào session
      if (token?.accessToken) {
        session.supabaseAccessToken = token.accessToken;
      }

      // Đính kèm user ID và email verification status
      if (token?.sub) {
        session.user.id = token.sub;
      }
      if (token?.emailVerified !== undefined) {
        session.user.emailVerified = token.emailVerified;
        session.user.isEmailConfirmed = token.emailVerified;
      }

      // Fetch user data from backend to get roles and other info
      // This is needed because NextAuth session doesn't store full user profile
      if (token?.accessToken && token?.sub) {
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const userData = await response.json();

            // Add user data to session
            (session.user as any).full_name = userData.full_name;
            (session.user as any).username = userData.username;
            (session.user as any).avatar_url = userData.avatar_url;
            (session.user as any).bio = userData.bio;

            // Add roles to session
            if (userData.roles && Array.isArray(userData.roles)) {
              (session.user as any).roles = userData.roles;
            } else {
              // Fallback: construct roles from flags
              const roles: string[] = [];
              if (userData.is_superuser) roles.push("admin");
              if (userData.is_instructor) roles.push("instructor");
              if (roles.length === 0) roles.push("student");
              (session.user as any).roles = roles;
            }
          }
        } catch (error) {
          console.error("Error fetching user data in session callback:", error);
          // Don't fail session creation if user data fetch fails
        }
      }

      return session;
    },
  },
};

// NextAuth v4 with App Router
// @ts-expect-error - NextAuth types don't fully support App Router yet
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
