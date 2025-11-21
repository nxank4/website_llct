"use client";

import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRouteWrapper requiredRoles={["admin", "instructor"]}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 flex flex-col bg-background">
            <AdminHeader />
            {/* Main Content Area - Only this part will change when navigating */}
            <main className="flex-1 overflow-y-auto bg-background">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}

