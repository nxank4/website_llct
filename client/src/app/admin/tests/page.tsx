"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAuthFetch, hasRole } from "@/lib/auth";
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
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";

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
  const { data: session } = useSession();
  const authFetch = useAuthFetch();

  // Wrapper to convert authFetch to FetchLike type
  const fetchLike = useCallback(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      return authFetch(url, init);
    },
    [authFetch]
  );

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAdmin = hasRole(session, "admin");
  const isInstructor = hasRole(session, "instructor");

  const fetchTestResults = useCallback(async () => {
    if (!authFetch) return;

    try {
      setLoading(true);
      const data = await listTestResults(fetchLike);
      setTestResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching test results:", error);
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  }, [fetchLike, authFetch]);

  const fetchStats = useCallback(async () => {
    if (!authFetch || !isInstructor) return;

    try {
      const data = await getInstructorStats(fetchLike);
      setStats(data);
    } catch (error) {
      console.error("Error fetching instructor stats:", error);
      setStats(null);
    }
  }, [fetchLike, authFetch, isInstructor]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" text="Đang tải dữ liệu bài kiểm tra..." />
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
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              title="Tạo bài kiểm tra mới"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tạo bài kiểm tra</span>
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

      <div className="max-w-7.5xl mx-auto">
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

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <CreateAssessmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Refresh test results after creating assessment
            fetchTestResults();
          }}
          authFetch={authFetch}
        />
      )}
    </div>
  );
}

// Create Assessment Modal Component
function CreateAssessmentModal({
  onClose,
  onSuccess,
  authFetch,
}: {
  onClose: () => void;
  onSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assessment_type: "quiz" as
      | "pre_test"
      | "post_test"
      | "quiz"
      | "exam"
      | "assignment",
    subject_id: "",
    time_limit_minutes: "",
    max_attempts: "3",
    is_published: false,
    is_randomized: false,
  });
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await authFetch(getFullUrl("/api/v1/admin/subjects"));
        if (response.ok) {
          const data = await response.json();
          const subjectsList = Array.isArray(data)
            ? data.map(
                (s: { id: number; name: string; description?: string }) => ({
                  id: s.id,
                  name: s.name || `Subject ${s.id}`,
                })
              )
            : [];
          setSubjects(subjectsList);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [authFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }

    if (!formData.subject_id) {
      setError("Vui lòng chọn môn học");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || "",
        assessment_type: formData.assessment_type,
        subject_id: parseInt(formData.subject_id),
        time_limit_minutes: formData.time_limit_minutes
          ? parseInt(formData.time_limit_minutes)
          : null,
        max_attempts: parseInt(formData.max_attempts) || 3,
        is_published: formData.is_published,
        is_randomized: formData.is_randomized,
      };

      const res = await authFetch(getFullUrl(API_ENDPOINTS.ASSESSMENTS), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Không thể tạo bài kiểm tra");
      }

      await res.json();
      alert("Tạo bài kiểm tra thành công! Bạn có thể thêm câu hỏi sau.");
      onSuccess();
      // Reset form
      setFormData({
        title: "",
        description: "",
        assessment_type: "quiz",
        subject_id: "",
        time_limit_minutes: "",
        max_attempts: "3",
        is_published: false,
        is_randomized: false,
      });
    } catch (err) {
      console.error("Error creating assessment:", err);
      setError(err instanceof Error ? err.message : "Lỗi khi tạo bài kiểm tra");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Tạo bài kiểm tra mới
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              placeholder="Nhập tiêu đề bài kiểm tra..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              placeholder="Nhập mô tả..."
            />
          </div>

          {/* Subject and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Môn học *
              </label>
              <select
                required
                value={formData.subject_id}
                onChange={(e) =>
                  setFormData({ ...formData, subject_id: e.target.value })
                }
                disabled={loadingSubjects}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent disabled:opacity-50"
              >
                <option value="">
                  {loadingSubjects ? "Đang tải môn học..." : "Chọn môn học..."}
                </option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại bài kiểm tra *
              </label>
              <select
                required
                value={formData.assessment_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assessment_type: e.target.value as
                      | "pre_test"
                      | "post_test"
                      | "quiz"
                      | "exam"
                      | "assignment",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              >
                <option value="quiz">Quiz</option>
                <option value="pre_test">Kiểm tra đầu kỳ</option>
                <option value="post_test">Kiểm tra cuối kỳ</option>
                <option value="exam">Thi</option>
                <option value="assignment">Bài tập</option>
              </select>
            </div>
          </div>

          {/* Time Limit and Max Attempts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian (phút)
              </label>
              <input
                type="number"
                min="1"
                value={formData.time_limit_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time_limit_minutes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                placeholder="Ví dụ: 60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lần làm tối đa
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_attempts}
                onChange={(e) =>
                  setFormData({ ...formData, max_attempts: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                placeholder="Ví dụ: 3"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) =>
                  setFormData({ ...formData, is_published: e.target.checked })
                }
                className="h-4 w-4 text-[#125093] focus:ring-[#125093] border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Đăng ngay</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_randomized}
                onChange={(e) =>
                  setFormData({ ...formData, is_randomized: e.target.checked })
                }
                className="h-4 w-4 text-[#125093] focus:ring-[#125093] border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Xáo trộn câu hỏi</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={creating || loadingSubjects}
              className="flex-1 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Tạo bài kiểm tra</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
