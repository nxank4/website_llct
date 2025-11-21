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
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

    // Prevent double submit
    if (isSubmitting) return;

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
      <div className="p-6 md:p-8 bg-background text-foreground min-h-[60vh]">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-6 py-8 text-amber-500">
          <h2 className="text-xl font-semibold">Quyền truy cập bị hạn chế</h2>
          <p className="mt-2 text-sm text-amber-500/80">
            Chỉ quản trị viên mới có thể quản lý danh sách môn học.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 poppins-bold">
                Quản lý môn học
              </h1>
              <p className="text-muted-foreground">
                Tạo và quản lý danh sách môn học được sử dụng trong thư viện,
                tài liệu và dữ liệu AI.
              </p>
            </div>
            <button
              onClick={() => openModal()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
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
          <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6 md:p-8 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Không thể tải danh sách môn học
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error
                ? error.message
                : "Đã xảy ra lỗi không xác định."}
            </p>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-subjects"] })
              }
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Chưa có môn học nào
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tạo môn học đầu tiên để sử dụng trong thư viện tài liệu và các
              công cụ quản lý.
            </p>
            <button
              onClick={() => openModal()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Tạo môn học</span>
            </button>
          </div>
        ) : (
          <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/70 hover:bg-muted/70">
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mã môn học
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tên môn học
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mô tả
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tài liệu
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cập nhật
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id} className="hover:bg-accent/50">
                    <TableCell className="px-4 py-3 text-sm font-medium text-foreground">
                      {subject.code}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-foreground">
                      {subject.name}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground max-w-md">
                      {subject.description ? (
                        <DescriptionPreview
                          description={subject.description}
                          isExpanded={expandedDescriptions.has(subject.id)}
                          onToggle={() => toggleDescription(subject.id)}
                        />
                      ) : (
                        <span className="italic text-muted-foreground">
                          (Chưa có mô tả)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {subject.total_documents ?? 0}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
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
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal(subject)}
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subject)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !isSubmitting) {
              closeModal();
            }
          }}
        >
          <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card text-card-foreground rounded-xl border border-border shadow-2xl p-0">
            <DialogHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold text-foreground">
                    {editingSubject ? "Chỉnh sửa môn học" : "Tạo môn học mới"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm text-muted-foreground">
                    {editingSubject
                      ? "Cập nhật thông tin môn học."
                      : "Thêm môn học để sử dụng ở thư viện, tài liệu và các công cụ khác."}
                  </DialogDescription>
                </div>
                <DialogClose
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                  aria-label="Đóng"
                  disabled={isSubmitting}
                >
                  <X className="h-5 w-5" />
                </DialogClose>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="px-8 pb-8">
              <FieldGroup>
                <Field data-invalid={!!formError && !formState.code}>
                  <FieldLabel htmlFor="subject-code">
                    Mã môn học <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="subject-code"
                    type="text"
                    value={formState.code}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        code: event.target.value,
                      }))
                    }
                    className="w-full"
                    placeholder="VD: POL101"
                    required
                    aria-invalid={!!formError && !formState.code}
                  />
                </Field>

                <Field data-invalid={!!formError && !formState.name}>
                  <FieldLabel htmlFor="subject-name">
                    Tên môn học <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="subject-name"
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="w-full"
                    placeholder="Tên môn học"
                    required
                    aria-invalid={!!formError && !formState.name}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="subject-description">Mô tả</FieldLabel>
                  <Textarea
                    id="subject-description"
                    value={formState.description || ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="w-full min-h-[96px]"
                    placeholder="Mô tả ngắn về môn học (tuỳ chọn)"
                  />
                </Field>

                {/* Chapter Management - Only show when creating new subject or editing existing */}
                {formState.code && (
                  <Field>
                    <FieldLabel>
                      Chương
                      <span className="text-muted-foreground text-xs ml-1">
                        (Tùy chọn)
                      </span>
                    </FieldLabel>
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
                  </Field>
                )}

                {formError && <FieldError>{formError}</FieldError>}
              </FieldGroup>

              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <DialogClose asChild>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="border border-border text-muted-foreground hover:bg-accent px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Huỷ
                  </button>
                </DialogClose>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
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
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, subject: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {deleteConfirmDialog.subject
                ? `Bạn có chắc chắn muốn xóa môn học "${deleteConfirmDialog.subject.name}"?`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Hủy</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDeleteSubject}>
                Xóa
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    return <span className="text-muted-foreground">{description}</span>;
  }

  return (
    <div className="space-y-1">
      <span className="text-muted-foreground">
        {isExpanded
          ? description
          : `${description.substring(0, MAX_LENGTH)}...`}
      </span>
      <button
        onClick={onToggle}
        className="text-primary hover:text-primary/80 text-xs font-medium flex items-center gap-1 transition-colors"
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
        <div className="bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[hsl(var(--warning))] font-medium">
                ⚠️ Môn học này chưa có chương nào
              </p>
              <p className="text-xs text-[hsl(var(--warning))]/80 mt-1">
                Tạo chương mới để tạo sườn môn học
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2"
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
        <div className="bg-muted/40 border border-border rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Các chương hiện có:
          </p>
          <div className="space-y-1">
            {chapters.map((chapter) => (
              <div
                key={chapter.chapter_number}
                className="flex items-center justify-between bg-card px-3 py-2 rounded border border-border"
              >
                <span className="text-sm text-foreground">
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
        className="w-full px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-accent flex items-center justify-center gap-2"
        title="Thêm chương mới"
      >
        <Plus className="w-4 h-4" />
        <span>Thêm chương mới</span>
      </button>

      {/* Create New Chapter Form */}
      {showCreateForm && (
        <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              Tạo chương mới
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewChapterNumber("");
                setNewChapterTitle("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Số chương <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min="1"
                required
                className="w-full text-sm"
                value={newChapterNumber || ""}
                onChange={(e) =>
                  setNewChapterNumber(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                placeholder="1, 2, 3..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Tiêu đề chương <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                required
                className="w-full text-sm"
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
              className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90"
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
              className="px-3 py-1.5 border border-border text-muted-foreground text-sm rounded-md hover:bg-accent"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* New Chapters List */}
      {newChapters.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
          <p className="text-xs font-medium text-primary mb-2">
            Các chương mới sẽ được tạo:
          </p>
          <div className="space-y-2">
            {newChapters.map((chapter, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-card px-3 py-2 rounded border border-primary/40"
              >
                <span className="text-sm text-foreground">
                  Chương {chapter.chapter_number}: {chapter.chapter_title}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveNewChapter(index)}
                  className="text-destructive hover:text-destructive/80"
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
