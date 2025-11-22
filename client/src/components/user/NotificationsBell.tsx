"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  AlertCircle,
  Shield,
  GraduationCap,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const CATEGORY_TO_TOAST: Record<
  NotificationCategory,
  "info" | "success" | "warning" | "error"
> = {
  system: "info",
  instructor: "success",
  alert: "warning",
  general: "info",
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
  const { theme } = useThemePreference();
  const [isMounted, setIsMounted] = useState(false);
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const [selectedCategory, setSelectedCategory] = useState<
    NotificationCategory | "all"
  >("all");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get Supabase user UUID from NextAuth session
  const supabaseUserId = user?.id || null;

  const notificationsQuery = useQuery<NotificationItem[], Error>({
    queryKey: ["notifications-list", supabaseUserId],
    enabled: isAuthenticated && !!supabaseUserId,
    queryFn: () =>
      fetchNotifications(
        (input, init) =>
          authFetch(typeof input === "string" ? input : input.toString(), init),
        { limit: 40 }
      ),
  });

  useEffect(() => {
    if (Array.isArray(notificationsQuery.data)) {
      setNotifications(notificationsQuery.data);
    }
  }, [notificationsQuery.data]);

  const errorShownRef = useRef<string | null>(null);

  useEffect(() => {
    if (notificationsQuery.error && errorShownRef.current !== "notifications") {
      errorShownRef.current = "notifications";
      showToast({
        type: "error",
        message: "Không thể tải thông báo",
      });
    } else if (
      !notificationsQuery.error &&
      errorShownRef.current === "notifications"
    ) {
      errorShownRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsQuery.error]);

  const preferencesQuery = useQuery<NotificationPreferences, Error>({
    queryKey: ["notification-preferences"],
    enabled: isAuthenticated,
    queryFn: () =>
      fetchNotificationPreferences((input, init) =>
        authFetch(typeof input === "string" ? input : input.toString(), init)
      ),
  });
  const preferences = preferencesQuery.data;

  useEffect(() => {
    if (preferencesQuery.error && errorShownRef.current !== "preferences") {
      errorShownRef.current = "preferences";
      showToast({
        type: "error",
        message: "Không thể tải cài đặt thông báo",
      });
    } else if (
      !preferencesQuery.error &&
      errorShownRef.current === "preferences"
    ) {
      errorShownRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesQuery.error]);

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
          table: "notifications",
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
            read: boolean;
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
            read: Boolean(payload.new.read),
          };
          setNotifications((prev) => [newNotification, ...prev].slice(0, 60));
          showToast({
            type: CATEGORY_TO_TOAST[category] ?? "info",
            title: payload.new.title,
            message: payload.new.message,
            actionLabel: payload.new.link_url ? "Xem chi tiết" : undefined,
            onAction: payload.new.link_url
              ? () => {
                  router.push(payload.new.link_url as string);
                  setOpen(false);
                }
              : undefined,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id_target=eq.${supabaseUserId}`,
        },
        (payload: {
          new: {
            id: string;
            read: boolean;
          };
        }) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id
                ? {
                    ...n,
                    read: Boolean(payload.new.read),
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
  }, [isAuthenticated, supabaseUserId, preferences, router, showToast]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "all") return notifications;
    if (selectedCategory === "system") {
      // Hiển thị cả "system" và "alert" khi chọn "Hệ thống"
      return notifications.filter(
        (n) => n.type === "system" || n.type === "alert"
      );
    }
    return notifications.filter((n) => n.type === selectedCategory);
  }, [notifications, selectedCategory]);

  const categoryFilters: Array<{
    key: NotificationCategory | "all";
    label: string;
  }> = [
    { key: "all", label: "Tất cả" },
    { key: "system", label: "Hệ thống" },
    { key: "instructor", label: "Giảng viên" },
  ];

  const disabledCategories =
    preferences &&
    Object.entries(preferences)
      .filter(([key, enabled]) => {
        // Bỏ qua "general" vì không còn sử dụng
        // Bỏ qua "alert" vì đã gộp với "system"
        if (key === "general" || key === "alert") return false;
        return !enabled;
      })
      .map(([key]) => key);

  const markAllPendingRef = useRef(false);

  const markAllRead = useCallback(async () => {
    if (markAllPendingRef.current) return;
    markAllPendingRef.current = true;
    try {
      await apiMarkAllNotificationsRead((input, init) =>
        authFetch(typeof input === "string" ? input : input.toString(), init)
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
      showToast({
        type: "error",
        message: "Không thể đánh dấu đã đọc",
      });
    } finally {
      markAllPendingRef.current = false;
    }
  }, [authFetch, showToast]);

  const markAsRead = async (id: string | number) => {
    try {
      await apiMarkNotificationRead(
        (input, init) =>
          authFetch(typeof input === "string" ? input : input.toString(), init),
        id
      );
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
    if (!open) return;
    const hasUnread = notifications.some((n) => !n.read);
    if (!hasUnread) return;
    markAllRead();
  }, [open, notifications, markAllRead]);

  if (!isAuthenticated) return null;

  const renderMenuContent = () => (
    <>
      <div
        className={cn(
          "px-4 py-3 border-b",
          resolvedDarkMode
            ? "border-border bg-card/50"
            : "border-slate-100 bg-slate-50"
        )}
      >
        <div className="mb-2">
          <div
            className={cn(
              "text-sm font-semibold",
              resolvedDarkMode ? "text-foreground" : "text-slate-900"
            )}
          >
            Thông báo
          </div>
          <p
            className={cn(
              "text-xs",
              resolvedDarkMode ? "text-muted-foreground" : "text-slate-500"
            )}
          >
            Cập nhật mới nhất từ hệ thống
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => notificationsQuery.refetch()}
            disabled={notificationsQuery.isFetching}
            className={cn(
              "text-xs",
              resolvedDarkMode
                ? "text-muted-foreground hover:text-foreground"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                notificationsQuery.isFetching ? "animate-spin" : ""
              }`}
            />
            {notificationsQuery.isFetching ? "Đang tải" : "Làm mới"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/settings#notifications")}
            className={cn(
              "text-xs",
              resolvedDarkMode
                ? "text-muted-foreground hover:text-foreground"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Cài đặt
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="text-xs text-primary hover:text-primary/80"
          >
            <Check className="h-3.5 w-3.5" />
            Đánh dấu đã đọc
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "px-4 py-2 border-b flex flex-wrap gap-2",
          resolvedDarkMode
            ? "border-border bg-card"
            : "border-slate-100 bg-white"
        )}
      >
        {categoryFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition",
              selectedCategory === key
                ? "bg-primary text-primary-foreground border-primary"
                : resolvedDarkMode
                ? "text-muted-foreground border-border hover:border-muted-foreground/50"
                : "text-gray-600 border-gray-200 hover:border-gray-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {disabledCategories && disabledCategories.length > 0 && (
        <div
          className={cn(
            "px-4 py-2 text-[11px] border-b",
            resolvedDarkMode
              ? "text-yellow-200 bg-yellow-100/10 border-yellow-200/30"
              : "text-gray-500 bg-yellow-50 border-yellow-100"
          )}
        >
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
                case "general":
                  return "Chung";
                default:
                  return key;
              }
            })
            .join(", ")}
        </div>
      )}

      <div
        className={cn(
          "max-h-80 overflow-y-auto",
          resolvedDarkMode ? "bg-card" : "bg-white"
        )}
      >
        {notificationsQuery.isLoading ? (
          <div
            className={cn(
              "p-4 text-sm flex items-center gap-2",
              resolvedDarkMode ? "text-muted-foreground" : "text-gray-500"
            )}
          >
            <Spinner size="sm" inline />
            Đang tải thông báo...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div
            className={cn(
              "p-4 text-sm",
              resolvedDarkMode ? "text-muted-foreground" : "text-gray-500"
            )}
          >
            Chưa có thông báo
          </div>
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
                <Shield
                  className={cn(
                    "h-4 w-4",
                    resolvedDarkMode ? "text-blue-400" : "text-blue-600"
                  )}
                />
              ) : n.type === "instructor" ? (
                <GraduationCap
                  className={cn(
                    "h-4 w-4",
                    resolvedDarkMode ? "text-emerald-400" : "text-emerald-600"
                  )}
                />
              ) : n.type === "alert" ? (
                <AlertCircle
                  className={cn(
                    "h-4 w-4",
                    resolvedDarkMode ? "text-red-400" : "text-red-600"
                  )}
                />
              ) : (
                <Bell
                  className={cn(
                    "h-4 w-4",
                    resolvedDarkMode ? "text-muted-foreground" : "text-gray-600"
                  )}
                />
              );

            const badge =
              n.type === "system"
                ? "Hệ thống"
                : n.type === "instructor"
                ? "Giảng viên"
                : n.type === "alert"
                ? "Cảnh báo"
                : "Chung";

            const badgeTone = cn(
              n.type === "system"
                ? resolvedDarkMode
                  ? "bg-blue-900/40 text-blue-300"
                  : "bg-blue-100 text-blue-700"
                : n.type === "instructor"
                ? resolvedDarkMode
                  ? "bg-emerald-900/40 text-emerald-300"
                  : "bg-emerald-100 text-emerald-700"
                : n.type === "alert"
                ? resolvedDarkMode
                  ? "bg-red-900/40 text-red-300"
                  : "bg-red-100 text-red-700"
                : resolvedDarkMode
                ? "bg-muted text-muted-foreground"
                : "bg-gray-100 text-gray-600"
            );

            return (
              <div
                key={n.id}
                onClick={handleClick}
                className={cn(
                  "px-4 py-3 border-b cursor-pointer transition-all",
                  n.read
                    ? resolvedDarkMode
                      ? "bg-card hover:bg-accent border-border"
                      : "bg-white hover:bg-slate-50 border-slate-100"
                    : resolvedDarkMode
                    ? "bg-blue-500/10 hover:bg-blue-500/20 border-border"
                    : "bg-blue-50 hover:bg-blue-100 border-slate-100"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div
                        className={cn(
                          "text-sm font-medium truncate",
                          resolvedDarkMode ? "text-foreground" : "text-gray-900"
                        )}
                      >
                        {n.title}
                      </div>
                      {!n.read && (
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            resolvedDarkMode ? "bg-blue-400" : "bg-blue-600"
                          )}
                        ></div>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-xs mb-1",
                        resolvedDarkMode ? "text-muted-foreground" : "text-gray-600"
                      )}
                    >
                      {n.message}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={cn(
                          "text-[10px]",
                          resolvedDarkMode ? "text-muted-foreground/70" : "text-gray-400"
                        )}
                      >
                        {new Date(n.createdAt).toLocaleString("vi-VN")}
                      </div>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded", badgeTone)}>
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
    </>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Thông báo: ${unreadCount} chưa đọc`}
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-12 w-12 rounded-full border shadow-md transition-all",
            resolvedDarkMode
              ? "border-border/50 bg-background/80 text-foreground hover:border-border hover:bg-background"
              : "border-white/30 bg-white/10 text-white hover:border-white/70 hover:bg-white/20"
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1.5 -right-1.5 min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white shadow-lg",
                resolvedDarkMode
                  ? "bg-red-600 shadow-red-500/50"
                  : "bg-red-500"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "z-50 mt-3 w-[420px] max-w-[90vw] overflow-hidden rounded-2xl border p-0 shadow-2xl ring-1",
          resolvedDarkMode
            ? "border-border bg-popover ring-black/5"
            : "border-slate-100 bg-white ring-black/5"
        )}
      >
        {renderMenuContent()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
