"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Download, Star } from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import Spinner from "@/components/ui/Spinner";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";

interface Answer {
  question_id?: string;
  question_text?: string;
  user_answer?: string;
  correct_answer?: string;
  is_correct?: boolean;
  explanation?: string;
  points?: number;
  points_earned?: number;
}

interface AssessmentResult {
  id: number;
  student_id: string;
  student_name?: string;
  assessment_id: string;
  assessment_title?: string;
  subject_code?: string;
  subject_name?: string;
  answers?: Answer[];
  score: number;
  correct_answers: number;
  total_questions: number;
  time_taken: number;
  attempt_number: number;
  is_completed: boolean;
  completed_at?: string;
}

interface Assessment {
  id: number;
  title: string;
  show_results: boolean;
  show_explanations: boolean;
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const resultId = searchParams.get("resultId");
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Load result and assessment data
  useEffect(() => {
    const loadData = async () => {
      if (!resultId) {
        showToast({
          type: "error",
          title: "Lỗi",
          message: "Không tìm thấy ID kết quả",
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load result
        const resultRes = await authFetch(
          getFullUrl(API_ENDPOINTS.ASSESSMENT_RESULT_BY_ID(parseInt(resultId)))
        );
        if (!resultRes.ok) {
          throw new Error("Không thể tải kết quả");
        }
        const resultData = await resultRes.json();
        setResult(resultData);

        // Load assessment to check show_results and show_explanations
        const assessmentId = resultData.assessment_id;
        if (assessmentId) {
          const assessmentRes = await authFetch(
            getFullUrl(API_ENDPOINTS.ASSESSMENT_DETAIL(parseInt(assessmentId)))
          );
          if (assessmentRes.ok) {
            const assessmentData = await assessmentRes.json();
            setAssessment(assessmentData);
          }
        }

        // Load user's rating if exists
        if (assessmentId) {
          const ratingRes = await authFetch(
            getFullUrl(API_ENDPOINTS.ASSESSMENT_RATING_MY(parseInt(assessmentId)))
          );
          if (ratingRes.ok) {
            const ratingData = await ratingRes.json();
            if (ratingData) {
              setUserRating(ratingData.rating);
            }
          }
        }
      } catch (error) {
        console.error("Error loading review data:", error);
        showToast({
          type: "error",
          title: "Lỗi",
          message: "Không thể tải dữ liệu xem lại",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [resultId, authFetch, showToast]);

  const handleRatingSubmit = async (newRating: number) => {
    if (!result?.assessment_id) return;

    try {
      setSubmittingRating(true);
      const res = await authFetch(
        getFullUrl(API_ENDPOINTS.ASSESSMENT_RATINGS(parseInt(result.assessment_id))),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: newRating }),
        }
      );

      if (res.ok) {
        setUserRating(newRating);
        showToast({
          type: "success",
          title: "Thành công",
          message: "Đánh giá của bạn đã được lưu",
        });
      } else {
        throw new Error("Không thể lưu đánh giá");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Không thể lưu đánh giá",
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleExport = async (format: "csv" | "excel" = "csv") => {
    if (!result?.student_id) return;

    try {
      const url = getFullUrl(
        API_ENDPOINTS.STUDENT_RESULTS_EXPORT(result.student_id, format)
      );
      const res = await authFetch(url);

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `ket_qua_kiem_tra.${format === "csv" ? "csv" : "xlsx"}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);

        showToast({
          type: "success",
          title: "Thành công",
          message: "Đã tải xuống kết quả",
        });
      } else {
        throw new Error("Không thể tải xuống");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Không thể tải xuống kết quả",
      });
    }
  };

  if (loading) {
    return (
      <ProtectedRouteWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Spinner size="xl" />
        </div>
      </ProtectedRouteWrapper>
    );
  }

  if (!result) {
    return (
      <ProtectedRouteWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Không tìm thấy kết quả
            </h2>
            <Link
              href={`/exercises/${resolvedParams.id}`}
              className="text-[#125093] hover:underline"
            >
              Quay lại danh sách bài kiểm tra
            </Link>
          </div>
        </div>
      </ProtectedRouteWrapper>
    );
  }

  const canShowResults = assessment?.show_results !== false;
  const canShowExplanations = assessment?.show_explanations !== false;
  const answers = result.answers || [];
  const scorePercentage = result.total_questions > 0 
    ? Math.round((result.score / result.total_questions) * 100) 
    : 0;

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/exercises/${resolvedParams.id}`}
              className="inline-flex items-center text-[#125093] hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 poppins-bold">
              Xem lại bài kiểm tra
            </h1>
            <p className="text-gray-600 arimo-regular">
              {result.assessment_title || "Bài kiểm tra"}
            </p>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-[#125093] mb-2 poppins-bold">
                  {result.score.toFixed(1)}/{result.total_questions}
                </div>
                <div className="text-gray-600 arimo-regular">Điểm số</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2 poppins-bold">
                  {result.correct_answers}/{result.total_questions}
                </div>
                <div className="text-gray-600 arimo-regular">Câu đúng</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2 poppins-bold">
                  {scorePercentage}%
                </div>
                <div className="text-gray-600 arimo-regular">Tỷ lệ đúng</div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-gray-600 arimo-regular">
                <Clock className="w-4 h-4" />
                <span>Thời gian: {Math.round(result.time_taken / 60)} phút</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 arimo-regular">
                <span>Lần làm: {result.attempt_number}</span>
              </div>
              <button
                onClick={() => handleExport("csv")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4073] transition-colors"
              >
                <Download className="w-4 h-4" />
                Tải CSV
              </button>
            </div>
          </div>

          {/* Rating Section */}
          {result.assessment_id && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 poppins-bold">
                Đánh giá bài kiểm tra
              </h2>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingSubmit(star)}
                    disabled={submittingRating}
                    className={`p-2 rounded transition-colors ${
                      userRating && star <= userRating
                        ? "text-yellow-500"
                        : "text-gray-300 hover:text-yellow-400"
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        userRating && star <= userRating ? "fill-current" : ""
                      }`}
                    />
                  </button>
                ))}
                {userRating && (
                  <span className="ml-2 text-gray-600 arimo-regular">
                    Bạn đã đánh giá {userRating}/5 sao
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Questions Review */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 poppins-bold">
              Chi tiết câu hỏi
            </h2>
            {answers.map((answer, index) => {
              const isCorrect = answer.is_correct ?? false;
              const showCorrectAnswer = canShowResults;
              const showExplanation = canShowExplanations && answer.explanation;

              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${
                    isCorrect
                      ? "border-green-500"
                      : "border-red-500"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-900 poppins-bold">
                        Câu {index + 1}
                      </span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                    {answer.points_earned !== undefined && (
                      <span className="text-sm font-semibold text-gray-600 poppins-semibold">
                        {answer.points_earned}/{answer.points || 1} điểm
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-900 text-base arimo-regular mb-3">
                      {answer.question_text || "Câu hỏi"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold text-gray-700 poppins-semibold">
                        Đáp án của bạn:{" "}
                      </span>
                      <span
                        className={
                          isCorrect ? "text-green-600" : "text-red-600"
                        }
                      >
                        {answer.user_answer || "Chưa trả lời"}
                      </span>
                    </div>

                    {showCorrectAnswer && (
                      <div>
                        <span className="font-semibold text-gray-700 poppins-semibold">
                          Đáp án đúng:{" "}
                        </span>
                        <span className="text-green-600">
                          {answer.correct_answer || "N/A"}
                        </span>
                      </div>
                    )}

                    {showExplanation && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="font-semibold text-blue-900 poppins-semibold">
                          Giải thích:{" "}
                        </span>
                        <span className="text-blue-800 arimo-regular">
                          {answer.explanation}
                        </span>
                      </div>
                    )}

                    {!canShowResults && (
                      <div className="mt-2 text-sm text-gray-500 arimo-regular italic">
                        Kết quả đúng sẽ được hiển thị sau khi giảng viên chấm bài
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}

