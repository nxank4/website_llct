'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Newspaper, FileText, Megaphone, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFullUrl } from '@/lib/api';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';

type NotificationType = 'news' | 'document' | 'announcement' | 'assignment';

interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string | null;
  createdAt: number;
  read: boolean;
}

export default function NotificationsBell() {
  const router = useRouter();
  const { authFetch, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    enabled: isAuthenticated,
    refetchInterval: 60000,
    queryFn: async (): Promise<AppNotification[]> => {
      try {
        const res = await authFetch(
          getFullUrl('/api/v1/notifications?limit=50')
        );
        if (!res.ok) return [];
        const json = await res.json();
        // Map backend fields -> UI fields
        return (json || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: (n.type || 'news') as NotificationType,
          link_url: n.link_url ?? null,
          createdAt: new Date(n.created_at || Date.now()).getTime(),
          read: Boolean(n.read),
        }));
      } catch {
        return [];
      }
    },
    initialData: [],
  });

  const notifications = data || [];
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAllRead = async () => {
    // Optimistic update
    queryClient.setQueryData<AppNotification[]>(['notifications'], (old) =>
      (old || []).map((n) => ({ ...n, read: true }))
    );
    // Best-effort call (optional)
    try {
      await authFetch(getFullUrl('/api/v1/notifications/mark-all-read'), {
        method: 'PATCH',
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // ignore
    }
  };

  const markAsRead = async (id: number) => {
    // Optimistic update
    queryClient.setQueryData<AppNotification[]>(['notifications'], (old) =>
      (old || []).map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    // Best-effort call (optional)
    try {
      await authFetch(getFullUrl(`/api/v1/notifications/${id}/read`), {
        method: 'PATCH',
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
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
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          showZero={false}
        >
          <Bell className="h-5 w-5 text-white" />
        </Badge>
      </IconButton>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="text-sm font-medium text-gray-900">Thông báo</div>
            <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 flex items-center">
              <Check className="h-3 w-3 mr-1" /> Đánh dấu đã đọc
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Chưa có thông báo</div>
            ) : (
              notifications.map(n => {
                const getTypeIcon = () => {
                  switch (n.type) {
                    case 'news':
                      return <Newspaper className="h-4 w-4 text-blue-600" />;
                    case 'document':
                      return <FileText className="h-4 w-4 text-green-600" />;
                    case 'announcement':
                      return <Megaphone className="h-4 w-4 text-orange-600" />;
                    case 'assignment':
                      return <ClipboardList className="h-4 w-4 text-purple-600" />;
                    default:
                      return <Bell className="h-4 w-4 text-gray-600" />;
                  }
                };

                const getTypeBadge = () => {
                  switch (n.type) {
                    case 'news':
                      return <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Tin tức</span>;
                    case 'document':
                      return <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Tài liệu</span>;
                    case 'announcement':
                      return <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">Thông báo</span>;
                    case 'assignment':
                      return <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Bài tập</span>;
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
                      n.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">{getTypeIcon()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{n.title}</div>
                          {!n.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{n.message}</div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] text-gray-400">
                            {new Date(n.createdAt).toLocaleString('vi-VN')}
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

