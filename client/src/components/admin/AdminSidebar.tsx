"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  BookOpen,
  FileText,
  MessageSquare,
  Users,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react";

interface SidebarItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: "dashboard",
    title: "Bảng tổng kết",
    icon: BarChart3,
    color: "#125093",
    href: "/admin/dashboard",
  },
  {
    id: "ai-data",
    title: "Dữ liệu AI",
    icon: Brain,
    color: "#00CBB8",
    href: "/admin/ai-data",
  },
  {
    id: "library",
    title: "Thư viện môn học",
    icon: BookOpen,
    color: "#5B72EE",
    href: "/admin/library",
  },
  {
    id: "lectures",
    title: "Bài giảng",
    icon: BookOpen,
    color: "#10B981",
    href: "/admin/lectures",
  },
  {
    id: "products",
    title: "Sản phẩm học tập",
    icon: FileText,
    color: "#F48C06",
    href: "/admin/products",
  },
  {
    id: "tests",
    title: "Bài kiểm tra",
    icon: FileText,
    color: "#29B9E7",
    href: "/admin/tests",
  },
  {
    id: "news",
    title: "Tin tức",
    icon: MessageSquare,
    color: "#00CBB8",
    href: "/admin/news",
  },
  {
    id: "members",
    title: "Thành viên",
    icon: Users,
    color: "#8B5CF6",
    href: "/admin/members",
  },
  {
    id: "notifications",
    title: "Thông báo",
    icon: Bell,
    color: "#EF4444",
    href: "/admin/notifications",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("admin-sidebar-open");
    if (savedState !== null) {
      setIsOpen(savedState === "true");
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("admin-sidebar-open", String(isOpen));
  }, [isOpen]);

  // Improved active state check - handles exact matches and sub-routes
  const isActive = (href: string) => {
    if (pathname === href) return true;
    // For sub-routes (e.g., /admin/products/123 should highlight /admin/products)
    if (pathname.startsWith(href + "/")) return true;
    return false;
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`bg-white border-r border-gray-100 sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out ${
        isOpen ? "w-64 px-5" : "w-20 px-2"
      }`}
    >
      {/* Header with Logo and Toggle Button */}
      <div
        className={`mb-6 flex items-center ${
          isOpen ? "justify-end" : "justify-center"
        }`}
      >
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 ${
            !isOpen ? "w-full" : ""
          }`}
          aria-label={isOpen ? "Đóng sidebar" : "Mở sidebar"}
        >
          {isOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Sidebar Menu */}
      <div className="space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const itemIsActive = isActive(item.href);
          return (
            <div
              key={item.id}
              className={`relative ${!isOpen ? "group/tooltip" : ""}`}
            >
              <Link
                href={item.href}
                className={`group flex items-center ${
                  isOpen ? "gap-4 px-3" : "justify-center px-2"
                } py-2.5 rounded-lg transition-all duration-300 ease-in-out ${
                  itemIsActive
                    ? "bg-[#125093]/10 border-l-4 border-[#125093] shadow-sm"
                    : "hover:bg-[#125093]/5 hover:border-l-4 hover:border-[#125093]/30"
                }`}
              >
                <div
                  className={`w-8 h-8 flex items-center justify-center rounded transition-all duration-300 flex-shrink-0 ${
                    itemIsActive
                      ? "scale-110 shadow-md"
                      : "group-hover:scale-105 group-hover:shadow-sm"
                  }`}
                  style={{
                    backgroundColor: itemIsActive ? item.color : item.color,
                    opacity: itemIsActive ? 1 : 0.9,
                  }}
                >
                  <Icon
                    className={`w-5 h-5 text-white transition-transform duration-300 ${
                      itemIsActive ? "scale-110" : "group-hover:scale-105"
                    }`}
                  />
                </div>
                {isOpen && (
                  <>
                    <div
                      className={`flex-1 text-sm md:text-base transition-all duration-300 ${
                        itemIsActive
                          ? "font-bold text-[#125093]"
                          : "font-medium text-gray-800 group-hover:text-[#125093]"
                      }`}
                      style={{
                        fontFamily: itemIsActive
                          ? '"Poppins", sans-serif'
                          : '"Arimo", sans-serif',
                      }}
                    >
                      {item.title}
                    </div>
                    {/* Active indicator dot */}
                    {itemIsActive && (
                      <div className="w-2 h-2 rounded-full bg-[#125093] animate-pulse flex-shrink-0" />
                    )}
                  </>
                )}
              </Link>
              {/* Tooltip when sidebar is closed */}
              {!isOpen && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
                  {item.title}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
