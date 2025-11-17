"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthFetch } from "@/lib/auth";
import { getFullUrl, API_ENDPOINTS } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/contexts/ToastContext";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import { AlertCircle } from "lucide-react";

import {
  Database,
  Upload,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  RefreshCw,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  X,
} from "lucide-react";

interface AIDataItem {
  // CORE & DB
  id: number;
  title: string;
  categoryId: number; // ID danh mục (ví dụ: môn học 1, 2, 3)
  description: string;

  // FILE & UPLOAD
  fileType?: string;
  fileSize?: number; // Lưu dưới dạng byte/KB/MB (dùng number)
  uploadDate?: number; // Timestamp (hoặc Date object)

  // RAG & INDEXING
  status: "PENDING" | "INDEXING" | "COMPLETED" | "FAILED"; // Nên là trường bắt buộc
  lastProcessed?: number; // Timestamp
  embeddings?: number; // Số vector nhúng
  chunks?: number; // Số chunks

  // UI & Metadata
  categoryName?: string; // Tên hiển thị (lookup)
  statusText?: string; // Trạng thái cho người dùng
  tags?: string[];
  thumbnailUrl?: string; // Đổi tên để rõ ràng là URL
  usage?: number; // Số lần dùng

  [key: string]: unknown;
}

export default function AIDataPage() {
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | number>(
    "all"
  );
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [aiData, setAiData] = useState<AIDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    fileId: number | null;
    fileName: string | null;
  }>({ isOpen: false, fileId: null, fileName: null });
  const [deleting, setDeleting] = useState(false);

  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>(
    []
  );

  // Helper function to convert MB to bytes
  const mbToBytes = (mb: number): number => mb * 1024 * 1024;

  // Helper function to format file size for display
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const mockAIData: AIDataItem[] = [
    {
      id: 1,
      title: "Giáo trình Toán học cơ bản",
      categoryId: 1,
      categoryName: "Tài liệu",
      description:
        "Tài liệu học tập môn Toán học cơ bản cho sinh viên năm nhất",
      fileType: "pdf",
      fileSize: mbToBytes(2.5),
      uploadDate: new Date("2024-01-15").getTime(),
      lastProcessed: new Date("2024-01-15").getTime(),
      status: "COMPLETED",
      statusText: "Đã xử lý",
      embeddings: 1250,
      chunks: 45,
      usage: 89,
      tags: ["toán học", "cơ bản", "giáo trình"],
      thumbnailUrl: "/api/placeholder/300/200",
    },
    {
      id: 2,
      title: "Video tài liệu Vật lý đại cương",
      categoryId: 2,
      categoryName: "Video",
      description:
        "Video tài liệu về các khái niệm cơ bản trong vật lý đại cương",
      fileType: "mp4",
      fileSize: mbToBytes(125),
      uploadDate: new Date("2024-01-14").getTime(),
      lastProcessed: new Date("2024-01-14").getTime(),
      status: "INDEXING",
      statusText: "Đang xử lý",
      embeddings: 0,
      chunks: 0,
      usage: 0,
      tags: ["vật lý", "video", "tài liệu"],
      thumbnailUrl: "/api/placeholder/300/200",
    },
    {
      id: 3,
      title: "Hình ảnh minh họa Hóa học",
      categoryId: 3,
      categoryName: "Hình ảnh",
      description: "Bộ sưu tập hình ảnh minh họa các phản ứng hóa học",
      fileType: "jpg",
      fileSize: mbToBytes(8.2),
      uploadDate: new Date("2024-01-13").getTime(),
      lastProcessed: new Date("2024-01-13").getTime(),
      status: "COMPLETED",
      statusText: "Đã xử lý",
      embeddings: 320,
      chunks: 12,
      usage: 45,
      tags: ["hóa học", "hình ảnh", "phản ứng"],
      thumbnailUrl: "/api/placeholder/300/200",
    },
    {
      id: 4,
      title: "Tài liệu âm thanh Sinh học",
      categoryId: 4,
      categoryName: "Âm thanh",
      description: "File âm thanh tài liệu về sinh học phân tử",
      fileType: "mp3",
      fileSize: mbToBytes(45),
      uploadDate: new Date("2024-01-12").getTime(),
      lastProcessed: new Date("2024-01-12").getTime(),
      status: "COMPLETED",
      statusText: "Đã xử lý",
      embeddings: 890,
      chunks: 28,
      usage: 67,
      tags: ["sinh học", "âm thanh", "phân tử"],
      thumbnailUrl: "/api/placeholder/300/200",
    },
    {
      id: 5,
      title: "Tài liệu tham khảo Tiếng Anh",
      categoryId: 1,
      categoryName: "Tài liệu",
      description: "Tài liệu tham khảo về ngữ pháp và từ vựng tiếng Anh",
      fileType: "docx",
      fileSize: mbToBytes(1.8),
      uploadDate: new Date("2024-01-11").getTime(),
      lastProcessed: new Date("2024-01-11").getTime(),
      status: "FAILED",
      statusText: "Lỗi xử lý",
      embeddings: 0,
      chunks: 0,
      usage: 0,
      tags: ["tiếng anh", "ngữ pháp", "từ vựng"],
      thumbnailUrl: "/api/placeholder/300/200",
    },
    {
      id: 6,
      title: "Video thí nghiệm Hóa học",
      categoryId: 2,
      categoryName: "Video",
      description: "Video ghi lại các thí nghiệm hóa học thực tế",
      fileType: "mp4",
      fileSize: mbToBytes(89),
      uploadDate: new Date("2024-01-10").getTime(),
      lastProcessed: new Date("2024-01-10").getTime(),
      status: "COMPLETED",
      statusText: "Đã xử lý",
      embeddings: 650,
      chunks: 22,
      usage: 123,
      tags: ["hóa học", "thí nghiệm", "video"],
      thumbnailUrl: "/api/placeholder/300/200",
    },
  ];

  const [stats, setStats] = useState([
    {
      title: "Tổng dữ liệu",
      value: "0",
      change: "+0%",
      changeType: "positive" as const,
      icon: Database,
      color: "text-blue-600 bg-blue-100",
    },
    {
      title: "Đã xử lý",
      value: "0",
      change: "+0%",
      changeType: "positive" as const,
      icon: CheckCircle,
      color: "text-green-600 bg-green-100",
    },
    {
      title: "Đang xử lý",
      value: "0",
      change: "0%",
      changeType: "negative" as const,
      icon: Clock,
      color: "text-yellow-600 bg-yellow-100",
    },
    {
      title: "Lỗi xử lý",
      value: "0",
      change: "0%",
      changeType: "positive" as const,
      icon: AlertCircle,
      color: "text-red-600 bg-red-100",
    },
  ]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!authFetch) return;
      try {
        // Fetch subjects from admin endpoint (organization.Subject model)
        const response = await authFetch(getFullUrl("/api/v1/admin/subjects"));
        if (response.ok) {
          const data = await response.json();
          const subjectsList = Array.isArray(data)
            ? data.map(
                (s: { id: number; name: string; description?: string }) => ({
                  id: s.id,
                  name: s.name || `Subject ${s.id}`,
                })
              )
            : [];

          // If no subjects found, use default categories
          if (subjectsList.length === 0) {
            setSubjects([
              { id: 1, name: "Tài liệu" },
              { id: 2, name: "Video" },
              { id: 3, name: "Hình ảnh" },
              { id: 4, name: "Âm thanh" },
            ]);
          } else {
            setSubjects(subjectsList);
          }
        } else {
          // Fallback to default subjects if fetch fails
          setSubjects([
            { id: 1, name: "Tài liệu" },
            { id: 2, name: "Video" },
            { id: 3, name: "Hình ảnh" },
            { id: 4, name: "Âm thanh" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        // Fallback to default subjects if fetch fails
        setSubjects([
          { id: 1, name: "Tài liệu" },
          { id: 2, name: "Video" },
          { id: 3, name: "Hình ảnh" },
          { id: 4, name: "Âm thanh" },
        ]);
      }
    };
    fetchSubjects();
  }, [authFetch]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!authFetch) return;
      try {
        const response = await authFetch(
          getFullUrl("/api/v1/admin/ai-data/stats"),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.warn("Unauthorized when fetching AI data stats (401)");
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Format numbers with commas
        const formatNumber = (num: number) => num.toLocaleString("vi-VN");

        setStats([
          {
            title: "Tổng dữ liệu",
            value: formatNumber(data.total_materials || 0),
            change: "+0%",
            changeType: "positive" as const,
            icon: Database,
            color: "text-blue-600 bg-blue-100",
          },
          {
            title: "Đã xử lý",
            value: formatNumber(data.processed_materials || 0),
            change: "+0%",
            changeType: "positive" as const,
            icon: CheckCircle,
            color: "text-green-600 bg-green-100",
          },
          {
            title: "Đang xử lý",
            value: formatNumber(data.processing_materials || 0),
            change: "0%",
            changeType: "negative" as const,
            icon: Clock,
            color: "text-yellow-600 bg-yellow-100",
          },
          {
            title: "Lỗi xử lý",
            value: formatNumber(data.failed_materials || 0),
            change: "0%",
            changeType: "positive" as const,
            icon: AlertCircle,
            color: "text-red-600 bg-red-100",
          },
        ]);
      } catch (error) {
        console.error("Error fetching AI data stats:", error);
      }
    };
    fetchStats();
  }, [authFetch]);

  useEffect(() => {
    const fetchAIData = async () => {
      if (!authFetch) return;
      try {
        setLoading(true);
        // Fetch AI data from Gemini File Search Store (new endpoint)
        const response = await authFetch(
          getFullUrl(API_ENDPOINTS.AI_DATA_FILES),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.warn("Unauthorized when fetching AI data list (401)");
            // Fallback dữ liệu mock để UI vẫn hoạt động
            setAiData(mockAIData);
            return;
          }
          // If new endpoint fails, try old endpoint as fallback
          const fallbackResponse = await authFetch(
            getFullUrl(`${API_ENDPOINTS.AI_DATA_LIST}?limit=100`),
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            const transformedData = fallbackData.map(
              (item: {
                id: number;
                title: string;
                subject_id?: number;
                subject_name?: string;
                description?: string;
                file_type?: string;
                file_size?: number;
                upload_date?: string;
                last_processed?: string;
                status?: string;
                status_text?: string;
                tags?: string[];
              }) => ({
                id: item.id,
                title: item.title,
                categoryId: item.subject_id || 1,
                categoryName: item.subject_name || "Tài liệu",
                description: item.description || "",
                fileType: item.file_type?.toLowerCase() || "pdf",
                fileSize: item.file_size || 0,
                uploadDate: item.upload_date
                  ? new Date(item.upload_date).getTime()
                  : Date.now(),
                lastProcessed: item.last_processed
                  ? new Date(item.last_processed).getTime()
                  : undefined,
                status: item.status || "PENDING",
                statusText: item.status_text || "Chưa xử lý",
                embeddings: 0,
                chunks: 0,
                usage: 0,
                tags: item.tags || [],
                thumbnailUrl: "/api/placeholder/300/200",
              })
            );
            setAiData(transformedData);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform API response to match AIDataItem interface
        const transformedData = data.map(
          (item: {
            id: number;
            title: string;
            subject_id?: number;
            subject_name?: string;
            description?: string;
            file_type?: string;
            file_size?: number;
            upload_date?: string;
            last_processed?: string;
            status?: string;
            status_text?: string;
            tags?: string[];
            file_name?: string;
            display_name?: string;
          }) => ({
            id: item.id,
            title: item.title,
            categoryId: item.subject_id || 1,
            categoryName: item.subject_name || "Tài liệu",
            description: item.description || "",
            fileType: item.file_type?.toLowerCase() || "pdf",
            fileSize: item.file_size || 0,
            uploadDate: item.upload_date
              ? new Date(item.upload_date).getTime()
              : Date.now(),
            lastProcessed: item.last_processed
              ? new Date(item.last_processed).getTime()
              : undefined,
            status: item.status || "PENDING",
            statusText: item.status_text || "Chưa xử lý",
            embeddings: 0,
            chunks: 0,
            usage: 0,
            tags: item.tags || [],
            thumbnailUrl: "/api/placeholder/300/200",
            file_name: item.file_name,
            display_name: item.display_name,
          })
        );

        setAiData(transformedData);
      } catch (error) {
        console.error("Error fetching AI data:", error);
        // Fallback to mock data on error
        setAiData(mockAIData);
      } finally {
        setLoading(false);
      }
    };
    fetchAIData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]);

  const filteredData = aiData.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags &&
        item.tags.some((tag: string) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    return matchesCategory && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (b.uploadDate || 0) - (a.uploadDate || 0);
      case "oldest":
        return (a.uploadDate || 0) - (b.uploadDate || 0);
      case "size":
        return (b.fileSize || 0) - (a.fileSize || 0);
      case "usage":
        return (b.usage || 0) - (a.usage || 0);
      default:
        return 0;
    }
  });

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return File;
    switch (fileType) {
      case "pdf":
      case "docx":
      case "doc":
        return FileText;
      case "mp4":
      case "avi":
      case "mov":
        return Video;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return ImageIcon;
      case "mp3":
      case "wav":
      case "aac":
        return File;
      default:
        return File;
    }
  };

  const getStatusColor = (status?: AIDataItem["status"]) => {
    if (!status) return "text-gray-600 bg-gray-100";
    switch (status) {
      case "COMPLETED":
        return "text-green-600 bg-green-100";
      case "INDEXING":
        return "text-yellow-600 bg-yellow-100";
      case "PENDING":
        return "text-blue-600 bg-blue-100";
      case "FAILED":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteConfirmDialog.fileId || !authFetch) return;

    setDeleting(true);
    try {
      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.AI_DATA_DELETE(deleteConfirmDialog.fileId)),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Không thể xóa file");
      }

      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã xóa file thành công",
      });

      // Refresh data
      setDeleteConfirmDialog({ isOpen: false, fileId: null, fileName: null });
      window.location.reload();
    } catch (error) {
      console.error("Error deleting file:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: error instanceof Error ? error.message : "Không thể xóa file",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
            Dữ liệu AI
          </h1>
          <p className="text-gray-600">
            Quản lý và xử lý dữ liệu AI cho hệ thống học tập
          </p>
        </div>
      </div>
      <div className="max-w-7.5xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <p className="text-gray-600">
                Upload và quản lý tài liệu để phục vụ hệ thống RAG - Tài liệu sẽ
                được xử lý, tạo embeddings và index để chatbot có thể truy xuất
                thông tin chính xác
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 1000);
                }}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Spinner size="sm" inline />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
                <span>Làm mới</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span>Tải lên tài liệu RAG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#125093]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-[#125093] poppins-bold">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <p
                        className={`text-sm flex items-center mt-1 ${
                          stat.changeType === "positive"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm dữ liệu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 w-64"
                />
              </div>

              {/* Category Filter */}
              <div className="flex space-x-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === "all"
                      ? "bg-[#125093] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Tất cả ({aiData.length})
                </button>
                {subjects.length > 0 ? (
                  subjects.map((subject) => {
                    const count = aiData.filter(
                      (item) => item.categoryId === subject.id
                    ).length;
                    return (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedCategory(subject.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategory === subject.id
                            ? "bg-[#125093] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {subject.name} ({count})
                      </button>
                    );
                  })
                ) : (
                  // Show placeholder while loading
                  <>
                    <button
                      disabled
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                    >
                      Đang tải môn học...
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="size">Kích thước</option>
                <option value="usage">Sử dụng</option>
              </select>

              {/* View Mode */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${
                    viewMode === "grid"
                      ? "bg-[#125093] text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${
                    viewMode === "list"
                      ? "bg-[#125093] text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Grid/List */}
        <div className="relative">
          {loading && <Spinner overlay size="lg" text="Đang tải dữ liệu..." />}
          {loading ? (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              }`}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              }`}
            >
              {sortedData.map((item) => {
                const FileIcon = getFileIcon(item.fileType);
                return (
                  <div
                    key={item.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                      viewMode === "list" ? "flex" : ""
                    }`}
                  >
                    {viewMode === "grid" ? (
                      <>
                        <div className="relative">
                          <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <FileIcon className="h-16 w-16 text-gray-400" />
                          </div>
                          <div className="absolute top-3 left-3">
                            <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                              {item.categoryName}
                            </span>
                          </div>
                          <div className="absolute top-3 right-3">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                item.status
                              )}`}
                            >
                              {item.statusText}
                            </span>
                          </div>
                        </div>

                        <div className="p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 text-sm">
                            {item.description}
                          </p>

                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center">
                              <Database className="h-4 w-4 mr-2" />
                              {item.embeddings} embeddings
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              {item.chunks} chunks
                            </div>
                            <div className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              {item.usage} sử dụng
                            </div>
                            <div className="flex items-center">
                              <FileIcon className="h-4 w-4 mr-2" />
                              {formatFileSize(item.fileSize)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4">
                            {(item.tags || []).slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <div className="flex space-x-2">
                            <button className="flex-1 bg-[#125093] text-white py-2 px-4 rounded-lg hover:bg-[#0d3d6f] transition-colors text-sm">
                              Xem chi tiết
                            </button>
                            {item.status === "PENDING" && (
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await authFetch(
                                      getFullUrl(
                                        `/api/v1/admin/ai-data/${item.id}/index`
                                      ),
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                      }
                                    );
                                    if (response.ok) {
                                      showToast({
                                        type: "success",
                                        title: "Thành công",
                                        message:
                                          "Đã kích hoạt quá trình index!",
                                      });
                                      window.location.reload();
                                    }
                                  } catch (error) {
                                    console.error(
                                      "Error triggering index:",
                                      error
                                    );
                                    showToast({
                                      type: "error",
                                      title: "Lỗi",
                                      message: "Lỗi khi kích hoạt index",
                                    });
                                  }
                                }}
                                className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                                title="Kích hoạt index"
                              >
                                Index
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setDeleteConfirmDialog({
                                  isOpen: true,
                                  fileId: item.id,
                                  fileName: item.title,
                                })
                              }
                              className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Xóa file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-32 h-24 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <FileIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                                  {item.categoryName}
                                </span>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                    item.status
                                  )}`}
                                >
                                  {item.statusText}
                                </span>
                              </div>

                              <h3 className="text-lg font-semibold text-gray-900 mb-2 poppins-semibold">
                                {item.title}
                              </h3>
                              <p className="text-gray-600 mb-3 text-sm">
                                {item.description}
                              </p>

                              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                <span className="flex items-center">
                                  <Database className="h-4 w-4 mr-1" />
                                  {item.embeddings} embeddings
                                </span>
                                <span className="flex items-center">
                                  <FileText className="h-4 w-4 mr-1" />
                                  {item.chunks} chunks
                                </span>
                                <span className="flex items-center">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  {item.usage} sử dụng
                                </span>
                                <span className="flex items-center">
                                  <FileIcon className="h-4 w-4 mr-1" />
                                  {formatFileSize(item.fileSize)}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {(item.tags || [])
                                  .slice(0, 4)
                                  .map((tag, index) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              <button
                                className="bg-[#125093] text-white py-2 px-4 rounded-lg hover:bg-[#0d3d6f] transition-colors text-sm"
                                style={{
                                  fontFamily: '"Arimo", sans-serif',
                                }}
                              >
                                Xem chi tiết
                              </button>
                              {item.status === "PENDING" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await authFetch(
                                        getFullUrl(
                                          `/api/v1/admin/ai-data/${item.id}/index`
                                        ),
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                        }
                                      );
                                      if (response.ok) {
                                        showToast({
                                          type: "success",
                                          title: "Thành công",
                                          message:
                                            "Đã kích hoạt quá trình index!",
                                        });
                                        window.location.reload();
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Error triggering index:",
                                        error
                                      );
                                      showToast({
                                        type: "error",
                                        title: "Lỗi",
                                        message: "Lỗi khi kích hoạt index",
                                      });
                                    }
                                  }}
                                  className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                                  title="Kích hoạt index để tạo embeddings"
                                >
                                  Index
                                </button>
                              )}
                              <div className="flex space-x-2">
                                <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                  <Download className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteConfirmDialog({
                                      isOpen: true,
                                      fileId: item.id,
                                      fileName: item.title,
                                    })
                                  }
                                  className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                  title="Xóa file"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!loading && sortedData.length === 0 && (
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 poppins-medium">
              Không tìm thấy dữ liệu
            </h3>
            <p className="text-gray-500">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <AIDataUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            // Refresh data
            window.location.reload();
          }}
          authFetch={authFetch}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) =>
          setDeleteConfirmDialog({
            isOpen: open,
            fileId: deleteConfirmDialog.fileId,
            fileName: deleteConfirmDialog.fileName,
          })
        }
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            className="fixed inset-0 bg-black/80 data-[state=open]:animate-overlayShow z-[100]"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          />
          <AlertDialog.Content className="fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[101]">
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <AlertDialog.Title className="text-[20px] font-semibold text-gray-900">
                  Xác nhận xóa file
                </AlertDialog.Title>
              </div>
              <AlertDialog.Description className="text-gray-600">
                Bạn có chắc chắn muốn xóa file{" "}
                <span className="font-semibold text-gray-900">
                  {deleteConfirmDialog.fileName}
                </span>
                ? Hành động này sẽ xóa file khỏi cả Gemini File Search Store và
                cơ sở dữ liệu. Hành động này không thể hoàn tác.
              </AlertDialog.Description>
            </div>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button
                  variant="outline"
                  disabled={deleting}
                  className="px-4 py-2"
                >
                  Hủy
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={handleDeleteFile}
                  disabled={deleting}
                  className="px-4 py-2"
                >
                  {deleting ? (
                    <>
                      <Spinner size="sm" inline />
                      <span className="ml-2">Đang xóa...</span>
                    </>
                  ) : (
                    "Xóa"
                  )}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// AI Data Upload Modal Component
function AIDataUploadModal({
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
    tags: "",
    categoryId: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
                (s: { id: number; name: string; description?: string }) => ({
                  id: s.id,
                  name: s.name || `Subject ${s.id}`,
                })
              )
            : [];

          // If no subjects found, use default categories
          if (subjectsList.length === 0) {
            setSubjects([
              { id: 1, name: "Tài liệu" },
              { id: 2, name: "Video" },
              { id: 3, name: "Hình ảnh" },
              { id: 4, name: "Âm thanh" },
            ]);
          } else {
            setSubjects(subjectsList);
          }
        } else {
          // Fallback to default subjects if fetch fails
          setSubjects([
            { id: 1, name: "Tài liệu" },
            { id: 2, name: "Video" },
            { id: 3, name: "Hình ảnh" },
            { id: 4, name: "Âm thanh" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        // Fallback to default subjects
        setSubjects([
          { id: 1, name: "Tài liệu" },
          { id: 2, name: "Video" },
          { id: 3, name: "Hình ảnh" },
          { id: 4, name: "Âm thanh" },
        ]);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [authFetch]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "video/mp4",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "audio/mpeg",
        "audio/mp3",
      ];
      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".mp4",
        ".jpg",
        ".jpeg",
        ".png",
        ".mp3",
      ];

      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (
        !allowedExtensions.includes(fileExtension) &&
        !allowedTypes.includes(file.type)
      ) {
        setError(
          "Loại file không được hỗ trợ. Hỗ trợ: PDF, DOC, DOCX, MP4, JPG, PNG, MP3"
        );
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setError("File quá lớn. Tối đa 100MB");
        return;
      }

      setSelectedFile(file);
      setError(null);
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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".mp4",
        ".jpg",
        ".jpeg",
        ".png",
        ".mp3",
      ];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        setError(
          "Loại file không được hỗ trợ. Hỗ trợ: PDF, DOC, DOCX, MP4, JPG, PNG, MP3"
        );
        return;
      }

      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("File quá lớn. Tối đa 100MB");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Vui lòng chọn file để upload");
      return;
    }

    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }

    if (!formData.categoryId) {
      setError("Vui lòng chọn danh mục");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload file using RAG upload endpoint
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      uploadFormData.append("title", formData.title);
      uploadFormData.append("description", formData.description || "");
      uploadFormData.append("subject_id", formData.categoryId); // Use categoryId as subject_id
      uploadFormData.append("tags", formData.tags || "");

      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.AI_DATA_UPLOAD),
        {
          method: "POST",
          body: uploadFormData, // Don't set Content-Type for FormData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Không thể upload file");
      }

      const data = await response.json();

      // Trigger indexing process
      try {
        const indexResponse = await authFetch(
          getFullUrl(API_ENDPOINTS.AI_DATA_INDEX(data.id)),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (indexResponse.ok) {
          const indexData = await indexResponse.json();
          showToast({
            type: "success",
            title: "Thành công",
            message: `Upload thành công! ${
              indexData.message ||
              "Tài liệu đang được xử lý và tạo embeddings..."
            }`,
          });
        } else {
          showToast({
            type: "success",
            title: "Thành công",
            message:
              "Upload thành công! Tài liệu sẽ được xử lý và index trong vài phút.",
          });
        }
      } catch (indexError) {
        console.warn("Failed to trigger indexing:", indexError);
        showToast({
          type: "success",
          title: "Thành công",
          message:
            "Upload thành công! Tài liệu sẽ được xử lý và index trong vài phút.",
        });
      }

      onSuccess();
    } catch (err) {
      console.error("Error uploading RAG material:", err);
      setError(err instanceof Error ? err.message : "Lỗi khi upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tải lên tài liệu RAG
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tài liệu sẽ được xử lý và tạo embeddings để phục vụ hệ thống RAG
          </p>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chọn file *
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : selectedFile
                  ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="ai-file-upload"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.mp4,.jpg,.jpeg,.png,.mp3"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Kéo thả file vào đây hoặc{" "}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#125093] hover:underline"
                    >
                      click để chọn
                    </button>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Hỗ trợ: PDF, DOC, DOCX, MP4, JPG, PNG, MP3 (Tối đa 100MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Môn học / Danh mục *
            </label>
            <select
              required
              value={formData.categoryId}
              onChange={(e) =>
                setFormData({ ...formData, categoryId: e.target.value })
              }
              disabled={loadingSubjects}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="">
                {loadingSubjects ? "Đang tải môn học..." : "Chọn môn học..."}
              </option>
              {subjects.map((subject: { id: number; name: string }) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Tài liệu sẽ được gán cho môn học này để phục vụ RAG
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tiêu đề *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Nhập tiêu đề..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Thẻ (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ví dụ: toán học, đại số, giải tích"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Nhập mô tả..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex-1 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0d3d6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" inline />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Tải lên</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
