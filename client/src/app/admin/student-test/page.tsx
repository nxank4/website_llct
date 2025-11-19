"use client";

import { useState, useEffect, useCallback } from "react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useAuthFetch, hasRole } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  RefreshCw,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  User,
} from "lucide-react";

interface AssessmentResult {
  id: string;
  assessment_id: string;
  assessment_title?: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  subject_code?: string;
  subject_name?: string;
  score: number;
  total_score: number;
  percentage: number;
  correct_answers: number;
  total_questions: number;
  attempt_number: number;
  max_attempts?: number;
  time_taken?: number;
  completed_at: string;
  started_at?: string;
  is_passed?: boolean;
}

interface Assessment {
  id: string;
  _id?: string;
  title: string;
  subject_code?: string;
  subject_name?: string;
  is_published: boolean;
}

export default function AdminStudentTestPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session;
  const isLoading = status === "loading";
  const authFetch = useAuthFetch();

  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [assessmentFilter, setAssessmentFilter] = useState<string>("all");

  // Load published assessments
  const fetchAssessments = useCallback(async () => {
    if (!authFetch) return;
    try {
      const res = await authFetch(getFullUrl(API_ENDPOINTS.ASSESSMENTS));
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
        ? ((data as Record<string, unknown>).items as Assessment[])
        : [];
      // Only get published assessments
      const published = list.filter((a) => a.is_published);
      setAssessments(published);
    } catch (e) {
      console.error("Failed to load assessments", e);
      setAssessments([]);
    }
  }, [authFetch]);

  // Load results for all assessments
  const fetchResults = useCallback(async () => {
    if (!authFetch || assessments.length === 0) return;

    try {
      setLoading(true);
      const allResults: AssessmentResult[] = [];

      // Fetch results for each published assessment
      for (const assessment of assessments) {
        const assessmentId = String(assessment.id || assessment._id || "");
        if (!assessmentId) continue;

        try {
          const res = await authFetch(
            getFullUrl(API_ENDPOINTS.ASSESSMENT_RESULTS_BY_ID(assessmentId))
          );
          if (res.ok) {
            const data = await res.json();
            const resultsList = Array.isArray(data) ? data : [];
            // Add assessment title and subject info to each result
            const enrichedResults = resultsList.map((r: AssessmentResult) => ({
              ...r,
              assessment_title: assessment.title,
              subject_code: assessment.subject_code || r.subject_code,
              subject_name: assessment.subject_name || r.subject_name,
            }));
            allResults.push(...enrichedResults);
          }
        } catch (e) {
          console.error(
            `Failed to load results for assessment ${assessmentId}`,
            e
          );
        }
      }

      // Sort by completed_at descending (newest first)
      allResults.sort((a, b) => {
        const dateA = new Date(a.completed_at).getTime();
        const dateB = new Date(b.completed_at).getTime();
        return dateB - dateA;
      });

      setResults(allResults);
    } catch (e) {
      console.error("Failed to load results", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, assessments]);

  useEffect(() => {
    if (!authFetch) return;
    fetchAssessments();
  }, [authFetch, fetchAssessments]);

  useEffect(() => {
    if (assessments.length > 0) {
      fetchResults();
    }
  }, [assessments, fetchResults]);

  // Get unique subjects from results
  const subjects = Array.from(
    new Set(
      results
        .map((r) => r.subject_code)
        .filter((code): code is string => Boolean(code))
    )
  ).sort();

  // Filter results
  const filteredResults = results.filter((result) => {
    const matchesSearch =
      result.assessment_title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      result.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.student_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubject =
      subjectFilter === "all" || result.subject_code === subjectFilter;

    const matchesAssessment =
      assessmentFilter === "all" || result.assessment_id === assessmentFilter;

    return matchesSearch && matchesSubject && matchesAssessment;
  });

  // Calculate statistics
  const stats = {
    total: filteredResults.length,
    passed: filteredResults.filter((r) => r.is_passed).length,
    averageScore:
      filteredResults.length > 0
        ? Math.round(
            filteredResults.reduce((sum, r) => sum + r.percentage, 0) /
              filteredResults.length
          )
        : 0,
    totalStudents: new Set(filteredResults.map((r) => r.student_id)).size,
  };

  const exportToCSV = () => {
    const headers = [
      "Môn học",
      "Bài kiểm tra",
      "Sinh viên",
      "Email",
      "Điểm",
      "Tổng điểm",
      "Tỷ lệ %",
      "Đúng",
      "Tổng câu",
      "Lần làm",
      "Hoàn thành",
    ];

    const rows = filteredResults.map((r) => [
      r.subject_name || r.subject_code || "N/A",
      r.assessment_title || "N/A",
      r.student_name || "N/A",
      r.student_email || "N/A",
      r.score.toString(),
      r.total_score.toString(),
      `${r.percentage}%`,
      r.correct_answers.toString(),
      r.total_questions.toString(),
      r.attempt_number.toString(),
      new Date(r.completed_at).toLocaleString("vi-VN"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ket-qua-sinh-vien-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" text="Đang tải dữ liệu..." />
      </div>
    );
  }

  if (
    !isAuthenticated ||
    !hasRole(
      session as {
        user?: { roles?: string[]; role?: string };
      } | null,
      "admin"
    )
  ) {
    return null;
  }

  return (
    <div className="p-6 md:p-8">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Kết quả sinh viên
            </h1>
            <p className="text-gray-600">
              Xem và quản lý kết quả bài kiểm tra của sinh viên
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                fetchAssessments();
                fetchResults();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg bg-[#125093] text-white hover:bg-[#0f4278] transition-colors"
              title="Xuất CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#125093" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tổng kết quả</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-[#125093]" />
          </div>
        </div>
        <div
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#10b981" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Đã đạt</p>
              <p className="text-2xl font-bold text-gray-900">{stats.passed}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#3b82f6" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Điểm trung bình</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageScore}%
              </p>
            </div>
            <Award className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
          style={{ borderLeftWidth: "4px", borderLeftColor: "#00CBB8" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sinh viên</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalStudents}
              </p>
            </div>
            <User className="w-8 h-8 text-[#00CBB8]" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bộ lọc</h3>
          <Filter className="w-5 h-5 text-gray-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, môn học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-[#125093]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Môn học
            </label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả môn học</SelectItem>
                {subjects.map((code) => {
                  const result = results.find((r) => r.subject_code === code);
                  return (
                    <SelectItem key={code} value={code}>
                      {result?.subject_name || code}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bài kiểm tra
            </label>
            <Select value={assessmentFilter} onValueChange={setAssessmentFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả bài kiểm tra</SelectItem>
                {assessments.map((a) => {
                  const assessmentId = String(a.id || a._id || "");
                  return (
                    <SelectItem key={assessmentId} value={assessmentId}>
                      {a.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" text="Đang tải kết quả..." />
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có kết quả nào
              </h3>
              <p className="text-gray-600">
                {searchTerm ||
                subjectFilter !== "all" ||
                assessmentFilter !== "all"
                  ? "Không tìm thấy kết quả phù hợp với bộ lọc"
                  : "Chưa có sinh viên nào hoàn thành bài kiểm tra"}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Môn học
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bài kiểm tra
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sinh viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Điểm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tỷ lệ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kết quả
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lần làm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hoàn thành
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.subject_code || "N/A"}
                      </div>
                      {result.subject_name && (
                        <div className="text-sm text-gray-500">
                          {result.subject_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {result.assessment_title || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.student_name || "N/A"}
                      </div>
                      {result.student_email && (
                        <div className="text-sm text-gray-500">
                          {result.student_email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.score} / {result.total_score}
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.correct_answers} / {result.total_questions} câu
                        đúng
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 mr-2">
                          {result.percentage}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              result.percentage >= 80
                                ? "bg-green-500"
                                : result.percentage >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${result.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.is_passed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Đạt
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Chưa đạt
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {result.attempt_number}
                        {result.max_attempts && ` / ${result.max_attempts}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(result.completed_at).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
