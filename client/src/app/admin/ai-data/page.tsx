'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Database, 
  Upload, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  MessageCircle,
  Settings,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AIDataPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [aiData, setAiData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { hasRole } = useAuth();

  const categories = [
    { id: 'all', name: 'Tất cả', count: 1250 },
    { id: 'documents', name: 'Tài liệu', count: 450 },
    { id: 'videos', name: 'Video', count: 320 },
    { id: 'images', name: 'Hình ảnh', count: 280 },
    { id: 'audio', name: 'Âm thanh', count: 200 }
  ];

  const mockAIData = [
    {
      id: 1,
      title: 'Giáo trình Toán học cơ bản',
      category: 'documents',
      categoryName: 'Tài liệu',
      description: 'Tài liệu học tập môn Toán học cơ bản cho sinh viên năm nhất',
      fileType: 'pdf',
      fileSize: '2.5 MB',
      uploadDate: '2024-01-15',
      lastProcessed: '2024-01-15',
      status: 'processed',
      statusText: 'Đã xử lý',
      embeddings: 1250,
      chunks: 45,
      usage: 89,
      tags: ['toán học', 'cơ bản', 'giáo trình'],
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: 2,
      title: 'Video bài giảng Vật lý đại cương',
      category: 'videos',
      categoryName: 'Video',
      description: 'Video bài giảng về các khái niệm cơ bản trong vật lý đại cương',
      fileType: 'mp4',
      fileSize: '125 MB',
      uploadDate: '2024-01-14',
      lastProcessed: '2024-01-14',
      status: 'processing',
      statusText: 'Đang xử lý',
      embeddings: 0,
      chunks: 0,
      usage: 0,
      tags: ['vật lý', 'video', 'bài giảng'],
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: 3,
      title: 'Hình ảnh minh họa Hóa học',
      category: 'images',
      categoryName: 'Hình ảnh',
      description: 'Bộ sưu tập hình ảnh minh họa các phản ứng hóa học',
      fileType: 'jpg',
      fileSize: '8.2 MB',
      uploadDate: '2024-01-13',
      lastProcessed: '2024-01-13',
      status: 'processed',
      statusText: 'Đã xử lý',
      embeddings: 320,
      chunks: 12,
      usage: 45,
      tags: ['hóa học', 'hình ảnh', 'phản ứng'],
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: 4,
      title: 'Bài giảng âm thanh Sinh học',
      category: 'audio',
      categoryName: 'Âm thanh',
      description: 'File âm thanh bài giảng về sinh học phân tử',
      fileType: 'mp3',
      fileSize: '45 MB',
      uploadDate: '2024-01-12',
      lastProcessed: '2024-01-12',
      status: 'processed',
      statusText: 'Đã xử lý',
      embeddings: 890,
      chunks: 28,
      usage: 67,
      tags: ['sinh học', 'âm thanh', 'phân tử'],
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: 5,
      title: 'Tài liệu tham khảo Tiếng Anh',
      category: 'documents',
      categoryName: 'Tài liệu',
      description: 'Tài liệu tham khảo về ngữ pháp và từ vựng tiếng Anh',
      fileType: 'docx',
      fileSize: '1.8 MB',
      uploadDate: '2024-01-11',
      lastProcessed: '2024-01-11',
      status: 'error',
      statusText: 'Lỗi xử lý',
      embeddings: 0,
      chunks: 0,
      usage: 0,
      tags: ['tiếng anh', 'ngữ pháp', 'từ vựng'],
      thumbnail: '/api/placeholder/300/200'
    },
    {
      id: 6,
      title: 'Video thí nghiệm Hóa học',
      category: 'videos',
      categoryName: 'Video',
      description: 'Video ghi lại các thí nghiệm hóa học thực tế',
      fileType: 'mp4',
      fileSize: '89 MB',
      uploadDate: '2024-01-10',
      lastProcessed: '2024-01-10',
      status: 'processed',
      statusText: 'Đã xử lý',
      embeddings: 650,
      chunks: 22,
      usage: 123,
      tags: ['hóa học', 'thí nghiệm', 'video'],
      thumbnail: '/api/placeholder/300/200'
    }
  ];

  const stats = [
    {
      title: 'Tổng dữ liệu',
      value: '1,250',
      change: '+12%',
      changeType: 'positive',
      icon: Database,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'Đã xử lý',
      value: '1,180',
      change: '+8%',
      changeType: 'positive',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'Đang xử lý',
      value: '45',
      change: '-3%',
      changeType: 'negative',
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-100'
    },
    {
      title: 'Lỗi xử lý',
      value: '25',
      change: '-15%',
      changeType: 'positive',
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100'
    }
  ];

  useEffect(() => {
    const fetchAIData = async () => {
      // Simulate API call
      setTimeout(() => {
        setAiData(mockAIData);
        setLoading(false);
      }, 1000);
    };
    fetchAIData();
  }, []);

  const filteredData = aiData.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      case 'oldest':
        return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      case 'size':
        return parseFloat(b.fileSize) - parseFloat(a.fileSize);
      case 'usage':
        return b.usage - a.usage;
      default:
        return 0;
    }
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
      case 'docx':
      case 'doc':
        return FileText;
      case 'mp4':
      case 'avi':
      case 'mov':
        return Video;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return ImageIcon;
      case 'mp3':
      case 'wav':
      case 'aac':
        return File;
      default:
        return File;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const sidebarItems = [
    { id: 'dashboard', title: 'Bảng tổng kết', icon: BarChart3, color: '#125093', href: '/admin/dashboard' },
    { id: 'ai-data', title: 'Dữ liệu AI', icon: Database, color: '#00CBB8', href: '/admin/ai-data', active: true },
    { id: 'library', title: 'Thư viện môn học', icon: BookOpen, color: '#5B72EE', href: '/admin/library' },
    { id: 'products', title: 'Sản phẩm học tập', icon: FileText, color: '#F48C06', href: '/admin/products' },
    { id: 'tests', title: 'Bài kiểm tra', icon: FileText, color: '#29B9E7', href: '/admin/tests' },
    { id: 'news', title: 'Tin tức', icon: MessageCircle, color: '#00CBB8', href: '/admin/news' },
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
        <div className="bg-white shadow-sm border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dữ liệu AI</h1>
              <p className="text-gray-600 mt-1">Quản lý và xử lý dữ liệu cho hệ thống AI</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <RefreshCw className="h-4 w-4" />
                <span>Làm mới</span>
              </button>
              
              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Tải lên</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className={`text-sm flex items-center ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color} dark:bg-opacity-80`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
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
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-64"
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
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="size">Kích thước</option>
                <option value="usage">Sử dụng</option>
              </select>
              
              {/* View Mode */}
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Grid/List */}
        {loading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse">
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
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {sortedData.map((item) => {
              const FileIcon = getFileIcon(item.fileType);
              return (
                <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                  viewMode === 'list' ? 'flex' : ''
                }`}>
                  {viewMode === 'grid' ? (
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
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
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
                            {item.fileSize}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex space-x-2">
                          <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                            Xem chi tiết
                          </button>
                          <button className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                {item.statusText}
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                              {item.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">
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
                                {item.fileSize}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {item.tags.slice(0, 4).map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2 ml-4">
                            <button className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                              Xem chi tiết
                            </button>
                            <div className="flex space-x-2">
                              <button className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <Download className="h-4 w-4" />
                              </button>
                              <button className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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

        {!loading && sortedData.length === 0 && (
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Không tìm thấy dữ liệu</h3>
            <p className="text-gray-500 dark:text-gray-400">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Tải lên dữ liệu AI</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chọn file
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Kéo thả file vào đây hoặc click để chọn</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Hỗ trợ: PDF, DOC, MP4, JPG, MP3</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nhập tiêu đề..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Thẻ
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nhập thẻ..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mô tả
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Nhập mô tả..."
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-8">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Tải lên
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    </ProtectedRoute>
  );
}
