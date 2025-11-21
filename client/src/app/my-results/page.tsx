"use client";
import StudentProgress from "@/components/stats/StudentProgress";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useSession } from "next-auth/react";
import { useStudentResults } from "@/hooks/useStudentResults";
import Spinner from "@/components/ui/Spinner";

export default function MyResultsPage() {
  const { data: session } = useSession();
  const user = session?.user as { id?: string } | undefined;
  const { loading } = useStudentResults(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="xl" text="Đang tải..." />
      </div>
    );
  }

  return (
    <ProtectedRouteWrapper requiredRoles={["student", "instructor", "admin"]}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-foreground mb-6 poppins-bold">
            Kết quả của tôi
          </h1>
          <div>
            <StudentProgress userId={user?.id} />
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
