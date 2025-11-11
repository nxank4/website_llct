import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import { createClient } from "@supabase/supabase-js";

interface ExtendedToken extends JWT {
  accessToken?: string;
  backendToken?: string;
  emailVerified?: boolean;
}

interface ExtendedSession extends Session {
  supabaseAccessToken?: string;
  user: Session["user"] & {
    id?: string;
    emailVerified?: boolean;
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
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

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

const adapter = getAdapter();

const authOptions = {
  // Load adapter at runtime when env vars are available; undefined during build
  adapter: adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    // Only enable Email provider if adapter is available
    ...(adapter ? [Email({
      server: {
        host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM || "nxan2911@gmail.com",
    })] : []),
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
          // Get Supabase configuration
          const supabaseUrl = process.env.SUPABASE_URL;
          // IMPORTANT: Use Anon Key (Publishable Key) for authentication to get RS256 tokens
          // Supabase has migrated from Legacy JWT Secret (HS256) to new JWT Signing Keys (RS256/ES256)
          // Using Anon Key ensures we get RS256 tokens that can be verified via JWKS
          const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

          if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Supabase configuration is missing:', {
              hasUrl: !!supabaseUrl,
              hasAnonKey: !!supabaseAnonKey,
              url: supabaseUrl ? 'present' : 'missing',
            });
            return null;
          }

          // Create Supabase Client with Anon Key (for authentication - RS256 tokens)
          // This ensures we get RS256 tokens that can be verified via JWKS
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // Sign in with Supabase Auth using Anon Key
          // This will return RS256 tokens (new JWT Signing Keys system)
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          if (error) {
            console.error('Supabase signInWithPassword error:', {
              message: error.message,
              status: error.status,
              email: credentials.email,
            });

            // Check if error is due to unverified email
            // Supabase returns "Email not confirmed" or similar messages
            if (
              error.message.includes('Email not confirmed') ||
              error.message.includes('email not confirmed') ||
              error.message.includes('Email not verified') ||
              error.message.includes('email not verified') ||
              error.message.includes('Email confirmation required') ||
              error.message.includes('email confirmation required')
            ) {
              console.error('Email not verified in Supabase Auth');
              // Return a special error that we can catch in the frontend
              // We'll throw an error with a specific message that frontend can detect
              throw new Error('EMAIL_NOT_VERIFIED');
            }

            // Provide more specific error messages
            if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials')) {
              console.error('User not found or password incorrect in Supabase Auth');
              // Check if user exists in Supabase Auth (but don't expose this info to client)
              // This is just for logging/debugging
            }

            return null;
          }

          if (!data.user) {
            console.error('Supabase signInWithPassword: No user returned');
            return null;
          }

          // Check email confirmation status
          const emailVerified = data.user.email_confirmed_at != null;

          // Log successful login for debugging
          console.log('Supabase signInWithPassword success:', {
            userId: data.user.id,
            email: data.user.email,
            emailVerified,
            hasSession: !!data.session,
            hasAccessToken: !!data.session?.access_token,
            sessionKeys: data.session ? Object.keys(data.session) : [],
          });

          // IMPORTANT: Get access token from Supabase session
          // Try multiple ways to get the token:
          // 1. From data.session.access_token (direct response)
          // 2. From supabase.auth.getSession() (client session)
          let accessToken = data.session?.access_token;

          // If access_token is not in response, try to get it from client session
          if (!accessToken) {
            console.warn('No access_token in response, trying to get from client session...');
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
              console.error('Error getting session:', sessionError);
            } else if (sessionData?.session?.access_token) {
              accessToken = sessionData.session.access_token;
              console.log('Got access_token from client session:', accessToken.substring(0, 20) + '...');
            }
          }

          if (!accessToken) {
            console.error('No access_token found in Supabase session or client session! This should not happen.');
            console.error('Full data object:', JSON.stringify(data, null, 2));
          } else {
            // Decode JWT header to check algorithm
            try {
              const header = JSON.parse(atob(accessToken.split('.')[0]));
              const isRS256 = header.alg === 'RS256' || header.alg === 'ES256';
              const isHS256 = header.alg === 'HS256';

              console.log('Got Supabase access token from signInWithPassword:', {
                algorithm: header.alg,
                kid: header.kid,
                tokenPreview: accessToken.substring(0, 20) + '...',
                isRS256: isRS256,
                isHS256: isHS256,
              });

              if (isHS256) {
                console.error('❌ ERROR: Token is HS256, not RS256! Supabase is still using Legacy JWT Secret.');
                console.error('This token will be REJECTED by ai-server which only accepts RS256/ES256 tokens.');
                console.error('SOLUTION: You need to migrate Supabase project to RS256/ES256:');
                console.error('1. Go to Supabase Dashboard → Project Settings → API → JWT Settings');
                console.error('2. Check if "Legacy JWT secret has been migrated to new JWT Signing Keys"');
                console.error('3. If not migrated, click "Migrate JWT secret"');
                console.error('4. If migrated, click "Rotate keys" to switch to RS256/ES256');
                console.error('5. After rotating, login again to get RS256/ES256 tokens');
              } else if (isRS256) {
                console.log('✅ Token is RS256/ES256 - ready for JWKS verification');
              } else {
                console.warn(`⚠️  Unknown algorithm: ${header.alg}`);
              }
            } catch (e) {
              console.log('Got Supabase access token from signInWithPassword:', accessToken.substring(0, 20) + '...');
              console.warn('Could not decode token header:', e);
            }
          }

          // Return user object for NextAuth session
          // Note: Supabase returns user data directly
          // We'll attach the access token in the jwt callback
          // IMPORTANT: The accessToken property will be passed to jwt callback via user object
          const userObject = {
            id: data.user.id,
            email: data.user.email || credentials.email as string,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
            image: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
            emailVerified: emailVerified,
            // Store access token - this will be passed to jwt callback via user object
            accessToken: accessToken,
          };

          console.log('Returning user object with accessToken:', !!userObject.accessToken);
          return userObject;
        } catch (error) {
          console.error('Login error:', error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account }: {
      user?: AdapterUserWithId;
      account: AccountWithAccessToken | null;
      email?: { verificationRequest?: boolean };
    }) {
      // Với Email provider, user sẽ được verify khi click vào magic link
      // Với Google OAuth, email đã được verify bởi Google
      if (account?.provider === "google") {
        // Google OAuth emails are already verified
        return true;
      }
      if (account?.provider === "email") {
        // Email provider - user will verify via magic link
        return true;
      }
      return true;
    },
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

      // Lưu email verification status
      if (user && 'emailVerified' in user) {
        token.emailVerified = (user as AdapterUserWithId & { emailVerified?: boolean }).emailVerified || false;
      }

      // Với Google OAuth, email đã được verify
      if (account?.provider === "google") {
        token.emailVerified = true;
      }

      // Xử lý Google OAuth: Lấy token từ backend
      // Note: Token sẽ được lấy trong AuthPage.tsx client-side, không cần lấy ở đây
      // Vì jwt callback chạy server-side và không thể lưu vào localStorage
      // Chỉ đánh dấu rằng đây là Google OAuth để AuthPage.tsx biết cần lấy token
      if (account?.provider === "google" && user?.email) {
        // Không cần làm gì ở đây, token sẽ được lấy trong AuthPage.tsx
        // Chỉ đánh dấu để biết đây là Google OAuth
        token.isGoogleOAuth = true;
      }

      // IMPORTANT: Store Supabase RS256 access token from CredentialsProvider
      // This token was obtained using Anon Key, so it's RS256 (new JWT Signing Keys)
      // We need to store it in the JWT token so it can be passed to the session
      // Note: user object from authorize() is passed to jwt callback on first sign-in
      type UserWithAccessToken = AdapterUserWithId & { accessToken?: string };
      if (user && 'accessToken' in user && (user as UserWithAccessToken).accessToken) {
        token.accessToken = (user as UserWithAccessToken).accessToken as string;
        console.log('Stored Supabase RS256 access token in JWT:', token.accessToken?.substring(0, 20) + '...');
      } else if (user && !token.accessToken) {
        // If no accessToken in user object, log warning
        const userWithToken = user as UserWithAccessToken;
        console.warn('No accessToken found in user object from CredentialsProvider. User object:', {
          hasUser: !!user,
          hasAccessToken: 'accessToken' in user,
          accessTokenValue: userWithToken.accessToken,
        });
      }

      // Với Supabase Adapter, user đã được tạo trong Supabase Auth
      // Chúng ta cần tạo JWT từ Supabase Auth
      // Tạm thời lưu user ID, JWT sẽ được tạo trong session callback
      if (account?.access_token && !token.accessToken) {
        token.accessToken = account.access_token;
      }

      return token;
    },
    async session({ session, token }: {
      session: ExtendedSession;
      token: ExtendedToken & { sub?: string; email?: string; backendToken?: string; emailVerified?: boolean }
    }) {
      // Debug: Log token contents
      console.log('Session callback - token contents:', {
        hasSub: !!token?.sub,
        hasAccessToken: !!token?.accessToken,
        accessTokenPreview: token?.accessToken ? token.accessToken.substring(0, 20) + '...' : undefined,
        sub: token?.sub,
      });

      // Đính kèm token vào session để client dùng gọi FastAPI
      // Với Supabase Adapter, user đã được tạo trong Supabase Auth
      // Chúng ta cần tạo JWT từ Supabase Auth
      // Tạm thời dùng user ID, trong production nên tạo JWT từ Supabase Auth
      if (token?.sub && session.user) {
        session.user.id = token.sub as string;
      }

      // Đính kèm email verification status
      if (token?.emailVerified !== undefined) {
        session.user.emailVerified = token.emailVerified;
        session.user.isEmailConfirmed = token.emailVerified;
      }

      // Backend token sẽ được lưu vào localStorage ở client-side
      // (không thể truy cập localStorage trong server-side callback)

      // IMPORTANT: Check if token.accessToken exists first (before checking adapter)
      // This is the token from CredentialsProvider (should be RS256 after migration)
      if (token?.accessToken) {
        // Decode token header to verify algorithm
        try {
          const header = JSON.parse(atob(token.accessToken.split('.')[0]));
          const isRS256 = header.alg === 'RS256' || header.alg === 'ES256';
          const isHS256 = header.alg === 'HS256';

          if (isHS256) {
            console.error('❌ ERROR: Token in session is HS256, not RS256!');
            console.error('Supabase project has not migrated to RS256/ES256 yet.');
            console.error('Please migrate Supabase project to RS256/ES256 first.');
            console.error('See SUPABASE_MIGRATION_GUIDE.md for instructions.');
          } else if (isRS256) {
            console.log('✅ Using RS256/ES256 access token from JWT token:', token.accessToken.substring(0, 20) + '...');
          } else {
            console.warn(`⚠️  Unknown algorithm: ${header.alg}`);
          }
        } catch (e) {
          console.log('Using access token from JWT token:', token.accessToken.substring(0, 20) + '...');
          console.warn('Could not decode token header:', e);
        }

        session.supabaseAccessToken = token.accessToken;
        return session;
      }

      // Fallback: Try to get token from Supabase Auth if adapter is available
      // Tạo JWT từ Supabase Auth nếu có user ID và adapter
      // Chỉ gọi Supabase nếu adapter có sẵn và token.sub là UUID
      if (token?.sub && adapter) {
        // Kiểm tra xem token.sub có phải là UUID không
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUUID = uuidRegex.test(token.sub);

        if (isUUID) {
          try {
            const supabaseUrl = process.env.SUPABASE_URL;
            // IMPORTANT: Use Admin Key (Secret Key) for reading app_metadata
            // This is separate from the Anon Key used for authentication
            // We need Admin Key to bypass RLS and read user metadata
            const supabaseAdminKey = process.env.SUPABASE_SECRET_KEY;

            if (supabaseUrl && supabaseAdminKey) {
              // Create Supabase Admin Client (for reading app_metadata)
              // This is different from the Anon Key client used in CredentialsProvider
              const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              });

              // Lấy user từ Supabase Auth (đã được tạo bởi Supabase Adapter)
              // Using Admin Key allows us to read app_metadata and other protected fields
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(token.sub);

              if (authUser?.user) {
                // Set email confirmation status from Supabase
                session.user.isEmailConfirmed = authUser.user.email_confirmed_at != null;
                session.user.emailVerified = authUser.user.email_confirmed_at != null;

                // Use the RS256 access token from CredentialsProvider (stored in jwt callback)
                // This token was obtained using Anon Key, so it's RS256 (new JWT Signing Keys)
                if (token.accessToken) {
                  session.supabaseAccessToken = token.accessToken;
                  console.log('Using RS256 access token from CredentialsProvider:', token.accessToken.substring(0, 20) + '...');
                } else {
                  // Fallback: use user ID if token not available
                  // This should not happen if CredentialsProvider is working correctly
                  console.error('No accessToken in JWT token! Falling back to user ID. This indicates a problem with CredentialsProvider.');
                  session.supabaseAccessToken = token.sub;
                }
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
        } else {
          // token.sub không phải UUID (có thể là email), không gọi Supabase
          // Chỉ lưu user ID vào session
          session.supabaseAccessToken = token.sub;
        }
      } else if (token?.sub) {
        // Nếu không có adapter hoặc token.sub không phải UUID, chỉ lưu user ID
        session.supabaseAccessToken = token.sub;
      }

      return session;
    },
  },
};

// NextAuth v4 with App Router
// @ts-expect-error - NextAuth types don't fully support App Router yet
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };


