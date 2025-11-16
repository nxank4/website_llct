"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useMemo } from "react";
import Spinner from "@/components/ui/Spinner";

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
  const userRoles = useMemo(() => {
    if (!session?.user) return [];
    
    // Check if roles is an array
    if (Array.isArray((session.user as any).roles)) {
      return (session.user as any).roles;
    }
    
    // Check if role is a single string
    if ((session.user as any).role) {
      return [(session.user as any).role];
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
