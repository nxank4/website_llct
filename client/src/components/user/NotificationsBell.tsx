"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  AlertCircle,
  Shield,
  GraduationCap,
  Settings,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchNotifications,
  markNotificationRead as apiMarkNotificationRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  fetchNotificationPreferences,
  NotificationItem,
  NotificationPreferences,
  NotificationCategory,
} from "@/services/notifications";

const LEGACY_TYPE_MAP: Record<string, NotificationCategory> = {
  news: "general",
  document: "instructor",
  assignment: "instructor",
  announcement: "system",
};

const normalizeCategory = (raw?: string): NotificationCategory => {
  if (!raw) return "general";
  const lowered = raw.toLowerCase();
  if (
    lowered === "system" ||
    lowered === "instructor" ||
    lowered === "alert" ||
    lowered === "general"
  ) {
    return lowered as NotificationCategory;
  }
  return LEGACY_TYPE_MAP[lowered] ?? "general";
};

export default function NotificationsBell() {
  const router = useRouter();
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  
  // Type-safe access to user with extended properties
  const user = session?.user as
    | {
        id?: string;
        full_name?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | undefined;
  
  const isAuthenticated = !!session;
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<
    NotificationCategory | "all"
  >("all");
  const ref = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get Supabase user UUID from NextAuth session
  const supabaseUserId = user?.id || null;

  const notificationsQuery = useQuery({
    queryKey: ["notifications-list", supabaseUserId],
    enabled: isAuthenticated && !!supabaseUserId,
    queryFn: () => fetchNotifications(authFetch, { limit: 40 }),
    onSuccess: (data) => setNotifications(data),
    onError: () =>
      showToast({
        type: "error",
        message: "Không thể tải thông báo",
      }),
  });

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences"],
    enabled: isAuthenticated,
    queryFn: () => fetchNotificationPreferences(authFetch),
    onSuccess: (data) => setPreferences(data),
    onError: () =>
      showToast({
        type: "error",
        message: "Không thể tải cài đặt thông báo",
      }),
  });

  // Subscribe to Supabase Realtime for new notifications
  useEffect(() => {
    if (!isAuthenticated || !supabaseUserId || !supabase) {
      return;
    }

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications_realtime",
          filter: `user_id_target=eq.${supabaseUserId}`,
        },
        (payload: {
          new: {
            id: string;
            title: string;
            message: string;
            type: string;
            link_url: string | null;
            created_at: string;
            read_status: boolean;
          };
        }) => {
          const category = normalizeCategory(payload.new.type);
          if (preferences && !preferences[category]) {
            return;
          }
          const newNotification: NotificationItem = {
            id: payload.new.id,
            title: payload.new.title,
            message: payload.new.message,
            type: category,
            linkUrl: payload.new.link_url ?? null,
            createdAt: payload.new.created_at ?? new Date().toISOString(),
            read: Boolean(payload.new.read_status),
          };
          setNotifications((prev) => [newNotification, ...prev].slice(0, 60));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications_realtime",
          filter: `user_id_target=eq.${supabaseUserId}`,
        },
        (payload: {
          new: {
            id: string;
            read_status: boolean;
          };
        }) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id
                ? {
                    ...n,
                    read: Boolean(payload.new.read_status),
                  }
                : n
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAuthenticated, supabaseUserId, preferences]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "all") return notifications;
    return notifications.filter((n) => n.type === selectedCategory);
  }, [notifications, selectedCategory]);

  const categoryFilters: Array<{
    key: NotificationCategory | "all";
    label: string;
  }> = [
    { key: "all", label: "Tất cả" },
    { key: "system", label: "Hệ thống" },
    { key: "instructor", label: "Giảng viên" },
    { key: "alert", label: "Cảnh báo" },
  ];

  const disabledCategories =
    preferences &&
    Object.entries(preferences)
      .filter(([, enabled]) => !enabled)
      .map(([key]) => key);

  const markAllRead = async () => {
    try {
      await apiMarkAllNotificationsRead(authFetch);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
      showToast({
        type: "error",
        message: "Không thể đánh dấu đã đọc",
      });
    }
  };

  const markAsRead = async (id: string | number) => {
    try {
      await apiMarkNotificationRead(authFetch, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      showToast({
        type: "error",
        message: "Không thể cập nhật trạng thái thông báo",
      });
    }
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={ref}>
      <IconButton
        aria-label={`Thông báo: ${unreadCount} chưa đọc`}
        onClick={() => setOpen(!open)}
        className="hover:bg-white/10"
        size="small"
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          overlap="circular"
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          showZero={false}
        >
          <Bell className="h-5 w-5 text-white" />
        </Badge>
      </IconButton>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="text-sm font-medium text-gray-900">Thông báo</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/settings#notifications")}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
              >
                <Settings className="h-3.5 w-3.5 mr-1" />
                Cài đặt
              </button>
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Check className="h-3 w-3 mr-1" /> Đánh dấu đã đọc
              </button>
            </div>
          </div>

          <div className="px-4 py-2 border-b bg-gray-50 flex flex-wrap gap-2">
            {categoryFilters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  selectedCategory === key
                    ? "bg-[#125093] text-white border-[#125093]"
                    : "text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {disabledCategories && disabledCategories.length > 0 && (
            <div className="px-4 py-2 text-[11px] text-gray-500 bg-yellow-50 border-b border-yellow-100">
              Đã tắt:{" "}
              {disabledCategories
                .map((key) => {
                  switch (key) {
                    case "system":
                      return "Hệ thống";
                    case "instructor":
                      return "Giảng viên";
                    case "alert":
                      return "Cảnh báo";
                    default:
                      return key;
                  }
                })
                .join(", ")}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                <Spinner size="sm" inline />
                Đang tải thông báo...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Chưa có thông báo</div>
            ) : (
              filteredNotifications.map((n) => {
                const handleClick = () => {
                  if (!n.read) {
                    markAsRead(n.id);
                  }
                  if (n.linkUrl) {
                    router.push(n.linkUrl);
                    setOpen(false);
                  }
                };

                const icon =
                  n.type === "system" ? (
                    <Shield className="h-4 w-4 text-blue-600" />
                  ) : n.type === "instructor" ? (
                    <GraduationCap className="h-4 w-4 text-emerald-600" />
                  ) : n.type === "alert" ? (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <Bell className="h-4 w-4 text-gray-600" />
                  );

                const badge =
                  n.type === "system"
                    ? "Hệ thống"
                    : n.type === "instructor"
                    ? "Giảng viên"
                    : n.type === "alert"
                    ? "Cảnh báo"
                    : "Chung";

                const badgeTone =
                  n.type === "system"
                    ? "bg-blue-100 text-blue-700"
                    : n.type === "instructor"
                    ? "bg-emerald-100 text-emerald-700"
                    : n.type === "alert"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600";

                return (
                  <div
                    key={n.id}
                    onClick={handleClick}
                    className={`px-4 py-3 border-b cursor-pointer transition-colors ${
                      n.read
                        ? "bg-white hover:bg-gray-50"
                        : "bg-blue-50 hover:bg-blue-100"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {n.title}
                          </div>
                          {!n.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">
                          {n.message}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] text-gray-400">
                            {new Date(n.createdAt).toLocaleString("vi-VN")}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeTone}`}>
                            {badge}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
