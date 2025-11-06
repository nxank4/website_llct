"use client";

import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteWrapper>
      {children}
    </ProtectedRouteWrapper>
  );
}


