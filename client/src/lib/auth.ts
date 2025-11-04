import { getSession } from "next-auth/react";

export async function getAccessToken(): Promise<string | undefined> {
  const session = await getSession();
  return (session as any)?.supabaseAccessToken as string | undefined;
}


