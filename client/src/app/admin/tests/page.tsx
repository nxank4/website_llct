"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/ui/Spinner";
import { listTestResults, getInstructorStats } from "@/services/tests";
import {
  Search,
  Download,
  BarChart3,
  CheckCircle2,
  Clock,
  Award,
  RefreshCw,
  Filter,
} from "lucide-react";

interface TestResult {
  id: number;
  test_id: string;
  test_title: string;
  subject_id?: string;
  subject_name?: string;
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  total_points: number;
  earned_points: number;
  percentage: number;
  grade?: string;
  time_limit?: number;
  time_taken: number;
  status: string;
  is_passed: boolean;
  attempt_number: number;
  max_attempts?: number;
  passing_score?: number;
  started_at: string;
  completed_at?: string;
  user?: {
    id: number;
    full_name?: string;
    username?: string;
    email?: string;
  };
}

interface InstructorStats {
  total_tests: number;
  completed_tests: number;
  average_score: number;
  pass_rate: number;
  total_students: number;
}

export default function AdminTestsPage() {
  const { authFetch, hasRole } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const isAdmin = hasRole("admin");
  const isInstructor = hasRole("instructor");

  const fetchTestResults = useCallback(async () => {
    if (!authFetch) return;

    try {
      setLoading(true);
      const data = await listTestResults(authFetch);
      setTestResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching test results:", error);
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchStats = useCallback(async () => {
    if (!authFetch || !isInstructor) return;

    try {
      const data = await getInstructorStats(authFetch);
      setStats(data);
    } catch (error) {
      console.error("Error fetching instructor stats:", error);
      setStats(null);
    }
  }, [authFetch, isInstructor]);

  useEffect(() => {
    if (!authFetch) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchData = async () => {
      if (mounted) {
        await fetchTestResults();
        await fetchStats();
      }
    };

    timeoutId = setTimeout(() => {
      fetchData();
    }, 200);

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]);

  // Filter test results
  const filteredResults = testResults.filter((result) => {
    const matchesSearch =
      result.test_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.user?.full_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      result.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || result.status === statusFilter;

    const matchesSubject =
      subjectFilter === "all" || result.subject_id === subjectFilter;

    return matchesSearch && matchesStatus && matchesSubject;
  });

  // Get unique subjects
  const subjects = Array.from(
    new Set(
      testResults.map((r) => r.subject_id).filter((id): id is string => !!id)
    )
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return "text-gray-600";
    switch (grade.toUpperCase()) {
      case "A":
        return "text-green-600";
      case "B":
        return "text-blue-600";
      case "C":
        return "text-yellow-600";
      case "D":
        return "text-orange-600";
      case "F":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "abandoned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner text="Đang tải dữ liệu bài kiểm tra..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Bài kiểm tra
            </h1>
            <p className="text-gray-600">Quản lý và xem kết quả bài kiểm tra</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                fetchTestResults();
                fetchStats();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              title="Bộ lọc"
              onClick={() => {
                const el = document.getElementById("tests-filters");
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Bộ lọc</span>
            </button>
            <button
              className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg bg-[#125093] text-white hover:bg-[#0f4278] transition-colors"
              title="Xuất CSV"
              onClick={() => {
                try {
                  const headers = [
                    "test_title",
                    "subject",
                    "user",
                    "percentage",
                    "grade",
                    "status",
                    "time_taken",
                    "completed_at",
                  ];
                  const rows = filteredResults.map((r) => [
                    r.test_title || r.test_id,
                    r.subject_name || r.subject_id || "",
                    r.user?.full_name || r.user?.email || "",
                    r.percentage?.toFixed(1),
                    r.grade || "",
                    r.status,
                    String(r.time_taken),
                    r.completed_at || r.started_at || "",
                  ]);
                  const csv = [
                    headers.join(","),
                    ...rows.map((x) =>
                      x
                        .map(
                          (v) => `"${String(v ?? "").replaceAll('"', '""')}"`
                        )
                        .join(",")
                    ),
                  ].join("\n");
                  const blob = new Blob([csv], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `test-results.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error("Export CSV failed", e);
                  alert("Không thể xuất CSV");
                }
              }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#125093]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Tổng số bài kiểm tra
                  </p>
                  <p className="text-2xl font-bold text-[#125093] poppins-bold">
                    {stats.total_tests || 0}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-[#125093]" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Đã hoàn thành</p>
                  <p className="text-2xl font-bold text-green-600 poppins-bold">
                    {stats.completed_tests || 0}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Điểm trung bình</p>
                  <p className="text-2xl font-bold text-blue-600 poppins-bold">
                    {stats.average_score?.toFixed(1) || 0}%
                  </p>
                </div>
                <Award className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#00CBB8]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tỷ lệ đạt</p>
                  <p className="text-2xl font-bold text-[#00CBB8] poppins-bold">
                    {stats.pass_rate?.toFixed(1) || 0}%
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-[#00CBB8]" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          id="tests-filters"
          className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên bài kiểm tra, môn học, học sinh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="in_progress">Đang làm</option>
              <option value="abandoned">Đã hủy</option>
            </select>

            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            >
              <option value="all">Tất cả môn học</option>
              {subjects.map((subjectId) => {
                const subject = testResults.find(
                  (r) => r.subject_id === subjectId
                );
                return (
                  <option key={subjectId} value={subjectId}>
                    {subject?.subject_name || subjectId}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Test Results Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#125093] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Bài kiểm tra
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Môn học
                  </th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                      Học sinh
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Điểm số
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Ngày hoàn thành
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 7 : 6}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      {loading
                        ? "Đang tải..."
                        : "Không có kết quả bài kiểm tra nào"}
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result) => (
                    <tr
                      key={result.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {result.test_title || result.test_id}
                        </div>
                        {result.attempt_number > 1 && (
                          <div className="text-sm text-gray-500">
                            Lần thử: {result.attempt_number}
                            {result.max_attempts && ` / ${result.max_attempts}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {result.subject_name || result.subject_id || "N/A"}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">
                            {result.user?.full_name ||
                              result.user?.username ||
                              result.user?.email ||
                              "N/A"}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-bold ${getGradeColor(
                              result.grade
                            )} poppins-bold`}
                          >
                            {result.percentage.toFixed(1)}%
                          </span>
                          {result.grade && (
                            <span
                              className={`text-sm font-semibold ${getGradeColor(
                                result.grade
                              )} poppins-semibold`}
                            >
                              ({result.grade})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {result.correct_answers}/{result.total_questions} câu
                          đúng
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            result.status
                          )}`}
                        >
                          {result.status === "completed"
                            ? "Đã hoàn thành"
                            : result.status === "in_progress"
                            ? "Đang làm"
                            : "Đã hủy"}
                        </span>
                        {result.is_passed && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 inline-block ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {formatTime(result.time_taken)}
                          {result.time_limit && (
                            <span className="text-gray-400">
                              / {result.time_limit} phút
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(result.completed_at || result.started_at)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
