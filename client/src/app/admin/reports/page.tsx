"use client";

import React from "react";
import { useAuthFetch } from "@/lib/auth";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import {
  RefreshCw,
  TrendingDown,
  Star,
  BarChart3,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
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

export default function AdminReportsPage() {
  const authFetch = useAuthFetch();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set()
  );
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );

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

  const scoreColors = [
    "hsl(var(--destructive))",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-background text-foreground">
        <Spinner size="xl" text="Đang tải dữ liệu phân tích..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchAnalytics} className="mt-4" variant="default">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <p className="text-primary">
            Không có dữ liệu phân tích nào để hiển thị.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 poppins-bold">
              Báo cáo đánh giá
            </h1>
            <p className="text-muted-foreground text-base">
              Tổng quan về hiệu suất bài kiểm tra và đánh giá của sinh viên
            </p>
          </div>
          <Button
            onClick={fetchAnalytics}
            disabled={loading}
            variant="default"
            size="default"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
              <p className="text-sm text-muted-foreground">
                Phân phối điểm số trên tổng số bài kiểm tra đã hoàn thành
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-72 min-h-[288px] w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                  <BarChart data={analytics.score_distribution}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
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
              <p className="text-sm text-muted-foreground">
                Điểm rating trung bình (1-5 sao) của từng bài kiểm tra
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              {analytics.average_ratings.length > 0 ? (
                <div className="h-72 min-h-[288px] w-full">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minHeight={288}
                  >
                    <BarChart
                      data={analytics.average_ratings.slice(0, 10)}
                      layout="vertical"
                      margin={{ left: 100, right: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        domain={[0, 5]}
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        type="category"
                        dataKey="assessment_title"
                        width={90}
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip />
                      <Bar
                        dataKey="average_rating"
                        fill="hsl(var(--warning))"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-20">
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
              <p className="text-sm text-muted-foreground">
                5 bài kiểm tra có điểm trung bình thấp nhất
              </p>
            </CardHeader>
            <CardContent>
              {analytics.low_performing_assessments.length > 0 ? (
                <ul className="space-y-2">
                  {analytics.low_performing_assessments.map((item) => (
                    <li
                      key={item.assessment_id}
                      className="flex items-center justify-between text-sm text-foreground bg-muted/70 p-3 rounded-md border border-border"
                    >
                      <span>{item.assessment_title}</span>
                      <span className="font-medium text-red-500">
                        {item.average_score} / 100 (Lượt làm:{" "}
                        {item.attempt_count})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Không có bài kiểm tra nào có điểm thấp được ghi nhận.
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
              <p className="text-sm text-muted-foreground">
                5 bài kiểm tra có rating trung bình thấp nhất
              </p>
            </CardHeader>
            <CardContent>
              {analytics.low_rated_assessments.length > 0 ? (
                <ul className="space-y-2">
                  {analytics.low_rated_assessments.map((item) => (
                    <li
                      key={item.assessment_id}
                      className="flex items-center justify-between text-sm text-foreground bg-muted/70 p-3 rounded-md border border-border"
                    >
                      <span>{item.assessment_title}</span>
                      <span className="font-medium text-amber-500">
                        {item.average_rating} / 5 ({item.rating_count} đánh giá)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Không có bài kiểm tra nào bị đánh giá thấp được ghi nhận.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hierarchical Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Phân tích Điểm số theo Cấu trúc Môn học</CardTitle>
            <p className="text-sm text-muted-foreground">
              Điểm trung bình, số lượt làm bài và rating theo Môn học, Chương và
              Bài kiểm tra
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {analytics.hierarchical_data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70">
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Mục
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Điểm TB
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Lượt làm
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rating TB
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.hierarchical_data.map((subject) => {
                    const isExpanded = expandedSubjects.has(
                      subject.subject_code
                    );
                    return (
                      <React.Fragment key={subject.subject_code}>
                        <TableRow className="bg-muted/60 hover:bg-accent cursor-pointer transition-colors">
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            <button
                              onClick={() =>
                                toggleSubject(subject.subject_code)
                              }
                              className="flex items-center gap-2"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-bold text-primary">
                                Môn: {subject.subject_name} (
                                {subject.subject_code})
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {subject.average_score}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {subject.attempt_count}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            N/A
                          </TableCell>
                        </TableRow>
                        {isExpanded &&
                          subject.chapters.map((chapter, chapterIndex) => {
                            const chapterKey = `${subject.subject_code}-${chapter.chapter_title}-${chapterIndex}`;
                            const chapterExpanded =
                              expandedChapters.has(chapterKey);
                            return (
                              <React.Fragment key={chapterKey}>
                                <TableRow className="bg-muted/40 hover:bg-accent/60 cursor-pointer transition-colors">
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground pl-10">
                                    <button
                                      onClick={() => toggleChapter(chapterKey)}
                                      className="flex items-center gap-2"
                                    >
                                      {chapterExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <span className="font-semibold text-foreground">
                                        Chương: {chapter.chapter_title}
                                      </span>
                                    </button>
                                  </TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                    {chapter.average_score}
                                  </TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    {chapter.attempt_count}
                                  </TableCell>
                                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                    N/A
                                  </TableCell>
                                </TableRow>
                                {chapterExpanded &&
                                  chapter.assessments.map((assessment) => (
                                    <TableRow
                                      key={assessment.assessment_id}
                                      className="hover:bg-accent/40"
                                    >
                                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground pl-20">
                                        <BarChart3 className="h-4 w-4 inline-block mr-2 text-muted-foreground" />
                                        {assessment.assessment_title}
                                      </TableCell>
                                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                        {assessment.average_score}
                                      </TableCell>
                                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {assessment.attempt_count}
                                      </TableCell>
                                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {assessment.average_rating} (
                                        {assessment.rating_count})
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </React.Fragment>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">
                Chưa có dữ liệu phân tích theo cấu trúc môn học.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
