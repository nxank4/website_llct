"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthFetch } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  User,
  BookOpen,
  Play,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import RTEContentDisplay from "@/components/library/RTEContentDisplay";
import ProtectedRouteWrapper from "@/components/auth/ProtectedRouteWrapper";
import { useToast } from "@/contexts/ToastContext";

interface Lecture {
  id: number;
  title: string;
  description?: string;
  file_url?: string;
  file_type?: string;
  material_type?: string;
  subject_id: number;
  subject_name?: string;
  uploaded_by: string;
  uploader_name?: string;
  chapter_number?: number;
  chapter_title?: string;
  lesson_number?: number;
  lesson_title?: string;
  content_html?: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function LectureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const lectureId = parseInt(resolvedParams.id);
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();

  // Fetch lecture details
  const {
    data: lecture,
    isLoading,
    error,
  } = useQuery<Lecture>({
    queryKey: ["lecture", lectureId],
    queryFn: async () => {
      if (!authFetch) throw new Error("Not authenticated");
      const url = getFullUrl(API_ENDPOINTS.LECTURE_DETAIL(lectureId));
      console.log("Fetching lecture from:", url, "Lecture ID:", lectureId);
      const response = await authFetch(url);
      console.log("Response status:", response.status, response.statusText);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch lecture:", errorData);
        throw new Error(errorData.detail || `Failed to fetch lecture: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Lecture data received:", data);
      return data;
    },
    enabled: !!lectureId && !!authFetch,
  });

  const handleDownload = async () => {
    if (!lecture?.file_url) {
      showToast({
        type: "warning",
        title: "Cảnh báo",
        message: "Tài liệu này không có file để tải xuống",
      });
      return;
    }

    try {
      window.open(lecture.file_url, "_blank");
    } catch (err) {
      console.error("Failed to open download URL:", err);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Không thể tải xuống file. Vui lòng thử lại.",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <ProtectedRouteWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </ProtectedRouteWrapper>
    );
  }

  if (error || !lecture) {
    return (
      <ProtectedRouteWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Không tìm thấy tài liệu
            </h2>
            <p className="text-gray-600 mb-4">
              Tài liệu bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
            </p>
            <Button onClick={() => router.push("/library")}>
              Quay lại Thư viện
            </Button>
          </div>
        </div>
      </ProtectedRouteWrapper>
    );
  }

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {lecture.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {lecture.subject_name && (
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{lecture.subject_name}</span>
                </div>
              )}
              {lecture.chapter_number && lecture.chapter_title && (
                <div className="flex items-center gap-1">
                  <span>Chương {lecture.chapter_number}:</span>
                  <span>{lecture.chapter_title}</span>
                </div>
              )}
              {lecture.lesson_number && (
                <div className="flex items-center gap-1">
                  <span>Bài {lecture.lesson_number}</span>
                  {lecture.lesson_title && (
                    <span>: {lecture.lesson_title}</span>
                  )}
                </div>
              )}
              {lecture.uploader_name && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{lecture.uploader_name}</span>
                </div>
              )}
              {lecture.created_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(lecture.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {lecture.description && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Mô tả
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {lecture.description}
              </p>
            </div>
          )}

          {/* File Download Section */}
          {lecture.file_url && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                      File tài liệu
                    </h2>
                    {lecture.file_type && (
                      <p className="text-sm text-gray-600">
                        Định dạng: {lecture.file_type.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Tải xuống
                </Button>
              </div>
            </div>
          )}

          {/* Rich Text Content */}
          {lecture.content_html && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Nội dung
              </h2>
              <RTEContentDisplay content={lecture.content_html} />
            </div>
          )}

          {/* Empty State - No file and no content */}
          {!lecture.file_url && !lecture.content_html && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Chưa có nội dung
              </h3>
              <p className="text-gray-600">
                Tài liệu này chưa có file hoặc nội dung để hiển thị.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}

