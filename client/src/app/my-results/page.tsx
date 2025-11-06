"use client";
import TestResultCard from "@/components/TestResultCard";
import StudentProgress from "@/components/StudentProgress";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useEffect, useState } from "react";
import { API_ENDPOINTS, getFullUrl, authFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type TestResult = {
  id: string;
  assessment_id: string;
  assessment_title: string;
  subject_code?: string;
  subject_name?: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_taken: number;
  attempt_number: number;
  completed_at: string;
  grade?: string;
};

export default function MyResultsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.id) return;
        const res = await authFetch(
          getFullUrl(API_ENDPOINTS.STUDENT_RESULTS(String(user.id)))
        );
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } else {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Kết quả của tôi
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {results.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-600">
                  Chưa có kết quả nào.
                </div>
              ) : (
                results.map((r) => <TestResultCard key={r.id} result={r} />)
              )}
            </div>

            <div>
              <StudentProgress />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
