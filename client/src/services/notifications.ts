import { getFullUrl } from "@/lib/api";

export type NotificationCategory =
  | "system"
  | "instructor"
  | "alert"
  | "general";

export interface NotificationItem {
  id: string | number;
  title: string;
  message: string;
  type: NotificationCategory;
  linkUrl?: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  system: boolean;
  instructor: boolean;
  alert: boolean;
  general: boolean;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function mapNotificationResponse(item: any): NotificationItem {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    type: (item.type || "general") as NotificationCategory,
    linkUrl: item.link_url ?? null,
    createdAt: item.created_at ?? new Date().toISOString(),
    read: Boolean(item.read),
  };
}

export async function fetchNotifications(
  authFetch: FetchLike,
  params?: { limit?: number; unreadOnly?: boolean }
): Promise<NotificationItem[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.unreadOnly) query.set("unread_only", String(params.unreadOnly));
  const url = getFullUrl(`/api/v1/notifications/${query.toString() ? `?${query}` : ""}`);
  const response = await authFetch(url);
  if (!response.ok) {
    throw new Error("Không thể tải thông báo");
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(mapNotificationResponse) : [];
}

export async function markNotificationRead(
  authFetch: FetchLike,
  notificationId: string | number
): Promise<void> {
  const response = await authFetch(
    getFullUrl(`/api/v1/notifications/${notificationId}/read`),
    { method: "PATCH" }
  );
  if (!response.ok) {
    throw new Error("Không thể đánh dấu đã đọc");
  }
}

export async function markAllNotificationsRead(authFetch: FetchLike): Promise<void> {
  const response = await authFetch(
    getFullUrl("/api/v1/notifications/mark-all-read"),
    { method: "POST" }
  );
  if (!response.ok) {
    throw new Error("Không thể đánh dấu tất cả đã đọc");
  }
}

export async function fetchNotificationPreferences(
  authFetch: FetchLike
): Promise<NotificationPreferences> {
  const response = await authFetch(getFullUrl("/api/v1/notifications/preferences"));
  if (!response.ok) {
    throw new Error("Không thể tải cài đặt thông báo");
  }
  return (await response.json()) as NotificationPreferences;
}

export async function updateNotificationPreferences(
  authFetch: FetchLike,
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const response = await authFetch(
    getFullUrl("/api/v1/notifications/preferences"),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    }
  );
  if (!response.ok) {
    throw new Error("Không thể lưu cài đặt thông báo");
  }
  return (await response.json()) as NotificationPreferences;
}

