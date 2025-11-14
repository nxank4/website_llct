"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import CreateLectureModal from "@/components/lectures/CreateLectureModal";
import {
  BookOpen,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  User,
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

export default function InstructorLecturesPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const authFetch = useAuthFetch();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);

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
  }, [authFetch]);

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
    <ProtectedRouteWrapper requiredRole="instructor">
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
                  Tạo và quản lý tài liệu cho các môn học của bạn
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
          ) : (
            <div className="space-y-6">
              {lecturesBySubject.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Chưa có môn học nào
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Vui lòng liên hệ admin để được gán môn học
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
                        {section.lecture_count} tài liệu
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
                                      {lecture.file_type?.toUpperCase() ||
                                        "FILE"}
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
                                    setEditingLecture(lecture);
                                  }}
                                  className="bg-[#125093] text-white px-3 py-2 rounded-lg hover:bg-[#0f4278] transition-colors text-xs md:text-sm"
                                >
                                  Chỉnh sửa
                                </button>
                                {String(lecture.uploaded_by) ===
                                  String((user as { id?: string })?.id) && (
                                  <button
                                    onClick={() => handleDelete(lecture.id)}
                                    className="text-red-500 hover:text-red-700 transition-colors"
                                    title="Xóa tài liệu"
                                  >
                                    <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                                  </button>
                                )}
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
    </ProtectedRouteWrapper>
  );
}
