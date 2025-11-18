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

const dateRangeOptions = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
  { value: "90d", label: "90 ngày qua" },
];

const sortOptions = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "views", label: "Lượt xem cao" },
];

export default function NewsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    tag: "",
    dateRange: "all",
    sort: "newest",
    featuredOnly: false,
  });

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
        label: "Bài viết",
        value: totalArticles.toLocaleString("vi-VN"),
        description: "đang được xuất bản",
      },
      {
        label: "Tin nổi bật",
        value: featuredCount.toLocaleString("vi-VN"),
        description: "được chọn bởi ban biên tập",
      },
      {
        label: "Lượt xem",
        value: totalViews.toLocaleString("vi-VN"),
        description: "cộng dồn trong tháng",
      },
    ];
  }, [articles, totalArticles]);

  const latestUpdatedLabel = latestArticle
    ? formatTimeAgo(latestArticle.published_at || latestArticle.created_at)
    : "Chưa có dữ liệu";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" />
          <p className="mt-4 text-gray-600">Đang tải tin tức...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f3d79] via-[#13376a] to-[#0a2447] text-white py-16 md:py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-72 h-72 bg-white/10 blur-3xl rounded-full absolute -top-10 -left-8 opacity-70" />
          <div className="w-80 h-80 bg-cyan-300/20 blur-3xl rounded-full absolute top-1/2 right-0 opacity-40" />
          <div className="w-64 h-64 bg-indigo-200/30 blur-3xl rounded-full absolute bottom-0 left-1/3 opacity-30" />
        </div>
        <div className="relative z-10 max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-white/10 border border-white/20 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-emerald-300 mr-2 animate-pulse"></span>
                Cập nhật mới nhất • {latestUpdatedLabel}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                Tin tức &amp; sự kiện được tuyển chọn mỗi tuần
              </h1>
              <p className="text-lg md:text-xl text-blue-100/90 leading-relaxed max-w-2xl">
                Theo dõi mọi thông tin về chương trình, sự kiện, hoạt động học
                thuật và các câu chuyện nổi bật của sinh viên. Bộ lọc nâng cao
                giúp bạn tìm nhanh nội dung phù hợp.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleQuickFilter("featured")}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition ${
                    filters.featuredOnly
                      ? "bg-white text-[#0a2447]"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Tin nổi bật
                </button>
                <button
                  onClick={() => handleQuickFilter("recent")}
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition ${
                    filters.dateRange === "7d"
                      ? "bg-white text-[#0a2447]"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-2" />7 ngày qua
                </button>
                <button
                  onClick={() => handleQuickFilter("all")}
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/5 hover:bg-white/10 transition"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tất cả tin tức
                </button>
              </div>
            </div>
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur px-5 py-4 shadow-lg"
                >
                  <p className="text-sm uppercase tracking-wide text-blue-100/80">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-sm text-blue-100/70 mt-2">
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
          <div className="mb-16">
            <div className="flex items-center mb-8">
              <Star className="h-6 w-6 text-yellow-500 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">Tin nổi bật</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {featuredArticles.map((article, index) => (
                <div
                  key={article.id}
                  className={`${
                    index === 0 ? "lg:col-span-2 lg:row-span-2" : ""
                  } bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow`}
                >
                  {article.featured_image && (
                    <div
                      className={`${
                        index === 0 ? "h-64 lg:h-80" : "h-48"
                      } bg-gray-200 relative`}
                    >
                      <Image
                        src={article.featured_image}
                        alt={article.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className={`${index === 0 ? "p-8" : "p-6"}`}>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
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
                      className={`${
                        index === 0 ? "text-2xl lg:text-3xl" : "text-xl"
                      } font-bold text-gray-900 mb-3 line-clamp-2`}
                    >
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p
                        className={`text-gray-600 mb-4 ${
                          index === 0 ? "text-lg line-clamp-3" : "line-clamp-2"
                        }`}
                      >
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {article.author_name}
                        </span>
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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm bài viết..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filters.tag}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, tag: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Tất cả chủ đề</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, sort: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <label className="inline-flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.featuredOnly}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    featuredOnly: e.target.checked,
                  }))
                }
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Chỉ hiển thị tin nổi bật
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Xóa bộ lọc
              </button>
              <span className="text-xs text-gray-500">
                Dữ liệu được cache tối đa 5 phút cho mỗi bộ lọc
              </span>
            </div>
          </div>
        </div>

        {isFetching && !isLoading && (
          <div className="flex items-center text-sm text-gray-500 gap-2 mb-6">
            <Spinner size="sm" inline />
            <span>Đang cập nhật kết quả...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <article
              key={article.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {article.featured_image && (
                <div className="h-48 bg-gray-200 relative">
                  <Image
                    src={article.featured_image}
                    alt={article.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
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
                    <span>{(article.views ?? 0).toLocaleString("vi-VN")}</span>
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

                {article.tags && article.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded cursor-pointer hover:bg-blue-100"
                          onClick={() => handleTagSelect(tag)}
                        >
                          {tag}
                        </span>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="text-gray-500 text-xs">
                          +{article.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {article.author_name}
                    </span>
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

        {showEmptyState && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {debouncedSearch || filters.tag
                ? "Không tìm thấy bài viết nào"
                : "Chưa có tin tức phù hợp"}
            </h3>
            <p className="text-gray-600">
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
