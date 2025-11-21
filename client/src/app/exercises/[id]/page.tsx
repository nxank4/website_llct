"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Star,
  LayoutGrid,
  List,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import Spinner from "@/components/ui/Spinner";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useAuthFetch } from "@/lib/auth";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface Assessment {
  _id?: string;
  id?: number;
  title?: string;
  questions?: unknown[];
  questions_count?: number;
  time_limit_minutes?: number;
  max_attempts?: number;
  subject_code?: string;
  subject_name?: string;
  assessment_type?: string;
  description?: string;
  rating?: number;
  rating_count?: number;
  [key: string]: unknown;
}

export default function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const subjectId = resolvedParams.id as string;
  const authFetch = useAuthFetch();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";

  const heroSectionClass = useMemo(
    () =>
      cn(
        "relative overflow-hidden py-12 xl:py-20 px-4",
        isDarkMode
          ? "bg-gradient-to-b from-background via-background to-background text-foreground"
          : "bg-gradient-to-b from-[var(--brand-primary,hsl(var(--primary)))] via-[var(--brand-primary-dark,hsl(var(--primary)/0.85))] to-[#0a2d5a] text-primary-foreground"
      ),
    [isDarkMode]
  );

  const heroDescriptionClass = useMemo(
    () =>
      cn(
        "text-base xl:text-xl mb-8 xl:mb-12 max-w-2xl mx-auto leading-relaxed arimo-regular",
        isDarkMode ? "text-foreground/80" : "text-white/90"
      ),
    [isDarkMode]
  );

  // Note: Subject details fetching removed for performance optimization
  // Backend doesn't have a single-subject endpoint, and fetching all subjects
  // just to find one is inefficient. If subject name/color is needed in the future,
  // consider adding a backend endpoint like GET /api/v1/library/public/subjects/{code}

  // Load published assessments for this subject
  // Optimized: Uses subjectId directly from params, no need to wait for subject details
  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        setLoading(true);
        setError(null);
        const subjectCode = subjectId.toUpperCase(); // Use subjectId directly from params

        // Try to fetch with auth first, fallback to direct fetch if auth is not available
        let res: Response;
        try {
          res = await authFetch(
            `${getFullUrl(
              API_ENDPOINTS.ASSESSMENTS
            )}?subject_code=${subjectCode}&published_only=true`
          );
        } catch (authError) {
          // If auth fails, try direct fetch (endpoint might allow public access for published assessments)
          console.warn("Auth fetch failed, trying direct fetch:", authError);
          res = await fetch(
            `${getFullUrl(
              API_ENDPOINTS.ASSESSMENTS
            )}?subject_code=${subjectCode}&published_only=true`
          );
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch assessments: ${res.status}`);
        }

        const data = await res.json();
        const assessmentsList = Array.isArray(data)
          ? (data as Assessment[])
          : [];
        setAssessments(assessmentsList);
      } catch (e) {
        console.error("Failed to load assessments", e);
        setError(
          "Đã xảy ra lỗi khi tải danh sách bài kiểm tra. Vui lòng thử lại."
        );
        setAssessments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessments();
  }, [subjectId, authFetch]);

  // Pagination for assessments
  const totalPages = Math.ceil(assessments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssessments = assessments.slice(startIndex, endIndex);

  // Reset to page 1 when assessments change
  useEffect(() => {
    setCurrentPage(1);
  }, [assessments.length]);

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-background text-foreground">
        {/* Hero Section */}
        <div className={heroSectionClass}>
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 opacity-20 hidden lg:block">
            <ClipboardCheck className="w-12 xl:w-16 h-12 xl:h-16 text-[hsl(var(--secondary))]" />
          </div>
          <div className="absolute top-20 right-20 opacity-20 hidden lg:block">
            <div
              className={cn(
                "w-12 xl:w-16 h-12 xl:h-16 rounded-lg flex items-center justify-center",
                isDarkMode
                  ? "bg-card/80 border border-border/60"
                  : "bg-white/80"
              )}
            >
              <div className="grid grid-cols-2 gap-1">
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[hsl(var(--secondary))] rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[hsl(var(--secondary))] rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[hsl(var(--secondary))] rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[hsl(var(--secondary))] rounded"></div>
              </div>
            </div>
          </div>

          {/* Floating Dots */}
          <div className="absolute top-32 left-1/4 w-2 xl:w-3 h-2 xl:h-3 bg-[hsl(var(--secondary))] rounded-full opacity-60 hidden md:block"></div>
          <div className="absolute top-40 right-1/3 w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[hsl(var(--accent))] rounded-full opacity-60 hidden md:block"></div>
          <div className="absolute top-16 right-1/4 w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[#8C7AFF] rounded-full opacity-60 hidden md:block"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-3xl xl:text-5xl font-bold mb-4 xl:mb-6 leading-tight poppins-bold">
              Kiểm tra
            </h1>
            <p className={heroDescriptionClass}>
              Kiểm tra và củng cố kiến thức để chuẩn bị cho những bài test sắp
              tới của bộ môn Kỹ năng mềm tại trường ĐH FPT
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 py-12 md:py-16 bg-background">
          <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-12 md:gap-16 lg:gap-20">
              {/* Quick Test Section */}
              <div className="w-full max-w-4xl flex flex-col items-center gap-6 md:gap-8">
                <div className="w-full max-w-2xl flex flex-col items-center gap-4 md:gap-6">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight poppins-bold text-center">
                    Kiểm tra nhanh
                  </h2>
                  <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed text-center arimo-regular max-w-xl">
                    Làm một bài kiểm tra tổng hợp gồm 60 câu được chọn random từ
                    toàn bộ bộ đề
                  </p>
                </div>
                <Link
                  href={`/exercises/${subjectId}/quick-test`}
                  className="w-full max-w-xs px-6 py-4 rounded-full text-lg md:text-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 poppins-semibold text-center bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Kiểm tra ngay
                </Link>
              </div>

              {/* Tests by Lesson Section */}
              <div className="w-full flex flex-col items-center gap-8 md:gap-12">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight poppins-bold text-center">
                  Kiểm tra theo bài học
                </h2>

                <div className="w-full max-w-7.5xl flex flex-col gap-8 md:gap-12 lg:gap-16">
                  {/* Assessments */}
                  <div className="w-full flex flex-col gap-8 md:gap-12">
                    {/* Header with View Mode Toggle */}
                    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground leading-tight poppins-bold">
                        Bài kiểm tra
                      </h3>
                      <div className="flex items-center gap-2 bg-muted/60 border border-border/60 rounded-lg p-1">
                        <button
                          onClick={() => setViewMode("grid")}
                          className={cn(
                            "p-2 rounded-md transition-all duration-200",
                            viewMode === "grid"
                              ? "bg-background text-primary shadow-sm border border-border"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Xem dạng lưới"
                        >
                          <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setViewMode("compact")}
                          className={cn(
                            "p-2 rounded-md transition-all duration-200",
                            viewMode === "compact"
                              ? "bg-background text-primary shadow-sm border border-border"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Xem dạng danh sách"
                        >
                          <List className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-12 w-full">
                        <Spinner size="xl" />
                        <p className="mt-4 text-muted-foreground arimo-regular">
                          Đang tải bài kiểm tra...
                        </p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12 w-full text-destructive">
                        <AlertCircle className="w-16 h-16 text-destructive/80 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-destructive mb-2 poppins-semibold">
                          Không thể tải
                        </h3>
                        <p className="arimo-regular">{error}</p>
                      </div>
                    ) : assessments.length === 0 ? (
                      <div className="text-center py-12 w-full">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-foreground mb-2 poppins-semibold">
                          Chưa có bài kiểm tra
                        </h3>
                        <p className="text-muted-foreground arimo-regular">
                          Môn học này chưa có bài kiểm tra nào được đăng.
                        </p>
                      </div>
                    ) : viewMode === "grid" ? (
                      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        {paginatedAssessments.map((assessment, index) => {
                          const assessmentId = String(
                            assessment._id ?? assessment.id ?? index
                          );
                          const questionsCount =
                            typeof assessment.questions_count === "number"
                              ? assessment.questions_count
                              : Array.isArray(assessment.questions)
                              ? assessment.questions.length
                              : 0;
                          return (
                            <Link
                              key={assessmentId}
                              href={`/exercises/${subjectId}/attempt?assessmentId=${assessmentId}`}
                              className="group flex flex-col"
                            >
                              {/* Card with Icon */}
                              <div className="w-full bg-card text-card-foreground shadow-lg rounded-2xl flex flex-col gap-4 md:gap-5 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-border/70 hover:border-primary relative overflow-hidden group/card">
                                {/* Icon - positioned absolutely at top */}
                                <div className="absolute top-4 left-6 md:left-8 z-30">
                                  <div className="p-3 md:p-4 bg-gradient-to-br from-[hsl(var(--accent))] to-[hsl(var(--primary))] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:from-[hsl(var(--primary))] group-hover:to-[hsl(var(--primary)/0.85)]">
                                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                  </div>
                                </div>
                                {/* Subtle background pattern */}
                                <div
                                  className="absolute inset-0 opacity-[0.015] group-hover/card:opacity-[0.03] transition-opacity duration-300 rounded-2xl"
                                  style={{
                                    backgroundImage: `radial-gradient(circle at 2px 2px, var(--brand-primary,hsl(var(--primary))) 1px, transparent 0)`,
                                    backgroundSize: "32px 32px",
                                  }}
                                ></div>

                                {/* Content - with top padding for icon */}
                                <div className="w-full pt-20 md:pt-24 pb-6 md:pb-8 px-6 md:px-8 lg:px-10 flex flex-col gap-3 md:gap-4 relative z-10">
                                  <h4 className="w-full text-xl md:text-2xl font-bold leading-tight poppins-bold line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-300">
                                    {String(assessment.title ?? "")}
                                  </h4>
                                  {assessment.description && (
                                    <p className="w-full text-muted-foreground text-sm md:text-base leading-relaxed arimo-regular line-clamp-2">
                                      {String(assessment.description)}
                                    </p>
                                  )}

                                  {/* Rating */}
                                  {(assessment.rating ||
                                    assessment.rating_count) && (
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                        <span className="text-sm md:text-base font-semibold poppins-semibold text-foreground">
                                          {typeof assessment.rating === "number"
                                            ? assessment.rating.toFixed(1)
                                            : "0.0"}
                                        </span>
                                      </div>
                                      {typeof assessment.rating_count ===
                                        "number" &&
                                        assessment.rating_count > 0 && (
                                          <span className="text-muted-foreground text-xs md:text-sm arimo-regular">
                                            ({assessment.rating_count} đánh giá)
                                          </span>
                                        )}
                                    </div>
                                  )}

                                  {/* Stats */}
                                  <div className="w-full flex flex-wrap items-center gap-3 md:gap-4 pt-3 border-t border-border relative z-10">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm md:text-base arimo-regular">
                                      <FileText className="w-4 h-4" />
                                      <span>{questionsCount} câu</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm md:text-base arimo-regular">
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {typeof assessment.time_limit_minutes ===
                                          "number" &&
                                        assessment.time_limit_minutes > 0
                                          ? assessment.time_limit_minutes
                                          : "∞"}{" "}
                                        phút
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm md:text-base arimo-regular">
                                      <Users className="w-4 h-4" />
                                      <span>
                                        {typeof assessment.max_attempts ===
                                          "number" &&
                                        assessment.max_attempts > 0
                                          ? assessment.max_attempts
                                          : "∞"}{" "}
                                        lần
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Button removed - entire card is clickable via Link */}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="w-full flex flex-col gap-4">
                        {paginatedAssessments.map((assessment, index) => {
                          const assessmentId = String(
                            assessment._id ?? assessment.id ?? index
                          );
                          const questionsCount =
                            typeof assessment.questions_count === "number"
                              ? assessment.questions_count
                              : Array.isArray(assessment.questions)
                              ? assessment.questions.length
                              : 0;
                          return (
                            <Link
                              key={assessmentId}
                              href={`/exercises/${subjectId}/attempt?assessmentId=${assessmentId}`}
                              className="group w-full bg-card text-card-foreground rounded-2xl shadow-md hover:shadow-xl border border-border/70 hover:border-primary transition-all duration-300 overflow-hidden hover:-translate-y-1"
                            >
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 md:p-6">
                                {/* Icon */}
                                <div className="flex-shrink-0">
                                  <div className="p-3 bg-gradient-to-br from-[hsl(var(--accent))] to-[var(--brand-primary,hsl(var(--primary)))] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:from-[var(--brand-primary,hsl(var(--primary)))] group-hover:to-[var(--brand-primary-dark,hsl(var(--primary)/0.85))]">
                                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col gap-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <h4 className="text-lg md:text-xl font-bold text-foreground leading-tight poppins-bold line-clamp-1">
                                      {String(assessment.title ?? "")}
                                    </h4>
                                    {(assessment.rating ||
                                      assessment.rating_count) && (
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <div className="flex items-center gap-1">
                                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                          <span className="text-sm font-semibold poppins-semibold text-foreground">
                                            {typeof assessment.rating ===
                                            "number"
                                              ? assessment.rating.toFixed(1)
                                              : "0.0"}
                                          </span>
                                        </div>
                                        {typeof assessment.rating_count ===
                                          "number" &&
                                          assessment.rating_count > 0 && (
                                            <span className="text-muted-foreground text-xs arimo-regular">
                                              ({assessment.rating_count})
                                            </span>
                                          )}
                                      </div>
                                    )}
                                  </div>

                                  {assessment.description && (
                                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed arimo-regular line-clamp-2">
                                      {String(assessment.description)}
                                    </p>
                                  )}

                                  {/* Stats */}
                                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/70">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm arimo-regular">
                                      <FileText className="w-4 h-4" />
                                      <span>{questionsCount} câu</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm arimo-regular">
                                      <Clock className="w-4 h-4" />
                                      <span>
                                        {typeof assessment.time_limit_minutes ===
                                          "number" &&
                                        assessment.time_limit_minutes > 0
                                          ? assessment.time_limit_minutes
                                          : "∞"}{" "}
                                        phút
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm arimo-regular">
                                      <Users className="w-4 h-4" />
                                      <span>
                                        {typeof assessment.max_attempts ===
                                          "number" &&
                                        assessment.max_attempts > 0
                                          ? assessment.max_attempts
                                          : "∞"}{" "}
                                        lần
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Button removed - entire card is clickable via Link */}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Pagination - only show if more than 6 items */}
                    {assessments.length > itemsPerPage && (
                      <div className="w-full flex items-center justify-center gap-2 mt-8">
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Trang trước"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              currentPage === page
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Trang sau"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
