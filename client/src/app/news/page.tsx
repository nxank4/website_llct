'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  User, 
  Eye, 
  Tag, 
  Search, 
  Filter,
  ArrowRight,
  Clock,
  Star
} from 'lucide-react';
import { API_ENDPOINTS, getFullUrl } from '@/lib/api';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  author_name: string;
  published_at: string;
  views: number;
  likes: number;
  tags: string[];
  is_featured: boolean;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  // Fetch articles
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        
        // Fetch latest articles
        const latestResponse = await fetch(getFullUrl(API_ENDPOINTS.NEWS_LATEST + '?limit=20'));
        if (latestResponse.ok) {
          const latestData = await latestResponse.json();
          setArticles(Array.isArray(latestData) ? latestData : []);
          
          // Extract unique tags
          const tags = new Set<string>();
          latestData.forEach((article: NewsArticle) => {
            article.tags.forEach(tag => tags.add(tag));
          });
          setAllTags(Array.from(tags));
        }
        
        // Fetch featured articles
        const featuredResponse = await fetch(getFullUrl(API_ENDPOINTS.NEWS_FEATURED + '?limit=3'));
        if (featuredResponse.ok) {
          const featuredData = await featuredResponse.json();
          setFeaturedArticles(Array.isArray(featuredData) ? featuredData : []);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
        setArticles([]);
        setFeaturedArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // Filter articles
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (article.excerpt && article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = !selectedTag || article.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Vừa xong';
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải tin tức...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Tin tức & Cập nhật
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Cập nhật những thông tin mới nhất về chương trình đào tạo, sự kiện và hoạt động của khoa
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center mb-8">
              <Star className="h-6 w-6 text-yellow-500 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">Tin nổi bật</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {featuredArticles.map((article, index) => (
                <div
                  key={article.id}
                  className={`${index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''} bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow`}
                >
                  {article.featured_image && (
                    <div className={`${index === 0 ? 'h-64 lg:h-80' : 'h-48'} bg-gray-200`}>
                      <img
                        src={article.featured_image}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`${index === 0 ? 'p-8' : 'p-6'}`}>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatTimeAgo(article.published_at)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{article.views}</span>
                      </div>
                    </div>
                    <h3 className={`${index === 0 ? 'text-2xl lg:text-3xl' : 'text-xl'} font-bold text-gray-900 mb-3 line-clamp-2`}>
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className={`text-gray-600 mb-4 ${index === 0 ? 'text-lg line-clamp-3' : 'line-clamp-2'}`}>
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{article.author_name}</span>
                      </div>
                      <Link
                        href={`/news/${article.slug}`}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                      >
                        <span>Đọc thêm</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài viết..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-64">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">Tất cả chủ đề</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((article) => (
            <article key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {article.featured_image && (
                <div className="h-48 bg-gray-200">
                  <img
                    src={article.featured_image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTimeAgo(article.published_at)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{article.views}</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  {article.title}
                </h3>
                
                {article.excerpt && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>
                )}
                
                {article.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded cursor-pointer hover:bg-blue-100"
                          onClick={() => setSelectedTag(tag)}
                        >
                          {tag}
                        </span>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="text-gray-500 text-xs">+{article.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{article.author_name}</span>
                  </div>
                  <Link
                    href={`/news/${article.slug}`}
                    className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                  >
                    <span>Đọc thêm</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Không tìm thấy bài viết nào
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedTag 
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'
                : 'Chưa có bài viết nào được đăng'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}