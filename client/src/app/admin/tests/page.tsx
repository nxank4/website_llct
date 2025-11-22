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
  Info,
  Edit,
  Trash2,
  FileText,
} from "lucide-react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import EditAssessmentModal from "./EditAssessmentModal";
import ManageQuestionsModal from "./ManageQuestionsModal";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="xl" text="Đang tải dữ liệu bài kiểm tra..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] mb-2 poppins-bold">
                  Ngân hàng bài kiểm tra
                </h1>
                <p className="text-muted-foreground">
                  Quản lý và xem kết quả bài kiểm tra của sinh viên
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => {
                  fetchAssessments();
                }}
                className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg border border-border text-foreground hover:bg-muted/60 transition-colors"
                title="Làm mới"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg border border-border text-foreground hover:bg-muted/60 transition-colors"
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
                className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg bg-[hsl(var(--primary))] text-primary-foreground hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
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
          className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên bài kiểm tra, môn học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent bg-background text-foreground"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="published">Đã đăng</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
              </SelectContent>
            </Select>

            {/* Subject Filter */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả môn học</SelectItem>
                {subjects.map((subjectCode) => {
                  const assessment = assessments.find(
                    (a) =>
                      (a.subject_code || String(a.subject_id)) === subjectCode
                  );
                  return (
                    <SelectItem key={subjectCode} value={subjectCode}>
                      {assessment?.subject_code &&
                        `${assessment.subject_code} - `}
                      {assessment?.subject_name || subjectCode}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assessments Table */}
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/70 hover:bg-muted/70">
                <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bài kiểm tra
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Môn học
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Loại
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Trạng thái
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Thời gian
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ngày tạo
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-12">
                    <div className="flex items-center justify-center">
                      <Spinner size="lg" text="Đang tải bài kiểm tra..." />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Không có bài kiểm tra nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredResults.map((assessment) => (
                  <TableRow key={assessment.id} className="hover:bg-accent/50">
                    <TableCell className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {assessment.title}
                      </div>
                      {assessment.description && (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {assessment.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-sm text-foreground">
                        {assessment.subject_code && (
                          <span className="font-medium">
                            {assessment.subject_code} -{" "}
                          </span>
                        )}
                        {assessment.subject_name ||
                          `Môn ${assessment.subject_id}`}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400">
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
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assessment.is_published
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                        }`}
                      >
                        {assessment.is_published ? "Đã đăng" : "Nháp"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {assessment.time_limit_minutes
                          ? `${assessment.time_limit_minutes} phút`
                          : "Không giới hạn"}
                      </div>
                      {assessment.max_attempts && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Tối đa {assessment.max_attempts} lần
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(assessment.created_at)}
                      </div>
                      {assessment.updated_at &&
                        assessment.updated_at !== assessment.created_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Cập nhật: {formatDate(assessment.updated_at)}
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setManagingQuestionsAssessment(assessment)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Quản lý câu hỏi - Thêm, chỉnh sửa và xóa câu hỏi"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-xs font-medium">Câu hỏi</span>
                        </button>
                        <button
                          onClick={() => setEditingAssessment(assessment)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
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
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
      <AlertDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, assessment: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {deleteConfirmDialog.assessment
                ? `Bạn có chắc chắn muốn xóa bài kiểm tra "${deleteConfirmDialog.assessment.title}"? Hành động này không thể hoàn tác.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Hủy</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
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
                      const errorData = await response.json().catch(() => ({}));
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

    // Prevent double submit
    if (creating) return;

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !creating) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 bg-card text-card-foreground border border-border rounded-xl shadow-xl">
        <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Tạo bài kiểm tra mới
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Nhập thông tin cơ bản để khởi tạo bài kiểm tra
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Tiêu đề <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
              placeholder="Nhập tiêu đề bài kiểm tra..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Mô tả{" "}
              <span className="text-muted-foreground/70 text-xs">
                (Tùy chọn)
              </span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
              placeholder="Nhập mô tả..."
            />
          </div>

          {/* Subject and Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Môn học{" "}
                <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <Select
                required
                value={String(formData.subject_id)}
                onValueChange={(value) =>
                  setFormData({ ...formData, subject_id: value })
                }
                disabled={loadingSubjects}
              >
                <SelectTrigger className="w-full disabled:opacity-50">
                  <SelectValue
                    placeholder={
                      loadingSubjects
                        ? "Đang tải môn học..."
                        : "Chọn môn học..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.code ? `${subject.code} - ` : ""}
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Loại bài kiểm tra{" "}
                <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <Select
                required
                value={formData.assessment_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    assessment_type: value as
                      | "pre_test"
                      | "post_test"
                      | "quiz"
                      | "assignment",
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="pre_test">Kiểm tra đầu kỳ</SelectItem>
                  <SelectItem value="post_test">Kiểm tra cuối kỳ</SelectItem>
                  <SelectItem value="assignment">Bài tập</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Limit and Max Attempts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <span>Thời gian (phút)</span>
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
                <div className="group relative inline-block">
                  <Info className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[9999]">
                    <div className="bg-popover text-popover-foreground text-xs rounded-lg py-2 px-3 w-56 shadow-xl border border-border">
                      <p className="mb-1">
                        <strong>Nếu để trống hoặc 0:</strong> Thời gian làm bài
                        sẽ không giới hạn.
                      </p>
                      <p>
                        <strong>Nếu có số:</strong> Bài kiểm tra sẽ tự động nộp
                        khi hết thời gian.
                      </p>
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[hsl(var(--popover))]"></div>
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
                className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                placeholder="Để trống = không giới hạn"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <span>Số lần làm tối đa</span>
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
                <div className="group relative inline-block">
                  <Info className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[9999]">
                    <div className="bg-popover text-popover-foreground text-xs rounded-lg py-2 px-3 w-56 shadow-xl border border-border">
                      <p className="mb-1">
                        <strong>Nếu để trống hoặc 0:</strong> Số lần làm bài sẽ
                        không giới hạn.
                      </p>
                      <p>
                        <strong>Nếu có số:</strong> Sinh viên chỉ có thể làm bài
                        tối đa số lần đã đặt.
                      </p>
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[hsl(var(--popover))]"></div>
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
                className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                placeholder="Để trống = không giới hạn"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border hover:bg-muted/60 transition-colors cursor-pointer">
              <Checkbox
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_published: checked === true })
                }
              />
              <Label
                htmlFor="is_published"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-foreground">
                  Đăng ngay
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  Bài kiểm tra sẽ được hiển thị ngay cho sinh viên sau khi tạo
                </p>
              </Label>
            </div>
            <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border hover:bg-muted/60 transition-colors cursor-pointer">
              <Checkbox
                id="is_randomized"
                checked={formData.is_randomized}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_randomized: checked === true })
                }
              />
              <Label
                htmlFor="is_randomized"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-foreground">
                  Xáo trộn câu hỏi
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  Thứ tự câu hỏi sẽ được xáo trộn ngẫu nhiên cho mỗi lần làm bài
                </p>
              </Label>
            </div>
            <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border hover:bg-muted/60 transition-colors cursor-pointer">
              <Checkbox
                id="show_results"
                checked={formData.show_results}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, show_results: checked === true })
                }
              />
              <Label
                htmlFor="show_results"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-foreground">
                  Cho phép xem kết quả đúng
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  Sinh viên có thể xem đáp án đúng sau khi hoàn thành bài kiểm
                  tra
                </p>
              </Label>
            </div>
            <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border hover:bg-muted/60 transition-colors cursor-pointer">
              <Checkbox
                id="show_explanations"
                checked={formData.show_explanations}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    show_explanations: checked === true,
                  })
                }
              />
              <Label
                htmlFor="show_explanations"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-foreground">
                  Cho phép xem giải thích
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  Sinh viên có thể xem giải thích cho từng câu hỏi sau khi hoàn
                  thành bài kiểm tra
                </p>
              </Label>
            </div>
          </div>

          {/* Important Note */}
          <div className="bg-blue-500/10 dark:bg-blue-500/20 border-l-4 border-blue-500/60 dark:border-blue-400/60 p-4 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Lưu ý quan trọng
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-100">
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
            <div className="bg-red-500/10 dark:bg-red-500/20 border border-red-500/40 dark:border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <DialogClose asChild>
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={creating || loadingSubjects}
              className="px-4 py-2 bg-[hsl(var(--primary))] text-primary-foreground rounded-lg hover:bg-[hsl(var(--primary)/0.85)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
