"use client";

import { useState, useEffect } from "react";
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
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { handleImageError } from "@/lib/imageFallback";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const { theme } = useThemePreference();
  const [isMounted, setIsMounted] = useState(false);
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (primaryRole === "admin")
      return "text-red-700 bg-red-100 border border-red-200 dark:text-destructive dark:bg-destructive/10 dark:border-destructive/30";
    if (primaryRole === "instructor")
      return "text-blue-700 bg-blue-100 border border-blue-200 dark:text-primary dark:bg-primary/10 dark:border-primary/20";
    return "text-emerald-700 bg-emerald-100 border border-emerald-200 dark:text-emerald-500 dark:bg-emerald-500/10 dark:border-emerald-500/20";
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white dark:text-foreground hover:bg-white/15 dark:hover:bg-foreground/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/40 dark:focus:ring-foreground/30"
          aria-label="User menu"
        >
          {/* Avatar - Scaled to fit header */}
          <div className="w-10 h-10 bg-white/15 dark:bg-foreground/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 dark:border-border flex-shrink-0 overflow-hidden">
            {avatarSource ? (
              <Image
                src={avatarSource}
                alt={user?.full_name || user?.username || user?.name || "User"}
                width={40}
                height={40}
                className="w-full h-full rounded-full object-cover"
                unoptimized
                onError={(event) => handleImageError(event, 40, 40, "Avatar")}
              />
            ) : (
              <User className="h-5 w-5 text-white dark:text-foreground" />
            )}
          </div>

          {/* User Name - Hidden on small screens, visible on md+ */}
          <div className="hidden lg:block text-left">
            <div className="text-sm font-semibold text-white dark:text-foreground leading-tight truncate max-w-[120px]">
              {user?.full_name || user?.name || user?.username || "User"}
            </div>
          </div>

          {/* Chevron Icon */}
          <ChevronDown className="h-4 w-4 text-white dark:text-foreground transition-transform duration-200 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn(
          "w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] md:w-[calc(100vw-4rem)] lg:w-72 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl p-0 rounded-xl shadow-xl border-border overflow-hidden"
        )}
      >
        {/* User Info Section */}
        <div
          className={cn(
            "px-4 sm:px-5 py-4 border-b rounded-t-xl",
            resolvedDarkMode
              ? "bg-card/90 text-card-foreground border-border"
              : "bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground border-white/10"
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-3.5">
            {/* Avatar in dropdown */}
            <div
              className={cn(
                "w-14 h-14 sm:w-16 sm:h-16 backdrop-blur-sm rounded-full flex items-center justify-center border-2 flex-shrink-0 overflow-hidden shadow-lg ring-2 mx-auto sm:mx-0",
                resolvedDarkMode
                  ? "bg-primary/20 border-primary/40 ring-primary/20"
                  : "bg-white/25 border-white/50 ring-white/20"
              )}
            >
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
                onError={(event) => handleImageError(event, 56, 56, "Avatar")}
                />
              ) : (
                <User
                  className={cn(
                    "h-7 w-7",
                    resolvedDarkMode
                      ? "text-primary"
                      : "text-primary-foreground"
                  )}
                />
              )}
            </div>

            {/* User Details */}
            <div className="flex-1 min-w-0 pt-0.5 text-center sm:text-left">
              <div
                className={cn(
                  "text-base sm:text-lg font-bold truncate mb-1 leading-tight",
                  resolvedDarkMode ? "text-foreground" : "text-white"
                )}
              >
                {user?.full_name || user?.name || user?.username || "User"}
              </div>
              <div
                className={cn(
                  "text-xs sm:text-sm truncate mb-2.5 leading-relaxed",
                  resolvedDarkMode ? "text-muted-foreground" : "text-white/90"
                )}
              >
                {user?.email}
              </div>
              {/* Role Badge - Better contrast with shadow */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-semibold shadow-sm ${getRoleColor()}`}
              >
                {getRoleIcon()}
                <span>{getRoleText()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className={cn(
              "flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base cursor-pointer transition-colors",
              resolvedDarkMode
                ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <User className="h-4 w-4" />
            <span className="font-medium">Thông tin cá nhân</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/my-results")}
            className={cn(
              "flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base cursor-pointer transition-colors",
              resolvedDarkMode
                ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">Kết quả học tập</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className={cn(
              "flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base cursor-pointer transition-colors",
              resolvedDarkMode
                ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            <span className="font-medium">Cài đặt</span>
          </DropdownMenuItem>

          {hasRole("admin") && (
            <DropdownMenuItem
              onClick={() => router.push("/admin/dashboard")}
              className={cn(
                "flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base cursor-pointer transition-colors",
                resolvedDarkMode
                  ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Shield className="h-4 w-4" />
              <span className="font-medium">Quản trị hệ thống</span>
            </DropdownMenuItem>
          )}

          {hasRole("instructor") && (
            <>
              <DropdownMenuItem
                onClick={() => router.push("/instructor")}
                className={cn(
                  "flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base cursor-pointer transition-colors",
                  resolvedDarkMode
                    ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <GraduationCap className="h-4 w-4" />
                <span className="font-medium">Bảng điều khiển giảng viên</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/instructor/stats")}
                className={cn(
                  "flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base cursor-pointer transition-colors",
                  resolvedDarkMode
                    ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Thống kê giảng dạy</span>
              </DropdownMenuItem>
            </>
          )}
        </div>

        {/* Logout Section */}
        <DropdownMenuSeparator className="bg-border" />
        <div className="pt-2 pb-2 bg-muted/30">
          <DropdownMenuItem
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-4 sm:px-5 py-2.5 text-sm sm:text-base cursor-pointer font-medium transition-colors",
              resolvedDarkMode
                ? "text-destructive hover:bg-destructive/20 hover:text-destructive"
                : "text-destructive hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
