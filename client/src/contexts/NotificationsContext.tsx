'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  add: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const add: NotificationsContextType['add'] = (n) => {
    setNotifications(prev => [
      { id: Math.random().toString(36).substr(2, 9), title: n.title, message: n.message, createdAt: Date.now(), read: false },
      ...prev
    ]);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Mock real-time generator
  useEffect(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      // 1/4 chance to push a notification
      if (Math.random() < 0.25) {
        add({ title: 'Thông báo mới', message: 'Bạn có hoạt động mới trong hệ thống.' });
      }
    }, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, add, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}


