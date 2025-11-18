"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthFetch } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import {
  getDocument,
  incrementViewCount,
  rateDocument,
} from "@/services/library";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Calendar,
  User,
  BookOpen,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import DocumentRating from "@/components/library/DocumentRating";
import RTEContentDisplay from "@/components/library/RTEContentDisplay";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useToast } from "@/contexts/ToastContext";

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
  rating_sum: number;
  rating_count: number;
  content_html?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const [viewCountTracked, setViewCountTracked] = useState(false);

  // Fetch document details
  const {
    data: document,
    isLoading,
    error,
    refetch,
  } = useQuery<LibraryDocument>({
    queryKey: ["library-document", documentId],
    queryFn: async () => {
      if (!authFetch) {
        throw new Error("Not authenticated");
      }
      console.log("[documents] fetching detail", documentId);
      const fetchLike = authFetch as (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => Promise<Response>;
      const data = await getDocument(fetchLike, documentId);
      console.log("[documents] detail received", documentId, data);
      return data;
    },
    enabled: !!documentId && !!authFetch,
  });

  // Track view count when document is loaded
  useEffect(() => {
    if (document && !viewCountTracked && authFetch) {
      const trackView = async () => {
        try {
          const fetchLike = authFetch as (
            input: RequestInfo | URL,
            init?: RequestInit
          ) => Promise<Response>;
          await incrementViewCount(fetchLike, documentId);
          setViewCountTracked(true);
          // Refetch to get updated view count
          refetch();
        } catch (err) {
          console.error("Failed to track view count:", err);
        }
      };
      trackView();
    }
  }, [document, viewCountTracked, documentId, authFetch, refetch]);

  const handleRatingSubmit = async (rating: number) => {
    if (!authFetch) return;
    const fetchLike = authFetch as (
      input: RequestInfo | URL,
      init?: RequestInit
    ) => Promise<Response>;
    await rateDocument(fetchLike, documentId, rating);
    // Refetch to get updated rating
    refetch();
  };

  const handleDownload = async () => {
    if (!document?.file_url) {
      showToast({
        type: "warning",
        title: "Cảnh báo",
        message: "Tài liệu này không có file để tải xuống",
      });
      return;
    }

    try {
      window.open(document.file_url, "_blank");
    } catch (err) {
      console.error("Failed to open download URL:", err);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Không thể tải xuống file. Vui lòng thử lại.",
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading || !authFetch) {
    return (
      <ProtectedRouteWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </ProtectedRouteWrapper>
    );
  }

  if (error || !document) {
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
              {document.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{document.subject_name}</span>
              </div>
              {document.chapter_title && (
                <div className="flex items-center gap-1">
                  <span>Chương {document.chapter_number}:</span>
                  <span>{document.chapter_title}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{document.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {formatDate(document.published_at || document.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats and Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Lượt xem</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {document.view_count || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Lượt tải</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {document.download_count || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Loại tài liệu</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {document.document_type || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="border-t pt-6">
              <DocumentRating
                documentId={documentId}
                currentRating={document.rating || 0}
                ratingCount={document.rating_count || 0}
                onRatingSubmit={handleRatingSubmit}
                authFetch={authFetch}
                getFullUrl={getFullUrl}
                API_ENDPOINTS={API_ENDPOINTS}
              />
            </div>

            {/* Download Button */}
            {document.file_url && (
              <div className="border-t pt-6 mt-6">
                <Button onClick={handleDownload} className="w-full md:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Tải xuống File
                  {document.file_size && (
                    <span className="ml-2 text-sm">
                      ({formatFileSize(document.file_size)})
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Description */}
          {document.description && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Mô tả
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {document.description}
              </p>
            </div>
          )}

          {/* RTE Content */}
          {document.content_html && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Nội dung
              </h2>
              <RTEContentDisplay content={document.content_html} />
            </div>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {document.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
