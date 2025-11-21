"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useAuthFetch, hasRole } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import {
  BookOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Upload,
  Search,
  Eye,
  X,
  RefreshCw,
  Filter,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { updateDocument, deleteDocument } from "@/services/library";
import CreateLectureModal from "@/components/lectures/CreateLectureModal";
import { useToast } from "@/contexts/ToastContext";
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
import TiptapEditor from "@/components/ui/TiptapEditor";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LibraryDocument {
  id: string;
  title: string;
  description?: string;
  subject_code: string;
  subject_name: string;
  document_type: string;
  status: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  author: string;
  instructor_id?: string;
  tags: string[];
  semester?: string;
  academic_year?: string;
  chapter?: string;
  chapter_number?: number;
  chapter_title?: string;
  download_count: number;
  view_count: number;
  rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

interface Lecture {
  id: number;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  subject_id: number;
  subject_name?: string;
  uploaded_by: number;
  uploader_name?: string;
  duration?: string;
  is_published: boolean;
  chapter_number?: number;
  chapter_title?: string;
  lesson_number?: number;
  lesson_title?: string;
  created_at?: string;
  updated_at?: string;
}

interface Subject {
  id: number;
  code?: string;
  name: string;
  description?: string;
  lecture_count?: number;
  total_documents?: number;
  total_students?: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminLibraryPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const authFetch = useAuthFetch();
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<LibraryDocument | null>(null);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
    null
  );
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    documentId: string | null;
  }>({ isOpen: false, documentId: null });
  const [deleteLectureDialog, setDeleteLectureDialog] = useState<{
    isOpen: boolean;
    lectureId: number | null;
  }>({ isOpen: false, lectureId: null });
  const { showToast } = useToast();

  const isAdmin = hasRole(session, "admin");

  // Wrapper to convert authFetch to FetchLike type
  const fetchLike: (
    input: RequestInfo | URL,
    init?: RequestInit
  ) => Promise<Response> = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    return authFetch(url, init);
  };

  // SWR fetcher tổng hợp documents + subjects
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["library-data"],
    queryFn: async () => {
      // Fetch subjects từ lectures endpoint giống admin/lectures
      const subjectsResponse = await authFetch(
        getFullUrl(API_ENDPOINTS.LECTURES_SUBJECTS)
      );
      let subjectsData: Subject[] = [];
      if (subjectsResponse.ok) {
        const data = await subjectsResponse.json();
        const subjectsArray = Array.isArray(data) ? data : [];
        // Map dữ liệu để đảm bảo có đầy đủ thông tin
        subjectsData = subjectsArray.map(
          (subject: {
            id: number;
            code?: string;
            name: string;
            description?: string;
            lecture_count?: number;
          }) => ({
            id: subject.id,
            code: subject.code || `SUB${subject.id}`,
            name: subject.name,
            description: subject.description,
            lecture_count: subject.lecture_count || 0,
            total_documents: subject.lecture_count || 0,
          })
        );
      } else {
        const errorData = await subjectsResponse.json().catch(() => ({}));
        console.error(
          "Error fetching subjects:",
          subjectsResponse.status,
          errorData
        );
      }

      // Fetch lectures thay vì documents
      const lecturesResponse = await authFetch(
        getFullUrl(`${API_ENDPOINTS.LECTURES}?limit=200`)
      );
      let lecturesData: Lecture[] = [];
      if (lecturesResponse.ok) {
        const lecturesJson = await lecturesResponse.json();
        lecturesData = Array.isArray(lecturesJson) ? lecturesJson : [];
      }

      return {
        lectures: lecturesData,
        subjects: subjectsData,
      };
    },
    enabled: Boolean(authFetch),
    retry: false, // Disable retry at query level (handled by provider)
  });

  const lectures = (data?.lectures as Lecture[]) ?? [];
  const subjects = (data?.subjects as Subject[]) ?? [];

  // Sử dụng lecture_count từ API thay vì tính từ documents
  const subjectsWithDocumentCount = subjects.map((subject) => ({
    ...subject,
    total_documents: subject.lecture_count || 0,
  }));

  // Handler functions to avoid inline functions
  const handleCloseEditModal = () => setEditingDocument(null);
  const handleEditSubmit = (data: Record<string, unknown>) => {
    if (editingDocument) {
      handleUpdateDocument(editingDocument.id, data);
    }
  };
  // Không cần fetchData/useEffect—SWR xử lý

  const handleUpdateDocument = async (
    documentId: string,
    documentData: Record<string, unknown>
  ) => {
    try {
      // Update main document
      await updateDocument(fetchLike, documentId, documentData);
      await queryClient.invalidateQueries({ queryKey: ["library-data"] });
      setEditingDocument(null);
      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã cập nhật tài liệu thành công",
      });
    } catch (error) {
      console.error("Error updating document:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi cập nhật tài liệu",
      });
    }
  };

  const handleUploadDocument = async (formData: FormData) => {
    try {
      const response = await authFetch(
        `${location.origin}/api/v1/library/documents/upload`,
        {
          method: "POST",
          body: formData, // Don't set Content-Type for FormData
        }
      );

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["library-data"] }); // Refresh data
        setShowUploadModal(false);
        showToast({
          type: "success",
          title: "Thành công",
          message: "Upload tài liệu thành công!",
        });
      } else {
        const errorData = await response.json();
        console.error("Failed to upload document:", errorData);
        showToast({
          type: "error",
          title: "Lỗi",
          message: `Không thể upload tài liệu: ${
            errorData.detail || "Lỗi không xác định"
          }`,
        });
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi upload tài liệu",
      });
    }
  };

  const confirmDeleteDocument = async () => {
    if (!deleteConfirmDialog.documentId) return;

    try {
      await deleteDocument(fetchLike, deleteConfirmDialog.documentId);
      await queryClient.invalidateQueries({ queryKey: ["library-data"] });
      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã xóa tài liệu thành công",
      });
      setDeleteConfirmDialog({ isOpen: false, documentId: null });
    } catch (error) {
      console.error("Error deleting document:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi xóa tài liệu",
      });
      setDeleteConfirmDialog({ isOpen: false, documentId: null });
    }
  };

  const confirmDeleteLecture = async () => {
    if (!deleteLectureDialog.lectureId || !authFetch) return;

    try {
      const response = await authFetch(
        getFullUrl(
          `${API_ENDPOINTS.LECTURES}/${deleteLectureDialog.lectureId}`
        ),
        { method: "DELETE" }
      );
      if (response.ok) {
        showToast({
          type: "success",
          title: "Thành công",
          message: "Đã xóa tài liệu thành công",
        });
        await queryClient.invalidateQueries({
          queryKey: ["library-data"],
        });
        setDeleteLectureDialog({ isOpen: false, lectureId: null });
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast({
          type: "error",
          title: "Lỗi",
          message: errorData.detail || "Không thể xóa tài liệu",
        });
        setDeleteLectureDialog({ isOpen: false, lectureId: null });
      }
    } catch (error) {
      console.error("Error deleting lecture:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi xóa tài liệu",
      });
      setDeleteLectureDialog({ isOpen: false, lectureId: null });
    }
  };

  // Filter lectures based on search and selected subject
  const filteredLectures = lectures.filter((lecture) => {
    const matchesSearch =
      lecture.title.toLowerCase().includes(query.toLowerCase()) ||
      lecture.description?.toLowerCase().includes(query.toLowerCase()) ||
      lecture.subject_name?.toLowerCase().includes(query.toLowerCase());
    const matchesSubject =
      selectedSubject === "all" ||
      (selectedSubjectId !== null &&
        lecture.subject_id === selectedSubjectId) ||
      (selectedSubject !== "all" &&
        subjects.find((s) => s.code === selectedSubject)?.id ===
          lecture.subject_id);

    return matchesSearch && matchesSubject;
  });

  const documentTypes = [
    { value: "all", label: "Tất cả loại" },
    { value: "textbook", label: "Giáo trình" },
    { value: "lecture_notes", label: "Tài liệu" },
    { value: "reference", label: "Tài liệu tham khảo" },
    { value: "exercise", label: "Bài tập" },
    { value: "exam", label: "Đề thi" },
    { value: "presentation", label: "Slide thuyết trình" },
    { value: "video", label: "Video" },
    { value: "audio", label: "Audio" },
    { value: "other", label: "Khác" },
  ];

  // Loading state: Hiển thị spinner LẦN ĐẦU TIÊN
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="xl" text="Đang tải thư viện..." />
      </div>
    );
  }

  // Error state: Hiển thị thông báo lỗi, useQuery sẽ dừng gọi sau khi retry thất bại
  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card text-card-foreground rounded-lg shadow-lg border border-border p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Không thể tải dữ liệu
          </h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi khi tải dữ liệu thư viện"}
          </p>
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["library-data"] })
            }
            className="px-4 py-2 bg-[hsl(var(--primary))] text-primary-foreground rounded-lg hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] mb-2 poppins-bold">
                Thư viện môn học
              </h1>
              <p className="text-muted-foreground">
                Quản lý và tìm kiếm tài liệu học tập cho các môn học
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["library-data"] })
                }
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
                title="Làm mới"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-muted hover:bg-muted/70 text-foreground px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload File</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-primary-foreground px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>Thêm tài liệu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters - Only show when a subject is selected */}
        {selectedSubject !== "all" && (
          <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border p-4 md:p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm tài liệu, tác giả, môn học..."
                    className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-3 md:space-x-4">
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Bộ lọc</span>
                  </span>
                  {/* Subject Filter */}
                  <Select
                    value={selectedSubject}
                    onValueChange={(value) => setSelectedSubject(value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Tất cả môn học" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả môn học</SelectItem>
                      {subjects
                        .filter((subject) => subject.code)
                        .map((subject) => (
                          <SelectItem key={subject.id} value={subject.code!}>
                            {subject.code} - {subject.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {/* Category Filter */}
                  <Select
                    value={selectedDocumentType}
                    onValueChange={(value) => setSelectedDocumentType(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tất cả loại" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subject Statistics - Only show when no subject is selected */}
        {subjectsWithDocumentCount.length > 0 && selectedSubject === "all" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {subjectsWithDocumentCount
              .filter((subject) => subject.code)
              .map((subject) => (
                <div
                  key={subject.id}
                  className="bg-card text-card-foreground rounded-lg shadow-sm p-6 border border-border hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {subject.code}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subject.name}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-2">
                      {subject.total_documents} tài liệu
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSubject(subject.code!)}
                    className="mt-4 w-full bg-primary/10 hover:bg-primary/20 text-primary py-2 px-3 rounded-md text-sm font-medium transition-colors"
                  >
                    Xem tài liệu
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* Documents List - Only show when a subject is selected */}
        {selectedSubject !== "all" && (
          <div className="bg-card text-card-foreground rounded-lg shadow-sm border border-border overflow-hidden">
            {/* Header with Back Button */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 px-6 py-5 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedSubject("all")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-card text-card-foreground hover:bg-background/70 rounded-lg border border-border shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="font-medium">Quay lại</span>
                  </button>
                  <div className="h-6 w-px bg-border"></div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Môn học
                    </p>
                    <h2 className="text-2xl font-bold text-foreground">
                      {subjects.find((s) => s.code === selectedSubject)?.name ||
                        selectedSubject}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {subjects.find((s) => s.code === selectedSubject)?.code ||
                        ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Tổng số tài liệu
                  </p>
                  <p className="text-2xl font-bold text-[hsl(var(--primary))]">
                    {filteredLectures.length}
                  </p>
                </div>
              </div>
            </div>
            {filteredLectures.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">
                  {selectedSubject !== "all"
                    ? `Môn học ${
                        subjects.find((s) => s.code === selectedSubject)
                          ?.name || selectedSubject
                      } chưa có tài liệu`
                    : lectures.length === 0
                    ? "Chưa có tài liệu"
                    : "Không tìm thấy tài liệu"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedSubject !== "all"
                    ? `Hiện tại môn học này chưa có tài liệu nào. Hãy thêm tài liệu cho môn học này.`
                    : lectures.length === 0
                    ? "Hãy thêm tài liệu đầu tiên vào thư viện."
                    : "Không tìm thấy tài liệu nào phù hợp với bộ lọc."}
                </p>
                {(isAdmin || hasRole(session, "instructor")) && (
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        if (selectedSubject !== "all") {
                          // Find subject_id from subject_code
                          const subject = subjects.find(
                            (s) => s.code === selectedSubject
                          );
                          if (subject) {
                            // Set selected subject ID and open create modal
                            setSelectedSubjectId(subject.id);
                            setShowCreateModal(true);
                          }
                        } else {
                          // If no subject selected, show create lecture modal
                          setSelectedSubjectId(null);
                          setShowCreateModal(true);
                        }
                      }}
                      className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-primary-foreground px-4 py-2 rounded-md"
                    >
                      {selectedSubject !== "all"
                        ? "Thêm tài liệu cho môn này"
                        : "Thêm tài liệu đầu tiên"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tài liệu
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Môn học
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Loại
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Trạng thái
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      File
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ngày tạo
                    </TableHead>
                    <TableHead className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLectures.map((lecture) => {
                    const subject = subjects.find(
                      (s) => s.id === lecture.subject_id
                    );
                    return (
                      <TableRow key={lecture.id} className="hover:bg-muted/40">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <FileText className="h-10 w-10 text-blue-500" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">
                                {lecture.title}
                              </div>
                              {lecture.description && (
                                <div className="text-sm text-muted-foreground">
                                  {lecture.description}
                                </div>
                              )}
                              {lecture.uploader_name && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Người tải: {lecture.uploader_name}
                                </div>
                              )}
                              {lecture.chapter_number &&
                                lecture.chapter_title && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Chương {lecture.chapter_number}:{" "}
                                    {lecture.chapter_title}
                                  </div>
                                )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {subject?.code || `Môn ${lecture.subject_id}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {subject?.name || lecture.subject_name}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                            {lecture.file_type?.toUpperCase() || "FILE"}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              lecture.is_published
                                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                : "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                            }`}
                          >
                            {lecture.is_published ? "Đã đăng" : "Nháp"}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {lecture.file_url ? (
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-1 text-blue-500" />
                                <a
                                  href={lecture.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                >
                                  Xem file
                                </a>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Không có file
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {lecture.created_at
                            ? new Date(lecture.created_at).toLocaleDateString(
                                "vi-VN"
                              )
                            : "N/A"}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {lecture.file_url && (
                              <button
                                onClick={() =>
                                  window.open(lecture.file_url, "_blank")
                                }
                                className="text-green-500 hover:text-green-400"
                                title="Xem file"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            {(isAdmin ||
                              lecture.uploaded_by ===
                                (user as { id?: number })?.id) && (
                              <>
                                <button
                                  onClick={() => setEditingLecture(lecture)}
                                  className="text-blue-500 hover:text-blue-400"
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteLectureDialog({
                                      isOpen: true,
                                      lectureId: lecture.id,
                                    });
                                  }}
                                  className="text-red-500 hover:text-red-400"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setShowUploadModal(false);
            }
          }}
        >
          <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border shadow-2xl p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Upload tài liệu
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-1">
                    Chọn file hoặc nhập nội dung để thêm tài liệu vào thư viện
                  </DialogDescription>
                </div>
                <DialogClose className="text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                  <X className="h-6 w-6" />
                </DialogClose>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6">
              <FileUploadForm
                subjects={subjects}
                onSubmit={handleUploadDocument}
                onCancel={() => setShowUploadModal(false)}
                authFetch={authFetch}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create/Edit Lecture Modal */}
      {showCreateModal && (
        <CreateLectureModal
          subjects={subjects.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code || `SUB${s.id}`,
            lecture_count: s.lecture_count || 0,
          }))}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedSubjectId(null);
          }}
          onSuccess={async () => {
            setShowCreateModal(false);
            setSelectedSubjectId(null);
            await queryClient.invalidateQueries({ queryKey: ["library-data"] });
            showToast({
              type: "success",
              title: "Thành công",
              message: "Đã tạo tài liệu thành công",
            });
          }}
          authFetch={authFetch}
          lecture={
            selectedSubjectId
              ? ({
                  subject_id: selectedSubjectId,
                } as Lecture)
              : null
          }
        />
      )}

      {/* Edit Lecture Modal */}
      {editingLecture && (
        <CreateLectureModal
          subjects={subjects.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code || `SUB${s.id}`,
            lecture_count: s.lecture_count || 0,
          }))}
          lecture={editingLecture}
          onClose={() => setEditingLecture(null)}
          onSuccess={async () => {
            setEditingLecture(null);
            await queryClient.invalidateQueries({ queryKey: ["library-data"] });
            showToast({
              type: "success",
              title: "Thành công",
              message: "Đã cập nhật tài liệu thành công",
            });
          }}
          authFetch={authFetch}
        />
      )}

      {/* Delete Document Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, documentId: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Bạn có chắc chắn muốn xóa tài liệu này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Hủy</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDeleteDocument}>
                Xóa
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lecture Confirmation Dialog */}
      <AlertDialog
        open={deleteLectureDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteLectureDialog({ isOpen: false, lectureId: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Bạn có chắc chắn muốn xóa tài liệu này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Hủy</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDeleteLecture}>
                Xóa
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Document Modal */}
      {editingDocument && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              handleCloseEditModal();
            }
          }}
        >
          <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border shadow-2xl p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Chỉnh sửa tài liệu
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-1">
                    Cập nhật thông tin và nội dung tài liệu đã chọn
                  </DialogDescription>
                </div>
                <DialogClose className="text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                  <X className="h-6 w-6" />
                </DialogClose>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6">
              <EditDocumentForm
                document={editingDocument}
                subjects={subjects}
                onSubmit={handleEditSubmit}
                onCancel={handleCloseEditModal}
                authFetch={authFetch}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Chapter Selector Component (Simple - Only for selecting existing chapters)
interface Chapter {
  chapter_number: number;
  chapter_title: string;
}

interface ChapterSelectorProps {
  subjectCode: string;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  selectedChapterNumber?: number;
  onChapterChange: (chapterNumber?: number, chapterTitle?: string) => void;
}

function ChapterSelector({
  subjectCode,
  authFetch,
  selectedChapterNumber,
  onChapterChange,
}: ChapterSelectorProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, [subjectCode, authFetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner size="sm" />
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Môn học này chưa có chương nào
            </p>
            <p className="text-xs text-yellow-700 mt-1 mb-3">
              Vui lòng tạo chương trong trang Quản lý môn học trước
            </p>
            <Link
              href={`/admin/subjects?subject_code=${subjectCode}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--primary))] text-primary-foreground text-xs rounded-md hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Chuyển đến Quản lý môn học</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1">
        Chương{" "}
        <span className="text-muted-foreground/70 text-xs">(Tùy chọn)</span>
      </label>
      <Select
        value={selectedChapterNumber ? `${selectedChapterNumber}` : ""}
        onValueChange={(value) => {
          if (value) {
            const chapter = chapters.find(
              (c) => c.chapter_number === Number(value)
            );
            onChapterChange(chapter?.chapter_number, chapter?.chapter_title);
          } else {
            onChapterChange(undefined, undefined);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Chọn chương" />
        </SelectTrigger>
        <SelectContent>
          {chapters.map((chapter) => (
            <SelectItem
              key={chapter.chapter_number}
              value={chapter.chapter_number.toString()}
            >
              Chương {chapter.chapter_number}: {chapter.chapter_title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// File Upload Form Component
function FileUploadForm({
  subjects,
  onSubmit,
  onCancel,
  authFetch,
}: {
  subjects: Subject[];
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    subject_code: string;
    document_type: string;
    author: string;
    tags: string;
    semester: string;
    academic_year: string;
    chapter: string;
    chapter_number?: number;
    chapter_title: string;
    content_html: string; // Rich text editor content
  }>({
    title: "",
    description: "",
    subject_code: "",
    document_type: "textbook",
    author: "",
    tags: "",
    semester: "",
    academic_year: "2024-2025",
    chapter: "",
    chapter_number: undefined,
    chapter_title: "",
    content_html: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submit
    if (uploading) return;

    // Validation: must have either file or content_html (or both)
    if (!selectedFile && !formData.content_html.trim()) {
      showToast({
        type: "warning",
        title: "Cảnh báo",
        message: "Vui lòng chọn file hoặc nhập nội dung (hoặc cả hai)",
      });
      return;
    }

    const subject = subjects.find((s) => s.code === formData.subject_code);
    if (!subject) {
      showToast({
        type: "warning",
        title: "Cảnh báo",
        message: "Vui lòng chọn môn học",
      });
      return;
    }

    setUploading(true);

    const uploadData = new FormData();
    if (selectedFile) {
      uploadData.append("file", selectedFile);
    }
    uploadData.append("title", formData.title);
    uploadData.append("description", formData.description);
    uploadData.append("subject_code", formData.subject_code);
    uploadData.append("subject_name", subject.name);
    uploadData.append("document_type", formData.document_type);
    uploadData.append("author", formData.author);
    uploadData.append("tags", formData.tags);
    if (formData.content_html.trim()) {
      uploadData.append("content_html", formData.content_html);
    }
    uploadData.append("semester", formData.semester);
    uploadData.append("academic_year", formData.academic_year);
    uploadData.append("chapter", formData.chapter);
    if (
      formData.chapter_number !== undefined &&
      formData.chapter_number !== null
    ) {
      uploadData.append("chapter_number", String(formData.chapter_number));
    }
    uploadData.append("chapter_title", formData.chapter_title);

    try {
      await onSubmit(uploadData);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const documentTypes = [
    { value: "textbook", label: "Giáo trình" },
    { value: "lecture_notes", label: "Tài liệu" },
    { value: "reference", label: "Tài liệu tham khảo" },
    { value: "exercise", label: "Bài tập" },
    { value: "exam", label: "Đề thi" },
    { value: "presentation", label: "Slide thuyết trình" },
    { value: "video", label: "Video" },
    { value: "audio", label: "Audio" },
    { value: "other", label: "Khác" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info Alert */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary mb-1">
              💡 Hướng dẫn
            </p>
            <p className="text-sm text-primary/90">
              Vui lòng chọn <strong>file</strong> hoặc nhập{" "}
              <strong>nội dung Rich Text Editor</strong> (hoặc cả hai) để tạo
              tài liệu.
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <Field>
        <FieldLabel>
          Chọn file để upload{" "}
          <span className="text-muted-foreground/70 text-xs">
            (Tùy chọn - hoặc nhập nội dung Rich Text Editor)
          </span>
        </FieldLabel>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-primary/50 bg-primary/10"
              : selectedFile
              ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
              : "border-border hover:border-muted-foreground/60"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.mp3,.wav,.zip,.rar"
          />

          {selectedFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <FileText className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-sm text-red-500 hover:text-red-400"
              >
                Xóa file
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary/80 font-medium">
                    Nhấn để chọn file
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    hoặc kéo thả file vào đây
                  </span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Hỗ trợ: PDF, Word, PowerPoint, Excel, Ảnh, Video, Audio, ZIP
                (tối đa 100MB)
              </p>
            </div>
          )}
        </div>
      </Field>

      {/* Form Fields */}
      <FieldGroup>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="library-upload-title">
              Tiêu đề <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="library-upload-title"
              type="text"
              required
              className="w-full"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="library-upload-subject">
              Môn học <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={formData.subject_code}
              onValueChange={(value) =>
                setFormData({ ...formData, subject_code: value })
              }
              required
            >
              <SelectTrigger id="library-upload-subject" className="w-full">
                <SelectValue placeholder="Chọn môn học" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.code} value={subject.code || ""}>
                    {subject.code} - {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="library-upload-description">
            Mô tả{" "}
            <span className="text-muted-foreground/70 text-xs">(Tùy chọn)</span>
          </FieldLabel>
          <Textarea
            id="library-upload-description"
            rows={3}
            className="w-full"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </Field>

        {/* Rich Text Editor Section */}
        <Field>
          <FieldLabel htmlFor="library-upload-content">
            Nội dung Rich Text Editor{" "}
            <span className="text-muted-foreground/70 text-xs">(Tùy chọn)</span>
          </FieldLabel>
          <p className="text-xs text-muted-foreground mb-2">
            Bạn có thể nhập nội dung bằng Rich Text Editor, tải lên file, hoặc
            cả hai
          </p>
          <TiptapEditor
            content={formData.content_html}
            onChange={(content) =>
              setFormData({ ...formData, content_html: content })
            }
            placeholder="Nhập nội dung hoặc để trống nếu chỉ tải file..."
            className="w-full"
          />
        </Field>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="library-upload-document-type">
              Loại tài liệu <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={formData.document_type}
              onValueChange={(value) =>
                setFormData({ ...formData, document_type: value })
              }
              required
            >
              <SelectTrigger
                id="library-upload-document-type"
                className="w-full"
              >
                <SelectValue placeholder="Chọn loại tài liệu" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="library-upload-author">
              Tác giả <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="library-upload-author"
              type="text"
              required
              className="w-full"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Field>
            <FieldLabel htmlFor="library-upload-semester">
              Học kỳ{" "}
              <span className="text-muted-foreground/70 text-xs">
                (Tùy chọn)
              </span>
            </FieldLabel>
            <Input
              id="library-upload-semester"
              type="text"
              placeholder="1, 2, 3..."
              className="w-full"
              value={formData.semester}
              onChange={(e) =>
                setFormData({ ...formData, semester: e.target.value })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="library-upload-academic-year">
              Năm học{" "}
              <span className="text-muted-foreground/70 text-xs">
                (Tùy chọn)
              </span>
            </FieldLabel>
            <Input
              id="library-upload-academic-year"
              type="text"
              placeholder="2024-2025"
              className="w-full"
              value={formData.academic_year}
              onChange={(e) =>
                setFormData({ ...formData, academic_year: e.target.value })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="library-upload-chapter-number">
              Số chương{" "}
              <span className="text-muted-foreground/70 text-xs">
                (Tùy chọn)
              </span>
            </FieldLabel>
            <Input
              id="library-upload-chapter-number"
              type="number"
              min="1"
              placeholder="1, 2, 3..."
              className="w-full"
              value={formData.chapter_number || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  chapter_number: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
            />
          </Field>
        </div>

        {/* Chapter Selector */}
        {formData.subject_code && (
          <ChapterSelector
            subjectCode={formData.subject_code}
            authFetch={authFetch}
            selectedChapterNumber={formData.chapter_number}
            onChapterChange={(chapterNumber, chapterTitle) => {
              setFormData({
                ...formData,
                chapter_number: chapterNumber,
                chapter_title: chapterTitle || "",
              });
            }}
          />
        )}

        <Field>
          <FieldLabel htmlFor="library-upload-tags">
            Tags (phân cách bằng dấu phẩy){" "}
            <span className="text-muted-foreground/70 text-xs">(Tùy chọn)</span>
          </FieldLabel>
          <Input
            id="library-upload-tags"
            type="text"
            placeholder="tag1, tag2, tag3"
            className="w-full"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
        </Field>

        <Field orientation="horizontal" className="justify-end pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted/60 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={
              uploading || (!selectedFile && !formData.content_html.trim())
            }
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center space-x-2"
          >
            {uploading ? (
              <>
                <Spinner size="sm" inline />
                <span>Đang upload...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload tài liệu</span>
              </>
            )}
          </button>
        </Field>
      </FieldGroup>
    </form>
  );
}

// Edit Document Form Component
function EditDocumentForm({
  document,
  subjects,
  onSubmit,
  onCancel,
  authFetch,
}: {
  document: LibraryDocument;
  subjects: Subject[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    title: document.title,
    description: document.description || "",
    subject_code: document.subject_code,
    document_type: document.document_type,
    author: document.author,
    tags: document.tags.join(", "),
    semester: document.semester || "",
    academic_year: document.academic_year || "",
    chapter: document.chapter || "",
    chapter_number: document.chapter_number,
    chapter_title: document.chapter_title || "",
    status: document.status,
    content_html:
      (document as LibraryDocument & { content_html?: string }).content_html ||
      "", // Rich text editor content
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subject = subjects.find((s) => s.code === formData.subject_code);
    if (!subject) {
      showToast({
        type: "warning",
        title: "Cảnh báo",
        message: "Vui lòng chọn môn học",
      });
      return;
    }

    const submitData = {
      ...formData,
      subject_name: subject.name,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
    };

    onSubmit(submitData);
  };

  const documentTypes = [
    { value: "textbook", label: "Giáo trình" },
    { value: "lecture_notes", label: "Tài liệu" },
    { value: "reference", label: "Tài liệu tham khảo" },
    { value: "exercise", label: "Bài tập" },
    { value: "exam", label: "Đề thi" },
    { value: "presentation", label: "Slide thuyết trình" },
    { value: "video", label: "Video" },
    { value: "audio", label: "Audio" },
    { value: "other", label: "Khác" },
  ];

  const statusOptions = [
    { value: "draft", label: "Nháp" },
    { value: "published", label: "Đã xuất bản" },
    { value: "under_review", label: "Đang xem xét" },
    { value: "archived", label: "Lưu trữ" },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="library-edit-title">
              Tiêu đề <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="library-edit-title"
              type="text"
              required
              className="w-full"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="library-edit-author">
              Tác giả <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="library-edit-author"
              type="text"
              required
              className="w-full"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="library-edit-description">
            Mô tả{" "}
            <span className="text-muted-foreground/70 text-xs">(Tùy chọn)</span>
          </FieldLabel>
          <Textarea
            id="library-edit-description"
            rows={3}
            className="w-full"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </Field>

        {/* Rich Text Editor Section */}
        <Field>
          <FieldLabel htmlFor="library-edit-content">
            Nội dung Rich Text Editor{" "}
            <span className="text-muted-foreground/70 text-xs">(Tùy chọn)</span>
          </FieldLabel>
          <p className="text-xs text-muted-foreground mb-2">
            Bạn có thể chỉnh sửa nội dung bằng Rich Text Editor
          </p>
          <TiptapEditor
            content={formData.content_html}
            onChange={(content) =>
              setFormData({ ...formData, content_html: content })
            }
            placeholder="Nhập nội dung..."
            className="w-full"
          />
        </Field>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Field>
            <FieldLabel htmlFor="library-edit-subject">
              Môn học <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={formData.subject_code}
              onValueChange={(value) =>
                setFormData({ ...formData, subject_code: value })
              }
              required
            >
              <SelectTrigger id="library-edit-subject" className="w-full">
                <SelectValue placeholder="Chọn môn học" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.code || ""}>
                    {subject.code} - {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="library-edit-document-type">
              Loại tài liệu <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={formData.document_type}
              onValueChange={(value) =>
                setFormData({ ...formData, document_type: value })
              }
              required
            >
              <SelectTrigger id="library-edit-document-type" className="w-full">
                <SelectValue placeholder="Chọn loại tài liệu" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="library-edit-status">Trạng thái</FieldLabel>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger id="library-edit-status" className="w-full">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Field>
            <FieldLabel htmlFor="library-edit-semester">
              Học kỳ{" "}
              <span className="text-muted-foreground/70 text-xs">
                (Tùy chọn)
              </span>
            </FieldLabel>
            <Input
              id="library-edit-semester"
              type="text"
              placeholder="1, 2, 3..."
              className="w-full"
              value={formData.semester}
              onChange={(e) =>
                setFormData({ ...formData, semester: e.target.value })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="library-edit-academic-year">
              Năm học{" "}
              <span className="text-muted-foreground/70 text-xs">
                (Tùy chọn)
              </span>
            </FieldLabel>
            <Input
              id="library-edit-academic-year"
              type="text"
              placeholder="2024-2025"
              className="w-full"
              value={formData.academic_year}
              onChange={(e) =>
                setFormData({ ...formData, academic_year: e.target.value })
              }
            />
          </Field>
        </div>

        {/* Chapter Selector */}
        {formData.subject_code && (
          <ChapterSelector
            subjectCode={formData.subject_code}
            authFetch={authFetch}
            selectedChapterNumber={formData.chapter_number}
            onChapterChange={(chapterNumber, chapterTitle) => {
              setFormData({
                ...formData,
                chapter_number: chapterNumber,
                chapter_title: chapterTitle || "",
              });
            }}
          />
        )}

        <Field>
          <FieldLabel htmlFor="library-edit-tags">
            Tags (phân cách bằng dấu phẩy){" "}
            <span className="text-muted-foreground/70 text-xs">(Tùy chọn)</span>
          </FieldLabel>
          <Input
            id="library-edit-tags"
            type="text"
            placeholder="tag1, tag2, tag3"
            className="w-full"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
        </Field>

        <Field orientation="horizontal" className="justify-end pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted/60"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Cập nhật
          </button>
        </Field>
      </FieldGroup>
    </form>
  );
}
