import { getSession } from "next-auth/react";
import { Session } from "next-auth";

export async function getAccessToken(): Promise<string | undefined> {
  const session = await getSession();
  return (session as Session | null)?.supabaseAccessToken;
}


