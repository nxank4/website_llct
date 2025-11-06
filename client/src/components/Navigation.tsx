"use client";

import { useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "./UserMenu";
import NotificationsBell from "./NotificationsBell";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, hasRole } = useAuth();

  const menuItems = [
    { href: "/library", label: "Thư viện", icon: BookOpen },
    { href: "/chatbot", label: "Chatbot", icon: MessageCircle },
    { href: "/exercises", label: "Kiểm tra", icon: FileText },
  ];

  // Add instructor-specific menu items
  if (hasRole("instructor")) {
    menuItems.push(
      {
        href: "/instructor/courses",
        label: "Khóa học của tôi",
        icon: BookOpen,
      },
      { href: "/instructor/exercises", label: "Bài tập", icon: FileText },
      { href: "/instructor/students", label: "Sinh viên", icon: Users }
    );
  }

  // Add admin menu only for admins
  if (hasRole("admin")) {
    menuItems.push({
      href: "/admin/dashboard",
      label: "Quản trị",
      icon: Settings,
    });
  }

  return (
    <nav className="bg-[#125093] shadow-lg">
      <div className="w-full px-3 sm:px-4 md:px-6">
        <div className="relative grid items-center h-20 grid-cols-[auto_1fr_auto] w-full">
          <div className="flex items-center shrink-0">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/logo-white.png"
                alt="Logo"
                width={64}
                height={64}
                className="h-14 md:h-16 w-auto object-contain shrink-0"
              />
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-8 justify-center min-w-0 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-1/2 md:-translate-y-1/2">
            <div className="flex items-center gap-8">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white px-5 py-2 rounded-full text-brand-base font-semibold transition-colors"
                  style={{ letterSpacing: "0.44px" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right actions (desktop) */}
          <div className="hidden md:flex items-center gap-4 justify-end">
            {isAuthenticated ? (
              <>
                <NotificationsBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-brand-base font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-brand-base font-medium hover:bg-blue-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {menuItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-brand-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  <ItemIcon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Mobile Auth Buttons */}
            {!isAuthenticated && (
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href="/login"
                  className="flex items-center justify-center text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-brand-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center bg-blue-600 text-white block px-3 py-2 rounded-md text-brand-base font-medium hover:bg-blue-700 mx-3 mt-2"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
