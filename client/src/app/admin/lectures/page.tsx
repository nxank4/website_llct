"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthFetch } from "@/lib/auth";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import CreateLectureModal from "@/components/lectures/CreateLectureModal";
import {
  BookOpen,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Clock,
  User,
  LayoutGrid,
  List,
  Upload,
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
  chapter_number?: number;
  chapter_title?: string;
  lesson_number?: number;
  lesson_title?: string;
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
  const authFetch = useAuthFetch();
  const searchParams = useSearchParams();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [filterChapterNumber, setFilterChapterNumber] = useState<number | null>(
    null
  );
  const [filterChapterTitle, setFilterChapterTitle] = useState<string | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"compact" | "full">("full");

  const fetchSubjects = useCallback(async () => {
    if (!authFetch) return;
    try {
      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.LECTURES_SUBJECTS)
      );
      if (response.ok) {
        const data = await response.json();
        setSubjects(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error fetching subjects:", response.status, errorData);
        setSubjects([]);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
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
        const lecturesArray = Array.isArray(data) ? data : [];
        console.log(
          "[Admin Lectures] Fetched lectures:",
          lecturesArray.length,
          lecturesArray
        );
        setLectures(lecturesArray);
      } else {
        console.error("[Admin Lectures] Failed to fetch:", response.status);
        setLectures([]);
      }
    } catch (error) {
      console.error("Error fetching lectures:", error);
      setLectures([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedSubject]);

  // Read query params from URL on mount
  useEffect(() => {
    const subjectIdParam = searchParams.get("subject_id");
    const chapterNumberParam = searchParams.get("chapter_number");
    const chapterTitleParam = searchParams.get("chapter_title");

    if (subjectIdParam) {
      const subjectId = parseInt(subjectIdParam, 10);
      if (!isNaN(subjectId)) {
        setSelectedSubject(subjectId);
      }
    }
    if (chapterNumberParam) {
      const chapterNumber = parseInt(chapterNumberParam, 10);
      if (!isNaN(chapterNumber)) {
        setFilterChapterNumber(chapterNumber);
      }
    }
    if (chapterTitleParam) {
      setFilterChapterTitle(chapterTitleParam);
    }
  }, [searchParams]);

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

  // Filter lectures by chapter if filter is set
  const filteredLectures = lectures.filter((lecture) => {
    if (filterChapterNumber !== null) {
      return lecture.chapter_number === filterChapterNumber;
    }
    return true;
  });

  // Debug: Log filtered lectures count
  useEffect(() => {
    if (selectedSubject !== null) {
      const subjectLectures = filteredLectures.filter(
        (l) => l.subject_id === selectedSubject
      );
      console.log("[Admin Lectures] Selected subject:", selectedSubject);
      console.log("[Admin Lectures] Total lectures:", lectures.length);
      console.log(
        "[Admin Lectures] Filtered lectures:",
        filteredLectures.length
      );
      console.log(
        "[Admin Lectures] Subject lectures:",
        subjectLectures.length,
        subjectLectures
      );
    }
  }, [selectedSubject, filteredLectures, lectures]);

  // Group lectures by subject
  const lecturesBySubject = subjects.map((subject) => ({
    ...subject,
    items: filteredLectures.filter(
      (lecture) => lecture.subject_id === subject.id
    ),
  }));

  const handleDelete = async (lectureId: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) return;
    if (!authFetch) return;

    try {
      const response = await authFetch(
        getFullUrl(`${API_ENDPOINTS.LECTURES}/${lectureId}`),
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        alert("Đã xóa tài liệu thành công!");
        fetchLectures();
        fetchSubjects();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Không thể xóa tài liệu");
      }
    } catch (error) {
      console.error("Error deleting lecture:", error);
      alert("Lỗi khi xóa tài liệu");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
                Quản lý tài liệu
              </h1>
              <p className="text-gray-600">
                {filterChapterNumber !== null && filterChapterTitle
                  ? `Tài liệu - Chương ${filterChapterNumber}: ${filterChapterTitle}`
                  : "Tạo và quản lý tài liệu cho các môn học"}
              </p>
              {filterChapterNumber !== null && (
                <button
                  onClick={() => {
                    setFilterChapterNumber(null);
                    setFilterChapterTitle(null);
                    // Clear URL params
                    window.history.replaceState({}, "", "/admin/lectures");
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Xóa bộ lọc chương
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1 bg-white">
                <button
                  onClick={() => setViewMode("compact")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "compact"
                      ? "bg-[#125093] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Chế độ compact"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("full")}
                  className={`p-2 rounded transition-colors ${
                    viewMode === "full"
                      ? "bg-[#125093] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Chế độ đầy đủ"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
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
                <span>Thêm tài liệu</span>
              </button>
            </div>
          </div>
        </div>

        {/* Lectures by Subject */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" text="Đang tải tài liệu..." />
          </div>
        ) : selectedSubject !== null ? (
          // Show lectures for selected subject
          <div className="mt-8">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                    <span className="font-medium">Quay lại</span>
                  </button>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {subjects.find((s) => s.id === selectedSubject)?.name ||
                        "Tài liệu"}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {subjects.find((s) => s.id === selectedSubject)?.code ||
                        ""}{" "}
                      •{" "}
                      {
                        filteredLectures.filter(
                          (l) => l.subject_id === selectedSubject
                        ).length
                      }{" "}
                      tài liệu
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {filteredLectures.filter((l) => l.subject_id === selectedSubject)
              .length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredLectures
                  .filter((l) => l.subject_id === selectedSubject)
                  .map((lecture) => {
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
                            onClick={() => setEditingLecture(lecture)}
                            className="bg-[#125093] text-white px-3 py-2 rounded-lg hover:bg-[#0f4278] transition-colors text-xs md:text-sm"
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={() => handleDelete(lecture.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Xóa tài liệu"
                          >
                            <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-10 md:py-12 bg-white rounded-xl shadow-md border border-gray-200">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
                </div>
                <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                  Chưa có tài liệu
                </h4>
                <p className="text-sm md:text-base text-gray-600 mb-6">
                  Hãy tải lên tài liệu đầu tiên cho môn học này
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#125093] text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-[#0f4278] transition-colors text-sm md:text-base"
                >
                  Tải lên tài liệu
                </button>
              </div>
            )}
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
                  Vui lòng tạo môn học trước khi thêm tài liệu
                </p>
              </div>
            ) : viewMode === "compact" ? (
              // Compact View - Horizontal cards
              <div className="space-y-3">
                {lecturesBySubject.map((section) => (
                  <div
                    key={section.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedSubject(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {section.code || `Môn học ${section.id}`}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {section.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {section.lecture_count}
                          </p>
                          <p className="text-xs text-gray-500">tài liệu</p>
                        </div>
                        {section.items.length > 0 && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Full View - Grid cards
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {lecturesBySubject.map((section) => (
                  <div
                    key={section.id}
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedSubject(section.id)}
                  >
                    <div className="flex flex-col items-center text-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3">
                        <BookOpen className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {section.code || `Môn ${section.id}`}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {section.name}
                      </p>
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-600">
                          {section.lecture_count} tài liệu
                        </span>
                      </div>
                    </div>
                    {section.items.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">
                          Tài liệu mới nhất:
                        </p>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {section.items[0].title}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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

      {/* Edit Lecture Modal */}
      {editingLecture && (
        <CreateLectureModal
          subjects={subjects}
          lecture={editingLecture}
          onClose={() => setEditingLecture(null)}
          onSuccess={() => {
            setEditingLecture(null);
            fetchLectures();
            fetchSubjects();
          }}
          authFetch={authFetch}
        />
      )}
    </div>
  );
}
