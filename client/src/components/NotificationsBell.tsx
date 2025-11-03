'use client';

import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { Bell, Check } from 'lucide-react';

export default function NotificationsBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-gray-100">
        <Bell className="h-5 w-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5">
            {unreadCount}
          </span>
        )}
      </button>

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
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b ${n.read ? 'bg-white' : 'bg-blue-50'}`}>
                  <div className="text-sm font-medium text-gray-900">{n.title}</div>
                  <div className="text-xs text-gray-600">{n.message}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('vi-VN')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


