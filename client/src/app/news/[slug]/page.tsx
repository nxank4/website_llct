"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Clock,
  Tag,
  RefreshCw,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import RTEContentDisplay from "@/components/library/RTEContentDisplay";
import { fetchNewsBySlug, NewsDetail } from "@/services/news";
import { getArticleImageUrl } from "@/lib/image";
import { getPlaceholderImage, handleImageError } from "@/lib/imageFallback";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

export default function NewsDetailPage() {
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  const routeParams = useParams<{ slug?: string | string[] }>();
  const slugFromHook = routeParams?.slug;
  const slug = Array.isArray(slugFromHook)
    ? slugFromHook[0] ?? ""
    : typeof slugFromHook === "string"
    ? slugFromHook
    : "";
  const [article, setArticle] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("Không xác định được bài viết.");
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchNewsBySlug(slug);
        if (mounted) {
          setArticle(data);
        }
      } catch (err) {
        console.error("Failed to fetch news:", err);
        if (mounted) {
          setError("Không tìm thấy tin tức hoặc tin đã bị xoá.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadArticle();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const formattedDates = useMemo(() => {
    if (!article) return null;
    const formatter = new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return {
      published: article.published_at
        ? formatter.format(new Date(article.published_at))
        : null,
      created: formatter.format(new Date(article.created_at)),
      updated: article.updated_at
        ? formatter.format(new Date(article.updated_at))
        : null,
    };
  }, [article]);

  if (loading) {
    return (
      <div
        className={cn(
          "min-h-[60vh] flex items-center justify-center transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <Spinner size="xl" text="Đang tải tin tức..." />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div
        className={cn(
          "min-h-[60vh] flex items-center justify-center px-4 transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <div className="max-w-md text-center">
          <p
            className={cn(
              "text-lg mb-4",
              isDarkMode ? "text-foreground" : "text-gray-700"
            )}
          >
            {error}
          </p>
          <Link
            href="/news"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-primary-foreground hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách tin tức
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-background" : "bg-white"
      )}
    >
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/news"
            className={cn(
              "inline-flex items-center transition-colors",
              isDarkMode
                ? "text-muted-foreground hover:text-foreground"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Trở lại tin tức</span>
          </Link>
          <div
            className={cn(
              "flex items-center text-sm",
              isDarkMode ? "text-muted-foreground" : "text-gray-500"
            )}
          >
            <Eye className="h-4 w-4 mr-1" />
            <span>{article.views.toLocaleString("vi-VN")} lượt xem</span>
          </div>
        </div>

        <article>
          <header className="mb-6">
            <h1
              className={cn(
                "text-3xl md:text-4xl font-bold mb-4",
                isDarkMode ? "text-foreground" : "text-gray-900"
              )}
            >
              {article.title}
            </h1>

            <div
              className={cn(
                "flex flex-wrap items-center gap-4 text-sm",
                isDarkMode ? "text-muted-foreground" : "text-gray-600"
              )}
            >
              <div className="flex items-center">
                <User
                  className={cn(
                    "h-4 w-4 mr-2",
                    isDarkMode ? "text-muted-foreground" : "text-gray-400"
                  )}
                />
                <span>{article.author_name}</span>
              </div>
              {formattedDates && (
                <div className="flex items-center">
                  <Calendar
                    className={cn(
                      "h-4 w-4 mr-2",
                      isDarkMode ? "text-muted-foreground" : "text-gray-400"
                    )}
                  />
                  <span>
                    {formattedDates.published
                      ? `Đăng: ${formattedDates.published}`
                      : `Tạo: ${formattedDates.created}`}
                  </span>
                </div>
              )}
              {formattedDates?.updated && (
                <div className="flex items-center">
                  <RefreshCw
                    className={cn(
                      "h-4 w-4 mr-2",
                      isDarkMode ? "text-muted-foreground" : "text-gray-400"
                    )}
                  />
                  <span>Cập nhật: {formattedDates.updated}</span>
                </div>
              )}
              <div className="flex items-center">
                <Clock
                  className={cn(
                    "h-4 w-4 mr-2",
                    isDarkMode ? "text-muted-foreground" : "text-gray-400"
                  )}
                />
                <span>{article.reading_time_minutes} phút đọc</span>
              </div>
            </div>
          </header>

          <div className="mb-10">
            <div
              className={cn(
                "relative h-72 md:h-96 rounded-2xl overflow-hidden shadow transition-colors",
                isDarkMode ? "shadow-lg" : "shadow"
              )}
            >
              <Image
                src={
                  getArticleImageUrl(article, 1200, 600) ||
                  getPlaceholderImage(1200, 600)
                }
                alt={article.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 60vw"
                priority
                onError={(event) => handleImageError(event, 1200, 600)}
              />
            </div>
          </div>

          <div className="prose prose-lg max-w-none mb-8">
            <RTEContentDisplay content={article.content} />
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Tag
                className={cn(
                  "h-4 w-4",
                  isDarkMode ? "text-muted-foreground" : "text-gray-400"
                )}
              />
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs uppercase tracking-wide transition-colors",
                    isDarkMode
                      ? "bg-muted text-muted-foreground"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
