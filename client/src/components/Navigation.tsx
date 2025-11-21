"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  MessageCircle,
  FileText,
  Users,
  Settings,
  Menu,
  X,
  Newspaper,
  Package,
} from "lucide-react";
import { useSession } from "next-auth/react";
import UserMenu from "./user/UserMenu";
import NotificationsBell from "./user/NotificationsBell";
import { hasRole } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { handleImageError } from "@/lib/imageFallback";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const { theme } = useThemePreference();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile menu when clicking outside or on route change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const isAuthenticated = !!session;
  const isLoading = status === "loading";
  const resolvedTheme = isMounted ? theme : "light";
  const isDarkMode = resolvedTheme === "dark";

  // Helper function to check role
  const checkRole = (role: "admin" | "instructor" | "student"): boolean => {
    return hasRole(
      session as {
        user?: { roles?: string[]; role?: string };
      } | null,
      role
    );
  };

  const menuItems = [
    { href: "/library", label: "Thư viện", icon: BookOpen },
    { href: "/news", label: "Tin tức", icon: Newspaper },
    { href: "/products", label: "Sản phẩm", icon: Package },
    { href: "/chatbot", label: "Chatbot", icon: MessageCircle },
    { href: "/exercises", label: "Kiểm tra", icon: FileText },
  ];

  // Add instructor-specific menu items
  if (checkRole("instructor")) {
    menuItems.push(
      {
        href: "/instructor/courses",
        label: "Khóa học của tôi",
        icon: BookOpen,
      },
      { href: "/instructor/lectures", label: "Tài liệu", icon: BookOpen },
      { href: "/instructor/exercises", label: "Bài tập", icon: FileText },
      { href: "/instructor/students", label: "Sinh viên", icon: Users }
    );
  }

  // Add admin menu only for admins
  if (checkRole("admin")) {
    menuItems.push({
      href: "/admin/dashboard",
      label: "Quản trị",
      icon: Settings,
    });
  }

  const navClassName = cn(
    "sticky top-0 z-50 border-b backdrop-blur transition-colors",
    isDarkMode
      ? "border-border/80 bg-background/95 text-foreground supports-[backdrop-filter]:bg-background/80"
      : "border-[var(--brand-primary-dark,hsl(var(--primary)/0.85))]/40 bg-[var(--brand-primary,hsl(var(--primary)))] text-white supports-[backdrop-filter]:bg-[var(--brand-primary,hsl(var(--primary)))]/90"
  );

  const navStyle: React.CSSProperties | undefined = useMemo(() => {
    if (!isMounted) return undefined;
    return {
      backgroundColor: isDarkMode
        ? "hsl(var(--background)/0.95)"
        : "var(--brand-primary, hsl(var(--primary)))",
    };
  }, [isDarkMode, isMounted]);

  return (
    <>
      <nav className={navClassName} style={navStyle}>
        <div className="w-full px-3 sm:px-4 md:px-6">
          <div className="relative flex items-center justify-between h-16 md:h-[72px] xl:h-20 w-full max-w-[1920px] mx-auto">
            {/* Logo - Always visible, responsive size */}
            <div className="flex items-center shrink-0 min-w-0 z-10">
              <Link
                href="/"
                className="flex items-center"
                onClick={() => setIsOpen(false)}
              >
                <Image
                  src="/logo-white.png"
                  alt="Logo"
                  width={64}
                  height={64}
                  className="h-10 sm:h-11 md:h-12 xl:h-14 w-auto object-contain"
                  priority
                  unoptimized
                  onError={(event) => handleImageError(event, 64, 64, "Logo")}
                />
              </Link>
            </div>

            {/* Desktop menu - Hidden on mobile, centered with proper spacing */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-6 absolute left-1/2 -translate-x-1/2 px-2 lg:px-3 xl:px-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 lg:px-3 xl:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm xl:text-base font-semibold transition-colors whitespace-nowrap text-white/80 hover:text-white hover:bg-white/10 dark:text-muted-foreground dark:hover:text-foreground dark:hover:bg-foreground/5"
                  style={{ letterSpacing: "0.44px" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right actions (desktop) - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2 xl:gap-3 justify-end shrink-0 z-10">
              {isLoading ? (
                <Spinner
                  size="sm"
                  className="text-white dark:text-foreground"
                />
              ) : isAuthenticated ? (
                <>
                  <div className="scale-90 lg:scale-95 xl:scale-100">
                    <NotificationsBell />
                  </div>
                  <div className="scale-90 lg:scale-95 xl:scale-100">
                    <UserMenu />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-2.5 lg:px-3 xl:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm xl:text-base font-semibold whitespace-nowrap transition-colors bg-white/15 text-white hover:bg-white/25 dark:bg-primary/15 dark:text-primary dark:hover:bg-primary/25"
                  >
                    Đăng ký
                  </Link>
                  <Link
                    href="/login"
                    className="px-2.5 lg:px-3 xl:px-4 py-1.5 lg:py-2 border rounded-full text-xs lg:text-sm xl:text-base font-semibold transition-colors whitespace-nowrap border-white/50 text-white hover:bg-white/15 dark:border-border dark:text-foreground dark:hover:bg-foreground/5"
                  >
                    Đăng nhập
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button - Only visible on mobile */}
            <div className="md:hidden flex items-center gap-2 justify-end shrink-0">
              {isAuthenticated && <NotificationsBell />}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <button
                    className="text-white dark:text-foreground p-2 hover:bg-white/15 dark:hover:bg-foreground/10 rounded-lg transition-colors"
                    aria-label={isOpen ? "Đóng menu" : "Mở menu"}
                  >
                    {isOpen ? (
                      <X className="w-6 h-6" />
                    ) : (
                      <Menu className="w-6 h-6" />
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="md:hidden p-0 w-full sm:max-w-sm border-l border-white/20 dark:border-border bg-[var(--brand-primary,hsl(var(--primary)))] text-white dark:bg-background dark:text-foreground"
                >
                  <SheetHeader className="px-4 py-3 border-b border-white/20 dark:border-border text-left">
                    <SheetTitle className="text-white dark:text-foreground">
                      Danh mục điều hướng
                    </SheetTitle>
                    <SheetDescription className="text-white/80 dark:text-muted-foreground">
                      Chọn tính năng bạn muốn sử dụng
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col h-full">
                    <div className="flex flex-col gap-1 p-4">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 dark:hover:bg-foreground/5 transition-colors"
                          >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                    <div className="border-t border-white/20 dark:border-border mt-auto">
                      {isAuthenticated ? (
                        <div className="p-4">
                          <div className="bg-white/10 dark:bg-foreground/5 rounded-lg p-4">
                            <UserMenu />
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 flex flex-col gap-3">
                          <Link
                            href="/register"
                            onClick={() => setIsOpen(false)}
                            className="text-white dark:text-foreground px-4 py-3 rounded-lg bg-white/20 hover:bg-white/30 dark:bg-primary/15 dark:hover:bg-primary/25 transition-colors text-center font-semibold"
                          >
                            Đăng ký
                          </Link>
                          <Link
                            href="/login"
                            onClick={() => setIsOpen(false)}
                            className="text-white dark:text-foreground px-4 py-3 rounded-lg border border-white/40 hover:bg-white/15 dark:border-border dark:hover:bg-foreground/5 transition-colors text-center font-semibold"
                          >
                            Đăng nhập
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
