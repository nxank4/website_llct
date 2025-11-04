import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";

export const { handlers, auth } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
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
          return { id: credentials.email, email: credentials.email } as any;
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }) {
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
    async session({ session, token }) {
      // Đính kèm token vào session để client dùng gọi FastAPI
      if (token?.accessToken) {
        (session as any).supabaseAccessToken = token.accessToken as string;
      }
      if (token?.sub && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
});

export const { GET, POST } = handlers;


