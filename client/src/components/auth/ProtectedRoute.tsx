"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useMemo } from "react";
import Spinner from "@/components/ui/Spinner";

const ROLE_VALUES = ["admin", "instructor", "student"] as const;
type Role = (typeof ROLE_VALUES)[number];

const isValidRole = (value: unknown): value is Role =>
  typeof value === "string" && ROLE_VALUES.includes(value as Role);

type SessionUserWithRoles = {
  role?: string | null;
  roles?: string[] | null;
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "instructor" | "student"; // legacy single-role
  requiredRoles?: Array<"admin" | "instructor" | "student">; // preferred multi-role
  fallbackPath?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  fallbackPath = "/login",
}: ProtectedRouteProps) {
  const { data: session, status } = useSession({
    required: false, // We'll handle redirect manually
  });
  const router = useRouter();

  const isAuthenticated = !!session;
  const isLoading = status === "loading";

  // Get user roles from session
  // Note: Role might be in session.user.role or session.user.roles (array)
  const userRoles = useMemo<Role[]>(() => {
    if (!session?.user) return [];
    const user = session.user as SessionUserWithRoles;

    if (Array.isArray(user.roles)) {
      return user.roles.filter(isValidRole);
    }

    if (isValidRole(user.role)) {
      return [user.role];
    }

    return [];
  }, [session?.user]);

  // Memoize roles check to avoid serialization issues
  const rolesToCheck = useMemo(() => {
    return requiredRoles && requiredRoles.length > 0
      ? requiredRoles
      : requiredRole
      ? [requiredRole]
      : [];
  }, [requiredRole, requiredRoles]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      if (
        rolesToCheck.length > 0 &&
        !rolesToCheck.some((r) => userRoles.includes(r))
      ) {
        // Redirect based on user's actual role
        const userRole: Role = userRoles.includes("admin")
          ? "admin"
          : userRoles.includes("instructor")
          ? "instructor"
          : "student";

        switch (userRole) {
          case "admin":
            router.push("/admin");
            break;
          case "instructor":
            router.push("/instructor");
            break;
          default:
            router.push("/");
            break;
        }
        return;
      }
    }
  }, [
    isAuthenticated,
    rolesToCheck,
    userRoles,
    isLoading,
    router,
    fallbackPath,
  ]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  // Don't render children if not authenticated or doesn't have required role
  if (
    !isAuthenticated ||
    (rolesToCheck.length > 0 &&
      !rolesToCheck.some((r) => userRoles.includes(r)))
  ) {
    return null;
  }

  return <>{children}</>;
}
