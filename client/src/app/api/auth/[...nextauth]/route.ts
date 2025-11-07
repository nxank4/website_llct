import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import { createClient } from "@supabase/supabase-js";

interface ExtendedToken extends JWT {
  accessToken?: string;
}

interface ExtendedSession extends Session {
  supabaseAccessToken?: string;
  user: Session["user"] & {
    id?: string;
  };
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
}

interface AdapterUserWithId extends AdapterUser {
  id: string;
}

// Conditionally import and initialize SupabaseAdapter
// Only use it if both env vars are present
// Adapter is disabled by default to avoid build-time module resolution errors
// Can be enabled later if needed by setting environment variables
const getAdapter = () => {
  // Only load adapter at runtime, not during build
  // Check if we're in a build context
  if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
    return undefined;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return undefined;
  }

  // Lazy load adapter only at runtime to avoid build-time module resolution
  try {
    // Use dynamic require with eval to prevent build-time resolution
    const adapterModule = new Function('return require("@auth/supabase-adapter")')();
    if (adapterModule && adapterModule.SupabaseAdapter) {
      return adapterModule.SupabaseAdapter({
        url: supabaseUrl,
        secret: supabaseKey,
      });
    }
    return undefined;
  } catch {
    // Silently fail if adapter is not available
    return undefined;
  }
};

const authOptions = {
  // Load adapter at runtime when env vars are available; undefined during build
  adapter: getAdapter(),
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
          // Call backend API for login
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const formData = new URLSearchParams();
          formData.append('username', credentials.email as string);
          formData.append('password', credentials.password as string);

          const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();

          // Store access token for future API calls
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', data.access_token);
          }

          // Return user object for NextAuth session
          // Note: Backend returns token, not user data
          // We'll need to fetch user data separately or include it in token
          return {
            id: credentials.email as string,
            email: credentials.email as string,
            accessToken: data.access_token,
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
    async jwt({ token, account, user }: {
      token: ExtendedToken;
      account: AccountWithAccessToken | null;
      user: AdapterUserWithId | undefined;
    }) {
      // Lưu user ID và email vào token
      if (user?.id) {
        token.sub = user.id as string;
      }
      if (user?.email) {
        token.email = user.email;
      }

      // Với Supabase Adapter, user đã được tạo trong Supabase Auth
      // Chúng ta cần tạo JWT từ Supabase Auth
      // Tạm thời lưu user ID, JWT sẽ được tạo trong session callback
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      return token;
    },
    async session({ session, token }: {
      session: ExtendedSession;
      token: ExtendedToken & { sub?: string; email?: string }
    }) {
      // Đính kèm token vào session để client dùng gọi FastAPI
      // Với Supabase Adapter, user đã được tạo trong Supabase Auth
      // Chúng ta cần tạo JWT từ Supabase Auth
      // Tạm thời dùng user ID, trong production nên tạo JWT từ Supabase Auth
      if (token?.sub && session.user) {
        session.user.id = token.sub as string;
      }

      // Tạo JWT từ Supabase Auth nếu có user ID
      if (token?.sub) {
        try {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false
              }
            });

            // Lấy user từ Supabase Auth (đã được tạo bởi Supabase Adapter)
            const { data: authUser } = await supabase.auth.admin.getUserById(token.sub);

            if (authUser?.user) {
              // Tạm thời dùng user ID, trong production nên tạo JWT từ Supabase Auth
              // Note: Supabase Adapter đã tạo user, nhưng chúng ta cần JWT từ backend
              // Backend JWT sẽ được lấy từ login API và lưu trong localStorage
              session.supabaseAccessToken = token.sub;
            } else {
              // Fallback: dùng user ID
              session.supabaseAccessToken = token.sub;
            }
          } else {
            // Fallback: dùng user ID
            session.supabaseAccessToken = token.sub;
          }
        } catch (error) {
          console.error("Error creating Supabase session:", error);
          // Fallback: dùng user ID
          session.supabaseAccessToken = token.sub;
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


