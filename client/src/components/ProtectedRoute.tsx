"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useMemo } from "react";

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
  const { isAuthenticated, hasRole, isLoading, user } = useAuth();
  const router = useRouter();

  // Memoize roles check to avoid serialization issues
  const rolesToCheck = useMemo(() => {
    return requiredRoles && requiredRoles.length > 0
      ? requiredRoles
      : requiredRole
      ? [requiredRole]
      : [];
  }, [requiredRole, requiredRoles]);

  // Memoize user roles for comparison
  const userRoles = useMemo(() => {
    return user?.roles || [];
  }, [user?.roles]);

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
        const userRole = userRoles.includes("admin")
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
