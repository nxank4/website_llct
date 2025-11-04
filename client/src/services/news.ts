import { http, getBaseUrl } from "./http";

export interface NewsArticle {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  featured_image?: string;
  author_name: string;
  published_at: string;
  views: number;
  tags?: string[];
}

export function fetchLatestNews(limit = 3) {
  return http<NewsArticle[]>(`/api/v1/news/latest?limit=${limit}`);
}

export interface NewsPayload {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'draft' | 'published' | 'hidden' | 'archived';
  featured_image?: string;
  tags?: string[];
  is_featured?: boolean;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function withBase(path: string) {
  return `${getBaseUrl()}${path}`;
}

export async function listNews(authFetch: FetchLike) {
  const res = await authFetch(withBase('/api/v1/news'));
  if (!res.ok) throw new Error('Failed to fetch news');
  return res.json();
}

export async function createNews(authFetch: FetchLike, body: NewsPayload) {
  const res = await authFetch(withBase('/api/v1/news'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to create news');
  return res.json();
}

export async function updateNews(authFetch: FetchLike, id: string, body: NewsPayload) {
  const res = await authFetch(withBase(`/api/v1/news/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update news');
  return res.json();
}

export async function deleteNews(authFetch: FetchLike, id: string) {
  const res = await authFetch(withBase(`/api/v1/news/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete news');
  return true;
}

export async function updateNewsStatus(authFetch: FetchLike, id: string, status: string) {
  const res = await authFetch(withBase(`/api/v1/news/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}


