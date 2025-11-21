"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Star,
} from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import Spinner from "@/components/ui/Spinner";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/separator";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";

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
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
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
            getFullUrl(
              API_ENDPOINTS.ASSESSMENT_RATING_MY(parseInt(assessmentId))
            )
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
        getFullUrl(
          API_ENDPOINTS.ASSESSMENT_RATINGS(parseInt(result.assessment_id))
        ),
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
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Spinner size="xl" />
        </div>
      </ProtectedRouteWrapper>
    );
  }

  if (!result) {
    return (
      <ProtectedRouteWrapper>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground text-center">
                Không tìm thấy kết quả
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <Link
                href={`/exercises/${resolvedParams.id}`}
                className="text-primary hover:underline"
              >
                Quay lại danh sách bài kiểm tra
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedRouteWrapper>
    );
  }

  const canShowResults = assessment?.show_results !== false;
  const canShowExplanations = assessment?.show_explanations !== false;
  const answers = result.answers || [];
  const scorePercentage =
    result.total_questions > 0
      ? Math.round((result.score / result.total_questions) * 100)
      : 0;

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/exercises/${resolvedParams.id}`}
              className="inline-flex items-center text-primary hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Link>
            <h1 className="text-3xl font-bold text-foreground mb-2 poppins-bold">
              Xem lại bài kiểm tra
            </h1>
            <p className="text-muted-foreground arimo-regular">
              {result.assessment_title || "Bài kiểm tra"}
            </p>
          </div>

          {/* Summary Card */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2 poppins-bold">
                    {result.score.toFixed(1)}/{result.total_questions}
                  </div>
                  <div className="text-muted-foreground arimo-regular">
                    Điểm số
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[hsl(var(--success))] dark:text-green-400 mb-2 poppins-bold">
                    {result.correct_answers}/{result.total_questions}
                  </div>
                  <div className="text-muted-foreground arimo-regular">
                    Câu đúng
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[hsl(var(--info))] dark:text-blue-400 mb-2 poppins-bold">
                    {scorePercentage}%
                  </div>
                  <div className="text-muted-foreground arimo-regular">
                    Tỷ lệ đúng
                  </div>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-muted-foreground arimo-regular">
                  <Clock className="w-4 h-4" />
                  <span>
                    Thời gian: {Math.round(result.time_taken / 60)} phút
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground arimo-regular">
                  <span>Lần làm: {result.attempt_number}</span>
                </div>
                <Button
                  onClick={() => handleExport("csv")}
                  variant="default"
                  size="default"
                >
                  <Download className="w-4 h-4" />
                  Tải CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rating Section */}
          {result.assessment_id && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground poppins-bold">
                  Đánh giá bài kiểm tra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Rating
                    value={userRating ?? undefined}
                    defaultValue={userRating ?? 0}
                    onValueChange={(value) => {
                      if (!submittingRating) {
                        handleRatingSubmit(value);
                      }
                    }}
                    readOnly={submittingRating}
                    className="gap-1"
                  >
                    {Array.from({ length: 5 }).map((_, index) => (
                      <RatingButton
                        key={index}
                        size={24}
                        className={cn(
                          "text-yellow-500 dark:text-yellow-400",
                          !userRating &&
                            "text-muted-foreground hover:text-yellow-500 dark:hover:text-yellow-400"
                        )}
                      />
                    ))}
                  </Rating>
                  {userRating && (
                    <span className="text-muted-foreground arimo-regular">
                      Bạn đã đánh giá {userRating}/5 sao
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions Review */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground poppins-bold">
              Chi tiết câu hỏi
            </h2>
            {answers.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4 dark:bg-transparent dark:border dark:border-white/40">
                      <Star className="w-8 h-8 text-muted-foreground dark:text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Chưa có chi tiết câu hỏi
                    </h3>
                    <p className="text-muted-foreground">
                      Chi tiết câu hỏi và lời giải sẽ được hiển thị sau khi hoàn
                      thành bài kiểm tra.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              answers.map((answer, index) => {
                const isCorrect = answer.is_correct ?? false;
                const showCorrectAnswer = canShowResults;
                const showExplanation =
                  canShowExplanations && answer.explanation;

                return (
                  <Card
                    key={index}
                    className={cn(
                      "border-l-4",
                      isCorrect
                        ? "border-[hsl(var(--success))] dark:border-green-400"
                        : "border-destructive dark:border-red-400"
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-foreground poppins-bold">
                            Câu {index + 1}
                          </span>
                          {isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))] dark:text-green-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-destructive dark:text-red-400" />
                          )}
                        </div>
                        {answer.points_earned !== undefined && (
                          <Badge variant="outline" className="text-sm">
                            {answer.points_earned}/{answer.points || 1} điểm
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-foreground text-base arimo-regular">
                          {answer.question_text || "Câu hỏi"}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <div>
                          <span className="font-semibold text-foreground poppins-semibold">
                            Đáp án của bạn:{" "}
                          </span>
                          <span
                            className={cn(
                              isCorrect
                                ? "text-[hsl(var(--success))] dark:text-green-400"
                                : "text-destructive dark:text-red-400"
                            )}
                          >
                            {answer.user_answer || "Chưa trả lời"}
                          </span>
                        </div>

                        {showCorrectAnswer && (
                          <div>
                            <span className="font-semibold text-foreground poppins-semibold">
                              Đáp án đúng:{" "}
                            </span>
                            <span className="text-[hsl(var(--success))] dark:text-green-400">
                              {answer.correct_answer || "N/A"}
                            </span>
                          </div>
                        )}

                        {showExplanation && (
                          <div
                            className={cn(
                              "mt-3 p-4 rounded-lg border",
                              isDarkMode
                                ? "bg-[hsl(var(--info))]/10 border-[hsl(var(--info))]/30"
                                : "bg-blue-50 border-blue-200"
                            )}
                          >
                            <span
                              className={cn(
                                "font-semibold poppins-semibold",
                                isDarkMode ? "text-blue-200" : "text-blue-900"
                              )}
                            >
                              Giải thích:{" "}
                            </span>
                            <span
                              className={cn(
                                "arimo-regular",
                                isDarkMode ? "text-blue-100" : "text-blue-800"
                              )}
                            >
                              {answer.explanation}
                            </span>
                          </div>
                        )}

                        {!canShowResults && (
                          <div className="mt-2 text-sm text-muted-foreground arimo-regular italic">
                            Kết quả đúng sẽ được hiển thị sau khi giảng viên
                            chấm bài
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
