'use client';

import { useAuth } from '@/contexts/AuthContext';
import { 
  BookOpen, 
  MessageCircle, 
  FileText, 
  Users, 
  BarChart3,
  ArrowRight,
  Star,
  Clock,
  Award,
  Play,
  Download,
  MessageSquare,
  TrendingUp,
  Calendar,
  Bell,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  Target,
  Zap,
  GraduationCap,
  Book,
  TestTube
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { API_ENDPOINTS, getFullUrl } from '@/lib/api';

interface NewsArticle {
  id: string;
  title: string;
  excerpt?: string;
  featured_image?: string;
  author_name: string;
  published_at: string;
  views: number;
}

export default function Home() {
  const { isAuthenticated, user, hasRole } = useAuth();
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  
  // Fetch latest news
  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        setLoadingNews(true);
        const response = await fetch(getFullUrl(API_ENDPOINTS.NEWS_LATEST + '?limit=3'));
        if (response.ok) {
          const data = await response.json();
          setLatestNews(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setLatestNews([]);
      } finally {
        setLoadingNews(false);
      }
    };

    fetchLatestNews();
  }, []);

  const features = [
    {
      title: 'Thư viện giáo trình',
      description: 'Our curriculum focuses on nurturing cognitive, social, emotional, and physical development, ensuring a well-rounded education.',
      icon: GraduationCap,
      color: '#5B72EE'
    },
    {
      title: 'Chat Bot AI',
      description: 'Our passionate and qualified teachers create a supportive and stimulating learning environment.',
      icon: MessageCircle,
      color: '#00CBB8'
    },
    {
      title: 'Kiểm tra',
      description: 'We prioritize safety and provide a warm and caring atmosphere for every child.',
      icon: TestTube,
      color: '#29B9E7'
    }
  ];

  const newsItems = [
    {
      id: 1,
      title: 'Phiên bản mới nhất của SEB đã cập nhập',
      description: 'Cập nhật các tính năng mới và cải thiện trải nghiệm người dùng',
      date: '10/10/2025',
      image: 'https://placehold.co/640x408',
      isMain: true
    },
    {
      id: 2,
      title: 'Sự kiện Hội sử Mùa thu 2025 đã chính thức khởi động',
      description: 'Tôn vinh Chủ tịch Hồ Chí Minh và tạo sân chơi cho sinh viên',
      image: 'https://placehold.co/269x200',
      isMain: false
    },
    {
      id: 3,
      title: 'Sự kiện Hội sử Mùa thu 2025 đã chính thức khởi động',
      description: 'Tôn vinh Chủ tịch Hồ Chí Minh và tạo sân chơi cho sinh viên',
      image: 'https://placehold.co/270x200',
      isMain: false
    },
    {
      id: 4,
      title: 'Sự kiện Hội sử Mùa thu 2025 đã chính thức khởi động',
      description: 'Tôn vinh Chủ tịch Hồ Chí Minh và tạo sân chơi cho sinh viên',
      image: 'https://placehold.co/270x200',
      isMain: false
    }
  ];

  const announcements = [
    {
      id: 1,
      instructor: 'Thầy Văn Bình',
      message: 'Lớp GD1703 slot 4 ngày 17/09/2025 chuyển xuống phòng G04.',
      contact: 'Liên hệ: 090.xxx.xxx',
      image: 'https://placehold.co/522x480'
    },
    {
      id: 2,
      instructor: 'Thầy Văn Bình',
      message: 'Lớp GD1703 slot 4 ngày 17/09/2025 chuyển xuống phòng G04.',
      contact: 'Liên hệ: 090.xxx.xxx',
      image: 'https://placehold.co/522x480'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-[#125093] overflow-hidden min-h-screen">
        {/* Background elements */}
        <div className="absolute top-20 right-20 w-5 h-5 bg-[#C4C4C4] rounded-full"></div>
        <div className="absolute top-32 right-32 w-5 h-5 bg-[#4EE381] rounded-full"></div>
        <div className="absolute top-40 right-40 w-2 h-2 bg-white rounded-full"></div>
        
        {/* Main content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              {isAuthenticated && user && (
                <div className="mb-6 p-4 bg-white bg-opacity-20 rounded-lg">
                  <p className="text-[20px] leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>
                    Chào mừng trở lại, <span className="font-bold">{user.full_name || user.username || user.email}</span>!
                    {hasRole('admin') && <span className="ml-2 text-[#00CBB8]">(Quản trị viên)</span>}
                  </p>
                </div>
              )}
              
              <h1 className="text-[54px] font-bold leading-[81px] mb-6" style={{fontFamily: 'SVN-Poppins'}}>
                Thư viện online bộ môn <span className="text-[#00CBB8]">Soft Skills</span>
              </h1>
              <p className="text-[24px] leading-[38.40px] mb-12" style={{fontFamily: 'Arimo'}}>
                Kho học tập online bộ môn Kỹ năng mềm trường Đại học FPT
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  href={isAuthenticated ? "/library" : "/login"}
                  className="w-[270px] px-5 py-5 bg-white bg-opacity-30 rounded-full text-white text-[22px] font-semibold text-center transition-colors"
                  style={{fontFamily: 'SVN-Gilroy', letterSpacing: '0.44px'}}
                >
                  Học ngay
                </Link>
                <Link
                  href={isAuthenticated ? "/chatbot" : "/login"}
                  className="w-[270px] px-5 py-5 bg-white bg-opacity-30 rounded-full text-white text-[22px] font-semibold text-center transition-colors"
                  style={{fontFamily: 'SVN-Gilroy', letterSpacing: '0.44px'}}
                >
                  Trò chuyện cùng AI
                </Link>
              </div>
            </div>

            {/* Right Content - Info Boxes */}
            <div className="relative">
              {/* Student Image Placeholder */}
              <div className="absolute right-0 top-0 w-[544px] h-[892px] bg-gray-200 rounded-lg shadow-2xl flex items-center justify-center">
                <Users className="h-32 w-32 text-gray-400" />
              </div>
              
              {/* Floating Info Cards */}
              <div className="relative z-10 space-y-6">
                {/* Card 1 */}
                <div className="w-[390px] p-6 bg-white bg-opacity-80 backdrop-blur-sm rounded-[20px] shadow-lg">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-[50px] h-[50px] bg-[#F88C3D] rounded-lg flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[22px] font-semibold text-[#595959]" style={{fontFamily: 'SVN-Gilroy', letterSpacing: '0.44px'}}>
                        Thư viện giáo trình
                      </h3>
                      <p className="text-[20px] text-[#545567] leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>
                        Hỗ trợ sinh viên
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="w-[417px] p-6 bg-white bg-opacity-80 backdrop-blur-sm rounded-[20px] shadow-lg ml-8">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-[50px] h-[50px] bg-[#F3627C] rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[22px] font-semibold text-[#595959]" style={{fontFamily: 'SVN-Gilroy', letterSpacing: '0.44px'}}>
                        Kiểm tra trình độ
                      </h3>
                      <p className="text-[20px] text-[#545567] leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>
                        Chuẩn bị tinh thần trước kỳ thi
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="w-[349px] p-6 bg-white bg-opacity-80 backdrop-blur-sm rounded-[20px] shadow-lg">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-[50px] h-[50px] bg-[#23BDEE] rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[22px] font-semibold text-[#595959]" style={{fontFamily: 'SVN-Gilroy', letterSpacing: '0.44px'}}>
                        Phản biện cùng AI
                      </h3>
                      <p className="text-[20px] text-[#545567] leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>
                        Củng cố kiến thức
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-[48px] font-bold text-[#010514] leading-[62.40px] mb-6" style={{fontFamily: 'SVN-Poppins'}}>
              Bắt đầu hành trình học tập của bạn
            </h2>
            <p className="text-[24px] text-[#5B5B5B] leading-[38.40px]" style={{fontFamily: 'SVN-Gilroy'}}>
              Khám phá các tính năng của website bộ môn Kỹ năng mềm thuộc trường Đại học FPT và nâng cao điểm số của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="relative">
                  {/* Icon */}
                  <div className="absolute -top-10 left-8 z-10">
                    <div 
                      className="w-[60px] h-[60px] rounded-xl flex items-center justify-center shadow-lg"
                      style={{backgroundColor: feature.color}}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Card */}
                  <div className="pt-16 pb-12 px-8 bg-white shadow-[4px_4px_15px_#9DA1A6] rounded-xl">
                    <h3 className="text-[28px] font-bold text-[#010514] leading-[36.40px] mb-5" style={{fontFamily: 'SVN-Poppins'}}>
                      {feature.title}
                    </h3>
                    <p className="text-[20px] text-[#5B5B5B] leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* News Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-[32px] font-bold text-[#010514] leading-[48px] mb-6" style={{fontFamily: 'SVN-Poppins'}}>
              Tin tức mới nhất
            </h2>
            <p className="text-[24px] text-[#5B5B5B] leading-[38.40px]" style={{fontFamily: 'SVN-Gilroy'}}>
              Cập nhập thông tin mới nhất của bộ môn
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Main News */}
            <div className="space-y-8">
              <img 
                src={newsItems[0].image} 
                alt={newsItems[0].title}
                className="w-full h-[408px] object-cover rounded-[20px]"
              />
              <div className="space-y-6">
                <h3 className="text-[28px] font-bold text-[#125093] leading-[36.40px]" style={{fontFamily: 'SVN-Poppins'}}>
                  {newsItems[0].title}
                </h3>
                <p className="text-[20px] text-[#5B5B5B] leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>
                  {newsItems[0].description}
                </p>
                <div className="border-b border-[#5B5B5B] pb-2 inline-block">
                  <span className="text-[22px] text-[#5B5B5B]" style={{fontFamily: 'SVN-Gilroy'}}>
                    Đọc thêm
                  </span>
                </div>
              </div>
            </div>

            {/* Side News */}
            <div className="space-y-8">
              {newsItems.slice(1).map((item) => (
                <div key={item.id} className="flex gap-6">
                  <img 
                    src={item.image} 
                    alt={item.title}
                    className="w-[269px] h-[200px] object-cover rounded-[20px] flex-shrink-0"
                  />
                  <div className="space-y-4">
                    <h4 className="text-[28px] font-bold text-[#125093] leading-[36.40px]" style={{fontFamily: 'SVN-Poppins'}}>
                      {item.title}
                    </h4>
                    <p className="text-[20px] text-[#5B5B5B] leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Announcements */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-16">
            <div className="w-20 h-1 bg-[#49BBBD] mr-8"></div>
            <h2 className="text-[54px] font-bold text-[#00CBB8] leading-[81px]" style={{fontFamily: 'SVN-Poppins'}}>
              Thông báo từ giảng viên
            </h2>
          </div>
          
          <div className="space-y-16">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="flex items-center justify-between">
                <div className="w-[701px] space-y-6">
                  <h3 className="text-[54px] font-bold text-[#125093] leading-[81px]" style={{fontFamily: 'SVN-Poppins'}}>{announcement.instructor}</h3>
                  <p className="text-[32px] text-[#5B5B5B] leading-[51.20px]" style={{fontFamily: 'Arimo'}}>{announcement.message}</p>
                  <p className="text-[32px] text-[#5B5B5B] leading-[51.20px]" style={{fontFamily: 'Arimo'}}>{announcement.contact}</p>
                </div>
                <div className="w-[522px] h-[480px] bg-gray-200 rounded-[80px] flex items-center justify-center">
                  <Users className="h-16 w-16 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest News Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-16">
            <div className="w-20 h-1 bg-[#49BBBD] mr-8"></div>
            <h2 className="text-[54px] font-bold text-[#00CBB8] leading-[81px]" style={{fontFamily: 'SVN-Poppins'}}>
              Tin tức mới nhất
            </h2>
          </div>
          
          {loadingNews ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : latestNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestNews.map((article) => (
                <div key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
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
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>Bởi {article.author_name}</span>
                        <span>{article.views} lượt xem</span>
                      </div>
                      <span>{new Date(article.published_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Chưa có tin tức nào</h3>
              <p className="text-gray-600">Các tin tức mới sẽ được cập nhật sớm</p>
            </div>
          )}
          
          {latestNews.length > 0 && (
            <div className="text-center mt-12">
              <Link
                href="/news"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <span>Xem tất cả tin tức</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}