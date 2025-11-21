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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/contexts/ToastContext";
import TiptapEditor from "@/components/ui/TiptapEditor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import { getPlaceholderImage, handleImageError } from "@/lib/imageFallback";

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
  const [submitting, setSubmitting] = useState(false);
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

    // Prevent double submit
    if (submitting) return;

    if (!formData.content || formData.content.trim().length === 0) {
      showToast({
        type: "warning",
        title: "Thiếu nội dung",
        message: "Vui lòng nhập nội dung bài viết trước khi lưu.",
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingArticle) {
        await updateNews(fetchLike, editingArticle.id, formData);
        showToast({
          type: "success",
          title: "Thành công",
          message: "Đã cập nhật bài viết thành công",
        });
      } else {
        await createNews(fetchLike, formData);
        showToast({
          type: "success",
          title: "Thành công",
          message: "Đã tạo bài viết thành công",
        });
      }
      await fetchArticles(activeFilter || undefined);
      handleCloseEditor();
    } catch (error) {
      console.error("Error saving article:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: editingArticle
          ? "Không thể cập nhật bài viết"
          : "Không thể tạo bài viết",
      });
    } finally {
      setSubmitting(false);
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
  const handleStatusChange = async (
    id: number | string,
    status: NewsStatus
  ) => {
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
  const handleOpenEditor = (article?: AdminArticle) => {
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
        return "bg-green-500/15 text-green-500";
      case "draft":
        return "bg-amber-500/15 text-amber-500";
      case "archived":
        return "bg-red-500/15 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
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
        color: "var(--brand-primary)",
      },
      {
        name: "Nháp",
        value: analytics.totals.draft,
        color: "#fbbf24",
      },
      {
        name: "Lưu trữ",
        value: analytics.totals.archived,
        color: "#94a3b8",
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="xl" text="Đang tải tin tức..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 poppins-bold">
              Quản lý tin tức
            </h1>
            <p className="text-muted-foreground">
              Tạo và quản lý các bài viết tin tức
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                fetchArticles(activeFilter || undefined);
                fetchAnalytics();
              }}
              disabled={loading || analyticsLoading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-muted-foreground hover:bg-accent transition-colors"
              title="Xuất CSV"
            >
              <Download className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
            <button
              onClick={() => handleOpenEditor()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo bài viết mới</span>
            </button>
          </div>
        </div>
        <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
              {articles.length} bài viết
            </span>
            {activeFilter && (
              <span className="text-xs text-muted-foreground">
                Kết quả cho &ldquo;
                <span className="font-semibold text-foreground">
                  {activeFilter}
                </span>
                &rdquo;
              </span>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchArticles(searchTerm.trim() || undefined);
            }}
            className="flex items-center gap-3 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm bài viết..."
                className="w-full pl-9 pr-3"
              />
            </div>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
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
          <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border p-10 flex items-center justify-center">
            <Spinner size="lg" text="Đang tải dashboard tin tức..." />
          </div>
        ) : analyticsError ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-destructive font-semibold">{analyticsError}</p>
              <p className="text-sm text-destructive/80 mt-1">
                Hãy thử làm mới hoặc kiểm tra kết nối.
              </p>
            </div>
            <Button variant="destructive" onClick={fetchAnalytics}>
              Thử lại
            </Button>
          </div>
        ) : hasAnalyticsData ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-4"
                >
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-semibold text-foreground mt-2">
                    {card.value}
                  </p>
                  {card.sub && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.sub}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-5 xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Tần suất đăng bài
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Số bài viết theo tháng gần đây
                    </p>
                  </div>
                </div>
                {publishingTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={publishingTrendData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="label"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <ReTooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary)/0.2)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa đủ dữ liệu để hiển thị.
                  </p>
                )}
              </div>
              <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">
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
                        {statusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa có dữ liệu tình trạng bài viết.
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  {statusChartData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Top bài viết theo lượt xem
                </h3>
                {topArticlesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={topArticlesData}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        dataKey="title"
                        type="category"
                        width={180}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <ReTooltip />
                      <Bar
                        dataKey="views"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa có dữ liệu lượt xem.
                  </p>
                )}
              </div>
              <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-5">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Chủ đề được quan tâm
                </h3>
                {tagChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={tagChartData}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        dataKey="tag"
                        type="category"
                        width={160}
                        tick={{
                          fontSize: 12,
                          fill: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <ReTooltip />
                      <Bar
                        dataKey="count"
                        fill="hsl(var(--primary)/0.6)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Chưa có dữ liệu thẻ tag.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-5">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Phân bố thời gian đọc
              </h3>
              {readingTimeChartData.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={readingTimeChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="bucket"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <ReTooltip />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary)/0.5)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có dữ liệu thời gian đọc.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border p-8 text-center text-muted-foreground">
            Chưa có dữ liệu để dựng dashboard.
          </div>
        )}
      </section>

      <div className="max-w-7.5xl mx-auto">
        {/* Articles List */}
        <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-primary poppins-semibold">
              Danh sách bài viết
            </h2>
          </div>
          {loading && articles.length > 0 && (
            <div className="px-6 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Spinner size="sm" inline />
              <span>Đang cập nhật danh sách...</span>
            </div>
          )}
          <div className="divide-y">
            {articles.map((article) => (
              <div
                key={article.id}
                className="p-6 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-foreground poppins-medium">
                        {article.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          article.status ?? "draft"
                        )}`}
                      >
                        {getStatusText(article.status ?? "draft")}
                      </span>
                      {article.is_featured && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    {article.excerpt && (
                      <p className="text-muted-foreground mb-3 line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{article.author_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Đăng:{" "}
                          {formatDate(
                            article.published_at ?? article.created_at
                          )}
                        </span>
                      </div>
                      {article.updated_at && (
                        <div className="flex items-center gap-1">
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Cập nhật: {formatDate(article.updated_at)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatReadingTime(article.reading_time_minutes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {article.views.toLocaleString("vi-VN")} lượt xem
                        </span>
                      </div>
                    </div>
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {article.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="bg-primary/10 text-primary text-xs px-2 py-1 rounded"
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
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <Select
                      value={article.status ?? "draft"}
                      onValueChange={(value) =>
                        handleStatusChange(article.id, value as NewsStatus)
                      }
                    >
                      <SelectTrigger className="text-sm w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Nháp</SelectItem>
                        <SelectItem value="published">Đăng</SelectItem>
                        <SelectItem value="archived">Lưu trữ</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
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
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2 poppins-medium">
                  {activeFilter
                    ? "Không tìm thấy bài viết nào"
                    : "Chưa có bài viết nào"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeFilter
                    ? "Thử tìm với từ khóa khác hoặc xóa bộ lọc."
                    : "Tạo bài viết đầu tiên để bắt đầu"}
                </p>
                <button
                  onClick={() => handleOpenEditor()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors"
                >
                  Tạo bài viết mới
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit News Modal */}
        <Dialog
          open={showEditor}
          onOpenChange={(open) => {
            if (!open && !submitting) {
              handleCloseEditor();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 bg-card text-card-foreground border border-border shadow-2xl">
            <div className="flex flex-col h-full">
              <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                <DialogHeader className="space-y-0">
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {editingArticle ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Biểu mẫu tạo hoặc chỉnh sửa bài viết tin tức
                  </DialogDescription>
                </DialogHeader>
                <DialogClose
                  className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  disabled={submitting}
                >
                  <X className="h-5 w-5" />
                </DialogClose>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto px-6 py-6 bg-card space-y-6"
              >
                <FieldGroup>
                  {/* Title */}
                  <Field>
                    <FieldLabel htmlFor="news-title">
                      Tiêu đề <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="news-title"
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full"
                      placeholder="Nhập tiêu đề bài viết..."
                    />
                  </Field>

                  {/* Excerpt */}
                  <Field>
                    <FieldLabel htmlFor="news-excerpt">
                      Mô tả ngắn{" "}
                      <span className="text-muted-foreground text-xs">
                        (Tùy chọn)
                      </span>
                    </FieldLabel>
                    <Textarea
                      id="news-excerpt"
                      value={formData.excerpt || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, excerpt: e.target.value })
                      }
                      rows={3}
                      className="w-full"
                      placeholder="Mô tả ngắn về bài viết..."
                    />
                  </Field>

                  {/* Featured Image */}
                  <Field data-invalid={!!imageUrlError}>
                    <FieldLabel htmlFor="news-featured-image">
                      Ảnh đại diện{" "}
                      <span className="text-muted-foreground text-xs">
                        (Tùy chọn)
                      </span>
                    </FieldLabel>
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
                        className="flex items-center space-x-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md cursor-pointer transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Tải ảnh lên</span>
                      </label>
                      <Input
                        id="news-featured-image"
                        type="url"
                        value={formData.featured_image || ""}
                        onChange={(e) => handleImageUrlChange(e.target.value)}
                        className={`flex-1 ${
                          imageUrlError
                            ? "border-destructive/40 focus-visible:ring-destructive"
                            : ""
                        }`}
                        placeholder="Hoặc nhập URL ảnh (ví dụ: https://example.com/image.jpg)..."
                        aria-invalid={!!imageUrlError}
                      />
                    </div>
                    <FieldError>{imageUrlError}</FieldError>
                    {imagePreview && !imageUrlError && (
                      <div className="mt-3">
                        <Image
                          src={imagePreview || getPlaceholderImage(192, 128)}
                          alt="Preview"
                          width={192}
                          height={128}
                          className="w-48 h-32 object-cover rounded-md border border-border"
                          onError={(event) => {
                            handleImageError(event, 192, 128, "Preview");
                            setImageUrlError("Không thể tải ảnh từ URL này");
                          }}
                        />
                      </div>
                    )}
                  </Field>

                  {/* Content */}
                  <Field>
                    <FieldLabel htmlFor="news-content">
                      Nội dung <span className="text-destructive">*</span>
                    </FieldLabel>
                    <div className="border border-border rounded-md overflow-hidden">
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
                  </Field>

                  {/* Tags */}
                  <Field>
                    <FieldLabel htmlFor="news-tag-input">
                      Thẻ tag{" "}
                      <span className="text-muted-foreground text-xs">
                        (Tùy chọn)
                      </span>
                    </FieldLabel>
                    <div className="flex items-center space-x-2 mb-3">
                      <Input
                        id="news-tag-input"
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" &&
                          (e.preventDefault(), handleAddTag())
                        }
                        className="flex-1"
                        placeholder="Nhập tag và nhấn Enter..."
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md"
                      >
                        Thêm
                      </button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full flex items-center space-x-2"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-primary hover:text-primary/80"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </Field>

                  {/* Settings */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Field>
                      <FieldLabel htmlFor="news-status">Trạng thái</FieldLabel>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            status: value as NewsStatus,
                          })
                        }
                      >
                        <SelectTrigger id="news-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Nháp</SelectItem>
                          <SelectItem value="published">Đăng ngay</SelectItem>
                          <SelectItem value="archived">Lưu trữ</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field orientation="horizontal">
                      <Checkbox
                        id="is_featured"
                        checked={formData.is_featured}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            is_featured: checked === true,
                          })
                        }
                      />
                      <FieldLabel htmlFor="is_featured" className="font-normal">
                        Hiển thị nổi bật trên trang chủ
                      </FieldLabel>
                    </Field>
                  </div>
                </FieldGroup>

                <DialogFooter className="border-t border-border pt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseEditor}
                      disabled={submitting}
                    >
                      Hủy
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {submitting ? (
                      <>
                        <Spinner size="sm" inline />
                        <span>
                          Đang {editingArticle ? "cập nhật" : "tạo"}...
                        </span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>
                          {editingArticle ? "Cập nhật" : "Tạo bài viết"}
                        </span>
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmDialog({ isOpen: false, articleId: null });
            }
          }}
        >
          <AlertDialogContent className="max-w-[425px]">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-2">
                Bạn có chắc chắn muốn xóa bài viết này?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline">Hủy</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="destructive" onClick={confirmDelete}>
                  Xóa
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
