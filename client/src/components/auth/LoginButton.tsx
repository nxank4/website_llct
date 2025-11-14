"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <button className="px-3 py-2 rounded bg-gray-200">Loading...</button>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">{session.user?.email}</span>
        <button
          className="px-3 py-2 rounded bg-red-600 text-white"
          onClick={() => signOut()}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-2 rounded bg-black text-white"
        onClick={() => signIn("google")}
      >
        Login with Google
      </button>
      <button
        className="px-3 py-2 rounded bg-gray-800 text-white"
        onClick={() => signIn()}
      >
        Login
      </button>
    </div>
  );
}


