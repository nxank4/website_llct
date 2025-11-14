"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, BookOpen, Activity } from "lucide-react";
import {
  fetchDashboardStats,
  fetchCourseStats,
  type DashboardStats,
} from "@/services/analytics";

export default function AdminReportsPage() {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [courseId, setCourseId] = useState<number>(1);
  const [courseStats, setCourseStats] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    fetchDashboardStats()
      .then(setDashboard)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCourseStats(courseId)
      .then(setCourseStats)
      .catch(() => {});
  }, [courseId]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Báo cáo đánh giá
            </h1>
            <p className="text-gray-600">
              Tổng quan hệ thống và thống kê đánh giá theo khóa học
            </p>
          </div>
        </div>

        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Người dùng
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard.total_users}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Khóa học
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard.total_courses}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Enrollment
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard.total_enrollments}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Tỷ lệ hoàn thành
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboard.completion_rate}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Thống kê theo khóa học
              </h2>
              <div>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-[#125093] focus:border-[#125093]"
                >
                  <option value={1}>Khóa học 1</option>
                  <option value={2}>Khóa học 2</option>
                  <option value={3}>Khóa học 3</option>
                </select>
              </div>
            </div>
            {courseStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Tổng enrollment
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {String(courseStats.total_enrollments ?? 0)}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Tiến độ trung bình
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {Math.round(
                      typeof courseStats.average_progress === "number"
                        ? courseStats.average_progress
                        : 0
                    )}
                    %
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Tỷ lệ hoàn thành
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {Math.round(
                      typeof courseStats.completion_rate === "number"
                        ? courseStats.completion_rate
                        : 0
                    )}
                    %
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                Đang tải...
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
