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
    };
  }
}


