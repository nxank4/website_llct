"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface ResultData {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTaken: string;
  date: string;
  assessmentId?: string | null;
  assessmentTitle?: string;
}

export default function TestResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const [resultData, setResultData] = useState<ResultData | null>(null);

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

  // Load result data from URL params or localStorage
  useEffect(() => {
    const score = searchParams.get("score");
    const correctAnswers = searchParams.get("correctAnswers");
    const totalQuestions = searchParams.get("totalQuestions");
    const timeTaken = searchParams.get("timeTaken");
    const assessmentId = searchParams.get("assessmentId");

    if (score && correctAnswers && totalQuestions) {
      // From URL params (just submitted)
      const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
      };

      setResultData({
        score: parseFloat(score),
        correctAnswers: parseInt(correctAnswers, 10),
        totalQuestions: parseInt(totalQuestions, 10),
        timeTaken: timeTaken ? formatTime(parseInt(timeTaken, 10)) : "00:00:00",
        date: new Date().toLocaleDateString("vi-VN"),
        assessmentId: assessmentId || null,
      });
    } else {
      // Try to load from localStorage
      const existingResults = JSON.parse(
        localStorage.getItem("assessment_results") || "[]"
      );
      const latestResult = existingResults[existingResults.length - 1];
      if (latestResult) {
        const formatTime = (seconds: number) => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        };

        setResultData({
          score:
            typeof latestResult.score === "number" ? latestResult.score : 0,
          correctAnswers:
            typeof latestResult.correct_answers === "number"
              ? latestResult.correct_answers
              : 0,
          totalQuestions:
            typeof latestResult.total_questions === "number"
              ? latestResult.total_questions
              : 0,
          timeTaken:
            typeof latestResult.time_taken === "number"
              ? formatTime(latestResult.time_taken)
              : "00:00:00",
          date: latestResult.completed_at
            ? new Date(String(latestResult.completed_at)).toLocaleDateString(
                "vi-VN"
              )
            : new Date().toLocaleDateString("vi-VN"),
          assessmentId: latestResult.assessment_id
            ? String(latestResult.assessment_id)
            : null,
          assessmentTitle: latestResult.assessment_title
            ? String(latestResult.assessment_title)
            : undefined,
        });
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-teal-600 py-20 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute top-32 right-20 w-12 h-12 bg-teal-300 bg-opacity-20 rounded-lg rotate-45"></div>
        <div className="absolute top-20 right-16 w-16 h-16 bg-white bg-opacity-10 rounded-lg flex items-center justify-center">
          <div className="w-8 h-8 bg-blue-300 rounded"></div>
        </div>
        <div className="absolute bottom-10 left-1/4 w-4 h-4 bg-teal-400 rounded-full"></div>
        <div className="absolute bottom-20 right-1/3 w-4 h-4 bg-purple-400 rounded-full"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-teal-400 mb-6">
            Kết quả kiểm tra
          </h1>
          <p className="text-xl text-white max-w-3xl mx-auto leading-relaxed">
            {currentSubject.name} - {currentSubject.code}
          </p>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">KẾT QUẢ</h2>
            <p className="text-lg text-gray-600">Kiểm tra theo bài</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {resultData ? (
              <div className="bg-gray-50 rounded-lg p-8 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-6">
                  <h3 className="text-2xl font-bold text-blue-800">
                    {resultData.assessmentTitle || "Bài kiểm tra"}
                  </h3>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      resultData.score >= 80
                        ? "bg-green-100 text-green-800"
                        : resultData.score >= 60
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {resultData.score >= 80
                      ? "Xuất sắc"
                      : resultData.score >= 60
                      ? "Đạt"
                      : "Chưa đạt"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">
                        Điểm số:
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          resultData.score >= 80
                            ? "text-green-600"
                            : resultData.score >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {resultData.score.toFixed(1)}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">
                        Số câu đúng:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {resultData.correctAnswers}/{resultData.totalQuestions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">
                        Thời gian làm bài:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {resultData.timeTaken}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">
                        Ngày làm bài:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {resultData.date}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">
                        Tỷ lệ đúng:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {resultData.totalQuestions > 0
                          ? (
                              (resultData.correctAnswers /
                                resultData.totalQuestions) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Tiến độ hoàn thành</span>
                    <span>{resultData.score.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        resultData.score >= 80
                          ? "bg-green-500"
                          : resultData.score >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(resultData.score, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-center space-x-4">
                    <Link
                      href={`/exercises/${resolvedParams.id}`}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Quay lại danh sách
                    </Link>
                    {resultData.assessmentId && (
                      <Link
                        href={`/exercises/${resolvedParams.id}/attempt?assessmentId=${resultData.assessmentId}`}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Làm lại
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 shadow-sm border border-gray-200 text-center">
                <p className="text-gray-600">
                  Không tìm thấy kết quả bài kiểm tra.
                </p>
                <Link
                  href={`/exercises/${resolvedParams.id}`}
                  className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Quay lại danh sách bài kiểm tra
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
