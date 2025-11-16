"use client";

import React from "react";
import { useAuthFetch } from "@/lib/auth";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { RefreshCw, TrendingDown, Star, BarChart3, ChevronRight, ChevronDown, Eye } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";

interface DashboardAnalytics {
  score_distribution: Array<{ range: string; count: number }>;
  average_ratings: Array<{
    assessment_id: string;
    assessment_title: string;
    average_rating: number;
    rating_count: number;
  }>;
  low_performing_assessments: Array<{
    assessment_id: string;
    assessment_title: string;
    average_score: number;
    attempt_count: number;
  }>;
  low_rated_assessments: Array<{
    assessment_id: string;
    assessment_title: string;
    average_rating: number;
    rating_count: number;
  }>;
  hierarchical_data: Array<{
    subject_code: string;
    subject_name: string;
    average_score: number;
    attempt_count: number;
    chapters: Array<{
      chapter_number: number | null;
      chapter_title: string;
      average_score: number;
      attempt_count: number;
      assessments: Array<{
        assessment_id: string;
        assessment_title: string;
        average_score: number;
        attempt_count: number;
        average_rating: number;
        rating_count: number;
      }>;
    }>;
  }>;
  most_viewed_resources: Array<{
    document_id: string;
    document_title: string;
    view_count: number;
    subject_name: string;
  }>;
  highest_rated_resources: Array<{
    document_id: string;
    document_title: string;
    average_rating: number;
    rating_count: number;
    subject_name: string;
  }>;
  lowest_rated_resources: Array<{
    document_id: string;
    document_title: string;
    average_rating: number;
    rating_count: number;
    subject_name: string;
  }>;
}

export default function AssessmentAnalyticsPage() {
  const authFetch = useAuthFetch();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const fetchAnalytics = useCallback(async () => {
    if (!authFetch) return;
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.ASSESSMENT_ANALYTICS_DASHBOARD)
      );
      if (!response.ok) {
        throw new Error("Không thể tải dữ liệu phân tích");
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(
        err instanceof Error ? err.message : "Không thể tải dữ liệu phân tích"
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const toggleSubject = (subjectCode: string) => {
    setExpandedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectCode)) {
        newSet.delete(subjectCode);
      } else {
        newSet.add(subjectCode);
      }
      return newSet;
    });
  };

  const toggleChapter = (chapterKey: string) => {
    setExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterKey)) {
        newSet.delete(chapterKey);
      } else {
        newSet.add(chapterKey);
      }
      return newSet;
    });
  };

  const scoreColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

  if (loading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <Spinner size="xl" text="Đang tải dữ liệu phân tích..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800">{error}</p>
          <Button
            onClick={fetchAnalytics}
            className="mt-4"
            variant="default"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Phân tích Bài kiểm tra
            </h1>
            <p className="text-gray-600 text-base">
              Theo dõi hiệu suất và đánh giá của sinh viên
            </p>
          </div>
          <Button
            onClick={fetchAnalytics}
            disabled={loading}
            variant="default"
            size="default"
            className="bg-[#125093] hover:bg-[#0f4278] text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Cập nhật</span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Visualization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution Histogram */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Phân phối Điểm số
              </CardTitle>
              <p className="text-sm text-gray-500">
                Phân phối điểm số trên tổng số bài kiểm tra đã hoàn thành
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.score_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {analytics.score_distribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={scoreColors[index % scoreColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Average Rating Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Rating Trung bình
              </CardTitle>
              <p className="text-sm text-gray-500">
                Điểm rating trung bình (1-5 sao) của từng bài kiểm tra
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {analytics.average_ratings.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.average_ratings.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 100, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        domain={[0, 5]}
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                      />
                      <YAxis
                        type="category"
                        dataKey="assessment_title"
                        width={90}
                        tick={{ fontSize: 11 }}
                        stroke="#9ca3af"
                      />
                      <Tooltip />
                      <Bar dataKey="average_rating" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-20">
                  Chưa có dữ liệu rating
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actionable Insights Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Performing Assessments */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <TrendingDown className="w-5 h-5" />
                Cần Cải Thiện
              </CardTitle>
              <p className="text-sm text-gray-500">
                5 bài kiểm tra có điểm trung bình thấp nhất
              </p>
            </CardHeader>
            <CardContent>
              {analytics.low_performing_assessments.length > 0 ? (
                <div className="space-y-3">
                  {analytics.low_performing_assessments.map((assessment, index) => (
                    <div
                      key={assessment.assessment_id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. {assessment.assessment_title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assessment.attempt_count} lượt làm bài
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">
                          {assessment.average_score.toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-500">/ 10</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Rated Assessments */}
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <Star className="w-5 h-5" />
                Đánh giá Thấp
              </CardTitle>
              <p className="text-sm text-gray-500">
                5 bài kiểm tra có rating trung bình thấp nhất
              </p>
            </CardHeader>
            <CardContent>
              {analytics.low_rated_assessments.length > 0 ? (
                <div className="space-y-3">
                  {analytics.low_rated_assessments.map((assessment, index) => (
                    <div
                      key={assessment.assessment_id}
                      className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. {assessment.assessment_title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {assessment.rating_count} đánh giá
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <p className="text-2xl font-bold text-yellow-600">
                            {assessment.average_rating.toFixed(1)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">/ 5.0</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Library Resources Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Most Viewed Resources */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Eye className="w-5 h-5" />
                Tài nguyên được xem nhiều nhất
              </CardTitle>
              <p className="text-sm text-gray-500">
                5 tài nguyên có lượt xem cao nhất
              </p>
            </CardHeader>
            <CardContent>
              {analytics.most_viewed_resources.length > 0 ? (
                <div className="space-y-3">
                  {analytics.most_viewed_resources.map((resource, index) => (
                    <div
                      key={resource.document_id}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. {resource.document_title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {resource.subject_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {resource.view_count}
                        </p>
                        <p className="text-xs text-gray-500">lượt xem</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Highest Rated Resources */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <Star className="w-5 h-5" />
                Tài nguyên được đánh giá cao nhất
              </CardTitle>
              <p className="text-sm text-gray-500">
                5 tài nguyên có rating trung bình cao nhất
              </p>
            </CardHeader>
            <CardContent>
              {analytics.highest_rated_resources.length > 0 ? (
                <div className="space-y-3">
                  {analytics.highest_rated_resources.map((resource, index) => (
                    <div
                      key={resource.document_id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. {resource.document_title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {resource.subject_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <p className="text-2xl font-bold text-green-600">
                            {resource.average_rating.toFixed(1)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          ({resource.rating_count} đánh giá)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lowest Rated Resources */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Star className="w-5 h-5" />
                Tài nguyên được đánh giá thấp nhất
              </CardTitle>
              <p className="text-sm text-gray-500">
                5 tài nguyên có rating trung bình thấp nhất
              </p>
            </CardHeader>
            <CardContent>
              {analytics.lowest_rated_resources.length > 0 ? (
                <div className="space-y-3">
                  {analytics.lowest_rated_resources.map((resource, index) => (
                    <div
                      key={resource.document_id}
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {index + 1}. {resource.document_title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {resource.subject_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <p className="text-2xl font-bold text-orange-600">
                            {resource.average_rating.toFixed(1)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          ({resource.rating_count} đánh giá)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  Chưa có dữ liệu
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hierarchical Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bảng Phân cấp Điểm số</CardTitle>
            <p className="text-sm text-gray-500">
              Dữ liệu điểm số tổng hợp theo cấu trúc phân cấp: Môn học → Chương → Bài kiểm tra
            </p>
          </CardHeader>
          <CardContent>
            {analytics.hierarchical_data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Môn học / Chương / Bài kiểm tra
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Điểm trung bình
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Số lượt làm bài
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Rating trung bình
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.hierarchical_data.map((subject) => {
                      const isSubjectExpanded = expandedSubjects.has(subject.subject_code);
                      return (
                        <React.Fragment key={subject.subject_code}>
                          {/* Subject Row */}
                          <tr className="border-b border-gray-100 bg-blue-50 hover:bg-blue-100">
                            <td className="py-3 px-4">
                              <button
                                onClick={() => toggleSubject(subject.subject_code)}
                                className="flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-900"
                              >
                                {isSubjectExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                📚 {subject.subject_name} ({subject.subject_code})
                              </button>
                            </td>
                            <td className="text-center py-3 px-4 font-semibold text-blue-700">
                              {subject.average_score.toFixed(2)}
                            </td>
                            <td className="text-center py-3 px-4 text-gray-600">
                              {subject.attempt_count}
                            </td>
                            <td className="text-center py-3 px-4 text-gray-500">-</td>
                          </tr>

                          {/* Chapter Rows */}
                          {isSubjectExpanded &&
                            subject.chapters.map((chapter, chapterIndex) => {
                              const chapterKey = `${subject.subject_code}_${chapterIndex}`;
                              const isChapterExpanded = expandedChapters.has(chapterKey);
                              return (
                                <React.Fragment key={chapterKey}>
                                  <tr className="border-b border-gray-50 bg-gray-50 hover:bg-gray-100">
                                    <td className="py-2 px-4 pl-8">
                                      <button
                                        onClick={() => toggleChapter(chapterKey)}
                                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                                      >
                                        {isChapterExpanded ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                        📖 {chapter.chapter_title ||
                                          `Chương ${chapter.chapter_number || "N/A"}`}
                                      </button>
                                    </td>
                                    <td className="text-center py-2 px-4 text-gray-700">
                                      {chapter.average_score.toFixed(2)}
                                    </td>
                                    <td className="text-center py-2 px-4 text-gray-600">
                                      {chapter.attempt_count}
                                    </td>
                                    <td className="text-center py-2 px-4 text-gray-500">-</td>
                                  </tr>

                                  {/* Assessment Rows */}
                                  {isChapterExpanded &&
                                    chapter.assessments.map((assessment) => (
                                      <tr
                                        key={assessment.assessment_id}
                                        className="border-b border-gray-50 hover:bg-gray-50"
                                      >
                                        <td className="py-2 px-4 pl-16 text-sm text-gray-600">
                                          📝 {assessment.assessment_title}
                                        </td>
                                        <td className="text-center py-2 px-4 text-gray-700">
                                          {assessment.average_score.toFixed(2)}
                                        </td>
                                        <td className="text-center py-2 px-4 text-gray-600">
                                          {assessment.attempt_count}
                                        </td>
                                        <td className="text-center py-2 px-4">
                                          {assessment.rating_count > 0 ? (
                                            <div className="flex items-center justify-center gap-1">
                                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                              <span className="text-gray-700">
                                                {assessment.average_rating.toFixed(1)}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                ({assessment.rating_count})
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                </React.Fragment>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-12">
                Chưa có dữ liệu phân cấp
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

