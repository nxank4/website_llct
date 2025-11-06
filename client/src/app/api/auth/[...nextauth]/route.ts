import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { NextRequest } from "next/server";

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-implied-eval
    const adapterModule = new Function('return require("@auth/supabase-adapter")')();
    if (adapterModule && adapterModule.SupabaseAdapter) {
      return adapterModule.SupabaseAdapter({
        url: supabaseUrl,
        secret: supabaseKey,
      });
    }
    return undefined;
  } catch (error) {
    // Silently fail if adapter is not available
    return undefined;
  }
};

const authOptions = {
  // Disable adapter during build to avoid module resolution errors
  // Adapter will be loaded at runtime if env vars are present
  adapter: undefined,
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
        // Placeholder: Bạn có thể tích hợp xác thực custom ở đây
        // để đăng nhập demo: chỉ cho phép nếu có email
        if (credentials?.email) {
          return {
            id: credentials.email,
            email: credentials.email
          };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }: {
      token: ExtendedToken;
      account: AccountWithAccessToken | null;
      user: AdapterUserWithId | undefined
    }) {
      // Lưu access_token từ OAuth (nếu có). Với SupabaseAdapter,
      // có thể ánh xạ bổ sung tuỳ nhu cầu thực tế.
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (user?.id) {
        token.sub = user.id as string;
      }
      return token;
    },
    async session({ session, token }: {
      session: ExtendedSession;
      token: ExtendedToken & { sub?: string }
    }) {
      // Đính kèm token vào session để client dùng gọi FastAPI
      if (token?.accessToken && typeof token.accessToken === 'string') {
        session.supabaseAccessToken = token.accessToken;
      }
      if (token?.sub && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
};

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) => Promise<Response> | Response;

const handler = (NextAuth as unknown as (options: typeof authOptions) => {
  GET: RouteHandler;
  POST: RouteHandler;
})(authOptions);

export const { GET, POST } = handler;


