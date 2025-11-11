"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";

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
  AlertCircle,
  Clock,
  BarChart3,
  TrendingUp,
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
  const { authFetch } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | number>(
    "all"
  );
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [aiData, setAiData] = useState<AIDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const categories = [
    { id: 1, name: "Tài liệu", count: 450 },
    { id: 2, name: "Video", count: 320 },
    { id: 3, name: "Hình ảnh", count: 280 },
    { id: 4, name: "Âm thanh", count: 200 },
  ];

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
      title: "Video bài giảng Vật lý đại cương",
      categoryId: 2,
      categoryName: "Video",
      description:
        "Video bài giảng về các khái niệm cơ bản trong vật lý đại cương",
      fileType: "mp4",
      fileSize: mbToBytes(125),
      uploadDate: new Date("2024-01-14").getTime(),
      lastProcessed: new Date("2024-01-14").getTime(),
      status: "INDEXING",
      statusText: "Đang xử lý",
      embeddings: 0,
      chunks: 0,
      usage: 0,
      tags: ["vật lý", "video", "bài giảng"],
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
      title: "Bài giảng âm thanh Sinh học",
      categoryId: 4,
      categoryName: "Âm thanh",
      description: "File âm thanh bài giảng về sinh học phân tử",
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
        // Fetch AI data from backend API (authenticated)
        const response = await authFetch(
          getFullUrl("/api/v1/admin/ai-data?limit=100"),
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
            embeddings_count?: number;
            chunks_count?: number;
            usage_count?: number;
            tags?: string[];
            file_url?: string;
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
            embeddings: item.embeddings_count || 0,
            chunks: item.chunks_count || 0,
            usage: item.usage_count || 0,
            tags: item.tags || [],
            thumbnailUrl: item.file_url || "/api/placeholder/300/200",
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

  return (
    <div className="p-6 md:p-8">
          {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
              <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
                  Dữ liệu AI
                </h1>
            <p className="text-gray-600">
                  Quản lý và xử lý dữ liệu cho hệ thống AI
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
                  <span>Tải lên</span>
                </button>
              </div>
            </div>
          </div>

      <div className="max-w-7xl mx-auto">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
                  <div className="flex space-x-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategory === category.id
                            ? "bg-[#125093] text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {category.name} ({category.count})
                      </button>
                    ))}
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
                              <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                <MoreVertical className="h-4 w-4" />
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
                                <div className="flex space-x-2">
                                  <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Tải lên dữ liệu AI
                </h2>

                <div className="space-y-4">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn file
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                        Kéo thả file vào đây hoặc click để chọn
                      </p>
                  <p className="text-sm text-gray-500">
                        Hỗ trợ: PDF, DOC, MP4, JPG, MP3
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tiêu đề
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white text-gray-900"
                        placeholder="Nhập tiêu đề..."
                      />
                    </div>

                    <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                        Thẻ
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white text-gray-900"
                        placeholder="Nhập thẻ..."
                      />
                    </div>
                  </div>

                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mô tả
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent bg-white text-gray-900"
                      rows={2}
                      placeholder="Nhập mô tả..."
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
              <button className="flex-1 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0d3d6f] transition-colors">
                    Tải lên
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
  );
}
