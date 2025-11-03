'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import { BarChart3, Users, BookOpen, Activity } from 'lucide-react';

export default function AdminReportsPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [courseId, setCourseId] = useState<number>(1);
  const [courseStats, setCourseStats] = useState<any>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/v1/analytics/dashboard')
      .then(r => r.json())
      .then(setDashboard)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/v1/analytics/courses/${courseId}`)
      .then(r => r.json())
      .then(setCourseStats)
      .catch(() => {});
  }, [courseId]);

  return (
    <ProtectedRoute requiredRoles={['admin', 'instructor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Báo cáo & Thống kê</h1>
            <p className="text-gray-600 dark:text-gray-400">Tổng quan hệ thống và thống kê theo khóa học</p>
          </div>

          {dashboard && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Người dùng</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_users}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Khóa học</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_courses}</p>
                </div>
                <BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Enrollment</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.total_enrollments}</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tỷ lệ hoàn thành</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard.completion_rate}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thống kê theo khóa học</h2>
              <div>
                <select value={courseId} onChange={(e) => setCourseId(parseInt(e.target.value))} className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value={1}>Khóa học 1</option>
                  <option value={2}>Khóa học 2</option>
                  <option value={3}>Khóa học 3</option>
                </select>
              </div>
            </div>
            {courseStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tổng enrollment</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{courseStats.total_enrollments}</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tiến độ trung bình</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(courseStats.average_progress)}%</div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tỷ lệ hoàn thành</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(courseStats.completion_rate)}%</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">Đang tải...</div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


