"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  X,
  Loader2,
  Upload,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";

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
  created_at?: string;
  updated_at?: string;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  lecture_count: number;
}

export default function AdminLecturesPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const authFetch = useAuthFetch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  const fetchSubjects = useCallback(async () => {
    if (!authFetch) return;
    try {
      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.LECTURES_SUBJECTS)
      );
      if (response.ok) {
        const data = await response.json();
        setSubjects(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  }, [authFetch]);

  const fetchLectures = useCallback(async () => {
    if (!authFetch) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSubject) {
        params.append("subject_id", selectedSubject.toString());
      }
      params.append("limit", "200");

      const response = await authFetch(
        getFullUrl(`${API_ENDPOINTS.LECTURES}?${params.toString()}`)
      );
      if (response.ok) {
        const data = await response.json();
        setLectures(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching lectures:", error);
      setLectures([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedSubject]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return BookOpen;
    const type = fileType.toLowerCase();
    if (["pdf", "doc", "docx"].includes(type)) return BookOpen;
    if (["mp4", "avi", "mov", "webm"].includes(type)) return Upload;
    if (["mp3", "wav"].includes(type)) return Upload;
    return BookOpen;
  };

  // Group lectures by subject
  const lecturesBySubject = subjects.map((subject) => ({
    ...subject,
    items: lectures.filter((lecture) => lecture.subject_id === subject.id),
  }));

  const handleDelete = async (lectureId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài giảng này?")) return;
    if (!authFetch) return;

    try {
      const response = await authFetch(
        getFullUrl(`${API_ENDPOINTS.LECTURES}/${lectureId}`),
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        alert("Đã xóa bài giảng thành công!");
        fetchLectures();
        fetchSubjects();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Không thể xóa bài giảng");
      }
    } catch (error) {
      console.error("Error deleting lecture:", error);
      alert("Lỗi khi xóa bài giảng");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
                Quản lý bài giảng
              </h1>
              <p className="text-gray-600">
                Tạo và quản lý bài giảng cho các môn học
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetchLectures();
                  fetchSubjects();
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Làm mới"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>Thêm bài giảng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lectures by Subject */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" text="Đang tải bài giảng..." />
          </div>
        ) : (
          <div className="space-y-6">
            {lecturesBySubject.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Chưa có môn học nào
                </h3>
                <p className="text-gray-600 mb-6">
                  Vui lòng tạo môn học trước khi thêm bài giảng
                </p>
              </div>
            ) : (
              lecturesBySubject.map((section) => (
                <div
                  key={section.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 poppins-semibold">
                        {section.code || `Môn học ${section.id}`}
                      </h3>
                      <p className="text-sm text-gray-600 arimo-regular">
                        {section.name}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {section.lecture_count} bài giảng
                    </div>
                  </div>

                  {section.items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {section.items.map((lecture) => {
                        const FileIcon = getFileIcon(lecture.file_type);
                        return (
                          <div
                            key={lecture.id}
                            className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="mb-4">
                              <div className="w-full h-28 md:h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                <div className="text-center">
                                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <FileIcon className="h-7 w-7 md:h-8 md:w-8 text-gray-500" />
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {lecture.file_type?.toUpperCase() || "FILE"}
                                  </p>
                                </div>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base line-clamp-2">
                                {lecture.title}
                              </h4>
                              {lecture.description && (
                                <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">
                                  {lecture.description}
                                </p>
                              )}
                              <div className="space-y-1">
                                {lecture.uploader_name && (
                                  <p className="text-xs md:text-sm text-gray-600 flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {lecture.uploader_name}
                                  </p>
                                )}
                                <p className="text-xs md:text-sm text-gray-600 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(lecture.created_at)}
                                </p>
                                {lecture.duration && (
                                  <p className="text-xs md:text-sm text-gray-500">
                                    {lecture.duration}
                                  </p>
                                )}
                              </div>
                              {lecture.is_published && (
                                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Đã đăng
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => {
                                  // TODO: Implement edit functionality
                                  alert("Chức năng chỉnh sửa đang được phát triển");
                                }}
                                className="bg-[#125093] text-white px-3 py-2 rounded-lg hover:bg-[#0f4278] transition-colors text-xs md:text-sm"
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                onClick={() => handleDelete(lecture.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                                title="Xóa bài giảng"
                              >
                                <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 md:py-12">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Plus className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
                      </div>
                      <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                        Chưa có bài giảng
                      </h4>
                      <p className="text-sm md:text-base text-gray-600 mb-6">
                        Hãy tải lên bài giảng đầu tiên cho môn học này
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-[#125093] text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-[#0f4278] transition-colors text-sm md:text-base"
                      >
                        Tải lên bài giảng
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Lecture Modal */}
      {showCreateModal && (
        <CreateLectureModal
          subjects={subjects}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchLectures();
            fetchSubjects();
          }}
          authFetch={authFetch}
        />
      )}
    </div>
  );
}

// Create Lecture Modal Component
function CreateLectureModal({
  subjects,
  onClose,
  onSuccess,
  authFetch,
}: {
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject_id: "",
    is_published: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".ppt",
        ".pptx",
        ".mp4",
        ".avi",
        ".mov",
        ".webm",
        ".mp3",
        ".wav",
        ".jpg",
        ".jpeg",
        ".png",
      ];
      const fileExtension =
        "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        setError(
          "Loại file không được hỗ trợ. Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, MP4, AVI, MOV, WEBM, MP3, WAV, JPG, PNG"
        );
        return;
      }

      // Validate file size (max 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        setError("File quá lớn. Tối đa 500MB");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

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

    setUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      if (selectedFile) {
        uploadFormData.append("file", selectedFile);
      }
      uploadFormData.append("title", formData.title);
      uploadFormData.append("description", formData.description || "");
      uploadFormData.append("subject_id", formData.subject_id);
      uploadFormData.append("is_published", formData.is_published.toString());

      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.LECTURES),
        {
          method: "POST",
          body: uploadFormData, // Don't set Content-Type for FormData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Không thể tạo bài giảng");
      }

      alert("Tạo bài giảng thành công!");
      onSuccess();
      // Reset form
      setFormData({
        title: "",
        description: "",
        subject_id: "",
        is_published: false,
      });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error creating lecture:", err);
      setError(err instanceof Error ? err.message : "Lỗi khi tạo bài giảng");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Tạo bài giảng mới</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File bài giảng (tùy chọn)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.avi,.mov,.webm,.mp3,.wav,.jpg,.jpeg,.png"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Xóa file
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#125093] hover:underline"
                  >
                    Chọn file
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, MP4, AVI, MOV, WEBM, MP3, WAV, JPG, PNG (Tối đa 500MB)
                  </p>
                </>
              )}
            </div>
          </div>

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
              placeholder="Nhập tiêu đề bài giảng..."
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

          {/* Subject */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            >
              <option value="">Chọn môn học...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code || ""} - {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Published */}
          <div>
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
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Tạo bài giảng</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
