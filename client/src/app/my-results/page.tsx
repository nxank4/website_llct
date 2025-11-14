"use client";
import TestResultCard from "@/components/stats/TestResultCard";
import StudentProgress from "@/components/stats/StudentProgress";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useSession } from "next-auth/react";
import { useStudentResults } from "@/hooks/useStudentResults";

export default function MyResultsPage() {
  const { data: session } = useSession();
  const user = session?.user as { id?: string } | undefined;
  const { results, loading } = useStudentResults(user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        Đang tải...
      </div>
    );
  }

  return (
    <ProtectedRouteWrapper requiredRoles={["student", "instructor", "admin"]}>
      <div className="min-h-screen bg-white">
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
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
