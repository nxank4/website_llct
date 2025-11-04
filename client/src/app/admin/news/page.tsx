'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  Image, 
  Video, 
  Tag,
  Calendar,
  User,
  FileText,
  Star,
  Upload,
  BarChart3,
  Brain,
  BookOpen,
  MessageSquare,
  Users
} from 'lucide-react';
import { createNews, deleteNews, listNews, updateNews, updateNewsStatus } from '@/services/news';

export const dynamic = 'force-dynamic';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author_id: string;
  author_name: string;
  status: 'draft' | 'published' | 'hidden' | 'archived';
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
  status: 'draft' | 'published' | 'hidden' | 'archived';
  featured_image: string;
  tags: string[];
  is_featured: boolean;
}

export default function AdminNewsPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState<NewsFormData>({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    featured_image: '',
    tags: [],
    is_featured: false
  });
  const [tagInput, setTagInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  // Fetch articles
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await listNews(authFetch);
      setArticles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

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
      console.error('Error saving article:', error);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    
    try {
      await deleteNews(authFetch, id);
      await fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
    }
  };

  // Handle status change
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateNewsStatus(authFetch, id, status);
      await fetchArticles();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Open editor
  const handleOpenEditor = (article?: NewsArticle) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt || '',
        status: article.status,
        featured_image: article.featured_image || '',
        tags: article.tags,
        is_featured: article.is_featured
      });
      setImagePreview(article.featured_image || '');
    } else {
      setEditingArticle(null);
      setFormData({
        title: '',
        content: '',
        excerpt: '',
        status: 'draft',
        featured_image: '',
        tags: [],
        is_featured: false
      });
      setImagePreview('');
    }
    setShowEditor(true);
  };

  // Close editor
  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingArticle(null);
    setTagInput('');
    setImagePreview('');
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to a server
      // For now, we'll use a placeholder URL
      const imageUrl = URL.createObjectURL(file);
      setFormData({ ...formData, featured_image: imageUrl });
      setImagePreview(imageUrl);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'hidden': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Đã đăng';
      case 'draft': return 'Nháp';
      case 'hidden': return 'Ẩn';
      case 'archived': return 'Lưu trữ';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'dashboard', title: 'Bảng tổng kết', icon: BarChart3, color: '#125093', href: '/admin/dashboard' },
    { id: 'ai-data', title: 'Dữ liệu AI', icon: Brain, color: '#00CBB8', href: '/admin/ai-data' },
    { id: 'library', title: 'Thư viện môn học', icon: BookOpen, color: '#5B72EE', href: '/admin/library' },
    { id: 'products', title: 'Sản phẩm học tập', icon: FileText, color: '#F48C06', href: '/admin/products' },
    { id: 'tests', title: 'Bài kiểm tra', icon: FileText, color: '#29B9E7', href: '/admin/tests' },
    { id: 'news', title: 'Tin tức', icon: MessageSquare, color: '#00CBB8', href: '/admin/news', active: true },
    { id: 'members', title: 'Thành viên', icon: Users, color: '#8B5CF6', href: '/admin/members' }
  ];

  return (
    <ProtectedRoute requiredRoles={['admin', 'instructor']}>
      <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-56 bg-white p-4 border-r border-gray-100">
        {/* Logo */}
        <div className="mb-6">
          <img 
            src="https://placehold.co/192x192" 
            alt="Logo" 
            className="w-24 h-24 md:w-32 md:h-32 mb-6"
          />
        </div>

        {/* Sidebar Menu */}
        <div className="space-y-8">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;
            return (
              <a
                key={item.id}
                href={item.href}
                className="flex items-center gap-4 hover:opacity-90"
              >
                <div
                  className="w-8 h-8 flex items-center justify-center rounded"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className={`flex-1 text-sm md:text-base ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                  {item.title}
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Quản lý tin tức</h1>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                  {articles.length} bài viết
                </span>
              </div>
              <button
                onClick={() => handleOpenEditor()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Tạo bài viết mới</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex-1">
            {!showEditor ? (
              /* Articles List */
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Danh sách bài viết</h2>
                </div>
                <div className="divide-y">
                  {articles.map((article) => (
                    <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{article.title}</h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(article.status)}`}>
                              {getStatusText(article.status)}
                            </span>
                            {article.is_featured && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          {article.excerpt && (
                            <p className="text-gray-600 mb-3 line-clamp-2">{article.excerpt}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{article.author_name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(article.created_at).toLocaleDateString('vi-VN')}</span>
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
                                  <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
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
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <select
                            value={article.status}
                            onChange={(e) => handleStatusChange(article.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1"
                          >
                            <option value="draft">Nháp</option>
                            <option value="published">Đăng</option>
                            <option value="hidden">Ẩn</option>
                            <option value="archived">Lưu trữ</option>
                          </select>
                          <button
                            onClick={() => handleDelete(article.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có bài viết nào</h3>
                      <p className="text-gray-600 mb-4">Tạo bài viết đầu tiên để bắt đầu</p>
                      <button
                        onClick={() => handleOpenEditor()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                      >
                        Tạo bài viết mới
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Editor */
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingArticle ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
                  </h2>
                  <button
                    onClick={handleCloseEditor}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
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
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
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
                        onChange={(e) => {
                          setFormData({ ...formData, featured_image: e.target.value });
                          setImagePreview(e.target.value);
                        }}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Hoặc nhập URL ảnh..."
                      />
                    </div>
                    {imagePreview && (
                      <div className="mt-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-48 h-32 object-cover rounded-md border"
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
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
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
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_featured" className="ml-2 block text-sm text-gray-700">
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
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md flex items-center space-x-2 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>{editingArticle ? 'Cập nhật' : 'Tạo bài viết'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}