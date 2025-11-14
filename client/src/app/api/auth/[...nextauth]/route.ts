import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import { createClient } from "@supabase/supabase-js";

interface ExtendedToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  backendToken?: string;
  emailVerified?: boolean;
  isEmailConfirmed?: boolean;
  isGoogleOAuth?: boolean;
  supabaseUserId?: string;
  role?: string;
  roles?: string[];
  avatarUrl?: string | null;
  fullName?: string | null;
  username?: string | null;
  error?: string;
}

interface ExtendedSession extends Session {
  supabaseAccessToken?: string;
  supabaseRefreshToken?: string;
  user: Session["user"] & {
    id?: string;
    emailVerified?: boolean;
    avatar_url?: string | null;
    full_name?: string | null;
    username?: string | null;
    image?: string | null;
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
  supabaseAccessToken?: string; // Custom field for Supabase JWT token
  supabaseRefreshToken?: string;
  supabaseExpiresAt?: number;
}

interface AdapterUserWithId extends AdapterUser {
  id: string;
}

// Validate required environment variables
const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please set these variables in your Vercel project settings or .env file');
}

// Build providers array conditionally
const providers = [];

// Add Google provider only if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
} else {
  console.warn('⚠️ Google OAuth not configured. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.');
}

// Always add Credentials provider (it handles missing Supabase config internally)
providers.push(
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
            // Throw error để NextAuth trả về result.error = "EMAIL_NOT_VERIFIED"
            throw new Error('EMAIL_NOT_VERIFIED');
          }
          // Throw error cho các lỗi khác để NextAuth trả về result.error
          throw new Error('INVALID_CREDENTIALS');
        }

        if (!data.user || !data.session?.access_token) {
          console.error('Supabase signInWithPassword: No user or access_token returned');
          return null;
        }

        const emailVerified = data.user.email_confirmed_at != null;
        const accessToken = data.session.access_token;
        const refreshToken = data.session.refresh_token ?? undefined;
        const expiresAt = data.session.expires_at
          ? data.session.expires_at * 1000
          : Date.now() + 60 * 60 * 1000;

        console.log('✅ Credentials login success - Got Supabase JWT token');

        return {
          id: data.user.id,
          email: data.user.email || credentials.email as string,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
          image: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          emailVerified: emailVerified,
          accessToken: accessToken, // Store Supabase JWT token
          refreshToken: refreshToken,
          accessTokenExpires: expiresAt,
        };
      } catch (error) {
        console.error('Login error:', error);
        return null;
      }
    },
  })
);

// Validate NEXTAUTH_SECRET
if (!process.env.NEXTAUTH_SECRET) {
  console.error('❌ NEXTAUTH_SECRET is required but not set!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET must be set in production environment');
  }
  console.warn('⚠️ Using fallback secret for development only. This should NOT be used in production!');
}

const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only-DO-NOT-USE-IN-PRODUCTION',
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account }: {
      account: AccountWithAccessToken | null;
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
          (account as AccountWithAccessToken).supabaseRefreshToken = data.session.refresh_token ?? undefined;
          (account as AccountWithAccessToken).supabaseExpiresAt = data.session.expires_at
            ? data.session.expires_at * 1000
            : Date.now() + 60 * 60 * 1000;

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
      // --- Thiết lập token khi đăng nhập lần đầu ---
      if (account?.provider === "google") {
        token.isGoogleOAuth = true;
        token.emailVerified = true;

        const accountWithToken = account as AccountWithAccessToken;
        if (accountWithToken.supabaseAccessToken) {
          token.accessToken = accountWithToken.supabaseAccessToken;
          token.refreshToken =
            accountWithToken.supabaseRefreshToken ?? token.refreshToken;
          token.accessTokenExpires =
            accountWithToken.supabaseExpiresAt ??
            Date.now() + 60 * 60 * 1000;
          token.sub = user?.id || token.sub;
          token.error = undefined;
          console.log("✅ Google OAuth - Stored Supabase JWT token in JWT callback");
        } else {
          console.error("❌ Google OAuth - No Supabase token in account object!");
        }
      }

      if (user && "accessToken" in user) {
        const userWithToken = user as AdapterUserWithId & {
          accessToken?: string;
          refreshToken?: string;
          accessTokenExpires?: number;
        };
        if (userWithToken.accessToken) {
          token.accessToken = userWithToken.accessToken;
          token.refreshToken = userWithToken.refreshToken ?? token.refreshToken;
          token.accessTokenExpires =
            userWithToken.accessTokenExpires ?? Date.now() + 60 * 60 * 1000;
          token.sub = user.id;
          token.error = undefined;
          console.log("✅ Credentials - Stored Supabase JWT token in JWT callback");
        }
      }

      if (user) {
        const enrichedUser = user as AdapterUserWithId & {
          avatar_url?: string | null;
          image?: string | null;
          full_name?: string | null;
          username?: string | null;
          name?: string | null;
        };

        const candidateAvatar =
          enrichedUser.avatar_url ?? enrichedUser.image ?? null;
        if (candidateAvatar) {
          token.avatarUrl = candidateAvatar;
        }

        const candidateFullName =
          enrichedUser.full_name ?? enrichedUser.name ?? null;
        if (candidateFullName) {
          token.fullName = candidateFullName;
        }

        if (enrichedUser.username) {
          token.username = enrichedUser.username;
        }
      }

      if (!token.accessTokenExpires && token.accessToken) {
        token.accessTokenExpires = Date.now() + 60 * 60 * 1000;
      }

      // --- Làm mới access token nếu hết hạn ---
      if (
        token.accessToken &&
        token.accessTokenExpires &&
        Date.now() >= token.accessTokenExpires
      ) {
        if (!token.refreshToken) {
          console.warn(
            "⚠️ JWT Callback - Missing refresh token, forcing re-authentication"
          );
          token.error = "RefreshAccessTokenError";
          return token;
        }

        try {
          const refreshed = await refreshSupabaseAccessToken(token);
          if (!refreshed) {
            token.error = "RefreshAccessTokenError";
            return token;
          }
          token.accessToken = refreshed.accessToken;
          token.refreshToken = refreshed.refreshToken ?? token.refreshToken;
          token.accessTokenExpires = refreshed.accessTokenExpires;
          token.error = undefined;
          console.log("✅ JWT Callback - Supabase token refreshed successfully");
        } catch (error) {
          console.error("❌ JWT Callback - Error refreshing Supabase token:", error);
          token.error = "RefreshAccessTokenError";
          return token;
        }
      }

      // --- Sao chép thông tin người dùng ---
      if (user?.id && !token.sub) {
        token.sub = user.id;
      }
      if (user?.email) {
        token.email = user.email;
      }
      if (user && "emailVerified" in user) {
        token.emailVerified =
          (user as AdapterUserWithId & { emailVerified?: boolean }).emailVerified ||
          false;
        token.isEmailConfirmed = token.emailVerified;
      }

      // --- Lấy role và trạng thái email từ Supabase Admin nếu cần ---
      const shouldRefreshRole =
        !!token.accessToken &&
        !!token.sub &&
        (!!account || !token.role || !token.roles || token.roles.length === 0);

      if (shouldRefreshRole) {
        try {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

          if (supabaseUrl && supabaseServiceKey) {
            const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            });

            const { data: authUser, error } =
              await supabaseAdmin.auth.admin.getUserById(token.sub as string);

            if (!error && authUser?.user) {
              const appMetadata = authUser.user.app_metadata || {};
              const userMetadata = authUser.user.user_metadata || {};
              const rawRoles = Array.isArray(appMetadata.roles)
                ? appMetadata.roles
                : [];
              const normalizedRoles = rawRoles
                .map((r) =>
                  typeof r === "string" ? r.toLowerCase() : String(r).toLowerCase()
                )
                .filter((r) => r.length > 0);
              const primaryRole = (
                appMetadata.user_role ||
                normalizedRoles[0] ||
                "student"
              ).toLowerCase();
              const distinctRoles = Array.from(
                new Set([primaryRole, ...normalizedRoles])
              );

              token.role = primaryRole;
              token.roles = distinctRoles;

              const metadataAvatar =
                userMetadata.avatar_url ||
                userMetadata.picture ||
                appMetadata.avatar_url ||
                appMetadata.picture ||
                null;
              if (metadataAvatar) {
                token.avatarUrl = metadataAvatar;
              }

              const metadataFullName =
                userMetadata.full_name ||
                userMetadata.name ||
                appMetadata.full_name ||
                appMetadata.name ||
                token.fullName ||
                null;
              if (metadataFullName) {
                token.fullName = metadataFullName;
              }

              const metadataUsername =
                userMetadata.username || appMetadata.username || token.username || null;
              if (metadataUsername) {
                token.username = metadataUsername;
              }

              const isEmailConfirmed = !!authUser.user.email_confirmed_at;
              token.isEmailConfirmed = isEmailConfirmed;
              token.emailVerified = isEmailConfirmed;

              console.log(
                `✅ JWT Callback - Lấy role và isEmailConfirmed từ Supabase Admin: roles=${distinctRoles.join(",")}, isEmailConfirmed=${isEmailConfirmed}`
              );
            } else {
              console.error(
                "❌ JWT Callback - Lỗi khi lấy user từ Supabase Admin:",
                error
              );
              token.role = "student";
              token.roles = ["student"];
              token.isEmailConfirmed = token.emailVerified || false;
              if (!token.avatarUrl) {
                token.avatarUrl = null;
              }
            }
          } else {
            console.warn("⚠️ JWT Callback - Thiếu SUPABASE_URL hoặc SUPABASE_SECRET_KEY");
            token.role = "student";
            token.roles = ["student"];
            token.isEmailConfirmed = token.emailVerified || false;
            if (!token.avatarUrl) {
              token.avatarUrl = null;
            }
          }
        } catch (error) {
          console.error("❌ JWT Callback - Lỗi khi gọi Supabase Admin:", error);
          token.role = "student";
          token.roles = ["student"];
          token.isEmailConfirmed = token.emailVerified || false;
          if (!token.avatarUrl) {
            token.avatarUrl = null;
          }
        }
      }

      return token;
    },
    async session({ session, token }: {
      session: ExtendedSession;
      token: ExtendedToken & {
        sub?: string;
        email?: string;
        emailVerified?: boolean;
        role?: string;
        isEmailConfirmed?: boolean;
      };
    }) {
      console.log("[NextAuth DEBUG] Đang chạy Session callback...");

      // === KHÔNG CÓ LỆNH "FETCH" NÀO Ở ĐÂY ===
      // Chỉ sao chép dữ liệu TỪ 'token' (cookie) SANG 'session' (client)

      const extendedUser = session.user as {
        accessToken?: string;
        role?: string;
        roles?: string[];
        avatar_url?: string | null;
        image?: string | null;
        full_name?: string | null;
        username?: string | null;
        name?: string | null;
      };

      // Đính kèm Supabase Access Token và Refresh Token vào session
      if (token?.accessToken) {
        session.supabaseAccessToken = token.accessToken;
        extendedUser.accessToken = token.accessToken;
      }
      if (token?.refreshToken) {
        session.supabaseRefreshToken = token.refreshToken;
      }

      // Đính kèm user ID
      if (token?.sub) {
        session.user.id = token.sub;
      }

      // Đính kèm email verification status
      if (token?.isEmailConfirmed !== undefined) {
        session.user.isEmailConfirmed = token.isEmailConfirmed;
        session.user.emailVerified = token.isEmailConfirmed;
      } else if (token?.emailVerified !== undefined) {
        session.user.emailVerified = token.emailVerified;
        session.user.isEmailConfirmed = token.emailVerified;
      }

      // Đính kèm role (từ app_metadata, đã lấy trong jwt callback)
      if (token?.role) {
        extendedUser.role = token.role;
      } else {
        extendedUser.role = "student";
      }

      if (token?.roles && token.roles.length > 0) {
        extendedUser.roles = token.roles;
      } else if (extendedUser.role) {
        extendedUser.roles = [extendedUser.role];
      } else {
        extendedUser.roles = ["student"];
      }

      if (token?.avatarUrl !== undefined) {
        extendedUser.avatar_url = token.avatarUrl;
        if (token.avatarUrl) {
          extendedUser.image = token.avatarUrl;
        } else if (!extendedUser.image) {
          extendedUser.image = null;
        }
      }

      if (token?.fullName) {
        extendedUser.full_name = token.fullName;
        if (!extendedUser.name) {
          extendedUser.name = token.fullName;
        }
      }

      if (token?.username) {
        extendedUser.username = token.username;
      }

      if (token.error) {
        (session as ExtendedSession & { error?: string }).error = token.error;
      }

      console.log("[NextAuth DEBUG] Session Callback: Đã gửi session về client.");
      console.log("[NextAuth DEBUG] Session data:", {
        id: session.user.id,
        role: extendedUser.role,
        isEmailConfirmed: session.user.isEmailConfirmed,
        hasAccessToken: !!session.supabaseAccessToken,
        hasError: token.error,
      });

      return session;
    },
  },
};

async function refreshSupabaseAccessToken(token: ExtendedToken): Promise<{ "accessToken": string; "refreshToken"?: string; "accessTokenExpires": number; } | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Refresh Token - Missing Supabase configuration");
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: token.refreshToken!,
    });

    if (error || !data.session?.access_token) {
      console.error("❌ Refresh Token - Supabase error:", error);
      return null;
    }

    const newAccessToken = data.session.access_token;
    const newRefreshToken = data.session.refresh_token ?? token.refreshToken;
    const accessTokenExpires = data.session.expires_at
      ? data.session.expires_at * 1000
      : Date.now() + 60 * 60 * 1000;

    console.log("✅ Refresh Token - Successfully refreshed Supabase session");

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken ?? undefined,
      accessTokenExpires,
    };
  } catch (error) {
    console.error("❌ Refresh Token - Unexpected error:", error);
    return null;
  }
}

// NextAuth v4 with App Router
// Wrap in try-catch to handle initialization errors gracefully
let handler: { GET: (req: Request) => Promise<Response>; POST: (req: Request) => Promise<Response> };

try {
  // @ts-expect-error - NextAuth types don't fully support App Router yet
  const nextAuthHandler = NextAuth(authOptions);
  handler = nextAuthHandler;
} catch (error) {
  console.error('❌ Failed to initialize NextAuth:', error);
  // Create a fallback handler that returns error
  const errorResponse = (message: string) =>
    new Response(
      JSON.stringify({
        error: 'NextAuth configuration error',
        message,
        missingEnvVars: missingEnvVars,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  handler = {
    GET: async () => errorResponse(error instanceof Error ? error.message : 'Unknown error'),
    POST: async () => errorResponse(error instanceof Error ? error.message : 'Unknown error'),
  };
}

// Wrap handlers with error handling
const handleRequest = async (req: Request, method: 'GET' | 'POST') => {
  try {
    return await handler[method](req);
  } catch (error) {
    console.error('❌ NextAuth handler error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const GET = (req: Request) => handleRequest(req, 'GET');
export const POST = (req: Request) => handleRequest(req, 'POST');
