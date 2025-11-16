"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  BookOpen,
  X,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

import { useAuthFetch, hasRole } from "@/lib/auth";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { createSubject, createDocument } from "@/services/library";
import { useToast } from "@/contexts/ToastContext";
import Spinner from "@/components/ui/Spinner";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject {
  id: number;
  code: string;
  name: string;
  description?: string;
  total_documents?: number;
  total_students?: number;
  created_at?: string;
  updated_at?: string;
}

interface Chapter {
  chapter_number: number;
  chapter_title: string;
}

export default function AdminSubjectsPage() {
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(
    new Set()
  );
  const [formState, setFormState] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newChapters, setNewChapters] = useState<Chapter[]>([]);
  const [chapterRefreshTrigger, setChapterRefreshTrigger] = useState(0);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    subject: Subject | null;
  }>({ isOpen: false, subject: null });

  const isAdmin = hasRole(
    session as { user?: { roles?: string[]; role?: string } } | null,
    "admin"
  );

  const {
    data: subjectsResponse,
    isLoading,
    isError,
    error,
  } = useQuery<Subject[]>({
    queryKey: ["admin-subjects"],
    enabled: Boolean(authFetch) && isAdmin,
    queryFn: async () => {
      if (!authFetch) throw new Error("authFetch not available");

      // Fetch subjects từ library endpoint để có đầy đủ thông tin (description, created_at, updated_at)
      const libraryResponse = await authFetch(
        getFullUrl("/api/v1/library/subjects/")
      );

      // Fetch lecture counts từ lectures endpoint
      const lecturesResponse = await authFetch(
        getFullUrl(API_ENDPOINTS.LECTURES_SUBJECTS)
      );

      let subjectsData: Subject[] = [];
      let lectureCounts: Record<number, number> = {};

      // Lấy lecture counts
      if (lecturesResponse.ok) {
        const lecturesData = await lecturesResponse.json();
        const lecturesArray = Array.isArray(lecturesData) ? lecturesData : [];
        lectureCounts = lecturesArray.reduce(
          (
            acc: Record<number, number>,
            subject: { id: number; lecture_count?: number }
          ) => {
            acc[subject.id] = subject.lecture_count || 0;
            return acc;
          },
          {}
        );
      }

      // Lấy subjects với đầy đủ thông tin từ library endpoint
      if (libraryResponse.ok) {
        const libraryData = await libraryResponse.json();
        const libraryArray = Array.isArray(libraryData) ? libraryData : [];
        subjectsData = libraryArray.map(
          (subject: {
            id: number;
            code: string;
            name: string;
            description?: string;
            created_at?: string;
            updated_at?: string;
          }) => ({
            id: subject.id,
            code: subject.code,
            name: subject.name,
            description: subject.description || "",
            total_documents: lectureCounts[subject.id] || 0,
            created_at: subject.created_at,
            updated_at: subject.updated_at,
          })
        ) as Subject[];
      } else {
        throw new Error(`Failed to fetch subjects: ${libraryResponse.status}`);
      }

      return subjectsData;
    },
  });

  const subjects = useMemo(() => subjectsResponse ?? [], [subjectsResponse]);

  const openModal = useCallback((subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormState({
        code: subject.code,
        name: subject.name,
        description: subject.description || "",
      });
    } else {
      setEditingSubject(null);
      setFormState({ code: "", name: "", description: "" });
    }
    setFormError(null);
    setNewChapters([]);
    setIsModalOpen(true);
  }, []);

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingSubject(null);
    setFormState({ code: "", name: "", description: "" });
    setNewChapters([]);
  };

  // Auto-open modal if subject_code is in URL params
  useEffect(() => {
    const subjectCodeParam = searchParams.get("subject_code");
    if (subjectCodeParam && subjects.length > 0 && !isModalOpen) {
      const subject = subjects.find((s) => s.code === subjectCodeParam);
      if (subject) {
        openModal(subject);
        // Remove query param from URL
        router.replace("/admin/subjects");
      }
    }
  }, [searchParams, subjects, isModalOpen, router, openModal]);

  const toggleDescription = (subjectId: number) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authFetch) return;

    const trimmedCode = formState.code.trim();
    const trimmedName = formState.name.trim();
    const trimmedDescription = formState.description.trim();

    if (!trimmedCode || !trimmedName) {
      setFormError("Mã môn học và tên môn học là bắt buộc");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (editingSubject) {
        // Update subject
        const response = await authFetch(
          getFullUrl(`/api/v1/library/subjects/${editingSubject.id}`),
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: trimmedCode,
              name: trimmedName,
              description: trimmedDescription || undefined,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Không thể cập nhật môn học");
        }
      } else {
        // Create subject
        const fetchLike = authFetch as (
          input: RequestInfo | URL,
          init?: RequestInit
        ) => Promise<Response>;
        await createSubject(fetchLike, {
          code: trimmedCode,
          name: trimmedName,
          description: trimmedDescription || undefined,
        });

        // Create chapters if any
        if (newChapters.length > 0) {
          for (const chapterData of newChapters) {
            try {
              await createDocument(fetchLike, {
                title: `Chương ${chapterData.chapter_number}: ${chapterData.chapter_title}`,
                description: `Tài liệu cho chương ${chapterData.chapter_number}`,
                subject_code: trimmedCode,
                subject_name: trimmedName,
                document_type: "textbook",
                author: "System",
                chapter_number: chapterData.chapter_number,
                chapter_title: chapterData.chapter_title,
                status: "published",
                tags: [],
              });
            } catch (error) {
              console.error("Error creating chapter document:", error);
            }
          }
          // Trigger chapter refresh
          setChapterRefreshTrigger((prev) => prev + 1);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      setIsModalOpen(false);
      showToast({
        type: "success",
        title: "Thành công",
        message: editingSubject
          ? "Đã cập nhật môn học thành công"
          : `Đã tạo môn học thành công${
              newChapters.length > 0 ? ` và ${newChapters.length} chương` : ""
            }`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể lưu môn học";
      setFormError(message);
      showToast({
        type: "error",
        title: "Lỗi",
        message: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (subject: Subject) => {
    if (!authFetch) return;

    if (subject.total_documents && subject.total_documents > 0) {
      showToast({
        type: "warning",
        title: "Không thể xóa",
        message: `Môn học này có ${subject.total_documents} tài liệu. Vui lòng xóa hoặc chuyển tài liệu trước.`,
      });
      return;
    }

    setDeleteConfirmDialog({ isOpen: true, subject });
  };

  const confirmDeleteSubject = async () => {
    if (!deleteConfirmDialog.subject || !authFetch) return;

    try {
      const response = await authFetch(
        getFullUrl(
          `/api/v1/library/subjects/${deleteConfirmDialog.subject.id}`
        ),
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showToast({
          type: "error",
          title: "Lỗi",
          message: errorData.detail || "Không thể xóa môn học",
        });
        setDeleteConfirmDialog({ isOpen: false, subject: null });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã xóa môn học thành công",
      });
      setDeleteConfirmDialog({ isOpen: false, subject: null });
    } catch (err) {
      console.error("Error deleting subject:", err);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi xóa môn học",
      });
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-amber-900">
          <h2 className="text-xl font-semibold">Quyền truy cập bị hạn chế</h2>
          <p className="mt-2 text-sm text-amber-800">
            Chỉ quản trị viên mới có thể quản lý danh sách môn học.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
                Quản lý môn học
              </h1>
              <p className="text-gray-600">
                Tạo và quản lý danh sách môn học được sử dụng trong thư viện,
                tài liệu và dữ liệu AI.
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Thêm môn học</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" text="Đang tải danh sách môn học..." />
          </div>
        ) : isError ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Không thể tải danh sách môn học
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {error instanceof Error
                ? error.message
                : "Đã xảy ra lỗi không xác định."}
            </p>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-subjects"] })
              }
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <BookOpen className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Chưa có môn học nào
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Tạo môn học đầu tiên để sử dụng trong thư viện tài liệu và các
              công cụ quản lý.
            </p>
            <button
              onClick={() => openModal()}
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Tạo môn học</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Mã môn học
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tên môn học
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Mô tả
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tài liệu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Cập nhật
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {subject.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {subject.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                      {subject.description ? (
                        <DescriptionPreview
                          description={subject.description}
                          isExpanded={expandedDescriptions.has(subject.id)}
                          onToggle={() => toggleDescription(subject.id)}
                        />
                      ) : (
                        <span className="italic text-gray-400">
                          (Chưa có mô tả)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {subject.total_documents ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {subject.updated_at &&
                      subject.updated_at !== subject.created_at
                        ? new Date(subject.updated_at).toLocaleDateString(
                            "vi-VN"
                          )
                        : subject.created_at
                        ? new Date(subject.created_at).toLocaleDateString(
                            "vi-VN"
                          )
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(subject)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subject)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingSubject ? "Chỉnh sửa môn học" : "Tạo môn học mới"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {editingSubject
                    ? "Cập nhật thông tin môn học."
                    : "Thêm môn học để sử dụng ở thư viện, tài liệu và các công cụ khác."}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã môn học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      code: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#125093] focus:outline-none focus:ring-2 focus:ring-[#125093]/20"
                  placeholder="VD: POL101"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên môn học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#125093] focus:outline-none focus:ring-2 focus:ring-[#125093]/20"
                  placeholder="Tên môn học"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="w-full min-h-[96px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#125093] focus:outline-none focus:ring-2 focus:ring-[#125093]/20"
                  placeholder="Mô tả ngắn về môn học (tuỳ chọn)"
                />
              </div>

              {/* Chapter Management - Only show when creating new subject or editing existing */}
              {formState.code && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chương
                    <span className="text-gray-400 text-xs ml-1">
                      (Tùy chọn)
                    </span>
                  </label>
                  <ChapterManager
                    subjectCode={formState.code}
                    authFetch={authFetch}
                    newChapters={newChapters}
                    onNewChaptersChange={setNewChapters}
                    refreshTrigger={chapterRefreshTrigger}
                    onChapterCreated={() => {
                      setChapterRefreshTrigger((prev) => prev + 1);
                    }}
                    showToast={showToast}
                  />
                </div>
              )}

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner size="sm" inline />
                      Đang lưu...
                    </>
                  ) : editingSubject ? (
                    "Cập nhật môn học"
                  ) : (
                    "Tạo môn học"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog.Root
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, subject: null });
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
                {deleteConfirmDialog.subject
                  ? `Bạn có chắc chắn muốn xóa môn học "${deleteConfirmDialog.subject.name}"?`
                  : ""}
              </AlertDialog.Description>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Hủy</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="destructive" onClick={confirmDeleteSubject}>
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

// Component để hiển thị mô tả với rút gọn/mở rộng
function DescriptionPreview({
  description,
  isExpanded,
  onToggle,
}: {
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const MAX_LENGTH = 100;
  const shouldTruncate = description.length > MAX_LENGTH;

  if (!shouldTruncate) {
    return <span>{description}</span>;
  }

  return (
    <div className="space-y-1">
      <span>
        {isExpanded
          ? description
          : `${description.substring(0, MAX_LENGTH)}...`}
      </span>
      <button
        onClick={onToggle}
        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Thu gọn
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            Xem thêm
          </>
        )}
      </button>
    </div>
  );
}

// Chapter Manager Component for Subject Management
interface ChapterManagerProps {
  subjectCode: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  newChapters: Chapter[];
  onNewChaptersChange: (chapters: Chapter[]) => void;
  refreshTrigger?: number;
  onChapterCreated?: () => void; // Callback to trigger refresh in parent
  showToast?: (toast: {
    type: "success" | "error" | "warning" | "info";
    title?: string;
    message: string;
    duration?: number;
  }) => void;
}

function ChapterManager({
  subjectCode,
  authFetch,
  newChapters,
  onNewChaptersChange,
  refreshTrigger,
  onChapterCreated,
  showToast,
}: ChapterManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newChapterNumber, setNewChapterNumber] = useState<number | "">("");
  const [newChapterTitle, setNewChapterTitle] = useState("");

  // Fetch chapters from API
  useEffect(() => {
    if (!subjectCode) {
      setChapters([]);
      return;
    }

    const fetchChapters = async () => {
      setLoading(true);
      try {
        const res = await authFetch(
          getFullUrl(API_ENDPOINTS.LIBRARY_CHAPTERS(subjectCode))
        );
        if (res.ok) {
          const chaptersData = await res.json();
          const uniqueChapters: Chapter[] = chaptersData.map(
            (ch: { chapter_number: number; chapter_title: string }) => ({
              chapter_number: ch.chapter_number,
              chapter_title: ch.chapter_title,
            })
          );
          setChapters(uniqueChapters);
        } else {
          console.error("Failed to fetch chapters:", res.status);
          setChapters([]);
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
        setChapters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [subjectCode, authFetch, refreshTrigger]);

  const handleAddNewChapter = async () => {
    if (!newChapterNumber || !newChapterTitle.trim()) {
      return;
    }
    const chapter: Chapter = {
      chapter_number: Number(newChapterNumber),
      chapter_title: newChapterTitle.trim(),
    };

    // If subject already exists (has subjectCode), save chapter to database immediately
    if (subjectCode) {
      try {
        setLoading(true);
        const fetchLike = authFetch as (
          input: RequestInfo | URL,
          init?: RequestInit
        ) => Promise<Response>;

        // Get subject name from API or use a placeholder
        const subjectRes = await authFetch(
          getFullUrl(`/api/v1/library/subjects/`)
        );
        let subjectName = "Unknown";
        if (subjectRes.ok) {
          const subjects = await subjectRes.json();
          const subject = subjects.find(
            (s: { code: string }) => s.code === subjectCode
          );
          if (subject) {
            subjectName = subject.name;
          }
        }

        await createDocument(fetchLike, {
          title: `Chương ${chapter.chapter_number}: ${chapter.chapter_title}`,
          description: `Tài liệu cho chương ${chapter.chapter_number}`,
          subject_code: subjectCode,
          subject_name: subjectName,
          document_type: "textbook",
          author: "System",
          chapter_number: chapter.chapter_number,
          chapter_title: chapter.chapter_title,
          status: "published",
          tags: [],
        });

        // Chapter saved successfully, trigger refresh
        if (onChapterCreated) {
          onChapterCreated();
        }
        // Also refresh local state by re-fetching
        const res = await authFetch(
          getFullUrl(API_ENDPOINTS.LIBRARY_CHAPTERS(subjectCode))
        );
        if (res.ok) {
          const chaptersData = await res.json();
          const uniqueChapters: Chapter[] = chaptersData.map(
            (ch: { chapter_number: number; chapter_title: string }) => ({
              chapter_number: ch.chapter_number,
              chapter_title: ch.chapter_title,
            })
          );
          setChapters(uniqueChapters);
        }
        if (showToast) {
          showToast({
            type: "success",
            title: "Thành công",
            message: `Đã tạo chương ${chapter.chapter_number} thành công`,
          });
        }
        setNewChapterNumber("");
        setNewChapterTitle("");
        setShowCreateForm(false);
      } catch (error) {
        console.error("Error creating chapter:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Không thể tạo chương. Vui lòng thử lại.";
        if (showToast) {
          showToast({
            type: "error",
            title: "Lỗi",
            message: errorMessage,
          });
        }
        // If save fails, still add to newChapters for form submission
        onNewChaptersChange([...newChapters, chapter]);
        setNewChapterNumber("");
        setNewChapterTitle("");
        setShowCreateForm(false);
      } finally {
        setLoading(false);
      }
    } else {
      // Subject doesn't exist yet, just add to newChapters for later
      onNewChaptersChange([...newChapters, chapter]);
      setNewChapterNumber("");
      setNewChapterTitle("");
      setShowCreateForm(false);
    }
  };

  const handleRemoveNewChapter = (index: number) => {
    onNewChaptersChange(newChapters.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  // Show empty state only if no chapters exist (from DB) and no new chapters and not showing create form
  if (chapters.length === 0 && newChapters.length === 0 && !showCreateForm) {
    return (
      <div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Môn học này chưa có chương nào
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Tạo chương mới để tạo sườn môn học
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tạo chương mới
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing Chapters Display */}
      {chapters.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Các chương hiện có:
          </p>
          <div className="space-y-1">
            {chapters.map((chapter) => (
              <div
                key={chapter.chapter_number}
                className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200"
              >
                <span className="text-sm text-gray-700">
                  Chương {chapter.chapter_number}: {chapter.chapter_title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Chapter Button */}
      <button
        type="button"
        onClick={() => setShowCreateForm(true)}
        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2 border border-gray-300"
        title="Thêm chương mới"
      >
        <Plus className="w-4 h-4" />
        <span>Thêm chương mới</span>
      </button>

      {/* Create New Chapter Form */}
      {showCreateForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Tạo chương mới
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewChapterNumber("");
                setNewChapterTitle("");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Số chương <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={newChapterNumber}
                onChange={(e) =>
                  setNewChapterNumber(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                placeholder="1, 2, 3..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tiêu đề chương <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Ví dụ: Giới thiệu về Mác-Lênin"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddNewChapter}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Thêm chương
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewChapterNumber("");
                setNewChapterTitle("");
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* New Chapters List */}
      {newChapters.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800 mb-2">
            Các chương mới sẽ được tạo:
          </p>
          <div className="space-y-2">
            {newChapters.map((chapter, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white px-3 py-2 rounded border border-blue-200"
              >
                <span className="text-sm text-gray-700">
                  Chương {chapter.chapter_number}: {chapter.chapter_title}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveNewChapter(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
