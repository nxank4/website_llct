"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useAuthFetch } from "@/lib/auth";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  Tag,
  Calendar,
  User,
  FileText,
  Star,
  Upload,
  RefreshCw,
  Download,
  AlertCircle,
  Search,
  Clock,
} from "lucide-react";
import {
  createNews,
  deleteNews,
  listNews,
  updateNews,
  updateNewsStatus,
  NewsDetail,
  NewsAnalytics,
  NewsPayload,
  NewsStatus,
  fetchNewsAnalytics,
} from "@/services/news";
import Spinner from "@/components/ui/Spinner";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import TiptapEditor from "@/components/ui/TiptapEditor";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

type AdminArticle = NewsDetail;
type NewsFormData = NewsPayload & {
  status: NewsStatus;
  featured_image: string;
  tags: string[];
};

export default function AdminNewsPage() {
  const authFetch = useAuthFetch();

  // Wrapper to convert authFetch to FetchLike type
  const fetchLike = useCallback(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      return authFetch(url, init);
    },
    [authFetch]
  );

  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<AdminArticle | null>(
    null
  );
  const initialFormState: NewsFormData = {
    title: "",
    content: "",
    excerpt: "",
    status: "draft",
    featured_image: "",
    tags: [],
    is_featured: false,
  };
  const [formData, setFormData] = useState<NewsFormData>(initialFormState);
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUrlError, setImageUrlError] = useState<string>("");
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    articleId: number | null;
  }>({ isOpen: false, articleId: null });
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [analytics, setAnalytics] = useState<NewsAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Fetch articles
  const fetchArticles = useCallback(
    async (query?: string) => {
      try {
        setLoading(true);
        const data = await listNews(
          fetchLike,
          query ? { q: query } : undefined
        );
        setArticles(Array.isArray(data) ? data : []);
        if (typeof query === "string") {
          setActiveFilter(query);
        } else {
          setActiveFilter("");
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchLike]
  );

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const data = await fetchNewsAnalytics(fetchLike);
      setAnalytics(data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics(null);
      setAnalyticsError("Không thể tải dữ liệu phân tích tin tức");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [fetchLike]);

  useEffect(() => {
    fetchArticles();
    fetchAnalytics();
  }, [fetchArticles, fetchAnalytics]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.content || formData.content.trim().length === 0) {
        showToast({
          type: "warning",
          title: "Thiếu nội dung",
          message: "Vui lòng nhập nội dung bài viết trước khi lưu.",
        });
        return;
      }
      if (editingArticle) {
        await updateNews(fetchLike, editingArticle.id, formData);
      } else {
        await createNews(fetchLike, formData);
      }
      await fetchArticles(activeFilter || undefined);
      handleCloseEditor();
    } catch (error) {
      console.error("Error saving article:", error);
    }
  };

  // Handle delete
  const handleDelete = (id: number) => {
    setDeleteConfirmDialog({ isOpen: true, articleId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmDialog.articleId) return;

    try {
      await deleteNews(fetchLike, deleteConfirmDialog.articleId);
      await fetchArticles(activeFilter || undefined);
      setDeleteConfirmDialog({ isOpen: false, articleId: null });
    } catch (error) {
      console.error("Error deleting article:", error);
      setDeleteConfirmDialog({ isOpen: false, articleId: null });
    }
  };

  // Handle status change
  const handleStatusChange = async (id: number | string, status: NewsStatus) => {
    try {
      await updateNewsStatus(fetchLike, id, status);
      await fetchArticles(activeFilter || undefined);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Validate URL
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString.trim()) return false;
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Handle image URL input
  const handleImageUrlChange = (url: string) => {
    setFormData({ ...formData, featured_image: url });

    if (!url.trim()) {
      setImagePreview("");
      setImageUrlError("");
      return;
    }

    if (isValidUrl(url)) {
      setImagePreview(url);
      setImageUrlError("");
    } else {
      setImagePreview("");
      setImageUrlError(
        "URL không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: https://example.com/image.jpg)"
      );
    }
  };

  // Open editor
  const handleOpenEditor = (article?: NewsArticle) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt || "",
        status: article.status ?? "draft",
        featured_image: article.featured_image || "",
        tags: article.tags || [],
        is_featured: article.is_featured,
      });
      const imageUrl = article.featured_image || "";
      setImagePreview(imageUrl);
      setImageUrlError(
        imageUrl && !isValidUrl(imageUrl) ? "URL không hợp lệ" : ""
      );
    } else {
      setEditingArticle(null);
      setFormData(initialFormState);
      setImagePreview("");
    }
    setImageUrlError("");
    setShowEditor(true);
    setEditorKey((prev) => prev + 1);
  };

  // Close editor
  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingArticle(null);
    setTagInput("");
    setImagePreview("");
    setImageUrlError("");
    setFormData(initialFormState);
    setEditorKey((prev) => prev + 1);
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showToast({
          type: "error",
          title: "Lỗi",
          message: "Vui lòng chọn file ảnh",
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        showToast({
          type: "error",
          title: "Lỗi",
          message: "File ảnh quá lớn. Tối đa 5MB",
        });
        return;
      }

      try {
        // Upload to library endpoint (reuse library upload for images)
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("title", `News Image: ${file.name}`);
        uploadFormData.append("description", "Featured image for news article");
        uploadFormData.append("subject_code", "NEWS");
        uploadFormData.append("subject_name", "Tin tức");
        uploadFormData.append("document_type", "other");
        uploadFormData.append("author", "Admin");

        const response = await authFetch(
          `${location.origin}/api/v1/library/documents/upload`,
          {
            method: "POST",
            body: uploadFormData,
          }
        );

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.file_url || URL.createObjectURL(file);
          setFormData({ ...formData, featured_image: imageUrl });
          setImagePreview(imageUrl);
          setImageUrlError("");
        } else {
          // Fallback to local preview if upload fails
          const imageUrl = URL.createObjectURL(file);
          setFormData({ ...formData, featured_image: imageUrl });
          setImagePreview(imageUrl);
          setImageUrlError("");
          console.warn("Failed to upload image to server, using local preview");
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        // Fallback to local preview
        const imageUrl = URL.createObjectURL(file);
        setFormData({ ...formData, featured_image: imageUrl });
        setImagePreview(imageUrl);
        setImageUrlError("");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "published":
        return "Đã đăng";
      case "draft":
        return "Nháp";
      case "archived":
        return "Lưu trữ";
      default:
        return status;
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return new Date(value).toLocaleString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatReadingTime = (minutes?: number) =>
    `${Math.max(1, minutes ?? 1)} phút đọc`;

  const formatMonthLabel = (value: string) => {
    if (!value.includes("-")) return value;
    const [year, month] = value.split("-");
    return `${month}/${year.slice(-2)}`;
  };

  const hasAnalyticsData = Boolean(analytics && analytics.totals.total > 0);

  const summaryCards = useMemo(() => {
    if (!analytics) return [];
    const { totals } = analytics;
    const publishedPercent = totals.total
      ? Math.round((totals.published / totals.total) * 100)
      : 0;
    return [
      {
        label: "Tổng bài viết",
        value: totals.total.toLocaleString("vi-VN"),
        sub: `${totals.featured} bài nổi bật`,
      },
      {
        label: "Đã đăng",
        value: totals.published.toLocaleString("vi-VN"),
        sub: `${publishedPercent}% tổng số`,
      },
      {
        label: "Lượt xem",
        value: totals.total_views.toLocaleString("vi-VN"),
        sub: `~${totals.avg_views.toFixed(1)} lượt/bài`,
      },
      {
        label: "Thời gian đọc TB",
        value: `${totals.avg_reading_time.toFixed(1)} phút`,
        sub: "Trung bình/bài viết",
      },
    ];
  }, [analytics]);

  const statusChartData = useMemo(() => {
    if (!analytics) return [];
    return [
      {
        name: "Đã đăng",
        value: analytics.totals.published,
        color: "#125093",
      },
      {
        name: "Nháp",
        value: analytics.totals.draft,
        color: "#FBBF24",
      },
      {
        name: "Lưu trữ",
        value: analytics.totals.archived,
        color: "#94A3B8",
      },
    ];
  }, [analytics]);

  const publishingTrendData = useMemo(() => {
    if (!analytics) return [];
    return analytics.publishing_trend.map((item) => ({
      ...item,
      label: formatMonthLabel(item.month),
    }));
  }, [analytics]);

  const topArticlesData = useMemo(() => {
    if (!analytics) return [];
    return analytics.top_articles.map((article) => ({
      title: article.title,
      views: article.views,
      reading_time: article.reading_time_minutes,
    }));
  }, [analytics]);

  const tagChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.tag_distribution.map((item) => ({
      tag: item.tag,
      count: item.count,
    }));
  }, [analytics]);

  const readingTimeChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.reading_time_distribution;
  }, [analytics]);

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" text="Đang tải tin tức..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Quản lý tin tức
            </h1>
            <p className="text-gray-600">Tạo và quản lý các bài viết tin tức</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                fetchArticles(activeFilter || undefined);
                fetchAnalytics();
              }}
              disabled={loading || analyticsLoading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Làm mới danh sách"
            >
              <RefreshCw
                className={`h-4 w-4 md:h-5 md:w-5 ${
                  loading || analyticsLoading ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={() => {
                try {
                  const headers = ["title", "author", "status", "views"];
                  const rows = articles.map((article) => [
                    article.title,
                    article.author_name,
                    article.status,
                    String(article.views ?? 0),
                  ]);
                  const csv = [
                    headers.join(","),
                    ...rows.map((x) =>
                      x
                        .map(
                          (v) => `"${String(v ?? "").replaceAll('"', '""')}"`
                        )
                        .join(",")
                    ),
                  ].join("\n");
                  const blob = new Blob([csv], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "news.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error("Export CSV failed", error);
                  showToast({
                    type: "error",
                    title: "Lỗi",
                    message: "Không thể xuất CSV",
                  });
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              title="Xuất CSV"
            >
              <Download className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
            <button
              onClick={() => handleOpenEditor()}
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo bài viết mới</span>
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-[#00CBB8]/10 text-[#00CBB8] text-sm font-medium px-3 py-1 rounded-full">
              {articles.length} bài viết
            </span>
            {activeFilter && (
              <span className="text-xs text-gray-500">
                Kết quả cho "
                <span className="font-semibold text-gray-700">
                  {activeFilter}
                </span>
                "
              </span>
            )
            }
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchArticles(searchTerm.trim() || undefined);
            }}
            className="flex items-center gap-3 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm bài viết..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              />
            </div>
            <Button type="submit" className="bg-[#125093] text-white">
              Tìm kiếm
            </Button>
            {activeFilter && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setActiveFilter("");
                  fetchArticles();
                }}
              >
                Xóa lọc
              </Button>
            )}
          </form>
        </div>
      </div>

      <section className="mb-10 space-y-6">
        {analyticsLoading ? (
          <div className="bg-white rounded-lg shadow-md p-10 flex items-center justify-center">
            <Spinner size="lg" text="Đang tải dashboard tin tức..." />
          </div>
        ) : analyticsError ? (
          <div className="bg-red-50 border border-red-100 rounded-lg p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-red-700 font-semibold">
                {analyticsError}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Hãy thử làm mới hoặc kiểm tra kết nối.
              </p>
            </div>
            <Button variant="destructive" onClick={fetchAnalytics}>
              Thử lại
            </Button>
          </div>
        ) : hasAnalyticsData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                >
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">
                    {card.value}
                  </p>
                  {card.sub && (
                    <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Tần suất đăng bài
                    </h3>
                    <p className="text-sm text-gray-500">
                      Số bài viết theo tháng gần đây
                    </p>
                  </div>
                </div>
                {publishingTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={publishingTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <ReTooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#125093"
                        fill="rgba(18,80,147,0.2)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">
                    Chưa đủ dữ liệu để hiển thị.
                  </p>
                )}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tình trạng bài viết
                </h3>
                {statusChartData.some((item) => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">
                    Chưa có dữ liệu tình trạng bài viết.
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  {statusChartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold text-gray-700">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Top bài viết theo lượt xem
                </h3>
                {topArticlesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={topArticlesData}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="title"
                        type="category"
                        width={180}
                        tick={{ fontSize: 12 }}
                      />
                      <ReTooltip />
                      <Bar dataKey="views" fill="#125093" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">
                    Chưa có dữ liệu lượt xem.
                  </p>
                )}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Chủ đề được quan tâm
                </h3>
                {tagChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={tagChartData}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        dataKey="tag"
                        type="category"
                        width={160}
                        tick={{ fontSize: 12 }}
                      />
                      <ReTooltip />
                      <Bar dataKey="count" fill="#00CBB8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">
                    Chưa có dữ liệu thẻ tag.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Phân bố thời gian đọc
              </h3>
              {readingTimeChartData.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={readingTimeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis allowDecimals={false} />
                    <ReTooltip />
                    <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500">
                  Chưa có dữ liệu thời gian đọc.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
            Chưa có dữ liệu để dựng dashboard.
          </div>
        )}
      </section>

      <div className="max-w-7.5xl mx-auto">
        {!showEditor ? (
          /* Articles List */
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#125093] poppins-semibold">
                Danh sách bài viết
              </h2>
            </div>
            {loading && articles.length > 0 && (
              <div className="px-6 py-3 text-sm text-gray-500 flex items-center gap-2">
                <Spinner size="sm" inline />
                <span>Đang cập nhật danh sách...</span>
              </div>
            )}
            <div className="divide-y">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 poppins-medium">
                          {article.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            article.status
                          )}`}
                        >
                          {getStatusText(article.status)}
                        </span>
                        {article.is_featured && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      {article.excerpt && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{article.author_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Đăng: {formatDate(article.published_at ?? article.created_at)}</span>
                        </div>
                        {article.updated_at && (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="h-4 w-4 text-gray-400" />
                            <span>Cập nhật: {formatDate(article.updated_at)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatReadingTime(article.reading_time_minutes)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-gray-400" />
                          <span>{article.views.toLocaleString("vi-VN")} lượt xem</span>
                        </div>
                      </div>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Tag className="h-4 w-4 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {article.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="bg-[#125093]/10 text-[#125093] text-xs px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleOpenEditor(article)}
                        className="p-2 text-gray-400 hover:text-[#125093] hover:bg-[#125093]/10 rounded-md transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <select
                        value={article.status ?? "draft"}
                        onChange={(e) =>
                          handleStatusChange(
                            article.id,
                            e.target.value as NewsStatus
                          )
                        }
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                      >
                        <option value="draft">Nháp</option>
                        <option value="published">Đăng</option>
                        <option value="archived">Lưu trữ</option>
                      </select>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {articles.length === 0 && (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2 poppins-medium">
                    {activeFilter
                      ? "Không tìm thấy bài viết nào"
                      : "Chưa có bài viết nào"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {activeFilter
                      ? "Thử tìm với từ khóa khác hoặc xóa bộ lọc."
                      : "Tạo bài viết đầu tiên để bắt đầu"}
                  </p>
                  <button
                    onClick={() => handleOpenEditor()}
                    className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Tạo bài viết mới
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Editor */
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#125093] poppins-semibold">
                {editingArticle ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
              </h2>
              <button
                onClick={handleCloseEditor}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nhập tiêu đề bài viết..."
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả ngắn{" "}
                  <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mô tả ngắn về bài viết..."
                />
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ảnh đại diện{" "}
                  <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Tải ảnh lên</span>
                  </label>
                  <input
                    type="url"
                    value={formData.featured_image}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    className={`flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent ${
                      imageUrlError
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    placeholder="Hoặc nhập URL ảnh (ví dụ: https://example.com/image.jpg)..."
                  />
                </div>
                {imageUrlError && (
                  <p className="mt-2 text-sm text-red-600">{imageUrlError}</p>
                )}
                {imagePreview && !imageUrlError && (
                  <div className="mt-3">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={192}
                      height={128}
                      className="w-48 h-32 object-cover rounded-md border"
                      onError={() => {
                        setImageUrlError("Không thể tải ảnh từ URL này");
                        setImagePreview("");
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <TiptapEditor
                    key={`news-editor-${editorKey}`}
                    content={formData.content}
                    onChange={(value) =>
                      setFormData({ ...formData, content: value })
                    }
                    className="min-h-[320px]"
                    placeholder="Nhập nội dung bài viết..."
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thẻ tag{" "}
                  <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                </label>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddTag())
                    }
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập tag và nhấn Enter..."
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Thêm
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full flex items-center space-x-2"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as
                          | "draft"
                          | "published"
                          | "hidden"
                          | "archived",
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Nháp</option>
                    <option value="published">Đăng ngay</option>
                    <option value="hidden">Ẩn</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_featured: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_featured"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Hiển thị nổi bật trên trang chủ
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-[#125093] hover:bg-[#0f4278] text-white px-6 py-2 rounded-md flex items-center space-x-2 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingArticle ? "Cập nhật" : "Tạo bài viết"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog.Root
          open={deleteConfirmDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmDialog({ isOpen: false, articleId: null });
            }
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Overlay
              className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
            />
            <AlertDialog.Content
              className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[425px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
              )}
            >
              <div className="flex flex-col space-y-2 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <AlertDialog.Title className="text-lg font-semibold">
                    Xác nhận xóa
                  </AlertDialog.Title>
                </div>
                <AlertDialog.Description className="text-sm text-gray-600 pt-2">
                  Bạn có chắc chắn muốn xóa bài viết này?
                </AlertDialog.Description>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <AlertDialog.Cancel asChild>
                  <Button variant="outline">Hủy</Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button variant="destructive" onClick={confirmDelete}>
                    Xóa
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
}
