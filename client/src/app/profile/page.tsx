"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { User, Mail, Shield, GraduationCap, BookOpen } from "lucide-react";

export default function ProfilePage() {
  const { user, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  if (!user) {
    return null;
  }

  const roleBadge =
    user.is_superuser || hasRole("admin")
      ? {
          text: "Quản trị viên",
          color: "text-red-600 bg-red-100",
          icon: Shield,
        }
      : hasRole("instructor")
      ? {
          text: "Giảng viên",
          color: "text-blue-600 bg-blue-100",
          icon: GraduationCap,
        }
      : {
          text: "Sinh viên",
          color: "text-green-600 bg-green-100",
          icon: BookOpen,
        };

  const RoleIcon = roleBadge.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8">
          <div className="flex items-start space-x-6">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.full_name}
              </h1>
              <div className="mt-2 flex items-center text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4 mr-2" /> {user.email}
              </div>
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-3 ${roleBadge.color} dark:bg-opacity-80`}
              >
                <RoleIcon className="h-4 w-4 mr-1" /> {roleBadge.text}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Thông tin tài khoản
              </h2>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Tên đăng nhập:{" "}
                  </span>
                  {user.username}
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Vai trò:{" "}
                  </span>
                  {user.roles?.join(", ") || "Chưa có"}
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">
                    Ngày tạo:{" "}
                  </span>
                  {user.created_at
                    ? new Date(user.created_at).toLocaleString("vi-VN")
                    : "Chưa có"}
                </div>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Hồ sơ
              </h2>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {user.bio || "Chưa có mô tả."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
