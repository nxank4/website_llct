"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ArrowLeft, Eye } from "lucide-react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { Rating, RatingButton } from "@/components/ui/shadcn-io/rating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/contexts/ToastContext";

interface ResultData {
  id?: number;
  score: number;
  correct_answers: number;
  total_questions: number;
  time_taken: number;
  completed_at?: string;
  attempt_number: number;
  assessment_id?: string | null;
  assessment_title?: string;
  subject_code?: string;
  subject_name?: string;
}

export default function TestResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Type-safe access to user with extended properties
  const user = session?.user as
    | {
        id?: string;
        full_name?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | undefined;
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const [results, setResults] = useState<ResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [ratings, setRatings] = useState<{ [key: string]: number }>({});
  const [submittingRatings, setSubmittingRatings] = useState<{
    [key: string]: boolean;
  }>({});

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

  // Load ratings for assessments
  const loadRatings = useCallback(
    async (assessmentIds: (string | null | undefined)[]) => {
      if (!authFetch) return;
      const ratingsMap: { [key: string]: number } = {};
      for (const assessmentId of assessmentIds) {
        if (!assessmentId) continue;
        try {
          const ratingRes = await authFetch(
            getFullUrl(
              API_ENDPOINTS.ASSESSMENT_RATING_MY(parseInt(assessmentId))
            )
          );
          if (ratingRes.ok) {
            const ratingData = await ratingRes.json();
            if (ratingData && typeof ratingData.rating === "number") {
              ratingsMap[assessmentId] = ratingData.rating;
            }
          }
        } catch (error) {
          console.error(
            `Error loading rating for assessment ${assessmentId}:`,
            error
          );
        }
      }
      setRatings(ratingsMap);
    },
    [authFetch]
  );

  // Load all results for this assessment
  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const assessmentId = searchParams.get("assessmentId");
        const studentId = user?.id?.toString() || "anonymous";

        if (studentId && assessmentId) {
          // Load from API
          const resultsRes = await authFetch(
            getFullUrl(API_ENDPOINTS.STUDENT_RESULTS(studentId)) +
              `?assessment_id=${assessmentId}`
          );
          if (resultsRes.ok) {
            const resultsData = await resultsRes.json();
            const resultsList = Array.isArray(resultsData) ? resultsData : [];
            // Sort by attempt_number descending (newest first)
            resultsList.sort(
              (a: ResultData, b: ResultData) =>
                (b.attempt_number || 0) - (a.attempt_number || 0)
            );
            setResults(resultsList);

            // Load ratings for all unique assessment IDs
            const uniqueAssessmentIds = Array.from(
              new Set(
                resultsList
                  .map((r) => r.assessment_id)
                  .filter((id): id is string => Boolean(id))
              )
            );
            if (uniqueAssessmentIds.length > 0) {
              loadRatings(uniqueAssessmentIds);
            }
          }
        } else {
          // Fallback: try to load from URL params or localStorage
          const score = searchParams.get("score");
          const correctAnswers = searchParams.get("correctAnswers");
          const totalQuestions = searchParams.get("totalQuestions");
          const timeTaken = searchParams.get("timeTaken");

          if (score && correctAnswers && totalQuestions) {
            const result: ResultData = {
              score: parseFloat(score),
              correct_answers: parseInt(correctAnswers, 10),
              total_questions: parseInt(totalQuestions, 10),
              time_taken: timeTaken ? parseInt(timeTaken, 10) : 0,
              completed_at: new Date().toISOString(),
              attempt_number: 1,
              assessment_id: assessmentId || null,
            };
            setResults([result]);
          } else {
            // Try localStorage
            const existingResults = JSON.parse(
              localStorage.getItem("assessment_results") || "[]"
            );
            if (existingResults.length > 0) {
              const formattedResults = existingResults.map(
                (r: unknown, index: number) => ({
                  score:
                    typeof (r as { score?: number }).score === "number"
                      ? (r as { score: number }).score
                      : 0,
                  correct_answers:
                    typeof (r as { correct_answers?: number })
                      .correct_answers === "number"
                      ? (r as { correct_answers: number }).correct_answers
                      : 0,
                  total_questions:
                    typeof (r as { total_questions?: number })
                      .total_questions === "number"
                      ? (r as { total_questions: number }).total_questions
                      : 0,
                  time_taken:
                    typeof (r as { time_taken?: number }).time_taken ===
                    "number"
                      ? (r as { time_taken: number }).time_taken
                      : 0,
                  completed_at:
                    (r as { completed_at?: string }).completed_at ||
                    new Date().toISOString(),
                  attempt_number: index + 1,
                  assessment_id:
                    (r as { assessment_id?: string }).assessment_id || null,
                  assessment_title:
                    (r as { assessment_title?: string }).assessment_title ||
                    undefined,
                })
              );
              setResults(formattedResults);
            }
          }
        }
      } catch (error) {
        console.error("Error loading results:", error);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [searchParams, user, authFetch, loadRatings]);

  const handleRatingSubmit = async (
    assessmentId: string,
    newRating: number
  ) => {
    if (!authFetch || !assessmentId) return;

    try {
      setSubmittingRatings((prev) => ({ ...prev, [assessmentId]: true }));
      const res = await authFetch(
        getFullUrl(API_ENDPOINTS.ASSESSMENT_RATINGS(parseInt(assessmentId))),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: newRating }),
        }
      );

      if (res.ok) {
        setRatings((prev) => ({ ...prev, [assessmentId]: newRating }));
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
      setSubmittingRatings((prev) => ({ ...prev, [assessmentId]: false }));
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString("vi-VN");
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const displayedResults = expanded ? results : results.slice(0, 3);
  const hasMoreResults = results.length > 3;

  if (loading) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <Spinner size="xl" text="Đang tải kết quả..." />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-background" : "bg-white"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "border-b transition-colors",
          isDarkMode ? "bg-card border-border" : "bg-white border-gray-200"
        )}
      >
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 md:py-6 gap-3">
            <Link
              href={`/exercises/${resolvedParams.id}`}
              className="flex items-center"
            >
              <ArrowLeft
                className={cn(
                  "h-6 w-6 md:h-7 md:w-7 transition-colors",
                  isDarkMode
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-gray-600 hover:text-gray-800"
                )}
              />
            </Link>
            <div className="text-center flex-1">
              <h1
                className={cn(
                  "text-2xl md:text-3xl lg:text-4xl font-bold mb-1 poppins-bold",
                  isDarkMode ? "text-foreground" : "text-gray-900"
                )}
              >
                {currentSubject.code}
              </h1>
            </div>
            <div className="w-6 md:w-7"></div>
          </div>
        </div>
      </header>

      {/* Results Section */}
      <section
        className={cn(
          "py-12 md:py-16 transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2
              className={cn(
                "text-3xl md:text-4xl font-bold mb-2 md:mb-4 poppins-bold",
                isDarkMode ? "text-foreground" : "text-gray-900"
              )}
            >
              KẾT QUẢ
            </h2>
            <p
              className={cn(
                "text-lg md:text-xl arimo-regular",
                isDarkMode ? "text-muted-foreground" : "text-gray-600"
              )}
            >
              Kiểm tra theo bài
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            {results.length === 0 ? (
              <div
                className={cn(
                  "rounded-xl p-8 md:p-12 shadow-sm border text-center transition-colors",
                  isDarkMode
                    ? "bg-card border-border"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <p
                  className={cn(
                    "arimo-regular mb-4",
                    isDarkMode ? "text-muted-foreground" : "text-gray-600"
                  )}
                >
                  Chưa có kết quả bài kiểm tra nào.
                </p>
                <Link
                  href={`/exercises/${resolvedParams.id}`}
                  className={cn(
                    "inline-block px-6 py-3 text-primary-foreground rounded-lg transition-colors poppins-semibold",
                    isDarkMode
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)]"
                  )}
                >
                  Quay lại danh sách
                </Link>
              </div>
            ) : (
              displayedResults.map((result, index) => {
                const score = result.score;
                const correctAnswers = result.correct_answers;
                const totalQuestions = result.total_questions;
                const timeTaken = formatTime(result.time_taken);
                const date = formatDate(result.completed_at);
                const attemptNum = result.attempt_number;

                return (
                  <div
                    key={result.id || index}
                    className={cn(
                      "rounded-xl p-6 md:p-8 shadow-md border hover:shadow-lg transition-all",
                      isDarkMode
                        ? "bg-card border-border"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4 md:mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-[hsl(var(--primary))] poppins-bold">
                        Lần {attemptNum}
                      </h3>
                      <span
                        className={cn(
                          "px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium poppins-semibold transition-colors",
                          score >= 80
                            ? isDarkMode
                              ? "bg-green-900/30 text-green-400"
                              : "bg-green-100 text-green-800"
                            : score >= 60
                            ? isDarkMode
                              ? "bg-yellow-900/30 text-yellow-400"
                              : "bg-yellow-100 text-yellow-800"
                            : isDarkMode
                            ? "bg-red-900/30 text-red-400"
                            : "bg-red-100 text-red-800"
                        )}
                      >
                        {score >= 80
                          ? "Xuất sắc"
                          : score >= 60
                          ? "Đạt"
                          : "Chưa đạt"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-6">
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center">
                          <span
                            className={cn(
                              "font-medium arimo-medium",
                              isDarkMode
                                ? "text-muted-foreground"
                                : "text-gray-600"
                            )}
                          >
                            Tổng điểm:
                          </span>
                          <span
                            className={cn(
                              "text-lg md:text-xl font-bold poppins-bold",
                              score >= 80
                                ? isDarkMode
                                  ? "text-green-400"
                                  : "text-green-600"
                                : score >= 60
                                ? isDarkMode
                                  ? "text-yellow-400"
                                  : "text-yellow-600"
                                : isDarkMode
                                ? "text-red-400"
                                : "text-red-600"
                            )}
                          >
                            {score.toFixed(1)}/10
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span
                            className={cn(
                              "font-medium arimo-medium",
                              isDarkMode
                                ? "text-muted-foreground"
                                : "text-gray-600"
                            )}
                          >
                            Số câu đúng:
                          </span>
                          <span
                            className={cn(
                              "text-lg md:text-xl font-bold poppins-bold",
                              isDarkMode ? "text-foreground" : "text-gray-900"
                            )}
                          >
                            {correctAnswers}/{totalQuestions}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center">
                          <span
                            className={cn(
                              "font-medium arimo-medium",
                              isDarkMode
                                ? "text-muted-foreground"
                                : "text-gray-600"
                            )}
                          >
                            Thời gian làm bài:
                          </span>
                          <span
                            className={cn(
                              "text-lg md:text-xl font-bold poppins-bold",
                              isDarkMode ? "text-foreground" : "text-gray-900"
                            )}
                          >
                            {timeTaken}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span
                            className={cn(
                              "font-medium arimo-medium",
                              isDarkMode
                                ? "text-muted-foreground"
                                : "text-gray-600"
                            )}
                          >
                            Ngày làm bài:
                          </span>
                          <span
                            className={cn(
                              "text-lg md:text-xl font-bold poppins-bold",
                              isDarkMode ? "text-foreground" : "text-gray-900"
                            )}
                          >
                            {date}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4 md:mb-6">
                      <div
                        className={cn(
                          "flex justify-between text-sm mb-2 arimo-regular",
                          isDarkMode ? "text-muted-foreground" : "text-gray-600"
                        )}
                      >
                        <span>Tiến độ hoàn thành</span>
                        <span>{score.toFixed(1)}%</span>
                      </div>
                      <div
                        className={cn(
                          "w-full rounded-full h-2 md:h-3",
                          isDarkMode ? "bg-muted" : "bg-gray-200"
                        )}
                      >
                        <div
                          className={cn(
                            "h-2 md:h-3 rounded-full transition-all duration-500",
                            score >= 80
                              ? isDarkMode
                                ? "bg-green-500"
                                : "bg-green-500"
                              : score >= 60
                              ? isDarkMode
                                ? "bg-yellow-500"
                                : "bg-yellow-500"
                              : isDarkMode
                              ? "bg-red-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(score * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Rating Section */}
                    {result.assessment_id && (
                      <Card className="mb-4 md:mb-6">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base md:text-lg font-semibold text-foreground">
                            Đánh giá bài kiểm tra
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-4">
                            <Rating
                              value={
                                result.assessment_id
                                  ? ratings[result.assessment_id] ?? undefined
                                  : undefined
                              }
                              defaultValue={
                                result.assessment_id
                                  ? ratings[result.assessment_id] ?? 0
                                  : 0
                              }
                              onValueChange={(value) => {
                                if (
                                  result.assessment_id &&
                                  !submittingRatings[result.assessment_id]
                                ) {
                                  handleRatingSubmit(
                                    result.assessment_id,
                                    value
                                  );
                                }
                              }}
                              readOnly={
                                result.assessment_id
                                  ? submittingRatings[result.assessment_id] ??
                                    false
                                  : true
                              }
                              className="gap-1"
                            >
                              {Array.from({ length: 5 }).map((_, index) => (
                                <RatingButton
                                  key={index}
                                  size={24}
                                  className={cn(
                                    "text-yellow-500 dark:text-yellow-400",
                                    result.assessment_id &&
                                      !ratings[result.assessment_id] &&
                                      "text-muted-foreground hover:text-yellow-500 dark:hover:text-yellow-400"
                                  )}
                                />
                              ))}
                            </Rating>
                            {result.assessment_id &&
                              ratings[result.assessment_id] && (
                                <span className="text-sm text-muted-foreground arimo-regular">
                                  Bạn đã đánh giá{" "}
                                  {ratings[result.assessment_id]}/5 sao
                                </span>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <div
                      className={cn(
                        "pt-4 border-t flex flex-wrap gap-3 transition-colors",
                        isDarkMode ? "border-border" : "border-gray-200"
                      )}
                    >
                      {result.id && (
                        <Link
                          href={`/exercises/${resolvedParams.id}/review?resultId=${result.id}`}
                          className={cn(
                            "inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 text-primary-foreground rounded-lg transition-colors poppins-semibold text-sm md:text-base",
                            isDarkMode
                              ? "bg-primary hover:bg-primary/90"
                              : "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)]"
                          )}
                        >
                          <Eye className="w-4 h-4" />
                          Xem lại chi tiết
                        </Link>
                      )}
                      {result.assessment_id && (
                        <Link
                          href={`/exercises/${resolvedParams.id}/attempt?assessmentId=${result.assessment_id}`}
                          className={cn(
                            "inline-block px-4 md:px-6 py-2 md:py-3 text-white rounded-lg transition-colors poppins-semibold text-sm md:text-base",
                            isDarkMode
                              ? "bg-[hsl(var(--brand-teal))] hover:bg-[hsl(var(--brand-teal))/0.9]"
                              : "bg-[hsl(var(--brand-teal))] hover:bg-[hsl(var(--brand-teal)/0.85)]"
                          )}
                        >
                          Làm lại
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Expand/Collapse Button */}
            {hasMoreResults && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className={cn(
                    "flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-colors arimo-semibold",
                    isDarkMode
                      ? "bg-muted hover:bg-accent text-foreground hover:text-accent-foreground"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-5 w-5" />
                      <span>Thu gọn</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-5 w-5" />
                      <span>Xem thêm {results.length - 3} bài kiểm tra</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Back Button */}
            {results.length > 0 && (
              <div className="text-center pt-6">
                <Link
                  href={`/exercises/${resolvedParams.id}`}
                  className={cn(
                    "inline-block px-6 py-3 text-primary-foreground rounded-lg transition-colors poppins-semibold",
                    isDarkMode
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)]"
                  )}
                >
                  Quay lại danh sách
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
