"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";

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
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user;
  const authFetch = useAuthFetch();
  const [results, setResults] = useState<ResultData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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
            getFullUrl(API_ENDPOINTS.STUDENT_RESULTS(studentId)) + `?assessment_id=${assessmentId}`
          );
          if (resultsRes.ok) {
            const resultsData = await resultsRes.json();
            const resultsList = Array.isArray(resultsData) ? resultsData : [];
            // Sort by attempt_number descending (newest first)
            resultsList.sort((a: ResultData, b: ResultData) => 
              (b.attempt_number || 0) - (a.attempt_number || 0)
            );
            setResults(resultsList);
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
              const formattedResults = existingResults.map((r: unknown, index: number) => ({
                score: typeof (r as { score?: number }).score === "number" ? (r as { score: number }).score : 0,
                correct_answers: typeof (r as { correct_answers?: number }).correct_answers === "number" ? (r as { correct_answers: number }).correct_answers : 0,
                total_questions: typeof (r as { total_questions?: number }).total_questions === "number" ? (r as { total_questions: number }).total_questions : 0,
                time_taken: typeof (r as { time_taken?: number }).time_taken === "number" ? (r as { time_taken: number }).time_taken : 0,
                completed_at: (r as { completed_at?: string }).completed_at || new Date().toISOString(),
                attempt_number: index + 1,
                assessment_id: (r as { assessment_id?: string }).assessment_id || null,
                assessment_title: (r as { assessment_title?: string }).assessment_title || undefined,
              }));
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
  }, [searchParams, user, authFetch]);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#125093] mx-auto mb-4"></div>
          <p className="text-gray-600 arimo-regular">Đang tải kết quả...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            <Link
              href={`/exercises/${resolvedParams.id}`}
              className="flex items-center"
            >
              <ArrowLeft className="h-6 w-6 md:h-7 md:w-7 text-gray-600 hover:text-gray-800 transition-colors" />
            </Link>
            <div className="text-center flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 poppins-bold">
                {currentSubject.code}
              </h1>
            </div>
            <div className="w-6 md:w-7"></div>
          </div>
        </div>
      </header>

      {/* Results Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4 poppins-bold">KẾT QUẢ</h2>
            <p className="text-lg md:text-xl text-gray-600 arimo-regular">Kiểm tra theo bài</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
            {results.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 md:p-12 shadow-sm border border-gray-200 text-center">
                <p className="text-gray-600 arimo-regular mb-4">
                  Chưa có kết quả bài kiểm tra nào.
                </p>
                <Link
                  href={`/exercises/${resolvedParams.id}`}
                  className="inline-block px-6 py-3 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors poppins-semibold"
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
                    className="bg-gray-50 rounded-xl p-6 md:p-8 shadow-md border border-gray-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4 md:mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-[#125093] poppins-bold">
                        Lần {attemptNum}
                      </h3>
                      <span
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium poppins-semibold ${
                          score >= 80
                            ? "bg-green-100 text-green-800"
                            : score >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {score >= 80
                          ? "Xuất sắc"
                          : score >= 60
                          ? "Đạt"
                          : "Chưa đạt"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium arimo-medium">
                            Tổng điểm:
                          </span>
                          <span
                            className={`text-lg md:text-xl font-bold poppins-bold ${
                              score >= 80
                                ? "text-green-600"
                                : score >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {score.toFixed(1)}/10
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium arimo-medium">
                            Số câu đúng:
                          </span>
                          <span className="text-lg md:text-xl font-bold text-gray-900 poppins-bold">
                            {correctAnswers}/{totalQuestions}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium arimo-medium">
                            Thời gian làm bài:
                          </span>
                          <span className="text-lg md:text-xl font-bold text-gray-900 poppins-bold">
                            {timeTaken}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium arimo-medium">
                            Ngày làm bài:
                          </span>
                          <span className="text-lg md:text-xl font-bold text-gray-900 poppins-bold">
                            {date}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4 md:mb-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2 arimo-regular">
                        <span>Tiến độ hoàn thành</span>
                        <span>{score.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 md:h-3">
                        <div
                          className={`h-2 md:h-3 rounded-full transition-all duration-500 ${
                            score >= 80
                              ? "bg-green-500"
                              : score >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(score * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* View Previous Test Button */}
                    {result.assessment_id && (
                      <div className="pt-4 border-t border-gray-200">
                        <Link
                          href={`/exercises/${resolvedParams.id}/attempt?assessmentId=${result.assessment_id}`}
                          className="inline-block px-4 md:px-6 py-2 md:py-3 bg-[#49BBBD] hover:bg-[#3da8aa] text-white rounded-lg transition-colors poppins-semibold text-sm md:text-base"
                        >
                          Bài kiểm tra trước
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Expand/Collapse Button */}
            {hasMoreResults && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors arimo-semibold"
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
                  className="inline-block px-6 py-3 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors poppins-semibold"
                >
                  Quay lại danh sách
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#125093] text-white mt-12 md:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg poppins-bold">SS</span>
                </div>
                <div className="text-white">
                  <div className="text-lg font-semibold poppins-semibold">
                    Soft Skills Department
                  </div>
                  <div className="text-sm opacity-90 arimo-regular">Trường ĐH FPT</div>
                </div>
              </div>
            </div>

            {/* Center Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white poppins-semibold">
                Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay
              </h3>
              <div className="space-y-2 text-sm text-white/90 arimo-regular">
                <div className="font-semibold text-white poppins-semibold">
                  Văn phòng Bộ môn Kỹ năng mềm
                </div>
                <div>Địa chỉ</div>
                <div>Email: vanbinh@fpt.edu.vn</div>
                <div>Zalo: 090.xxx.xxx</div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white poppins-semibold">
                Thầy Văn Bình
              </h3>
              <div className="space-y-2 text-sm text-white/90 arimo-regular">
                <div>Chức vụ</div>
                <div>Email: vanbinh@fpt.edu.vn</div>
                <div>Zalo: 090.xxx.xxx</div>
              </div>
            </div>
          </div>

          {/* Bottom Line */}
          <div className="border-t border-white/20 mt-8 pt-8 text-center">
            <p className="text-sm text-white/80 arimo-regular">
              Soft Skills Department | Trường Đại học FPT
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
