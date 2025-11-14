"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import UserMenu from "./user/UserMenu";
import NotificationsBell from "./user/NotificationsBell";
import { hasRole } from "@/lib/auth";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();

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

  return (
    <>
      <nav className="bg-[#125093] shadow-lg relative z-50">
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
                />
              </Link>
            </div>

            {/* Desktop menu - Hidden on mobile, centered with proper spacing */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-6 absolute left-1/2 -translate-x-1/2 px-2 lg:px-3 xl:px-4">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white px-2 lg:px-3 xl:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm xl:text-base font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
                  style={{ letterSpacing: "0.44px" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Right actions (desktop) - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2 xl:gap-3 justify-end shrink-0 z-10">
              {isLoading ? (
                <div className="w-7 h-7 lg:w-8 lg:h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                    className="px-2.5 lg:px-3 xl:px-4 py-1.5 lg:py-2 border-2 border-white/40 text-white rounded-full text-xs lg:text-sm xl:text-base font-semibold hover:bg-white/20 hover:border-white/60 transition-colors whitespace-nowrap"
                  >
                    Đăng ký
                  </Link>
                  <Link
                    href="/login"
                    className="px-2.5 lg:px-3 xl:px-4 py-1.5 lg:py-2 bg-white/20 text-white rounded-full text-xs lg:text-sm xl:text-base font-semibold hover:bg-white/30 transition-colors whitespace-nowrap"
                  >
                    Đăng nhập
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button - Only visible on mobile */}
            <div className="md:hidden flex items-center gap-2 justify-end shrink-0">
              {isAuthenticated && <NotificationsBell />}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
              >
                {isOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay menu - Full screen overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile menu overlay */}
          <div className="fixed inset-0 top-16 bg-[#125093] z-40 md:hidden overflow-y-auto">
            <div className="flex flex-col h-full">
              {/* Menu items */}
              <div className="flex flex-col gap-1 p-4">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 text-white px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-white/20 my-2" />

              {/* Auth section */}
              {isAuthenticated ? (
                <div className="p-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <UserMenu />
                  </div>
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-3">
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="text-white px-4 py-3 rounded-lg border-2 border-white/40 hover:bg-white/10 transition-colors text-center font-semibold"
                  >
                    Đăng ký
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="text-white px-4 py-3 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-center font-semibold"
                  >
                    Đăng nhập
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navigation;
