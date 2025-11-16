"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthFetch } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
// Instructor stats removed - using assessment_results statistics instead
import { useToast } from "@/contexts/ToastContext";
import {
  Search,
  Clock,
  RefreshCw,
  Filter,
  Plus,
  X,
  Info,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import EditAssessmentModal from "./EditAssessmentModal";
import ManageQuestionsModal from "./ManageQuestionsModal";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Assessment {
  id: number;
  title: string;
  description?: string;
  assessment_type: string;
  subject_id: number;
  subject_name?: string;
  subject_code?: string;
  time_limit_minutes?: number;
  max_attempts?: number;
  is_published: boolean;
  is_randomized: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  questions_count?: number;
  results_count?: number;
}

// InstructorStats interface removed - stats can be calculated from assessment_results if needed

export default function AdminTestsPage() {
  const authFetch = useAuthFetch();
  const { showToast } = useToast();

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  // Stats removed - can be calculated from assessment_results if needed
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(
    null
  );
  const [managingQuestionsAssessment, setManagingQuestionsAssessment] =
    useState<Assessment | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    assessment: Assessment | null;
  }>({ isOpen: false, assessment: null });

  // isAdmin and isInstructor removed - not used

  const fetchAssessments = useCallback(async () => {
    if (!authFetch) return;

    try {
      setLoading(true);
      const res = await authFetch(getFullUrl(API_ENDPOINTS.ASSESSMENTS));
      if (res.ok) {
        const data = await res.json();
        setAssessments(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch assessments:", res.status);
        setAssessments([]);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // fetchStats removed - stats can be calculated from assessment_results if needed

  useEffect(() => {
    if (!authFetch) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const fetchData = async () => {
      if (mounted) {
        await fetchAssessments();
        // Stats removed - can be calculated from assessment_results if needed
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

  // Filter assessments
  const filteredResults = assessments.filter((assessment) => {
    const matchesSearch =
      assessment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assessment.subject_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      assessment.subject_code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && assessment.is_published) ||
      (statusFilter === "draft" && !assessment.is_published);

    const matchesSubject =
      subjectFilter === "all" ||
      String(assessment.subject_id) === subjectFilter ||
      assessment.subject_code === subjectFilter;

    return matchesSearch && matchesStatus && matchesSubject;
  });

  // Get unique subjects
  const subjects = Array.from(
    new Set(
      assessments
        .map((a) => a.subject_code || String(a.subject_id))
        .filter((code): code is string => !!code)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" text="Đang tải dữ liệu bài kiểm tra..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
                  Ngân hàng bài kiểm tra
                </h1>
                <p className="text-gray-600">
                  Quản lý và xem kết quả bài kiểm tra của sinh viên
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => {
                  fetchAssessments();
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
                className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg bg-[#125093] text-white hover:bg-[#0f4278] transition-colors"
                title="Tạo bài kiểm tra"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tạo bài KT</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Removed, can be calculated from assessment_results if needed */}

        {/* Filters */}
        <div
          id="tests-filters"
          className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên bài kiểm tra, môn học..."
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
              <option value="published">Đã đăng</option>
              <option value="draft">Nháp</option>
            </select>

            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            >
              <option value="all">Tất cả môn học</option>
              {subjects.map((subjectCode) => {
                const assessment = assessments.find(
                  (a) =>
                    (a.subject_code || String(a.subject_id)) === subjectCode
                );
                return (
                  <option key={subjectCode} value={subjectCode}>
                    {assessment?.subject_code &&
                      `${assessment.subject_code} - `}
                    {assessment?.subject_name || subjectCode}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Assessments Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
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
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Loại
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold poppins-semibold">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold poppins-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12">
                      <div className="flex items-center justify-center">
                        <Spinner size="lg" text="Đang tải bài kiểm tra..." />
                      </div>
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Không có bài kiểm tra nào
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((assessment) => (
                    <tr
                      key={assessment.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {assessment.title}
                        </div>
                        {assessment.description && (
                          <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {assessment.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {assessment.subject_code && (
                            <span className="font-medium">
                              {assessment.subject_code} -{" "}
                            </span>
                          )}
                          {assessment.subject_name ||
                            `Môn ${assessment.subject_id}`}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assessment.assessment_type === "quiz"
                            ? "Quiz"
                            : assessment.assessment_type === "pre_test"
                            ? "Kiểm tra đầu kỳ"
                            : assessment.assessment_type === "post_test"
                            ? "Kiểm tra cuối kỳ"
                            : assessment.assessment_type === "assignment"
                            ? "Bài tập"
                            : assessment.assessment_type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            assessment.is_published
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {assessment.is_published ? "Đã đăng" : "Nháp"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {assessment.time_limit_minutes
                            ? `${assessment.time_limit_minutes} phút`
                            : "Không giới hạn"}
                        </div>
                        {assessment.max_attempts && (
                          <div className="text-xs text-gray-500 mt-1">
                            Tối đa {assessment.max_attempts} lần
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(assessment.created_at)}
                        </div>
                        {assessment.updated_at &&
                          assessment.updated_at !== assessment.created_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Cập nhật: {formatDate(assessment.updated_at)}
                            </div>
                          )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setManagingQuestionsAssessment(assessment)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Quản lý câu hỏi - Thêm, chỉnh sửa và xóa câu hỏi"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="text-xs font-medium">Câu hỏi</span>
                          </button>
                          <button
                            onClick={() => setEditingAssessment(assessment)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Chỉnh sửa bài kiểm tra"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmDialog({
                                isOpen: true,
                                assessment,
                              });
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
            // Refresh assessments after creating
            fetchAssessments();
          }}
          authFetch={authFetch}
        />
      )}

      {/* Edit Assessment Modal */}
      {editingAssessment && (
        <EditAssessmentModal
          assessment={editingAssessment}
          onClose={() => setEditingAssessment(null)}
          onSuccess={() => {
            setEditingAssessment(null);
            fetchAssessments();
          }}
          authFetch={authFetch}
        />
      )}

      {/* Manage Questions Modal */}
      {managingQuestionsAssessment && (
        <ManageQuestionsModal
          assessment={managingQuestionsAssessment}
          onClose={() => setManagingQuestionsAssessment(null)}
          authFetch={authFetch}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, assessment: null });
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          />
          <AlertDialog.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[425px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
            )}
          >
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <AlertDialog.Title className="text-lg font-semibold">
                  Xác nhận xóa
                </AlertDialog.Title>
              </div>
              <AlertDialog.Description className="text-sm text-gray-600 pt-2">
                {deleteConfirmDialog.assessment
                  ? `Bạn có chắc chắn muốn xóa bài kiểm tra "${deleteConfirmDialog.assessment.title}"? Hành động này không thể hoàn tác.`
                  : ""}
              </AlertDialog.Description>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Hủy</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!deleteConfirmDialog.assessment || !authFetch) return;

                    try {
                      const response = await authFetch(
                        getFullUrl(
                          `${API_ENDPOINTS.ASSESSMENTS}/${deleteConfirmDialog.assessment.id}`
                        ),
                        { method: "DELETE" }
                      );
                      if (response.ok) {
                        showToast({
                          type: "success",
                          title: "Thành công",
                          message: "Đã xóa bài kiểm tra thành công",
                        });
                        fetchAssessments();
                        setDeleteConfirmDialog({
                          isOpen: false,
                          assessment: null,
                        });
                      } else {
                        const errorData = await response
                          .json()
                          .catch(() => ({}));
                        showToast({
                          type: "error",
                          title: "Lỗi",
                          message:
                            errorData.detail || "Không thể xóa bài kiểm tra",
                        });
                        setDeleteConfirmDialog({
                          isOpen: false,
                          assessment: null,
                        });
                      }
                    } catch (error) {
                      console.error("Error deleting assessment:", error);
                      showToast({
                        type: "error",
                        title: "Lỗi",
                        message: "Lỗi khi xóa bài kiểm tra",
                      });
                      setDeleteConfirmDialog({
                        isOpen: false,
                        assessment: null,
                      });
                    }
                  }}
                >
                  Xóa
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
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
    assessment_type: "quiz" as "pre_test" | "post_test" | "quiz" | "assignment",
    subject_id: "",
    time_limit_minutes: "",
    max_attempts: "3",
    is_published: false,
    is_randomized: false,
    show_results: true,
    show_explanations: true,
  });
  const [subjects, setSubjects] = useState<
    Array<{ id: number; name: string; code?: string }>
  >([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await authFetch(getFullUrl("/api/v1/admin/subjects"));
        if (response.ok) {
          const data = await response.json();
          const subjectsList = Array.isArray(data)
            ? data.map(
                (s: {
                  id: number;
                  name: string;
                  code?: string;
                  description?: string;
                }) => ({
                  id: s.id,
                  name: s.name || `Subject ${s.id}`,
                  code: s.code,
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
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        assessment_type: formData.assessment_type,
        subject_id: parseInt(formData.subject_id),
        time_limit_minutes: formData.time_limit_minutes
          ? parseInt(formData.time_limit_minutes)
          : null,
        max_attempts: formData.max_attempts
          ? parseInt(formData.max_attempts) || 0
          : 0, // 0 = không giới hạn
        is_published: formData.is_published,
        is_randomized: formData.is_randomized,
        show_results: formData.show_results,
        show_explanations: formData.show_explanations,
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
      showToast({
        type: "success",
        title: "Thành công",
        message:
          "Tạo bài kiểm tra thành công! Vui lòng sử dụng nút quản lý câu hỏi để thêm câu hỏi.",
      });
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
        show_results: true,
        show_explanations: true,
      });
    } catch (err) {
      console.error("Error creating assessment:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Lỗi khi tạo bài kiểm tra";
      setError(errorMessage);
      showToast({
        type: "error",
        title: "Lỗi",
        message: errorMessage,
      });
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
              Tiêu đề <span className="text-red-500">*</span>
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
              Mô tả <span className="text-gray-400 text-xs">(Tùy chọn)</span>
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
                Môn học <span className="text-red-500">*</span>
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
                    {subject.code ? `${subject.code} - ` : ""}
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại bài kiểm tra <span className="text-red-500">*</span>
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
                      | "assignment",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              >
                <option value="quiz">Quiz</option>
                <option value="pre_test">Kiểm tra đầu kỳ</option>
                <option value="post_test">Kiểm tra cuối kỳ</option>
                <option value="assignment">Bài tập</option>
              </select>
            </div>
          </div>

          {/* Time Limit and Max Attempts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <span>Thời gian (phút)</span>
                <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                <div className="group relative inline-block">
                  <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[9999]">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 w-56 shadow-xl">
                      <p className="mb-1">
                        <strong>Nếu để trống hoặc 0:</strong> Thời gian làm bài
                        sẽ không giới hạn.
                      </p>
                      <p>
                        <strong>Nếu có số:</strong> Bài kiểm tra sẽ tự động nộp
                        khi hết thời gian.
                      </p>
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </label>
              <input
                type="number"
                min="0"
                value={formData.time_limit_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time_limit_minutes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                placeholder="Để trống = không giới hạn"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <span>Số lần làm tối đa</span>
                <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                <div className="group relative inline-block">
                  <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[9999]">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 w-56 shadow-xl">
                      <p className="mb-1">
                        <strong>Nếu để trống hoặc 0:</strong> Số lần làm bài sẽ
                        không giới hạn.
                      </p>
                      <p>
                        <strong>Nếu có số:</strong> Sinh viên chỉ có thể làm bài
                        tối đa số lần đã đặt.
                      </p>
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </label>
              <input
                type="number"
                min="0"
                value={formData.max_attempts}
                onChange={(e) =>
                  setFormData({ ...formData, max_attempts: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                placeholder="Để trống = không giới hạn"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) =>
                  setFormData({ ...formData, is_published: e.target.checked })
                }
                className="h-5 w-5 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="is_published"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-gray-900">
                  Đăng ngay
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Bài kiểm tra sẽ được hiển thị ngay cho sinh viên sau khi tạo
                </p>
              </label>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                id="is_randomized"
                checked={formData.is_randomized}
                onChange={(e) =>
                  setFormData({ ...formData, is_randomized: e.target.checked })
                }
                className="h-5 w-5 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="is_randomized"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-gray-900">
                  Xáo trộn câu hỏi
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Thứ tự câu hỏi sẽ được xáo trộn ngẫu nhiên cho mỗi lần làm bài
                </p>
              </label>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                id="show_results"
                checked={formData.show_results}
                onChange={(e) =>
                  setFormData({ ...formData, show_results: e.target.checked })
                }
                className="h-5 w-5 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="show_results"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-gray-900">
                  Cho phép xem kết quả đúng
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Sinh viên có thể xem đáp án đúng sau khi hoàn thành bài kiểm
                  tra
                </p>
              </label>
            </div>
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
              <input
                type="checkbox"
                id="show_explanations"
                checked={formData.show_explanations}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    show_explanations: e.target.checked,
                  })
                }
                className="h-5 w-5 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="show_explanations"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-gray-900">
                  Cho phép xem giải thích
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Sinh viên có thể xem giải thích cho từng câu hỏi sau khi hoàn
                  thành bài kiểm tra
                </p>
              </label>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">
                  Lưu ý quan trọng
                </h4>
                <p className="text-sm text-blue-800">
                  Sau khi tạo bài kiểm tra thành công, bạn có thể thêm câu hỏi
                  bằng cách sử dụng nút{" "}
                  <span className="inline-flex items-center gap-1 font-medium">
                    <FileText className="w-4 h-4" />
                    Quản lý câu hỏi
                  </span>{" "}
                  trong bảng danh sách bài kiểm tra. Chỉ khi bài kiểm tra đã
                  được tạo, bạn mới có thể thực hiện thao tác thêm, chỉnh sửa và
                  xóa câu hỏi.
                </p>
              </div>
            </div>
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
                  <Spinner size="sm" inline />
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
