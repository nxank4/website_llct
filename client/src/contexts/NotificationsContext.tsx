"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useSession } from "next-auth/react";

export type NotificationType =
  | "news"
  | "document"
  | "announcement"
  | "assignment";

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string | null;
  createdAt: number;
  read: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  isLoading: boolean;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

const STORAGE_KEY = "notifications_cache";

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null
  );
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Load initial notifications from Supabase
  const loadNotifications = async (userId: string) => {
    try {
      setIsLoading(true);

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn(
          "Supabase is not configured. Loading from localStorage only."
        );
        // Try to load from localStorage as fallback
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setNotifications(parsed);
          } catch (e) {
            console.error("Error parsing cached notifications:", e);
          }
        }
        setIsLoading(false);
        return;
      }

      // Load from Supabase
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading notifications:", error);
        // Try to load from localStorage as fallback
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setNotifications(parsed);
          } catch (e) {
            console.error("Error parsing cached notifications:", e);
          }
        }
        return;
      }

      if (data) {
        const mapped = data.map(
          (n: {
            id: number;
            title: string;
            message: string;
            type: string;
            link_url: string | null;
            created_at: string;
            read: boolean;
          }) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type as NotificationType,
            link_url: n.link_url,
            createdAt: new Date(n.created_at).getTime(),
            read: n.read,
          })
        );

        setNotifications(mapped);

        // Cache in localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllRead = async () => {
    if (!user) return;

    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        // Fallback: update local state only
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        const updated = notifications.map((n) => ({ ...n, read: true }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return;
      }

      // Update in Supabase
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) {
        console.error("Error marking all as read:", error);
        // Fallback: update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } else {
        // State will be updated by the subscription
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        // Update cache
        const updated = notifications.map((n) => ({ ...n, read: true }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Mark a single notification as read
  const markAsRead = async (id: number) => {
    if (!user) return;

    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        // Fallback: update local state only
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        const updated = notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return;
      }

      // Update in Supabase
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error marking as read:", error);
        // Fallback: update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      } else {
        // State will be updated by the subscription
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        // Update cache
        const updated = notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Clear notifications when logged out
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    // Load initial notifications
    if (user.id) {
      loadNotifications(user.id as string);
    }

    // Subscribe to real-time changes only if Supabase is configured
    if (!isSupabaseConfigured() || !user.id) {
      return;
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: {
          eventType: "INSERT" | "UPDATE" | "DELETE";
          new: {
            id: number;
            title: string;
            message: string;
            type: string;
            link_url: string | null;
            created_at: string;
            read: boolean;
          };
          old?: {
            id: number;
          };
        }) => {
          console.log("Notification change received:", payload);

          if (payload.eventType === "INSERT") {
            const newNotification: AppNotification = {
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.message,
              type: payload.new.type as NotificationType,
              link_url: payload.new.link_url,
              createdAt: new Date(payload.new.created_at).getTime(),
              read: payload.new.read,
            };

            setNotifications((prev) => [newNotification, ...prev]);

            // Update cache
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                const updated = [newNotification, ...parsed];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch (e) {
                console.error("Error updating cache:", e);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id
                  ? {
                      ...n,
                      read: payload.new.read,
                      title: payload.new.title,
                      message: payload.new.message,
                    }
                  : n
              )
            );

            // Update cache
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                const updated = parsed.map((n: AppNotification) =>
                  n.id === payload.new.id
                    ? {
                        ...n,
                        read: payload.new.read,
                        title: payload.new.title,
                        message: payload.new.message,
                      }
                    : n
                );
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch (e) {
                console.error("Error updating cache:", e);
              }
            }
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [isAuthenticated, user]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAllRead, markAsRead, isLoading }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
}
