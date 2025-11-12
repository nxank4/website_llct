"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  createNews,
  deleteNews,
  listNews,
  updateNews,
  updateNewsStatus,
} from "@/services/news";
import Spinner from "@/components/ui/Spinner";

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author_id: string;
  author_name: string;
  status: "draft" | "published" | "hidden" | "archived";
  featured_image?: string;
  media: Array<{
    type: string;
    url: string;
    filename: string;
    alt_text?: string;
  }>;
  tags: string[];
  views: number;
  likes: number;
  is_featured: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

interface NewsFormData {
  title: string;
  content: string;
  excerpt: string;
  status: "draft" | "published" | "hidden" | "archived";
  featured_image: string;
  tags: string[];
  is_featured: boolean;
}

export default function AdminNewsPage() {
  const authFetch = useAuthFetch();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(
    null
  );
  const [formData, setFormData] = useState<NewsFormData>({
    title: "",
    content: "",
    excerpt: "",
    status: "draft",
    featured_image: "",
    tags: [],
    is_featured: false,
  });
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUrlError, setImageUrlError] = useState<string>("");

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listNews(authFetch);
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingArticle) {
        await updateNews(authFetch, editingArticle.id, formData);
      } else {
        await createNews(authFetch, formData);
      }
      await fetchArticles();
      handleCloseEditor();
    } catch (error) {
      console.error("Error saving article:", error);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này?")) return;

    try {
      await deleteNews(authFetch, id);
      await fetchArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
    }
  };

  // Handle status change
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateNewsStatus(authFetch, id, status);
      await fetchArticles();
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
      setImageUrlError("URL không hợp lệ. Vui lòng nhập URL đầy đủ (ví dụ: https://example.com/image.jpg)");
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
        status: article.status,
        featured_image: article.featured_image || "",
        tags: article.tags,
        is_featured: article.is_featured,
      });
      const imageUrl = article.featured_image || "";
      setImagePreview(imageUrl);
      setImageUrlError(imageUrl && !isValidUrl(imageUrl) ? "URL không hợp lệ" : "");
    } else {
      setEditingArticle(null);
      setFormData({
        title: "",
        content: "",
        excerpt: "",
        status: "draft",
        featured_image: "",
        tags: [],
        is_featured: false,
      });
      setImagePreview("");
    }
    setImageUrlError("");
    setShowEditor(true);
  };

  // Close editor
  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingArticle(null);
    setTagInput("");
    setImagePreview("");
    setImageUrlError("");
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
        alert("Vui lòng chọn file ảnh");
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert("File ảnh quá lớn. Tối đa 5MB");
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
      case "hidden":
        return "bg-gray-100 text-gray-800";
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
      case "hidden":
        return "Ẩn";
      case "archived":
        return "Lưu trữ";
      default:
        return status;
    }
  };

  if (loading) {
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
              onClick={fetchArticles}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Làm mới danh sách"
            >
              <RefreshCw
                className={`h-4 w-4 md:h-5 md:w-5 ${
                  loading ? "animate-spin" : ""
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
                  alert("Không thể xuất CSV");
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
        <div className="bg-white rounded-lg shadow-md p-4 inline-block">
          <span className="bg-[#00CBB8]/10 text-[#00CBB8] text-sm font-medium px-3 py-1 rounded-full">
            {articles.length} bài viết
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {!showEditor ? (
          /* Articles List */
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#125093] poppins-semibold">
                Danh sách bài viết
              </h2>
            </div>
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
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{article.author_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(article.created_at).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{article.views} lượt xem</span>
                        </div>
                      </div>
                      {article.tags.length > 0 && (
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
                        value={article.status}
                        onChange={(e) =>
                          handleStatusChange(article.id, e.target.value)
                        }
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                      >
                        <option value="draft">Nháp</option>
                        <option value="published">Đăng</option>
                        <option value="hidden">Ẩn</option>
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
                    Chưa có bài viết nào
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Tạo bài viết đầu tiên để bắt đầu
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
                  Tiêu đề *
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
                  Mô tả ngắn
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
                  Ảnh đại diện
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
                  Nội dung *
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={15}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Nhập nội dung bài viết (hỗ trợ HTML)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bạn có thể sử dụng HTML để định dạng nội dung
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thẻ tag
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
      </div>
    </div>
  );
}
