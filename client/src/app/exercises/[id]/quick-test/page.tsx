"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function QuickTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { authFetch, user } = useAuth();
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

        // Get all assessments for this subject
        const assessmentsRes = await authFetch(
          `${getFullUrl(API_ENDPOINTS.ASSESSMENTS)}?subject_code=${currentSubject.code}&published_only=true`
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
              getFullUrl(API_ENDPOINTS.ASSESSMENT_QUESTIONS(Number(assessment._id || assessment.id)))
            );
            const questionsData = await questionsRes.json();
            const questionsList = Array.isArray(questionsData)
              ? questionsData
              : [];
            allQuestions.push(...questionsList);
          } catch (e) {
            console.error(`Failed to load questions for assessment ${assessment._id}:`, e);
          }
        }

        // Randomly select 60 questions (or all if less than 60)
        const selectedQuestions = allQuestions
          .sort(() => Math.random() - 0.5)
          .slice(0, 60);

        if (selectedQuestions.length === 0) {
          setError("Không có câu hỏi nào trong bộ đề. Vui lòng liên hệ quản trị viên.");
          setLoading(false);
          return;
        }

        // Create a temporary assessment for quick test
        const quickTestAssessment = {
          title: "Kiểm tra nhanh",
          subject_code: currentSubject.code,
          subject_name: currentSubject.name,
          time_limit_minutes: 60,
          max_attempts: 999, // Unlimited attempts for quick test
          is_published: true,
          is_randomized: true,
          questions: selectedQuestions,
        };

        // Create assessment
        const createRes = await authFetch(
          getFullUrl(API_ENDPOINTS.ASSESSMENTS),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quickTestAssessment),
          }
        );

        if (!createRes.ok) {
          throw new Error("Failed to create quick test");
        }

        const createdAssessment = await createRes.json();
        const assessmentId = createdAssessment._id || createdAssessment.id;

        // Redirect to attempt page
        router.push(
          `/exercises/${resolvedParams.id}/attempt?assessmentId=${assessmentId}&quickTest=true`
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" />
          <p className="mt-4 text-gray-600 arimo-regular">
            Đang tạo bài kiểm tra nhanh...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 poppins-bold">
            Lỗi
          </h2>
          <p className="text-gray-600 mb-6 arimo-regular">{error}</p>
          <button
            onClick={() => router.push(`/exercises/${resolvedParams.id}`)}
            className="px-6 py-3 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors poppins-semibold"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return null;
}

