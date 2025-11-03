'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Save, User, Lock, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '',
    bio: '',
    locale: 'vi',
    theme: 'light'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        bio: user.bio || '',
        locale: 'vi',
        theme: 'light'
      });
    }
  }, [user]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Mock save
      await new Promise(resolve => setTimeout(resolve, 600));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Cài đặt tài khoản</h1>

          <form onSubmit={onSubmit} className="space-y-8">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Thông tin cá nhân</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Họ và tên</label>
                  <input name="full_name" value={form.full_name} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Giới thiệu</label>
                  <textarea name="bio" value={form.bio} onChange={onChange} rows={4} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Ngôn ngữ & Giao diện</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Ngôn ngữ</label>
                  <select name="locale" value={form.locale} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Giao diện</label>
                  <select name="theme" value={form.theme} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="light">Sáng</option>
                    <option value="dark">Tối</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


