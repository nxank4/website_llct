"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

// Import ProtectedRoute with SSR disabled to avoid prerender errors
const ProtectedRoute = dynamic(
  () => import("./ProtectedRoute"),
  { ssr: false }
);

interface ProtectedRouteWrapperProps {
  children: ReactNode;
  requiredRole?: "admin" | "instructor" | "student";
  requiredRoles?: Array<"admin" | "instructor" | "student">;
  fallbackPath?: string;
}

// Wrapper component that uses dynamic import to disable SSR
export default function ProtectedRouteWrapper({
  children,
  requiredRole,
  requiredRoles,
  fallbackPath,
}: ProtectedRouteWrapperProps) {
  return (
    <ProtectedRoute
      requiredRole={requiredRole}
      requiredRoles={requiredRoles}
      fallbackPath={fallbackPath}
    >
      {children}
    </ProtectedRoute>
  );
}

