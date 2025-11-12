"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { hasRole } from "@/lib/auth";
import {
  MessageCircle,
  FileText,
  Users,
  ArrowRight,
  GraduationCap,
  TestTube,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchLatestNews, NewsArticle } from "@/services/news";
import Spinner from "@/components/ui/Spinner";

// types moved to services/news

export default function Home() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const user = session?.user;
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
        "Truy cập tài liệu, giáo trình và bài giảng được cập nhật liên tục, đầy đủ kiến thức trọng tâm.",
      icon: GraduationCap,
      accent: "from-[#125093] to-[#0f4278]",
      href: "/library",
    },
    {
      title: "Chatbot AI hỗ trợ",
      description:
        "Trò chuyện với AI để được giải đáp thắc mắc, luyện phản biện và củng cố kiến thức mọi lúc mọi nơi.",
      icon: MessageCircle,
      accent: "from-[#00cbb8] to-[#00b19f]",
      href: "/chatbot",
    },
    {
      title: "Đánh giá & luyện tập",
      description:
        "Hệ thống bài kiểm tra giúp ôn luyện, kiểm tra tiến độ và đo lường hiệu quả học tập cá nhân.",
      icon: TestTube,
      accent: "from-[#29b9e7] to-[#1a9bc7]",
      href: "/exercises",
    },
  ];

  // Tin tức lấy từ backend qua fetchLatestNews (latestNews)

  const announcements: Array<{
    id: number;
    instructor: string;
    message: string;
    contact?: string;
    image?: string;
  }> = [];

  // derived data (if needed later)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#125093] via-[#0f4b82] to-[#0b3563] text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -left-12 w-56 h-56 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-64 h-64 bg-[#00cbb8]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-1/3 w-[460px] h-[300px] bg-white/10 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-white/20 to-transparent"></div>
        </div>

        <div className="relative max-w-6xl mx-auto px-1 sm:px-2 lg:px-4 py-16 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 md:space-y-10">
              {isAuthenticated && user && (
                <div className="mb-4 p-5 md:p-6 bg-white/15 backdrop-blur-[2px] rounded-2xl border border-white/25 shadow-lg transition-all hover:bg-white/20">
                  <p className="text-base md:text-lg lg:text-xl leading-relaxed arimo-regular">
                    Chào mừng trở lại,&nbsp;
                    <span className="font-semibold text-[#00cbb8] poppins-semibold">
                      {(user as any)?.full_name ||
                        (user as any)?.username ||
                        user?.email}
                    </span>
                    !
                    {hasRole(session, "admin") && (
                      <>
                        <span className="ml-2 text-[#00cbb8] font-semibold poppins-medium">
                          (Quản trị viên)
                        </span>
                        <Link
                          href="/admin/dashboard"
                          className="ml-3 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 bg-white/20 text-white hover:bg-white/30"
                        >
                          Vào Dashboard
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              )}

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight poppins-bold">
                Thư viện online bộ môn{" "}
                <span className="text-[#00cbb8] block sm:inline poppins-bold">
                  Soft Skills
                </span>
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-white/85 max-w-2xl arimo-regular">
                Kho học tập trực tuyến dành cho bộ môn Kỹ năng mềm trường Đại
                học FPT
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href={isAuthenticated ? "/library" : "/login"}
                  className="rounded-full px-8 md:px-10 py-4 md:py-5 text-base md:text-lg font-semibold text-center shadow-lg bg-white/15 text-white/75 border-2 border-transparent backdrop-blur-sm transition-all duration-300 hover:bg-transparent hover:text-white hover:border-white/80 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-[#125093]"
                >
                  <span className="flex items-center justify-center gap-2 poppins-semibold">
                    Học ngay
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                <Link
                  href={isAuthenticated ? "/chatbot" : "/login"}
                  className="rounded-full px-8 md:px-10 py-4 md:py-5 text-base md:text-lg font-semibold text-center shadow-md bg-white/10 text-white/70 border-2 border-transparent backdrop-blur-sm transition-all duration-300 hover:bg-transparent hover:text-white hover:border-white/60 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-[#125093]"
                >
                  <span className="flex items-center justify-center gap-2 poppins-semibold">
                    Trò chuyện cùng AI
                    <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:flex flex-col gap-6 items-end justify-center h-full min-h-[600px]">
              <div className="absolute -bottom-12 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -top-6 -right-12 w-56 h-56 bg-[#00cbb8]/12 rounded-full blur-3xl"></div>

              {/* Card 1: Thư viện giáo trình */}
              <div className="w-full max-w-[420px] p-6 md:p-7 bg-white/85 backdrop-blur-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/60 z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 md:w-16 md:h-16 brand-gradient rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#010514] poppins-bold">
                      Thư viện giáo trình
                    </h3>
                    <p className="text-gray-600 text-base arimo-regular">
                      Hỗ trợ sinh viên
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Kiểm tra trình độ */}
              <div className="w-full max-w-[420px] p-6 md:p-7 bg-white/85 backdrop-blur-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/60 z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-[#29b9e7] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <TestTube className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#010514] poppins-bold">
                      Kiểm tra trình độ
                    </h3>
                    <p className="text-gray-600 text-base arimo-regular">
                      Chuẩn bị tinh thần trước kỳ thi
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Phản biện cùng AI */}
              <div className="w-full max-w-[420px] p-6 md:p-7 bg-white/85 backdrop-blur-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-white/60 z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-[#00cbb8] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <MessageCircle className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#010514] poppins-bold">
                      Phản biện cùng AI
                    </h3>
                    <p className="text-gray-600 text-base arimo-regular">
                      Củng cố kiến thức
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div className="text-center mb-12 md:mb-16 lg:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-gray-900 mb-4 md:mb-6 leading-tight poppins-bold">
              Bắt đầu hành trình học tập của bạn
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto arimo-regular">
              Khám phá toàn bộ tính năng hỗ trợ học tập, luyện thi và phát triển
              kỹ năng mềm dành riêng cho sinh viên Đại học FPT.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={index}
                  href={feature.href}
                  aria-label={feature.title}
                  className="group relative h-full cursor-pointer block mx-[-2px] md:mx-[-4px]"
                >
                  <div className="absolute -top-6 left-6 z-10">
                    <div
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center`}
                    >
                      <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                    </div>
                  </div>

                  <div className="relative pt-14 pb-8 px-6 elevated-card h-full min-h-[240px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden rounded-2xl ring-1 ring-gray-100 group-hover:ring-[#125093]/20">
                    {/* subtle background gradient bleed */}
                    <div
                      className={`pointer-events-none absolute -inset-2 bg-gradient-to-br ${feature.accent} opacity-10 blur-2xl`}
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-white/60"
                      aria-hidden="true"
                    />
                    <h3 className="text-xl md:text-2xl lg:text-[26px] text-gray-900 mb-4 leading-snug poppins-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-sm md:text-base lg:text-lg text-gray-600 leading-relaxed flex-grow arimo-regular">
                      {feature.description}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#125093] poppins-semibold">
                      Tìm hiểu thêm
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Latest News Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-[42px] text-[#125093] mb-4 poppins-bold">
              Tin tức mới nhất
            </h2>
            <p className="text-base md:text-lg text-gray-600 arimo-regular">
              Thông tin được tổng hợp trực tiếp từ hệ thống của bộ môn.
            </p>
          </div>

          {loadingNews ? (
            <div className="flex justify-center py-20">
              <Spinner size="xl" />
            </div>
          ) : latestNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {latestNews.map((article) => (
                <Link
                  key={article.id}
                  href="#"
                  className="group bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
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
                    <h3 className="text-lg md:text-xl text-gray-900 mb-3 line-clamp-2 poppins-semibold group-hover:text-[#125093] transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm md:text-base text-gray-600 mb-4 line-clamp-3 leading-relaxed arimo-regular">
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
                Hiện tại chưa có tin tức nào (..◜ᴗ◝..)
              </h3>
              <p className="text-base md:text-lg text-gray-600">
                Tin tức sẽ được cập nhật sớm nhất!
              </p>
            </div>
          )}

          {latestNews.length > 0 && (
            <div className="text-center mt-10 md:mt-12">
              <Link
                href="/news"
                className="inline-flex items-center gap-2 btn-primary rounded-full px-6 md:px-8 py-3 md:py-4 font-semibold transition-transform duration-300 hover:-translate-y-1"
              >
                <span>Xem tất cả tin tức</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Instructor Announcements */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-4">
          <div className="mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-[42px] text-[#125093] mb-3 poppins-bold text-left">
              Thông báo từ giảng viên
            </h2>
            <div className="h-1 w-20 bg-[#125093] rounded-full mb-4"></div>
            <p className="text-base md:text-lg text-gray-600 arimo-regular text-left">
              Theo dõi các cập nhật quan trọng về lịch học, phòng học và thông
              tin lớp.
            </p>
          </div>

          <div className="space-y-6 md:space-y-8">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                  <Users className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg md:text-2xl font-medium text-gray-900 mb-2">
                  Hiện tại chưa có Thông báo nào (..◜ᴗ◝..)
                </h3>
                <p className="text-gray-600">
                  Thông báo sẽ được cập nhật sớm nhất!
                </p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="group flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 p-6 md:p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#00CBB8]/30"
                >
                  <div className="flex-1 space-y-4 w-full md:w-auto">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#00CBB8]/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-[#00CBB8]" />
                      </div>
                      <h3 className="text-lg md:text-xl lg:text-2xl text-[#125093] poppins-semibold">
                        {announcement.instructor}
                      </h3>
                    </div>
                    <p className="text-base md:text-lg text-gray-600 leading-relaxed arimo-regular">
                      {announcement.message}
                    </p>
                    <p className="text-sm md:text-base text-[#125093] font-medium flex items-center gap-2 poppins-medium">
                      <MessageCircle className="h-4 w-4" />
                      {announcement.contact}
                    </p>
                  </div>
                  <div className="w-full md:w-56 lg:w-64 h-40 md:h-56 lg:h-64 bg-gradient-to-br from-[#00CBB8]/10 to-[#125093]/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#00CBB8]/20 group-hover:from-[#00CBB8]/20 group-hover:to-[#125093]/20 transition-all duration-300">
                    <Users className="h-10 w-10 md:h-12 md:w-12 text-[#00CBB8]/40" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
