"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Component to guard routes and redirect unconfirmed users to /auth/confirm-email
 * 
 * This component checks if the user is authenticated but email is not confirmed,
 * and redirects them to the confirm-email page.
 * 
 * Excludes certain routes from this check (login, register, confirm-email, etc.)
 */
export default function EmailConfirmationGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Routes that don't require email confirmation
  const excludedRoutes = [
    "/login",
    "/register",
    "/auth/confirm-email",
    "/auth/callback",
    "/api",
  ];

  // Check if current route should be excluded
  const isExcludedRoute = excludedRoutes.some((route) =>
    pathname?.startsWith(route)
  );

  useEffect(() => {
    // Only check if session is loaded and route is not excluded
    if (status === "loading" || isExcludedRoute) {
      return;
    }

    // If authenticated but email not confirmed, redirect to confirm-email page
    if (
      status === "authenticated" &&
      session?.user &&
      !session.user.isEmailConfirmed &&
      !session.user.emailVerified
    ) {
      router.push("/auth/confirm-email");
    }
  }, [status, session, router, pathname, isExcludedRoute]);

  // Don't render children if redirecting
  if (
    status === "authenticated" &&
    session?.user &&
    !session.user.isEmailConfirmed &&
    !session.user.emailVerified &&
    !isExcludedRoute
  ) {
    return null;
  }

  return <>{children}</>;
}

