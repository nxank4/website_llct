"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
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

type Role = "admin" | "instructor" | "student";

interface SessionUserWithMeta {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  role?: Role | string;
  roles?: string[];
}

export default function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const user = session?.user as SessionUserWithMeta | undefined;

  const avatarSource = user?.avatar_url ?? user?.image ?? null;

  // Helper function to check role
  const hasRole = (role: Role): boolean => {
    if (!user) return false;
    const rolesArray = Array.isArray(user.roles)
      ? user.roles.map((r) => r.toLowerCase())
      : [];
    const singleRole = user.role ? String(user.role).toLowerCase() : undefined;

    if (rolesArray.includes(role)) {
      return true;
    }

    if (singleRole) {
      return singleRole === role;
    }

    return false;
  };

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

  const handleLogout = async () => {
    try {
      // Clear NextAuth session and redirect to login page
      // Following NextAuth.js documentation:
      // https://next-auth.js.org/getting-started/client#signout
      const data = await nextAuthSignOut({
        redirect: false,
        callbackUrl: "/login",
      });

      // Clear localStorage (if any tokens were stored)
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
      }

      // Redirect to login page without page reload (no flicker)
      if (data?.url) {
        router.push(data.url);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      router.push("/login");
    }
  };

  const primaryRole = ((): Role => {
    if (user?.role) {
      const normalized = String(user.role).toLowerCase();
      if (normalized === "admin" || normalized === "instructor") {
        return normalized;
      }
    }

    if (Array.isArray(user?.roles)) {
      const normalizedRoles = user.roles
        .map((r) => String(r).toLowerCase())
        .filter((r) => r === "admin" || r === "instructor" || r === "student");

      if (normalizedRoles.includes("admin")) return "admin";
      if (normalizedRoles.includes("instructor")) return "instructor";
      if (normalizedRoles.includes("student")) return "student";
    }

    return "student";
  })();

  const getRoleIcon = () => {
    if (primaryRole === "admin") return <Shield className="h-3.5 w-3.5" />;
    if (primaryRole === "instructor")
      return <GraduationCap className="h-3.5 w-3.5" />;
    return <BookOpen className="h-3.5 w-3.5" />;
  };

  const getRoleText = () => {
    if (primaryRole === "admin") return "Quản trị viên";
    if (primaryRole === "instructor") return "Giảng viên";
    return "Sinh viên";
  };

  const getRoleColor = () => {
    if (primaryRole === "admin") return "text-red-700 bg-red-50 border-red-200";
    if (primaryRole === "instructor")
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
          {avatarSource ? (
            <Image
              src={avatarSource}
              alt={user?.full_name || user?.username || user?.name || "User"}
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
            {user?.full_name || user?.name || user?.username || "User"}
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
        <div className="absolute right-2 sm:right-4 mt-2 w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] md:w-[calc(100vw-4rem)] lg:w-72 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl bg-white rounded-xl shadow-xl border border-gray-200/80 z-50 overflow-hidden">
          {/* User Info Section */}
          <div className="px-4 sm:px-5 py-4 bg-gradient-to-br from-[#125093] via-[#1560a3] to-[#1a6bb8] border-b border-white/10 rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-3.5">
              {/* Avatar in dropdown */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50 flex-shrink-0 overflow-hidden shadow-lg ring-2 ring-white/20 mx-auto sm:mx-0">
                {avatarSource ? (
                  <Image
                    src={avatarSource}
                    alt={
                      user?.full_name || user?.name || user?.username || "User"
                    }
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
              <div className="flex-1 min-w-0 pt-0.5 text-center sm:text-left">
                <div className="text-base sm:text-lg font-bold text-white truncate mb-1 leading-tight">
                  {user?.full_name || user?.name || user?.username || "User"}
                </div>
                <div className="text-xs sm:text-sm text-white/90 truncate mb-2.5 leading-relaxed">
                  {user?.email}
                </div>
                {/* Role Badge - Better contrast with shadow */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-semibold shadow-sm border ${getRoleColor()}`}
                >
                  {getRoleIcon()}
                  <span>{getRoleText()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2 divide-y divide-gray-100/60">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/profile");
              }}
              className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Thông tin cá nhân</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/my-results");
              }}
              className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Kết quả học tập</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/settings");
              }}
              className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors duration-150"
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
                className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors duration-150"
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
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors duration-150"
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
                  className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors duration-150"
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
              className="w-full flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base text-red-600 hover:bg-red-50 transition-colors duration-150 font-medium"
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
