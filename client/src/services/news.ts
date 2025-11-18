import { http, getBaseUrl } from "./http";

export type NewsStatus = "draft" | "published" | "archived";

export interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  author_name: string;
  author_id?: string;
  published_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  status?: NewsStatus;
  is_featured: boolean;
  tags?: string[];
  views: number;
  likes?: number;
  reading_time_minutes: number;
}

export interface NewsDetail extends NewsArticle {
  content: string;
}

export interface PublicNewsFilters {
  search?: string;
  tag?: string;
  author?: string;
  featured?: boolean;
  sort?: "newest" | "oldest" | "views";
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface NewsAnalytics {
  totals: {
    total: number;
    published: number;
    draft: number;
    archived: number;
    featured: number;
    total_views: number;
    avg_views: number;
    avg_reading_time: number;
  };
  publishing_trend: { month: string; count: number }[];
  top_articles: {
    id: number;
    title: string;
    views: number;
    reading_time_minutes: number;
    published_at?: string | null;
  }[];
  tag_distribution: { tag: string; count: number }[];
  reading_time_distribution: { bucket: string; count: number }[];
}

export async function fetchLatestNews(limit = 3) {
  try {
    return await http<NewsArticle[]>(
      `/api/v1/news/public/latest?limit=${limit}`
    );
  } catch (error) {
    console.warn("fetchLatestNews fallback (returning empty array):", error);
    return [] as NewsArticle[];
  }
}

export async function fetchNewsBySlug(slug: string) {
  return http<NewsDetail>(`/api/v1/news/public/by-slug/${slug}`);
}

export async function fetchNewsList(filters: PublicNewsFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search) query.set("q", filters.search);
  if (filters.tag) query.set("tag", filters.tag);
  if (filters.author) query.set("author", filters.author);
  if (typeof filters.featured === "boolean") {
    query.set("featured", String(filters.featured));
  }
  if (filters.dateFrom) query.set("date_from", filters.dateFrom);
  if (filters.dateTo) query.set("date_to", filters.dateTo);
  if (filters.sort) query.set("sort", filters.sort);
  if (filters.limit) query.set("limit", String(filters.limit));

  const search = query.toString();
  const url = `/api/v1/news/public/search${search ? `?${search}` : ""}`;
  return http<NewsArticle[]>(url);
}

export interface NewsPayload {
  title: string;
  content: string;
  excerpt?: string;
  status?: NewsStatus;
  featured_image?: string;
  tags?: string[];
  is_featured?: boolean;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withBase(path: string) {
  return `${getBaseUrl()}${path}`;
}

interface ListNewsParams {
  q?: string;
  status?: NewsStatus;
  is_featured?: boolean;
  limit?: number;
  skip?: number;
}

export async function listNews(
  authFetch: FetchLike,
  params?: ListNewsParams
) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.status) query.set("status", params.status);
  if (typeof params?.is_featured === "boolean") {
    query.set("is_featured", String(params.is_featured));
  }
  const safeLimit = Math.min(params?.limit ?? 100, 100);
  query.set("limit", String(safeLimit));
  if (params?.skip) query.set("skip", String(params.skip));

  const url = `/api/v1/news?${query.toString()}`;

  const res = await authFetch(withBase(url));
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json() as Promise<NewsDetail[]>;
}

export async function createNews(authFetch: FetchLike, body: NewsPayload) {
  const res = await authFetch(withBase("/api/v1/news"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create news");
  return res.json() as Promise<NewsDetail>;
}

export async function updateNews(
  authFetch: FetchLike,
  id: number | string,
  body: NewsPayload
) {
  const res = await authFetch(withBase(`/api/v1/news/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update news");
  return res.json() as Promise<NewsDetail>;
}

export async function deleteNews(authFetch: FetchLike, id: number | string) {
  const res = await authFetch(withBase(`/api/v1/news/${id}`), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete news");
  return true;
}

export async function updateNewsStatus(
  authFetch: FetchLike,
  id: number | string,
  status: NewsStatus
) {
  const res = await authFetch(withBase(`/api/v1/news/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json() as Promise<NewsDetail>;
}

export async function fetchNewsAnalytics(authFetch: FetchLike) {
  const res = await authFetch(withBase("/api/v1/news/analytics/dashboard"));
  if (!res.ok) throw new Error("Failed to fetch news analytics");
  return res.json() as Promise<NewsAnalytics>;
}

