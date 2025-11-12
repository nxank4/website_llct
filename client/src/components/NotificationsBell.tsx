"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Newspaper,
  FileText,
  Megaphone,
  ClipboardList,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";

type NotificationType = "news" | "document" | "announcement" | "assignment";

interface AppNotification {
  id: string; // UUID from Supabase
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string | null;
  createdAt: number;
  read: boolean;
}

export default function NotificationsBell() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get Supabase user UUID from NextAuth session
  const supabaseUserId = session?.user?.id || null;

  // Load initial notifications (one-time fetch, no polling)
  const { data: initialNotifications } = useQuery({
    queryKey: ["notifications-initial", supabaseUserId],
    enabled: isAuthenticated && !!supabaseUserId,
    retry: false,
    queryFn: async (): Promise<AppNotification[]> => {
      try {
        // Fetch from Supabase directly (with RLS)
        if (!supabase || !supabaseUserId) {
          console.warn("Supabase client or user ID not available");
          return [];
        }

        const { data, error } = await supabase
          .from("notifications_realtime")
          .select("*")
          .eq("user_id_target", supabaseUserId) // RLS will filter automatically
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          console.error("Error fetching notifications:", error);
          return [];
        }

        // Map Supabase fields -> UI fields
        return (data || []).map(
          (n: {
            id: string;
            title: string;
            message: string;
            type: string;
            link_url: string | null;
            created_at: string;
            read_status: boolean;
          }) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: (n.type || "news") as NotificationType,
            link_url: n.link_url ?? null,
            createdAt: new Date(n.created_at || Date.now()).getTime(),
            read: Boolean(n.read_status),
          })
        );
      } catch (err) {
        console.error("Error in notifications query:", err);
        return [];
      }
    },
    initialData: [],
  });

  // Set initial notifications
  useEffect(() => {
    if (initialNotifications) {
      setNotifications(initialNotifications);
    }
  }, [initialNotifications]);

  // Subscribe to Supabase Realtime for new notifications
  useEffect(() => {
    if (!isAuthenticated || !supabaseUserId || !supabase) {
      return;
    }

    // Subscribe to INSERT events on notifications table
    // RLS will automatically filter to only show notifications for current user
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications_realtime",
          filter: `user_id_target=eq.${supabaseUserId}`, // Filter by current user UUID
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
          console.log("New notification received:", payload);

          // Add new notification to state
          const newNotification: AppNotification = {
            id: payload.new.id,
            title: payload.new.title,
            message: payload.new.message,
            type: (payload.new.type || "news") as NotificationType,
            link_url: payload.new.link_url ?? null,
            createdAt: new Date(payload.new.created_at || Date.now()).getTime(),
            read: Boolean(payload.new.read_status),
          };

          setNotifications((prev) => [newNotification, ...prev]);

          // Invalidate query to refresh if needed
          queryClient.invalidateQueries({
            queryKey: ["notifications-initial"],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications_realtime",
          filter: `user_id_target=eq.${supabaseUserId}`, // Filter by current user UUID
        },
        (payload: {
          new: {
            id: string;
            read_status: boolean;
          };
        }) => {
          console.log("Notification updated:", payload);

          // Update notification in state (e.g., when marked as read)
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
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAuthenticated, supabaseUserId, queryClient]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllRead = async () => {
    if (!supabase || !supabaseUserId) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Update in Supabase
    try {
      const { error } = await supabase
        .from("notifications_realtime")
        .update({ read_status: true })
        .eq("user_id_target", supabaseUserId)
        .eq("read_status", false);

      if (error) {
        console.error("Error marking all as read:", error);
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["notifications-initial"] });
      }
    } catch (err) {
      console.error("Error in markAllRead:", err);
      queryClient.invalidateQueries({ queryKey: ["notifications-initial"] });
    }
  };

  const markAsRead = async (id: string) => {
    if (!supabase || !supabaseUserId) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    // Update in Supabase
    try {
      const { error } = await supabase
        .from("notifications_realtime")
        .update({ read_status: true })
        .eq("id", id)
        .eq("user_id_target", supabaseUserId); // RLS check

      if (error) {
        console.error("Error marking as read:", error);
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["notifications-initial"] });
      }
    } catch (err) {
      console.error("Error in markAsRead:", err);
      queryClient.invalidateQueries({ queryKey: ["notifications-initial"] });
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
            <button
              onClick={markAllRead}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
            >
              <Check className="h-3 w-3 mr-1" /> Đánh dấu đã đọc
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Chưa có thông báo</div>
            ) : (
              notifications.map((n) => {
                const getTypeIcon = () => {
                  switch (n.type) {
                    case "news":
                      return <Newspaper className="h-4 w-4 text-blue-600" />;
                    case "document":
                      return <FileText className="h-4 w-4 text-green-600" />;
                    case "announcement":
                      return <Megaphone className="h-4 w-4 text-orange-600" />;
                    case "assignment":
                      return (
                        <ClipboardList className="h-4 w-4 text-purple-600" />
                      );
                    default:
                      return <Bell className="h-4 w-4 text-gray-600" />;
                  }
                };

                const getTypeBadge = () => {
                  switch (n.type) {
                    case "news":
                      return (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          Tin tức
                        </span>
                      );
                    case "document":
                      return (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                          Tài liệu
                        </span>
                      );
                    case "announcement":
                      return (
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                          Thông báo
                        </span>
                      );
                    case "assignment":
                      return (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                          Bài tập
                        </span>
                      );
                    default:
                      return null;
                  }
                };

                const handleClick = () => {
                  if (!n.read) {
                    markAsRead(n.id);
                  }
                  if (n.link_url) {
                    router.push(n.link_url);
                    setOpen(false);
                  }
                };

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
                      <div className="mt-0.5 flex-shrink-0">
                        {getTypeIcon()}
                      </div>
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
                          {getTypeBadge()}
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
