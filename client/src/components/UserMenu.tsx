"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  GraduationCap,
  BookOpen,
  BarChart3,
  TrendingUp,
} from "lucide-react";

export default function UserMenu() {
  const { user, logout, hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getRoleIcon = () => {
    if (hasRole("admin")) return <Shield className="h-3.5 w-3.5" />;
    if (hasRole("instructor")) return <GraduationCap className="h-3.5 w-3.5" />;
    return <BookOpen className="h-3.5 w-3.5" />;
  };

  const getRoleText = () => {
    if (hasRole("admin")) return "Quản trị viên";
    if (hasRole("instructor")) return "Giảng viên";
    return "Sinh viên";
  };

  const getRoleColor = () => {
    if (hasRole("admin")) return "text-red-700 bg-red-50 border-red-200";
    if (hasRole("instructor"))
      return "text-blue-700 bg-blue-50 border-blue-200";
    return "text-green-700 bg-green-50 border-green-200";
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button - Optimized for header height (h-20 = 80px) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="User menu"
      >
        {/* Avatar - Scaled to fit header */}
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 flex-shrink-0 overflow-hidden">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.full_name || "User"}
              width={40}
              height={40}
              className="w-full h-full rounded-full object-cover"
              unoptimized
            />
          ) : (
            <User className="h-5 w-5 text-white" />
          )}
        </div>

        {/* User Name - Hidden on small screens, visible on md+ */}
        <div className="hidden lg:block text-left">
          <div className="text-sm font-semibold text-white leading-tight truncate max-w-[120px]">
            {user.full_name || user.username || "User"}
          </div>
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          className={`h-4 w-4 text-white transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200/80 z-50 overflow-hidden">
          {/* User Info Section */}
          <div className="px-5 py-4 bg-gradient-to-br from-[#125093] via-[#1560a3] to-[#1a6bb8] border-b border-white/10 rounded-t-xl">
            <div className="flex items-start gap-3.5">
              {/* Avatar in dropdown */}
              <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 flex-shrink-0 overflow-hidden shadow-lg ring-2 ring-white/20">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name || "User"}
                    width={56}
                    height={56}
                    className="w-full h-full rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="h-7 w-7 text-white" />
                )}
              </div>

              {/* User Details */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-base font-bold text-white truncate mb-1 leading-tight">
                  {user.full_name || user.username || "User"}
                </div>
                <div className="text-xs text-white/90 truncate mb-2.5 leading-relaxed">
                  {user.email}
                </div>
                {/* Role Badge - Better contrast with shadow */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm border ${getRoleColor()}`}
                >
                  {getRoleIcon()}
                  <span>{getRoleText()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Thông tin cá nhân</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/my-results");
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Kết quả học tập</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Cài đặt</span>
            </button>

            {hasRole("admin") && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/admin/dashboard");
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
              >
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Quản trị hệ thống</span>
              </button>
            )}

            {hasRole("instructor") && (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/instructor");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                  <GraduationCap className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    Bảng điều khiển giảng viên
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/instructor/stats");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Thống kê giảng dạy</span>
                </button>
              </>
            )}
          </div>

          {/* Logout Section */}
          <div className="border-t border-gray-200 pt-2 pb-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
