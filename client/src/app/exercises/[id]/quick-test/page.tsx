"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

export default function QuickTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const user = session?.user;
  const authFetch = useAuthFetch();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subjectInfo = {
    mln111: { code: "MLN111", name: "Triết học Mác - Lê-nin" },
    mln122: { code: "MLN122", name: "Kinh tế chính trị Mác - Lê-nin" },
    mln131: { code: "MLN131", name: "Chủ nghĩa xã hội khoa học" },
    hcm202: { code: "HCM202", name: "Tư tưởng Hồ Chí Minh" },
    vnr202: { code: "VNR202", name: "Lịch sử Đảng Cộng sản Việt Nam" },
  };

  const currentSubject =
    subjectInfo[resolvedParams.id as keyof typeof subjectInfo] ||
    subjectInfo.mln111;

  // Create quick test assessment
  useEffect(() => {
    const createQuickTest = async () => {
      try {
        setLoading(true);
        setError(null);

        // First, fetch subject to get subject_id
        let subjectId: number | null = null;
        try {
          const subjectsRes = await fetch(
            `${getFullUrl(
              API_ENDPOINTS.LIBRARY_SUBJECTS
            )}?is_active=true&limit=100`
          );
          if (subjectsRes.ok) {
            const subjectsData = await subjectsRes.json();
            const subjectsList = Array.isArray(subjectsData)
              ? subjectsData
              : [];
            const foundSubject = subjectsList.find(
              (s: { code: string; id: number }) =>
                s.code.toLowerCase() === currentSubject.code.toLowerCase()
            );
            if (foundSubject) {
              subjectId = foundSubject.id;
            }
          }
        } catch (e) {
          console.error("Error fetching subject:", e);
        }

        if (!subjectId) {
          setError("Không tìm thấy môn học. Vui lòng thử lại.");
          setLoading(false);
          return;
        }

        // Get all assessments for this subject
        const assessmentsRes = await authFetch(
          `${getFullUrl(API_ENDPOINTS.ASSESSMENTS)}?subject_code=${
            currentSubject.code
          }&published_only=true`
        );
        const assessmentsData = await assessmentsRes.json();
        const assessmentsList = Array.isArray(assessmentsData)
          ? assessmentsData
          : [];

        // Collect all questions from all assessments
        const allQuestions: unknown[] = [];
        for (const assessment of assessmentsList) {
          try {
            const questionsRes = await authFetch(
              getFullUrl(
                API_ENDPOINTS.ASSESSMENT_QUESTIONS(
                  Number(assessment._id || assessment.id)
                )
              )
            );
            const questionsData = await questionsRes.json();
            const questionsList = Array.isArray(questionsData)
              ? questionsData
              : [];
            allQuestions.push(...questionsList);
          } catch (e) {
            console.error(
              `Failed to load questions for assessment ${assessment._id}:`,
              e
            );
          }
        }

        // Randomly select 60 questions (or all if less than 60)
        const selectedQuestions = allQuestions
          .sort(() => Math.random() - 0.5)
          .slice(0, 60);

        if (selectedQuestions.length === 0) {
          setError(
            "Không có câu hỏi nào trong bộ đề. Vui lòng liên hệ quản trị viên."
          );
          setLoading(false);
          return;
        }

        // Create temporary assessment object in memory (NOT in database)
        const tempAssessment = {
          id: `quick_test_${Date.now()}`, // Temporary ID
          title: "Kiểm tra nhanh",
          assessment_type: "quiz",
          subject_id: subjectId,
          subject_code: currentSubject.code,
          subject_name: currentSubject.name,
          time_limit_minutes: 60,
          max_attempts: null, // Unlimited
          is_published: true,
          is_randomized: true,
          questions: selectedQuestions, // Include questions directly
        };

        // Store assessment data in sessionStorage (better for large data)
        const storageKey = `quick_test_${resolvedParams.id}_${Date.now()}`;
        sessionStorage.setItem(storageKey, JSON.stringify(tempAssessment));

        // Redirect to attempt page with storage key
        router.push(
          `/exercises/${resolvedParams.id}/attempt?quickTest=true&storageKey=${storageKey}`
        );
      } catch (err) {
        console.error("Error creating quick test:", err);
        setError("Đã xảy ra lỗi khi tạo bài kiểm tra nhanh. Vui lòng thử lại.");
        setLoading(false);
      }
    };

    createQuickTest();
  }, [resolvedParams.id, currentSubject, authFetch, router, user]);

  if (loading) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <div className="text-center">
          <Spinner size="xl" />
          <p
            className={cn(
              "mt-4 arimo-regular",
              isDarkMode ? "text-muted-foreground" : "text-gray-600"
            )}
          >
            Đang tạo bài kiểm tra nhanh...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <div className="text-center max-w-md mx-auto px-4">
          <h2
            className={cn(
              "text-2xl font-bold mb-4 poppins-bold",
              isDarkMode ? "text-foreground" : "text-gray-900"
            )}
          >
            Lỗi
          </h2>
          <p
            className={cn(
              "mb-6 arimo-regular",
              isDarkMode ? "text-muted-foreground" : "text-gray-600"
            )}
          >
            {error}
          </p>
          <button
            onClick={() => router.push(`/exercises/${resolvedParams.id}`)}
            className="px-6 py-3 bg-[hsl(var(--primary))] text-primary-foreground rounded-lg hover:bg-[hsl(var(--primary)/0.85)] transition-colors poppins-semibold"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return null;
}
