"use client";

import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  MessageCircle,
  FileText,
  Users,
  BarChart3,
  ArrowRight,
  MessageSquare,
  GraduationCap,
  TestTube,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchLatestNews, NewsArticle } from "@/services/news";

// types moved to services/news

export default function Home() {
  const { isAuthenticated, user, hasRole } = useAuth();
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);

  // Fetch latest news
  useEffect(() => {
    const loadLatest = async () => {
      try {
        setLoadingNews(true);
        const data = await fetchLatestNews(3);
        setLatestNews(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching news:", error);
        setLatestNews([]);
      } finally {
        setLoadingNews(false);
      }
    };

    loadLatest();
  }, []);

  const features = [
    {
      title: "Thư viện giáo trình",
      description:
        "Our curriculum focuses on nurturing cognitive, social, emotional, and physical development, ensuring a well-rounded education.",
      icon: GraduationCap,
      color: "#5B72EE",
    },
    {
      title: "Chat Bot AI",
      description:
        "Our passionate and qualified teachers create a supportive and stimulating learning environment.",
      icon: MessageCircle,
      color: "#00CBB8",
    },
    {
      title: "Kiểm tra",
      description:
        "We prioritize safety and provide a warm and caring atmosphere for every child.",
      icon: TestTube,
      color: "#29B9E7",
    },
  ];

  const newsItems = [
    {
      id: 1,
      title: "Phiên bản mới nhất của SEB đã cập nhập",
      description:
        "Cập nhật các tính năng mới và cải thiện trải nghiệm người dùng",
      date: "10/10/2025",
      image: "https://placehold.co/640x408",
      isMain: true,
    },
    {
      id: 2,
      title: "Sự kiện Hội sử Mùa thu 2025 đã chính thức khởi động",
      description:
        "Tôn vinh Chủ tịch Hồ Chí Minh và tạo sân chơi cho sinh viên",
      image: "https://placehold.co/269x200",
      isMain: false,
    },
    {
      id: 3,
      title: "Sự kiện Hội sử Mùa thu 2025 đã chính thức khởi động",
      description:
        "Tôn vinh Chủ tịch Hồ Chí Minh và tạo sân chơi cho sinh viên",
      image: "https://placehold.co/270x200",
      isMain: false,
    },
    {
      id: 4,
      title: "Sự kiện Hội sử Mùa thu 2025 đã chính thức khởi động",
      description:
        "Tôn vinh Chủ tịch Hồ Chí Minh và tạo sân chơi cho sinh viên",
      image: "https://placehold.co/270x200",
      isMain: false,
    },
  ];

  const announcements = [
    {
      id: 1,
      instructor: "Thầy Văn Bình",
      message: "Lớp GD1703 slot 4 ngày 17/09/2025 chuyển xuống phòng G04.",
      contact: "Liên hệ: 090.xxx.xxx",
      image: "https://placehold.co/522x480",
    },
    {
      id: 2,
      instructor: "Thầy Văn Bình",
      message: "Lớp GD1703 slot 4 ngày 17/09/2025 chuyển xuống phòng G04.",
      contact: "Liên hệ: 090.xxx.xxx",
      image: "https://placehold.co/522x480",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-[#125093] overflow-hidden min-h-[90vh] flex items-center">
        {/* Background elements with animation */}
        <div className="absolute top-20 right-20 w-5 h-5 bg-[#C4C4C4] rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-32 w-5 h-5 bg-[#4EE381] rounded-full animate-pulse delay-300"></div>
        <div className="absolute top-40 right-40 w-2 h-2 bg-white rounded-full animate-pulse delay-700"></div>

        {/* Main content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="text-white space-y-6 md:space-y-8">
              {isAuthenticated && user && (
                <div className="mb-4 p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg transition-all hover:bg-white/25">
                  <p className="text-base md:text-lg lg:text-xl leading-relaxed">
                    Chào mừng trở lại,{" "}
                    <span className="font-bold text-[#00CBB8]">
                      {user.full_name || user.username || user.email}
                    </span>
                    !
                    {hasRole("admin") && (
                      <span className="ml-2 text-[#00CBB8] font-semibold">
                        (Quản trị viên)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Thư viện online bộ môn{" "}
                <span className="text-[#00CBB8] block sm:inline">
                  Soft Skills
                </span>
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-white/90 max-w-2xl">
                Kho học tập online bộ môn Kỹ năng mềm trường Đại học FPT
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href={isAuthenticated ? "/library" : "/login"}
                  className="group px-6 md:px-8 py-3 md:py-4 rounded-full text-base md:text-lg font-semibold text-center transition-all duration-300 bg-[#49BBBD] text-white hover:bg-[#3aa8ad] hover:shadow-xl hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#00CBB8] focus:ring-offset-2 focus:ring-offset-[#125093]"
                >
                  <span className="flex items-center justify-center gap-2">
                    Học ngay
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link
                  href={isAuthenticated ? "/chatbot" : "/login"}
                  className="group px-6 md:px-8 py-3 md:py-4 rounded-full text-base md:text-lg font-semibold text-center transition-all duration-300 border-2 border-white/70 text-white hover:bg-white/10 hover:border-white hover:shadow-xl hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#125093]"
                >
                  <span className="flex items-center justify-center gap-2">
                    Trò chuyện cùng AI
                    <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Right Content - Info Boxes */}
            <div className="relative hidden lg:block">
              {/* Student Image Placeholder */}
              <div className="absolute right-0 top-0 w-full max-w-[544px] h-[600px] md:h-[700px] bg-gradient-to-br from-white/10 to-white/5 rounded-2xl shadow-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Users className="h-24 w-24 md:h-32 md:w-32 text-white/30" />
              </div>

              {/* Floating Info Cards */}
              <div className="relative z-10 space-y-4 md:space-y-6 pt-8">
                {/* Card 1 */}
                <div className="w-full max-w-[390px] p-5 md:p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#F88C3D] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold text-[#595959] mb-1">
                        Thư viện giáo trình
                      </h3>
                      <p className="text-sm md:text-base text-[#545567] leading-relaxed">
                        Hỗ trợ sinh viên
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="w-full max-w-[417px] p-5 md:p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ml-4 md:ml-8 border border-white/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#F3627C] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <BarChart3 className="h-6 w-6 md:h-7 md:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold text-[#595959] mb-1">
                        Kiểm tra trình độ
                      </h3>
                      <p className="text-sm md:text-base text-[#545567] leading-relaxed">
                        Chuẩn bị tinh thần trước kỳ thi
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="w-full max-w-[349px] p-5 md:p-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-white/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-[#23BDEE] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <MessageSquare className="h-6 w-6 md:h-7 md:w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold text-[#595959] mb-1">
                        Phản biện cùng AI
                      </h3>
                      <p className="text-sm md:text-base text-[#545567] leading-relaxed">
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
      <div className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16 lg:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#010514] mb-4 md:mb-6 leading-tight">
              Bắt đầu hành trình học tập của bạn
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-[#5B5B5B] leading-relaxed max-w-3xl mx-auto">
              Khám phá các tính năng của website bộ môn Kỹ năng mềm thuộc trường
              Đại học FPT và nâng cao điểm số của bạn
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative h-full cursor-pointer"
                >
                  {/* Icon */}
                  <div className="absolute -top-6 left-6 z-10">
                    <div
                      className="w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
                      style={{ backgroundColor: feature.color }}
                    >
                      <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="pt-12 md:pt-14 pb-6 md:pb-8 px-6 bg-white shadow-md rounded-2xl h-full min-h-[220px] flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#010514] mb-4 leading-tight">
                      {feature.title}
                    </h3>
                    <p className="text-sm md:text-base lg:text-lg text-[#5B5B5B] leading-relaxed flex-grow">
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
      <div className="py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16 lg:mb-20">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#010514] mb-4 md:mb-6 leading-tight">
              Tin tức mới nhất
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-[#5B5B5B] leading-relaxed">
              Cập nhập thông tin mới nhất của bộ môn
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Main News */}
            <div className="space-y-6 group cursor-pointer">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Image
                  src={newsItems[0].image}
                  alt={newsItems[0].title}
                  width={800}
                  height={408}
                  className="w-full h-[300px] md:h-[400px] object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#125093] leading-tight group-hover:text-[#0d3d6f] transition-colors">
                  {newsItems[0].title}
                </h3>
                <p className="text-base md:text-lg text-[#5B5B5B] leading-relaxed line-clamp-3">
                  {newsItems[0].description}
                </p>
                <Link
                  href="#"
                  className="inline-flex items-center gap-2 text-base md:text-lg font-semibold text-[#125093] border-b-2 border-[#125093] pb-1 hover:text-[#0d3d6f] hover:border-[#0d3d6f] transition-colors"
                >
                  Đọc thêm
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Side News */}
            <div className="space-y-6">
              {newsItems.slice(1).map((item) => (
                <Link
                  key={item.id}
                  href="#"
                  className="group flex flex-col sm:flex-row gap-4 md:gap-6 p-4 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:shadow-md"
                >
                  <div className="relative overflow-hidden rounded-xl flex-shrink-0 w-full sm:w-40 md:w-48 h-40 md:h-48">
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={269}
                      height={200}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-3 flex-1">
                    <h4 className="text-lg md:text-xl lg:text-2xl font-bold text-[#125093] leading-tight group-hover:text-[#0d3d6f] transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-sm md:text-base text-[#5B5B5B] leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Announcements */}
      <div className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#00CBB8]">
              Thông báo từ giảng viên
            </h2>
          </div>

          <div className="space-y-6 md:space-y-8">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="group flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 p-6 md:p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#00CBB8]/30"
              >
                <div className="flex-1 space-y-4 w-full md:w-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[#00CBB8]/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-[#00CBB8]" />
                    </div>
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-[#125093]">
                      {announcement.instructor}
                    </h3>
                  </div>
                  <p className="text-base md:text-lg text-[#5B5B5B] leading-relaxed">
                    {announcement.message}
                  </p>
                  <p className="text-sm md:text-base text-[#125093] font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {announcement.contact}
                  </p>
                </div>
                <div className="w-full md:w-56 lg:w-64 h-40 md:h-56 lg:h-64 bg-gradient-to-br from-[#00CBB8]/10 to-[#125093]/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#00CBB8]/20 group-hover:from-[#00CBB8]/20 group-hover:to-[#125093]/20 transition-all duration-300">
                  <Users className="h-10 w-10 md:h-12 md:w-12 text-[#00CBB8]/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest News Section */}
      <div className="py-12 md:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#00CBB8]">
              Tin tức mới nhất
            </h2>
          </div>

          {loadingNews ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CBB8]"></div>
            </div>
          ) : latestNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {latestNews.map((article) => (
                <Link
                  key={article.id}
                  href="#"
                  className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                >
                  {article.featured_image && (
                    <div className="h-48 bg-gray-200 relative overflow-hidden">
                      <Image
                        src={article.featured_image}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  )}
                  <div className="p-5 md:p-6">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#125093] transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm md:text-base text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="truncate">
                          Bởi {article.author_name}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          {article.views} lượt xem
                        </span>
                      </div>
                      <span className="flex-shrink-0">
                        {new Date(article.published_at).toLocaleDateString(
                          "vi-VN"
                        )}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 md:py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">
                Database chưa có thông báo
              </h3>
              <p className="text-base md:text-lg text-gray-600">
                Các tin tức mới sẽ được cập nhật sớm
              </p>
            </div>
          )}

          {latestNews.length > 0 && (
            <div className="text-center mt-10 md:mt-12">
              <Link
                href="/news"
                className="inline-flex items-center gap-2 bg-[#125093] hover:bg-[#0d3d6f] text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#125093] focus:ring-offset-2"
              >
                <span>Xem tất cả tin tức</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
