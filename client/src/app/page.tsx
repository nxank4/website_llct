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
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { fetchLatestNews, NewsArticle } from "@/services/news";
import Spinner from "@/components/ui/Spinner";
import { useThemePreference } from "@/providers/ThemeProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import { getPlaceholderImage, handleImageError } from "@/lib/imageFallback";

// types moved to services/news

export default function Home() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const user = session?.user;
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const { theme } = useThemePreference();
  const { t } = useLocale();
  const [isMounted, setIsMounted] = useState(false);
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const features = useMemo(() => [
    {
      title: t("home.libraryTitle", "Thư viện giáo trình"),
      description: t("home.libraryDesc", "Truy cập tài liệu, giáo trình được cập nhật liên tục, đầy đủ kiến thức trọng tâm."),
      icon: GraduationCap,
      accent: "from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)]",
      href: "/library",
    },
    {
      title: t("home.chatbotTitle", "Chatbot AI hỗ trợ"),
      description: t("home.chatbotDesc", "Trò chuyện với AI để được giải đáp thắc mắc, luyện phản biện và củng cố kiến thức mọi lúc mọi nơi."),
      icon: MessageCircle,
      accent: "from-[hsl(var(--secondary))] to-[hsl(var(--secondary)/0.85)]",
      href: "/chatbot",
    },
    {
      title: t("home.exercisesTitle", "Đánh giá & luyện tập"),
      description: t("home.exercisesDesc", "Hệ thống bài kiểm tra giúp ôn luyện, kiểm tra tiến độ và đo lường hiệu quả học tập cá nhân."),
      icon: TestTube,
      accent: "from-[hsl(var(--accent))] to-[hsl(var(--accent)/0.85)]",
      href: "/exercises",
    },
  ], [t]);

  // Tin tức lấy từ backend qua fetchLatestNews (latestNews)

  const formatNewsDate = (dateString?: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatReadingTime = (minutes?: number) =>
    `${Math.max(1, minutes ?? 1)} ${t("news.minutesRead", "phút đọc")}`;

  const announcements: Array<{
    id: number;
    instructor: string;
    message: string;
    contact?: string;
    image?: string;
  }> = [];

  // derived data (if needed later)

  const heroSectionClass = useMemo(
    () =>
      cn(
        "relative overflow-hidden transition-colors",
        resolvedDarkMode
          ? "bg-gradient-to-br from-background via-background to-background text-foreground"
          : "bg-gradient-to-br from-[var(--brand-primary,hsl(var(--primary)))] via-[var(--brand-primary-dark,hsl(var(--primary)/0.85))] to-[var(--brand-primary-dark,hsl(var(--primary)/0.7))] text-primary-foreground"
      ),
    [resolvedDarkMode]
  );

  const heroCardClass = useMemo(
    () =>
      cn(
        "mb-6 p-5 md:p-6 lg:p-7 rounded-2xl border shadow-xl transition-all duration-300 backdrop-blur-md",
        resolvedDarkMode
          ? "bg-background/70 border-border/60 hover:bg-background/80 hover:border-border"
          : "bg-primary-foreground/15 border-white/30 hover:bg-primary-foreground/25 hover:border-white/40"
      ),
    [resolvedDarkMode]
  );

  const heroCTAClass = useMemo(
    () =>
      cn(
        "group rounded-full px-8 md:px-10 py-4 md:py-5 text-base md:text-lg font-semibold text-center shadow-xl border backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 poppins-semibold",
        resolvedDarkMode
          ? "bg-primary text-primary-foreground border-primary/60 hover:bg-primary/90 focus-visible:ring-primary focus-visible:ring-offset-background"
          : "bg-primary-foreground/30 text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/40 focus-visible:ring-white/80 focus-visible:ring-offset-[var(--brand-primary,hsl(var(--primary)))]"
      ),
    [resolvedDarkMode]
  );

  const heroSecondaryCTAClass = useMemo(
    () =>
      cn(
        "group rounded-full px-8 md:px-10 py-4 md:py-5 text-base md:text-lg font-semibold text-center shadow-lg border backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 poppins-semibold",
        resolvedDarkMode
          ? "bg-foreground/10 text-foreground border-border hover:bg-foreground/15 focus-visible:ring-border focus-visible:ring-offset-background"
          : "bg-primary-foreground/20 text-primary-foreground border-white/30 hover:bg-primary-foreground/30 focus-visible:ring-white/70 focus-visible:ring-offset-[var(--brand-primary,hsl(var(--primary)))]"
      ),
    [resolvedDarkMode]
  );

  const heroInfoCardClass = useMemo(
    () =>
      cn(
        "w-full max-w-[420px] p-6 md:p-7 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border z-10 backdrop-blur-lg",
        resolvedDarkMode
          ? "bg-card/90 border-border/70"
          : "bg-white/85 border-white/60"
      ),
    [resolvedDarkMode]
  );

  const heroIconBase =
    "w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 transition-colors";
  const heroIconConfigs = useMemo(() => [
    {
      icon: GraduationCap,
      title: t("home.libraryTitle", "Thư viện giáo trình"),
      description: t("home.librarySupport", "Hỗ trợ sinh viên"),
      wrapperClass: resolvedDarkMode
        ? "bg-primary/15 text-primary"
        : "brand-gradient text-primary-foreground",
    },
    {
      icon: TestTube,
      title: t("home.testTitle", "Kiểm tra trình độ"),
      description: t("home.testDesc", "Chuẩn bị tinh thần trước kỳ thi"),
      wrapperClass: resolvedDarkMode
        ? "bg-[hsl(var(--secondary)/0.2)] text-[hsl(var(--secondary))]"
        : "bg-[hsl(var(--secondary))] text-white",
    },
    {
      icon: MessageCircle,
      title: t("home.debateTitle", "Phản biện cùng AI"),
      description: t("home.debateDesc", "Củng cố kiến thức"),
      wrapperClass: resolvedDarkMode
        ? "bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]"
        : "bg-[hsl(var(--accent))] text-white",
    },
  ], [t, resolvedDarkMode]);

  const newsCTAClass = useMemo(
    () =>
      cn(
        "inline-flex items-center gap-2 rounded-full px-6 md:px-8 py-3 md:py-4 font-semibold transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 poppins-semibold",
        resolvedDarkMode
          ? "bg-primary text-primary-foreground border border-primary/40 shadow-lg shadow-primary/20 focus-visible:ring-primary focus-visible:ring-offset-background"
          : "bg-gradient-to-br from-[var(--brand-primary,hsl(var(--primary)))] to-[var(--brand-primary-dark,hsl(var(--primary)/0.85))] text-white shadow-md"
      ),
    [resolvedDarkMode]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className={heroSectionClass}>
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={cn(
              "absolute -top-12 -left-12 w-56 h-56 rounded-full blur-3xl",
              resolvedDarkMode ? "bg-primary/10" : "bg-white/10"
            )}
          />
          <div
            className={cn(
              "absolute top-1/4 right-0 w-64 h-64 rounded-full blur-3xl",
              resolvedDarkMode ? "bg-primary/10" : "bg-emerald-400/20"
            )}
          />
          <div
            className={cn(
              "absolute bottom-10 left-1/3 w-[460px] h-[300px] rounded-full blur-3xl opacity-70",
              resolvedDarkMode ? "bg-primary/5" : "bg-white/10"
            )}
          />
          <div
            className={cn(
              "absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t",
              resolvedDarkMode
                ? "from-foreground/10 to-transparent"
                : "from-white/20 to-transparent"
            )}
          />
        </div>

        <div className="relative max-w-7.5xl mx-auto px-4 sm:px-4 lg:px-8 py-16 md:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8 md:space-y-10">
              {isAuthenticated && user && (
                <div className={heroCardClass}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center flex-wrap gap-2">
                      <p
                        className={cn(
                          "text-base md:text-lg lg:text-xl leading-relaxed arimo-regular",
                          resolvedDarkMode
                            ? "text-foreground/85"
                            : "text-white/90"
                        )}
                      >
                        {t("home.welcome", "Chào mừng trở lại")},
                      </p>
                      <span className="font-semibold text-emerald-300 poppins-semibold text-lg md:text-xl lg:text-2xl">
                        {(
                          user as {
                            full_name?: string;
                            username?: string;
                            email?: string | null;
                          }
                        )?.full_name ||
                          (
                            user as {
                              full_name?: string;
                              username?: string;
                              email?: string | null;
                            }
                          )?.username ||
                          user?.email}
                      </span>
                      {hasRole(
                        session as {
                          user?: { roles?: string[]; role?: string };
                        } | null,
                        "admin"
                      ) && (
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs md:text-sm font-semibold poppins-medium border",
                            resolvedDarkMode
                              ? "bg-primary/15 text-primary border-primary/30"
                              : "bg-emerald-400/20 text-emerald-400 border-emerald-400/40"
                          )}
                        >
                          {t("settings.admin", "Quản trị viên")}
                        </span>
                      )}
                    </div>
                    {hasRole(
                      session as {
                        user?: { roles?: string[]; role?: string };
                      } | null,
                      "admin"
                    ) && (
                      <Link
                        href="/admin/dashboard"
                        className={cn(
                          "group inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border backdrop-blur-sm poppins-semibold",
                          resolvedDarkMode
                            ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20"
                            : "bg-primary-foreground/25 text-primary-foreground border-white/40 hover:bg-primary-foreground/35"
                        )}
                      >
                        <span>{t("home.goToDashboard", "Vào Dashboard")}</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight poppins-bold">
                {t("home.heroTitle", "Thư viện online bộ môn")}{" "}
                <span className="text-emerald-300 block sm:inline poppins-bold">
                  Soft Skills
                </span>
              </h1>
              <p
                className={cn(
                  "text-lg md:text-xl lg:text-2xl leading-relaxed max-w-2xl arimo-regular",
                  resolvedDarkMode ? "text-foreground/85" : "text-white/85"
                )}
              >
                {t("home.heroDescription", "Kho học tập trực tuyến dành cho bộ môn Kỹ năng mềm trường Đại học FPT")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href={isAuthenticated ? "/library" : "/login"}
                  className={heroCTAClass}
                >
                  <span className="flex items-center justify-center gap-2">
                    {t("home.startLearning", "Học ngay")}
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
                <Link
                  href={isAuthenticated ? "/chatbot" : "/login"}
                  className={heroSecondaryCTAClass}
                >
                  <span className="flex items-center justify-center gap-2">
                    {t("home.chatWithAI", "Trò chuyện cùng AI")}
                    <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="relative hidden lg:flex flex-col gap-6 items-end justify-center h-full min-h-[600px]">
              <div
                className={cn(
                  "absolute -bottom-12 -left-20 w-64 h-64 rounded-full blur-3xl",
                  resolvedDarkMode ? "bg-primary/10" : "bg-white/10"
                )}
              />
              <div
                className={cn(
                  "absolute -top-6 -right-12 w-56 h-56 rounded-full blur-3xl",
                  resolvedDarkMode ? "bg-primary/10" : "bg-emerald-400/15"
                )}
              />

              {heroIconConfigs.map(
                ({ icon: Icon, title, description, wrapperClass }) => (
                  <div key={title} className={heroInfoCardClass}>
                    <div className="flex items-center gap-5">
                      <div className={cn(heroIconBase, wrapperClass)}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground poppins-bold">
                          {title}
                        </h3>
                        <p className="text-muted-foreground text-base arimo-regular">
                          {description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-muted/40 dark:bg-muted/20">
        <div className="max-w-7.5xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12 md:mb-16 lg:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 md:mb-6 leading-tight poppins-bold">
              {t("home.startJourney", "Bắt đầu hành trình học tập của bạn")}
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto arimo-regular">
              {t("home.journeyDescription", "Khám phá toàn bộ tính năng hỗ trợ học tập, luyện thi và phát triển kỹ năng mềm dành riêng cho sinh viên Đại học FPT.")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              // Determine icon colors based on feature and dark mode
              const iconConfigs = [
                {
                  // Thư viện giáo trình - primary
                  bgClass: resolvedDarkMode
                    ? "bg-[hsl(var(--primary)/0.2)]"
                    : `bg-gradient-to-br ${feature.accent}`,
                  iconClass: resolvedDarkMode
                    ? "text-[hsl(var(--primary))]"
                    : "text-white",
                },
                {
                  // Chatbot AI - secondary
                  bgClass: resolvedDarkMode
                    ? "bg-[hsl(var(--secondary)/0.2)]"
                    : `bg-gradient-to-br ${feature.accent}`,
                  iconClass: resolvedDarkMode
                    ? "text-[hsl(var(--secondary))]"
                    : "text-white",
                },
                {
                  // Đánh giá & luyện tập - accent
                  bgClass: resolvedDarkMode
                    ? "bg-[hsl(var(--accent)/0.2)]"
                    : `bg-gradient-to-br ${feature.accent}`,
                  iconClass: resolvedDarkMode
                    ? "text-[hsl(var(--accent))]"
                    : "text-white",
                },
              ];
              const iconConfig = iconConfigs[index] || iconConfigs[0];
              return (
                <Link
                  key={index}
                  href={feature.href}
                  aria-label={feature.title}
                  className="group relative h-full cursor-pointer block mx-[-2px] md:mx-[-4px]"
                >
                  <div className="absolute -top-6 left-6 z-10">
                    <div
                      className={cn(
                        "w-14 h-14 md:w-16 md:h-16 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl flex items-center justify-center",
                        iconConfig.bgClass
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-7 h-7 md:w-8 md:h-8",
                          iconConfig.iconClass
                        )}
                      />
                    </div>
                  </div>

                  <div className="relative pt-14 pb-8 px-6 elevated-card h-full min-h-[240px] flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden rounded-2xl ring-1 ring-border/50 group-hover:ring-primary/30">
                    {/* subtle background gradient bleed */}
                    <div
                      className={`pointer-events-none absolute -inset-2 bg-gradient-to-br ${feature.accent} opacity-10 blur-2xl`}
                      aria-hidden="true"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/70 via-card/60 to-card/80 dark:from-background/80 dark:via-background/60 dark:to-background/80"
                      aria-hidden="true"
                    />
                    <h3 className="text-xl md:text-2xl lg:text-[26px] text-foreground font-bold mb-4 leading-snug poppins-bold">
                      {feature.title}
                    </h3>
                    <p className="text-sm md:text-base lg:text-lg text-foreground/90 leading-relaxed flex-grow arimo-regular">
                      {feature.description}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary poppins-semibold">
                      {t("home.learnMore", "Tìm hiểu thêm")}
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
      <section className="py-12 md:py-16 lg:py-20 bg-muted/40 dark:bg-muted/20">
        <div className="max-w-7.5xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-[42px] text-primary mb-4 poppins-bold">
              {t("home.latestNews", "Tin tức mới nhất")}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground arimo-regular">
              {t("home.newsDescription", "Thông tin được tổng hợp trực tiếp từ hệ thống của bộ môn.")}
            </p>
          </div>

          {loadingNews ? (
            <div className="flex justify-center py-20">
              <Spinner size="xl" />
            </div>
          ) : latestNews.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {latestNews.map((article) => {
                const imageWidth = 720;
                const imageHeight = 420;
                const imageSrc =
                  article.featured_image?.trim() ||
                  getPlaceholderImage(imageWidth, imageHeight);
                return (
                  <Link
                    key={article.id}
                    href={`/news/${article.slug}`}
                    className="group bg-card text-card-foreground rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-border"
                  >
                    <div className="h-48 bg-muted relative overflow-hidden">
                      <Image
                        src={imageSrc}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        unoptimized
                        onError={(event) =>
                          handleImageError(event, imageWidth, imageHeight)
                        }
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  <div className="p-5 md:p-6">
                    <h3 className="text-lg md:text-xl text-foreground font-bold mb-3 line-clamp-2 poppins-bold group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm md:text-base text-muted-foreground mb-4 line-clamp-3 leading-relaxed arimo-regular">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground pt-4 border-t border-border">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="truncate">
                          {t("news.by", "Bởi")} {article.author_name}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          {formatNewsDate(
                            article.published_at || article.created_at
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline">
                          {(article.views ?? 0).toLocaleString("vi-VN")} {t("news.views", "lượt xem")}
                        </span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {formatReadingTime(article.reading_time_minutes)}
                        </span>
                      </div>
                    </div>
                  </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 md:py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-muted dark:bg-transparent dark:border dark:border-white/40 rounded-full mb-4 text-muted-foreground dark:text-white">
                <FileText className="h-10 w-10" />
              </div>
              <h3 className="text-xl md:text-2xl font-medium text-foreground mb-2">
                {t("home.noNews", "Hiện tại chưa có tin tức nào (..◜ᴗ◝..)")}
              </h3>
              <p className="text-base md:text-lg text-muted-foreground">
                {t("home.newsComingSoon", "Tin tức sẽ được cập nhật sớm nhất!")}
              </p>
            </div>
          )}

          {latestNews.length > 0 && (
            <div className="text-center mt-10 md:mt-12">
              <Link href="/news" className={newsCTAClass}>
                <span>{t("home.viewAllNews", "Xem tất cả tin tức")}</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Instructor Announcements */}
      <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-muted/40 to-background">
        <div className="max-w-7.5xl mx-auto px-4 lg:px-6">
          <div className="mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-[42px] text-primary mb-3 poppins-bold text-left">
              Thông báo từ giảng viên
            </h2>
            <div className="h-1 w-20 bg-primary rounded-full mb-4"></div>
            <p className="text-base md:text-lg text-muted-foreground arimo-regular text-left">
              Theo dõi các cập nhật quan trọng về lịch học, phòng học và thông
              tin lớp.
            </p>
          </div>

          <div className="space-y-6 lg:space-y-8">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-muted dark:bg-transparent dark:border dark:border-white/40 rounded-full mb-4 text-muted-foreground dark:text-white">
                  <Users className="h-10 w-10" />
                </div>
              <h3 className="text-lg md:text-2xl font-medium text-foreground mb-2">
                {t("home.noAnnouncements", "Hiện tại chưa có Thông báo nào (..◜ᴗ◝..)")}
              </h3>
              <p className="text-muted-foreground">
                {t("home.announcementsComingSoon", "Thông báo sẽ được cập nhật sớm nhất!")}
              </p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="group flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8 p-6 lg:p-8 bg-card text-card-foreground rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-border hover:border-primary/50"
                >
                  <div className="flex-1 space-y-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-emerald-400/15 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg md:text-xl lg:text-2xl text-primary poppins-semibold">
                        {announcement.instructor}
                      </h3>
                    </div>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed arimo-regular">
                      {announcement.message}
                    </p>
                    <p className="text-sm md:text-base text-primary font-medium flex items-center gap-2 poppins-medium">
                      <MessageCircle className="h-4 w-4" />
                      {announcement.contact}
                    </p>
                  </div>
                  <div className="w-full lg:w-64 h-40 lg:h-64 bg-gradient-to-br from-emerald-400/10 to-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-400/30 group-hover:from-emerald-400/20 group-hover:to-primary/20 transition-all duration-300">
                    <Users className="h-10 w-10 lg:h-12 lg:w-12 text-emerald-400/50" />
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
