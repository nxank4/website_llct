"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAuthFetch, hasRole } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Upload,
  Search,
  Download,
  Eye,
  X,
  RefreshCw,
  Filter,
  ArrowLeft,
} from "lucide-react";
import {
  listDocuments,
  listSubjects,
  createDocument,
  updateDocument,
  deleteDocument,
  incrementDownloadAndGetUrl,
} from "@/services/library";
import Spinner from "@/components/ui/Spinner";

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

interface Subject {
  id: string;
  code: string;
  name: string;
  description?: string;
  department?: string;
  faculty?: string;
  prerequisite_subjects: string[];
  primary_instructor_id?: string;
  instructors: string[];
  total_documents: number;
  total_students: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminLibraryPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const authFetch = useAuthFetch();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedDocumentType, setSelectedDocumentType] =
    useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<LibraryDocument | null>(null);

  const isAdmin = hasRole(session, "admin");

  // SWR fetcher tổng hợp documents + subjects
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["library-data"],
    queryFn: async () => {
      const [documentsData, subjectsData] = await Promise.all([
        listDocuments(authFetch),
        listSubjects(authFetch),
      ]);
      return {
        documents: Array.isArray(documentsData) ? documentsData : [],
        subjects: Array.isArray(subjectsData) ? subjectsData : [],
      };
    },
    enabled: Boolean(authFetch),
    retry: false, // Disable retry at query level (handled by provider)
  });

  const documents = (data?.documents as LibraryDocument[]) ?? [];
  const subjects = (data?.subjects as Subject[]) ?? [];

  // Handler functions to avoid inline functions
  const handleCloseCreateModal = () => setShowCreateModal(false);
  const handleCloseEditModal = () => setEditingDocument(null);
  const handleOpenEditModal = (document: LibraryDocument) =>
    setEditingDocument(document);
  const handleEditSubmit = (data: Record<string, unknown>) => {
    if (editingDocument) {
      handleUpdateDocument(editingDocument.id, data);
    }
  };
  // Không cần fetchData/useEffect—SWR xử lý

  const handleCreateDocument = async (
    documentData: Record<string, unknown>
  ) => {
    try {
      await createDocument(authFetch, documentData);
      await queryClient.invalidateQueries({ queryKey: ["library-data"] });
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating document:", error);
      alert("Lỗi khi tạo tài liệu");
    }
  };

  const handleUpdateDocument = async (
    documentId: string,
    documentData: Record<string, unknown>
  ) => {
    try {
      await updateDocument(authFetch, documentId, documentData);
      await queryClient.invalidateQueries({ queryKey: ["library-data"] });
      setEditingDocument(null);
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Lỗi khi cập nhật tài liệu");
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
        alert("Upload tài liệu thành công!");
      } else {
        const errorData = await response.json();
        console.error("Failed to upload document:", errorData);
        alert(
          `Không thể upload tài liệu: ${
            errorData.detail || "Lỗi không xác định"
          }`
        );
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Lỗi khi upload tài liệu");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) return;

    try {
      await deleteDocument(authFetch, documentId);
      await queryClient.invalidateQueries({ queryKey: ["library-data"] });
      alert("Đã xóa tài liệu thành công");
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Lỗi khi xóa tài liệu");
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      // First, increment download count
      const data = await incrementDownloadAndGetUrl(authFetch, documentId);
      if (data.file_url) {
        window.open(
          data.file_url.startsWith("http")
            ? data.file_url
            : `${location.origin}${data.file_url}`,
          "_blank"
        );
        await queryClient.invalidateQueries({ queryKey: ["library-data"] });
      } else {
        alert("File không tồn tại");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Lỗi khi tải file");
    }
  };

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(query.toLowerCase()) ||
      doc.author.toLowerCase().includes(query.toLowerCase()) ||
      doc.subject_name.toLowerCase().includes(query.toLowerCase());
    const matchesSubject =
      selectedSubject === "all" || doc.subject_code === selectedSubject;
    const matchesType =
      selectedDocumentType === "all" ||
      doc.document_type === selectedDocumentType;

    return matchesSearch && matchesSubject && matchesType;
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

  const getDocumentTypeLabel = (type: string) => {
    const docType = documentTypes.find((t) => t.value === type);
    return docType ? docType.label : type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "published":
        return "Đã xuất bản";
      case "draft":
        return "Nháp";
      case "under_review":
        return "Đang xem xét";
      case "archived":
        return "Lưu trữ";
      default:
        return status;
    }
  };

  // Loading state: Hiển thị spinner LẦN ĐẦU TIÊN
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" text="Đang tải thư viện..." />
      </div>
    );
  }

  // Error state: Hiển thị thông báo lỗi, useQuery sẽ dừng gọi sau khi retry thất bại
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Không thể tải dữ liệu
          </h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi khi tải dữ liệu thư viện"}
          </p>
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["library-data"] })
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
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
                Thư viện môn học
              </h1>
              <p className="text-gray-600">
                Quản lý và tìm kiếm tài liệu học tập cho các môn học
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["library-data"] })
                }
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Làm mới"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload File</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>Thêm tài liệu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters - Only show when a subject is selected */}
        {selectedSubject !== "all" && (
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm tài liệu, tác giả, môn học..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-3 md:space-x-4">
                  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Bộ lọc</span>
                  </span>
                  {/* Subject Filter */}
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                  >
                    <option value="all">Tất cả môn học</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.code}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                  </select>
                  {/* Category Filter */}
                  <select
                    value={selectedDocumentType}
                    onChange={(e) => setSelectedDocumentType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subject Statistics - Only show when no subject is selected */}
        {subjects.length > 0 && selectedSubject === "all" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {subject.code}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{subject.name}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {subject.total_documents} tài liệu
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSubject(subject.code)}
                  className="mt-4 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                >
                  Xem tài liệu
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Documents List - Only show when a subject is selected */}
        {selectedSubject !== "all" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Header with Back Button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedSubject("all")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 rounded-lg border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="font-medium">Quay lại</span>
                  </button>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Môn học</p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {subjects.find((s) => s.code === selectedSubject)?.name ||
                        selectedSubject}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {subjects.find((s) => s.code === selectedSubject)?.code ||
                        ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Tổng số tài liệu</p>
                  <p className="text-2xl font-bold text-[#125093]">
                    {filteredDocuments.length}
                  </p>
                </div>
              </div>
            </div>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {selectedSubject !== "all"
                    ? `Môn học ${
                        subjects.find((s) => s.code === selectedSubject)
                          ?.name || selectedSubject
                      } chưa có tài liệu`
                    : documents.length === 0
                    ? "Chưa có tài liệu"
                    : "Không tìm thấy tài liệu"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedSubject !== "all"
                    ? `Hiện tại môn học này chưa có tài liệu nào. Hãy thêm tài liệu cho môn học này.`
                    : documents.length === 0
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
                            // Navigate to lectures page to create lecture
                            router.push(
                              `/admin/lectures?subject_id=${subject.id}`
                            );
                          }
                        } else {
                          // If no subject selected, show create document modal
                          setShowCreateModal(true);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      {selectedSubject !== "all"
                        ? (() => {
                            // Check if there are documents with chapters
                            const docsWithChapters = filteredDocuments.filter(
                              (doc) => doc.chapter_number
                            );
                            if (docsWithChapters.length > 0) {
                              // Get the first chapter number found
                              const firstChapter =
                                docsWithChapters[0].chapter_number;
                              return `Thêm tài liệu cho chương ${firstChapter} môn này`;
                            }
                            return "Thêm tài liệu cho môn này";
                          })()
                        : "Thêm tài liệu đầu tiên"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tài liệu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Môn học
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loại
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thống kê
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày tạo
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDocuments.map((document) => (
                      <tr key={document.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <FileText className="h-10 w-10 text-blue-500" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {document.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {document.description}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Tác giả: {document.author}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {document.subject_code}
                          </div>
                          <div className="text-sm text-gray-500">
                            {document.subject_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {getDocumentTypeLabel(document.document_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              document.status
                            )}`}
                          >
                            {getStatusLabel(document.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {document.file_url ? (
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-1 text-blue-500" />
                                <span className="text-xs font-medium">
                                  {document.file_name}
                                </span>
                              </div>
                              {document.file_size && (
                                <div className="text-xs text-gray-400">
                                  {(document.file_size / (1024 * 1024)).toFixed(
                                    2
                                  )}{" "}
                                  MB
                                </div>
                              )}
                              <button
                                onClick={() => handleDownload(document.id)}
                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Tải xuống
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Không có file
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              {document.view_count}
                            </div>
                            <div className="flex items-center">
                              <Download className="h-4 w-4 mr-1" />
                              {document.download_count}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(document.created_at).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {/* View Lectures Button */}
                            <button
                              onClick={() => {
                                // Find subject_id from subject_code
                                const subject = subjects.find(
                                  (s) => s.code === document.subject_code
                                );
                                if (subject) {
                                  // Navigate to lectures page with filters
                                  const params = new URLSearchParams();
                                  params.append("subject_id", subject.id);
                                  if (document.chapter_number) {
                                    params.append(
                                      "chapter_number",
                                      document.chapter_number.toString()
                                    );
                                  }
                                  if (document.chapter_title) {
                                    params.append(
                                      "chapter_title",
                                      document.chapter_title
                                    );
                                  }
                                  router.push(
                                    `/admin/lectures?${params.toString()}`
                                  );
                                }
                              }}
                              className="text-purple-600 hover:text-purple-900"
                              title="Xem tài liệu"
                            >
                              <BookOpen className="h-4 w-4" />
                            </button>
                            {document.file_url && (
                              <button
                                onClick={() => handleDownload(document.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Tải xuống"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                            {(isAdmin ||
                              document.instructor_id ===
                                (user as { id?: string })?.id) && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(document)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteDocument(document.id)
                                  }
                                  className="text-red-600 hover:text-red-900"
                                  title="Xóa"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Upload tài liệu
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <FileUploadForm
              subjects={subjects}
              onSubmit={handleUploadDocument}
              onCancel={() => setShowUploadModal(false)}
            />
          </div>
        </div>
      )}

      {/* Create Document Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Thêm tài liệu mới
              </h3>
              <button
                onClick={handleCloseCreateModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <CreateDocumentForm
              subjects={subjects}
              onSubmit={handleCreateDocument}
              onCancel={handleCloseCreateModal}
            />
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDocument && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Chỉnh sửa tài liệu
              </h3>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <EditDocumentForm
              document={editingDocument}
              subjects={subjects}
              onSubmit={handleEditSubmit}
              onCancel={handleCloseEditModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Create Document Form Component
function CreateDocumentForm({
  subjects,
  onSubmit,
  onCancel,
}: {
  subjects: Subject[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
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
    status: "draft",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subject = subjects.find((s) => s.code === formData.subject_code);
    if (!subject) {
      alert("Vui lòng chọn môn học");
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tác giả <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.author}
            onChange={(e) =>
              setFormData({ ...formData, author: e.target.value })
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Môn học <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.subject_code}
            onChange={(e) =>
              setFormData({ ...formData, subject_code: e.target.value })
            }
          >
            <option value="">Chọn môn học</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.code}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loại tài liệu <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.document_type}
            onChange={(e) =>
              setFormData({ ...formData, document_type: e.target.value })
            }
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Học kỳ <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="text"
            placeholder="1, 2, 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.semester}
            onChange={(e) =>
              setFormData({ ...formData, semester: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Năm học <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="text"
            placeholder="2024-2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.academic_year}
            onChange={(e) =>
              setFormData({ ...formData, academic_year: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số chương <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="number"
            min="1"
            placeholder="1, 2, 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiêu đề chương{" "}
          <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <input
          type="text"
          placeholder="Ví dụ: Giới thiệu về Mác-Lênin"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.chapter_title || ""}
          onChange={(e) =>
            setFormData({ ...formData, chapter_title: e.target.value })
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (phân cách bằng dấu phẩy){" "}
          <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <input
          type="text"
          placeholder="tag1, tag2, tag3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trạng thái{" "}
          <span className="text-gray-400 text-xs">(Mặc định: Nháp)</span>
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        >
          <option value="draft">Nháp</option>
          <option value="published">Đã xuất bản</option>
          <option value="archived">Lưu trữ</option>
        </select>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Tạo tài liệu
        </button>
      </div>
    </form>
  );
}

// File Upload Form Component
function FileUploadForm({
  subjects,
  onSubmit,
  onCancel,
}: {
  subjects: Subject[];
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
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
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("Vui lòng chọn file để upload");
      return;
    }

    const subject = subjects.find((s) => s.code === formData.subject_code);
    if (!subject) {
      alert("Vui lòng chọn môn học");
      return;
    }

    setUploading(true);

    const uploadData = new FormData();
    uploadData.append("file", selectedFile);
    uploadData.append("title", formData.title);
    uploadData.append("description", formData.description);
    uploadData.append("subject_code", formData.subject_code);
    uploadData.append("subject_name", subject.name);
    uploadData.append("document_type", formData.document_type);
    uploadData.append("author", formData.author);
    uploadData.append("tags", formData.tags);
    uploadData.append("semester", formData.semester);
    uploadData.append("academic_year", formData.academic_year);
    uploadData.append("chapter", formData.chapter);
    if (formData.chapter_number) {
      uploadData.append("chapter_number", formData.chapter_number.toString());
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
      {/* File Upload Area */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Chọn file để upload *
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? "border-blue-400 bg-blue-50"
              : selectedFile
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-gray-400"
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
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Xóa file
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-800 font-medium">
                    Nhấn để chọn file
                  </span>
                  <span className="text-gray-500">
                    {" "}
                    hoặc kéo thả file vào đây
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Hỗ trợ: PDF, Word, PowerPoint, Excel, Ảnh, Video, Audio, ZIP
                (tối đa 100MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Môn học <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.subject_code}
            onChange={(e) =>
              setFormData({ ...formData, subject_code: e.target.value })
            }
          >
            <option value="">Chọn môn học</option>
            {subjects.map((subject) => (
              <option key={subject.code} value={subject.code}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loại tài liệu <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.document_type}
            onChange={(e) =>
              setFormData({ ...formData, document_type: e.target.value })
            }
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tác giả <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.author}
            onChange={(e) =>
              setFormData({ ...formData, author: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Học kỳ <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="text"
            placeholder="1, 2, 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.semester}
            onChange={(e) =>
              setFormData({ ...formData, semester: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Năm học <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="text"
            placeholder="2024-2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.academic_year}
            onChange={(e) =>
              setFormData({ ...formData, academic_year: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số chương <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="number"
            min="1"
            placeholder="1, 2, 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiêu đề chương{" "}
          <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <input
          type="text"
          placeholder="Ví dụ: Giới thiệu về Mác-Lênin"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.chapter_title || ""}
          onChange={(e) =>
            setFormData({ ...formData, chapter_title: e.target.value })
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (phân cách bằng dấu phẩy){" "}
          <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <input
          type="text"
          placeholder="tag1, tag2, tag3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={uploading || !selectedFile}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Đang upload...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Upload tài liệu</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Edit Document Form Component
function EditDocumentForm({
  document,
  subjects,
  onSubmit,
  onCancel,
}: {
  document: LibraryDocument;
  subjects: Subject[];
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subject = subjects.find((s) => s.code === formData.subject_code);
    if (!subject) {
      alert("Vui lòng chọn môn học");
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tiêu đề <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tác giả <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.author}
            onChange={(e) =>
              setFormData({ ...formData, author: e.target.value })
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mô tả <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Môn học <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.subject_code}
            onChange={(e) =>
              setFormData({ ...formData, subject_code: e.target.value })
            }
          >
            <option value="">Chọn môn học</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.code}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loại tài liệu <span className="text-red-500">*</span>
          </label>
          <select
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.document_type}
            onChange={(e) =>
              setFormData({ ...formData, document_type: e.target.value })
            }
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trạng thái
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Học kỳ <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="text"
            placeholder="1, 2, 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.semester}
            onChange={(e) =>
              setFormData({ ...formData, semester: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Năm học <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="text"
            placeholder="2024-2025"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={formData.academic_year}
            onChange={(e) =>
              setFormData({ ...formData, academic_year: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số chương <span className="text-gray-400 text-xs">(Tùy chọn)</span>
          </label>
          <input
            type="number"
            min="1"
            placeholder="1, 2, 3..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tiêu đề chương{" "}
          <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <input
          type="text"
          placeholder="Ví dụ: Giới thiệu về Mác-Lênin"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.chapter_title || ""}
          onChange={(e) =>
            setFormData({ ...formData, chapter_title: e.target.value })
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (phân cách bằng dấu phẩy){" "}
          <span className="text-gray-400 text-xs">(Tùy chọn)</span>
        </label>
        <input
          type="text"
          placeholder="tag1, tag2, tag3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Cập nhật
        </button>
      </div>
    </form>
  );
}
