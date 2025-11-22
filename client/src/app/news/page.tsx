"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  User,
  Eye,
  Tag,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Star,
  RefreshCw,
} from "lucide-react";
import { fetchNewsList, NewsArticle, PublicNewsFilters } from "@/services/news";
import Spinner from "@/components/ui/Spinner";
import { getArticleImageUrl } from "@/lib/image";
import { getPlaceholderImage, handleImageError } from "@/lib/imageFallback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useThemePreference } from "@/providers/ThemeProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

export default function NewsPage() {
  const { theme } = useThemePreference();
  const { t } = useLocale();
  const [isMounted, setIsMounted] = useState(false);
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;

  const dateRangeOptions = [
    { value: "all", label: t("news.allTime", "Tất cả thời gian") },
    { value: "7d", label: t("news.last7Days", "7 ngày qua") },
    { value: "30d", label: t("news.last30Days", "30 ngày qua") },
    { value: "90d", label: t("news.last90Days", "90 ngày qua") },
  ];

  const sortOptions = [
    { value: "newest", label: t("news.newest", "Mới nhất") },
    { value: "oldest", label: t("news.oldest", "Cũ nhất") },
    { value: "views", label: t("news.mostViews", "Lượt xem cao") },
  ];

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    tag: "",
    dateRange: "all",
    sort: "newest",
    featuredOnly: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const queryPayload = useMemo<PublicNewsFilters>(() => {
    const payload: PublicNewsFilters = {
      search: debouncedSearch.trim() || undefined,
      tag: filters.tag || undefined,
      sort: filters.sort as "newest" | "oldest" | "views",
      featured: filters.featuredOnly || undefined,
      limit: 60,
    };

    if (filters.dateRange !== "all") {
      const now = new Date();
      const rangeMap: Record<string, number> = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
      };
      const days = rangeMap[filters.dateRange] || 0;
      now.setDate(now.getDate() - days);
      payload.dateFrom = now.toISOString();
    }

    return payload;
  }, [debouncedSearch, filters]);

  const queryKey = useMemo(
    () => [
      "news",
      queryPayload.search || "",
      queryPayload.tag || "",
      queryPayload.sort || "newest",
      queryPayload.featured ? "1" : "0",
      queryPayload.dateFrom || "",
    ],
    [queryPayload]
  );

  const {
    data: articles = [],
    isLoading,
    isFetching,
  } = useQuery<NewsArticle[]>({
    queryKey,
    queryFn: () => fetchNewsList(queryPayload),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach((article) => {
      article.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [articles]);

  const featuredArticles = useMemo(() => {
    const pinned = articles
      .filter((article) => article.is_featured)
      .slice(0, 3);
    if (pinned.length > 0) {
      return pinned;
    }
    return articles.slice(0, 3);
  }, [articles]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "—";
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Vừa xong";
    if (diffInHours < 24) return `${diffInHours} giờ trước`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;

    return formatDate(dateString);
  };

  const formatReadingTime = (minutes?: number) =>
    `${Math.max(1, minutes ?? 1)} phút đọc`;

  const totalArticles = articles.length;
  const latestArticle = useMemo(
    () =>
      [...articles].sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at || 0).getTime();
        const dateB = new Date(b.published_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })[0],
    [articles]
  );

  const heroStats = useMemo(() => {
    const totalViews = articles.reduce(
      (sum, article) => sum + (article.views || 0),
      0
    );
    const featuredCount = articles.filter(
      (article) => article.is_featured
    ).length;
    return [
      {
        label: t("news.articles", "Bài viết"),
        value: totalArticles.toLocaleString("vi-VN"),
        description: t("news.articlesPublished", "đang được xuất bản"),
      },
      {
        label: t("news.featured", "Tin nổi bật"),
        value: featuredCount.toLocaleString("vi-VN"),
        description: t("news.featuredSelected", "được chọn bởi ban biên tập"),
      },
      {
        label: t("news.views", "Lượt xem"),
        value: totalViews.toLocaleString("vi-VN"),
        description: t("news.viewsAccumulated", "cộng dồn trong tháng"),
      },
    ];
  }, [articles, totalArticles, t]);

  const latestUpdatedLabel = latestArticle
    ? formatTimeAgo(latestArticle.published_at || latestArticle.created_at)
    : t("news.noData", "Chưa có dữ liệu");

  const handleQuickFilter = (type: "featured" | "recent" | "all") => {
    if (type === "featured") {
      setFilters((prev) => ({ ...prev, featuredOnly: true }));
    } else if (type === "recent") {
      setFilters((prev) => ({ ...prev, dateRange: "7d" }));
    } else {
      handleResetFilters();
    }
  };

  const handleResetFilters = () => {
    setFilters({
      tag: "",
      dateRange: "all",
      sort: "newest",
      featuredOnly: false,
    });
    setSearchInput("");
  };

  const handleTagSelect = (tag: string) => {
    setFilters((prev) => ({ ...prev, tag }));
  };

  const showEmptyState = !isLoading && articles.length === 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" />
          <p className="mt-4 text-muted-foreground">{t("news.loading", "Đang tải tin tức...")}</p>
        </div>
      </div>
    );
  }

  const heroSectionClass = cn(
    "relative overflow-hidden py-16 md:py-20 transition-colors",
    resolvedDarkMode
      ? "bg-gradient-to-br from-background via-background to-background text-foreground"
      : "bg-gradient-to-br from-[#0f3d79] via-[#13376a] to-[#0a2447] text-white"
  );

  const getImageWithFallback = (
    article: NewsArticle,
    width: number,
    height: number
  ) => {
    const imageUrl = getArticleImageUrl(article, width, height);
    return imageUrl || getPlaceholderImage(width, height);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className={heroSectionClass}>
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={cn(
              "w-72 h-72 blur-3xl rounded-full absolute -top-10 -left-8 opacity-70",
              resolvedDarkMode ? "bg-primary/10" : "bg-white/10"
            )}
          />
          <div
            className={cn(
              "w-80 h-80 blur-3xl rounded-full absolute top-1/2 right-0 opacity-40",
              resolvedDarkMode ? "bg-primary/20" : "bg-cyan-300/20"
            )}
          />
          <div
            className={cn(
              "w-64 h-64 blur-3xl rounded-full absolute bottom-0 left-1/3 opacity-30",
              resolvedDarkMode ? "bg-primary/15" : "bg-indigo-200/30"
            )}
          />
        </div>
        <div className="relative z-10 max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span
                className={cn(
                  "inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur",
                  resolvedDarkMode
                    ? "bg-card/80 border border-border text-foreground"
                    : "bg-white/10 border border-white/20 text-white"
                )}
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full mr-2 animate-pulse",
                    resolvedDarkMode
                      ? "bg-[hsl(var(--success))]"
                      : "bg-emerald-300"
                  )}
                ></span>
                {t("news.latestUpdate", "Cập nhật mới nhất")} • {latestUpdatedLabel}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                {t("news.titleHero", "Tin tức & sự kiện được tuyển chọn mỗi tuần")}
              </h1>
              <p
                className={cn(
                  "text-lg md:text-xl leading-relaxed max-w-2xl",
                  resolvedDarkMode
                    ? "text-muted-foreground"
                    : "text-blue-100/90"
                )}
              >
                {t("news.descriptionHero", "Theo dõi mọi thông tin về chương trình, sự kiện, hoạt động học thuật và các câu chuyện nổi bật của sinh viên. Bộ lọc nâng cao giúp bạn tìm nhanh nội dung phù hợp.")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleQuickFilter("featured")}
                  size="sm"
                  className="rounded-full gap-2"
                  variant={filters.featuredOnly ? "default" : "secondary"}
                >
                  <Star className="w-4 h-4" />
                  {t("news.featured", "Tin nổi bật")}
                </Button>
                <Button
                  onClick={() => handleQuickFilter("recent")}
                  size="sm"
                  className="rounded-full gap-2"
                  variant={filters.dateRange === "7d" ? "default" : "secondary"}
                >
                  <Calendar className="w-4 h-4" />{t("news.last7Days", "7 ngày qua")}
                </Button>
                <Button
                  onClick={() => handleQuickFilter("all")}
                  size="sm"
                  className="rounded-full gap-2"
                  variant="ghost"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t("news.allNews", "Tất cả tin tức")}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "rounded-2xl backdrop-blur px-5 py-4 shadow-lg",
                    resolvedDarkMode
                      ? "bg-card/80 border border-border"
                      : "bg-white/10 border border-white/10"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm uppercase tracking-wide",
                      resolvedDarkMode
                        ? "text-muted-foreground"
                        : "text-blue-100/80"
                    )}
                  >
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p
                    className={cn(
                      "text-sm mt-2",
                      resolvedDarkMode
                        ? "text-muted-foreground/80"
                        : "text-blue-100/70"
                    )}
                  >
                    {stat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {featuredArticles.length > 0 && (
          <section className="mb-16 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <Star className="h-6 w-6 text-[hsl(var(--warning))] mr-2" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Tin nổi bật
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("news.featuredDescription", "Những bài viết được quan tâm và biên tập viên đề xuất")}
                  </p>
                </div>
              </div>
              <Link
                href="/news?featuredOnly=true"
                className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80"
              >
                {t("news.viewAllFeatured", "Xem tất cả tin nổi bật")}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {featuredArticles.map((article, index) => (
                <article
                  key={article.id}
                  className={cn(
                    index === 0 ? "lg:col-span-2 lg:row-span-2" : "",
                    "bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border"
                  )}
                >
                  <div
                    className={cn(
                      index === 0 ? "h-64 lg:h-80" : "h-48",
                      "bg-muted relative"
                    )}
                  >
                    <Image
                      src={getImageWithFallback(
                        article,
                        index === 0 ? 960 : 720,
                        index === 0 ? 540 : 420
                      )}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority={index === 0}
                      onError={(event) =>
                        handleImageError(
                          event,
                          index === 0 ? 960 : 720,
                          index === 0 ? 540 : 420
                        )
                      }
                    />
                    <span className="absolute top-4 left-4 bg-[hsl(var(--warning))] text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg">
                      {t("news.highlighted", "Nổi bật")}
                    </span>
                  </div>
                  <div className={`${index === 0 ? "p-8" : "p-6"}`}>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3 flex-wrap">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatTimeAgo(
                            article.published_at || article.created_at
                          )}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>
                          {(article.views ?? 0).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatReadingTime(article.reading_time_minutes)}
                        </span>
                      </div>
                    </div>
                    <h3
                      className={cn(
                        index === 0 ? "text-2xl lg:text-3xl" : "text-xl",
                        "font-bold text-foreground mb-3 line-clamp-2"
                      )}
                    >
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p
                        className={cn(
                          "text-muted-foreground mb-4",
                          index === 0 ? "text-lg line-clamp-3" : "line-clamp-2"
                        )}
                      >
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {article.author_name}
                        </span>
                      </div>
                      <Link
                        href={`/news/${article.slug}`}
                        className="text-primary hover:text-primary/80 font-medium flex items-center space-x-1"
                      >
                        <span>{t("news.readMore", "Đọc thêm")}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {t("news.latest", "Tin mới nhất")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("news.filterAndSearch", "Lọc và tìm kiếm nhanh những bài viết phù hợp")}
              </p>
            </div>
            {featuredArticles.length > 0 && (
              <span className="text-xs text-muted-foreground/70">
                {t("news.featuredShownAbove", "Tin nổi bật hiển thị riêng phía trên")}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("news.searchPlaceholder", "Tìm kiếm bài viết...")}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Select
                value={filters.tag || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    tag: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder={t("news.allTopics", "Tất cả chủ đề")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("news.allTopics", "Tất cả chủ đề")}</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select
              value={filters.dateRange}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, dateRange: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("news.timeRange", "Khoảng thời gian")} />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.sort}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, sort: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("news.sort", "Sắp xếp")} />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <label
              htmlFor="featuredOnly"
              className="inline-flex items-center text-sm text-foreground gap-2"
            >
              <Checkbox
                id="featuredOnly"
                checked={filters.featuredOnly}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    featuredOnly: Boolean(checked),
                  }))
                }
              />
              {t("news.showFeaturedOnly", "Chỉ hiển thị tin nổi bật")}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t("news.clearFilters", "Xóa bộ lọc")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("news.cacheInfo", "Dữ liệu được cache tối đa 5 phút cho mỗi bộ lọc")}
              </span>
            </div>
          </div>
        </section>

        {isFetching && !isLoading && (
          <div className="flex items-center text-sm text-muted-foreground gap-2 mb-6">
            <Spinner size="sm" inline />
            <span>{t("news.updatingResults", "Đang cập nhật kết quả...")}</span>
          </div>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {filters.featuredOnly ? t("news.featured", "Tin nổi bật") : t("news.allArticles", "Tất cả bài viết")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filters.featuredOnly
                  ? t("news.featuredArticlesDesc", "Hiển thị các bài viết được ghim nổi bật theo bộ lọc")
                  : t("news.articlesListDesc", "Danh sách bài viết theo bộ lọc hiện tại")}
              </p>
            </div>
            <span className="text-sm text-muted-foreground/70">
              {articles.length.toLocaleString("vi-VN")} {t("news.articlesCount", "bài viết")}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <article
                key={article.id}
                className="bg-card rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border"
              >
                <div className="h-48 bg-muted relative">
                  <Image
                    src={getImageWithFallback(article, 640, 360)}
                    alt={article.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    onError={(event) => handleImageError(event, 640, 360)}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatReadingTime(article.reading_time_minutes)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatTimeAgo(
                          article.published_at || article.created_at
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>
                        {(article.views ?? 0).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}

                  {article.tags && article.tags.length > 0 && (
                    <div className="flex items-center space-x-2 mb-4">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {article.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="bg-muted text-foreground text-xs px-2 py-1 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => handleTagSelect(tag)}
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-muted-foreground text-xs">
                            +{article.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {article.author_name}
                      </span>
                    </div>
                    <Link
                      href={`/news/${article.slug}`}
                      className="text-primary hover:text-primary/80 font-medium flex items-center space-x-1"
                    >
                      <span>Đọc thêm</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {showEmptyState && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium text-foreground mb-2">
              {debouncedSearch || filters.tag
                ? "Không tìm thấy bài viết nào"
                : "Chưa có tin tức phù hợp"}
            </h3>
            <p className="text-muted-foreground">
              {debouncedSearch || filters.tag
                ? "Thử điều chỉnh từ khóa hoặc bộ lọc để xem thêm kết quả"
                : "Tin tức mới sẽ được cập nhật trong thời gian tới"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
