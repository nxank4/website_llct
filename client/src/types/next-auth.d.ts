declare module "next-auth" {
  interface Session {
    supabaseAccessToken?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      emailVerified?: boolean;
      isEmailConfirmed?: boolean;
      email_confirmed_at?: string | null;
      full_name?: string;
      username?: string;
      avatar_url?: string;
      bio?: string;
      roles?: string[];
      role?: string; // Single role for backward compatibility
    };
  }
}


