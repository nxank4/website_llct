"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import {
  fetchNewsBySlug,
  NewsDetail,
} from "@/services/news";

export default function NewsDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const [article, setArticle] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <Spinner size="xl" text="Đang tải tin tức..." />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-[60vh] bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-lg text-gray-700 mb-4">{error}</p>
          <Link
            href="/news"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-[#125093] text-white hover:bg-[#0f4278]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách tin tức
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/news"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Trở lại tin tức</span>
          </Link>
          <div className="flex items-center text-sm text-gray-500">
            <Eye className="h-4 w-4 mr-1" />
            <span>{article.views.toLocaleString("vi-VN")} lượt xem</span>
          </div>
        </div>

        <article>
          <header className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                <span>{article.author_name}</span>
              </div>
              {formattedDates && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span>
                    {formattedDates.published
                      ? `Đăng: ${formattedDates.published}`
                      : `Tạo: ${formattedDates.created}`}
                  </span>
                </div>
              )}
              {formattedDates?.updated && (
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Cập nhật: {formattedDates.updated}</span>
                </div>
              )}
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                <span>{article.reading_time_minutes} phút đọc</span>
              </div>
            </div>
          </header>

          {article.featured_image && (
            <div className="mb-10">
              <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden shadow">
                <Image
                  src={article.featured_image}
                  alt={article.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          <div className="prose prose-lg max-w-none mb-8">
            <RTEContentDisplay content={article.content} />
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Tag className="h-4 w-4 text-gray-400" />
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs uppercase tracking-wide"
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


