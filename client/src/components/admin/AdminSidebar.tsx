"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  BookOpen,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface SidebarLink {
  id: string;
  title: string;
  href: string;
}

interface SidebarSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href?: string;
  items?: SidebarLink[];
  defaultOpen?: boolean;
}

const sidebarSections: SidebarSection[] = [
  {
    id: "dashboard",
    title: "Bảng tổng kết",
    icon: BarChart3,
    color: "#125093",
    href: "/admin/dashboard",
  },
  {
    id: "learning",
    title: "Tài nguyên học tập",
    icon: BookOpen,
    color: "#5B72EE",
    defaultOpen: true,
    items: [
      { id: "subjects", title: "Môn học", href: "/admin/subjects" },
      { id: "library", title: "Thư viện môn học", href: "/admin/library" },
      { id: "products", title: "Sản phẩm học tập", href: "/admin/products" },
      { id: "ai-data", title: "Dữ liệu AI", href: "/admin/ai-data" },
    ],
  },
  {
    id: "assessment",
    title: "Kiểm tra & Đánh giá",
    icon: Brain,
    color: "#00CBB8",
    defaultOpen: true,
    items: [
      { id: "tests", title: "Ngân hàng bài kiểm tra", href: "/admin/tests" },
      {
        id: "student-test",
        title: "Kết quả sinh viên",
        href: "/admin/student-test",
      },
      { id: "reports", title: "Báo cáo đánh giá", href: "/admin/reports" },
    ],
  },
  {
    id: "communications",
    title: "Tin tức & thông báo",
    icon: MessageSquare,
    color: "#F48C06",
    defaultOpen: false,
    items: [
      { id: "news", title: "Tin tức", href: "/admin/news" },
      { id: "notifications", title: "Thông báo", href: "/admin/notifications" },
    ],
  },
  {
    id: "members",
    title: "Quản lý thành viên",
    icon: Users,
    color: "#8B5CF6",
    href: "/admin/members",
  },
];

const ACTIVE_ITEM_CLASS =
  "bg-[#0F3E71]/10 border-l-4 border-[#0F3E71] shadow-sm";
const INACTIVE_ITEM_CLASS =
  "hover:bg-[#0F3E71]/5 hover:border-l-4 hover:border-[#0F3E71]/30";
const ACTIVE_TEXT_CLASS = "text-[#0F3E71]";
const INACTIVE_TEXT_CLASS = "text-slate-700";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isLinkActive = (href: string) => {
    if (!href) return false;
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    const savedState = localStorage.getItem("admin-sidebar-collapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }

    const storedGroups = localStorage.getItem("admin-sidebar-groups");
    if (storedGroups) {
      try {
        const parsed = JSON.parse(storedGroups) as Record<string, boolean>;
        setOpenGroups(parsed);
      } catch (error) {
        console.warn("Failed to parse sidebar groups from storage", error);
      }
    } else {
      const defaults: Record<string, boolean> = {};
      sidebarSections.forEach((section) => {
        if (section.items?.length) {
          defaults[section.id] = section.defaultOpen ?? false;
        }
      });
      setOpenGroups(defaults);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Determine if sidebar should show text (only when not collapsed)
  const shouldShowText = !isCollapsed;

  useEffect(() => {
    if (Object.keys(openGroups).length > 0) {
      localStorage.setItem("admin-sidebar-groups", JSON.stringify(openGroups));
    }
  }, [openGroups]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      sidebarSections.forEach((section) => {
        if (section.items?.length) {
          const shouldBeOpen = section.items.some((item) => {
            if (!item.href) return false;
            if (pathname === item.href) return true;
            return pathname.startsWith(`${item.href}/`);
          });
          if (shouldBeOpen && !prev[section.id]) {
            updated[section.id] = true;
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const toggleGroup = (sectionId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [sectionId]: !(prev[sectionId] ?? false),
    }));
  };

  const sidebarWidth = isCollapsed ? 80 : 256; // 80px when collapsed, 256px (w-64) when expanded

  return (
    <div
      className="bg-white border-r border-gray-100 sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="px-4 py-4">
        {/* Toggle Button - Full Width */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 group/button"
          aria-label={isCollapsed ? "Mở sidebar" : "Đóng sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
              {shouldShowText && (
                <span className="text-sm font-medium text-left flex-1">
                  Thu gọn
                </span>
              )}
            </>
          )}
        </button>
      </div>

      <div className="px-4 space-y-1 pb-10">
        {sidebarSections.map((section) => {
          const Icon = section.icon;
          const childItems = section.items ?? [];
          const hasChildren = childItems.length > 0;
          const sectionActive = hasChildren
            ? childItems.some((item) => isLinkActive(item.href))
            : isLinkActive(section.href ?? "");
          const isGroupOpen = hasChildren
            ? openGroups[section.id] ?? section.defaultOpen ?? false
            : false;

          const sectionContent = (
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-transform duration-300 flex-shrink-0 ${
                sectionActive
                  ? "scale-105 shadow-md"
                  : "group-hover:scale-105 group-hover:shadow-sm"
              }`}
              style={{
                backgroundColor: section.color,
                opacity: sectionActive ? 1 : 0.9,
              }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
          );

          if (!hasChildren && section.href) {
            return (
              <div
                key={section.id}
                className={`relative ${!shouldShowText ? "group/tooltip" : ""}`}
              >
                <Link
                  href={section.href}
                  aria-current={sectionActive ? "page" : undefined}
                  className={`group flex items-center justify-start ${
                    shouldShowText ? "gap-3 px-3" : "justify-center px-2"
                  } py-2.5 rounded-lg transition-all duration-200 ease-in-out ${
                    sectionActive ? ACTIVE_ITEM_CLASS : INACTIVE_ITEM_CLASS
                  }`}
                >
                  {sectionContent}
                  {shouldShowText && (
                    <div
                      className={`flex-1 text-left text-sm font-medium transition-colors whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal sm:line-clamp-2 ${
                        sectionActive ? ACTIVE_TEXT_CLASS : INACTIVE_TEXT_CLASS
                      } group-hover:text-[#0F3E71]`}
                    >
                      {section.title}
                    </div>
                  )}
                  {shouldShowText && sectionActive && (
                    <div className="w-2 h-2 rounded-full bg-[#0F3E71] animate-pulse flex-shrink-0" />
                  )}
                </Link>
                {!shouldShowText && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
                    {section.title}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </div>
            );
          }

          if (!hasChildren) {
            return null;
          }

          return (
            <div
              key={section.id}
              className={`${!shouldShowText ? "group/tooltip" : ""} relative`}
            >
              <button
                type="button"
                onClick={() => toggleGroup(section.id)}
                aria-expanded={isGroupOpen}
                aria-controls={`${section.id}-content`}
                className={`group flex items-center justify-start ${
                  shouldShowText ? "gap-3 px-3" : "justify-center px-2"
                } py-2.5 rounded-lg transition-all duration-200 ease-in-out w-full ${
                  sectionActive ? ACTIVE_ITEM_CLASS : INACTIVE_ITEM_CLASS
                }`}
              >
                {sectionContent}
                {shouldShowText && (
                  <div className="flex items-center justify-between flex-1 text-left text-sm font-medium text-slate-700 group-hover:text-[#0F3E71] min-w-0">
                    <span
                      className={`text-left whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal sm:line-clamp-2 ${
                        sectionActive ? ACTIVE_TEXT_CLASS : ""
                      }`}
                    >
                      {section.title}
                    </span>
                    {isGroupOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#0F3E71] flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#0F3E71] flex-shrink-0 ml-2" />
                    )}
                  </div>
                )}
              </button>

              {shouldShowText && isGroupOpen && (
                <div
                  id={`${section.id}-content`}
                  className="mt-1 border-l border-slate-100 pl-3 space-y-1"
                  style={{ marginLeft: "3.25rem" }}
                >
                  {childItems.map((item) => {
                    const itemActive = isLinkActive(item.href);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        aria-current={itemActive ? "page" : undefined}
                        className={`flex items-center justify-start gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          itemActive
                            ? "bg-[#0F3E71]/10 text-[#0F3E71] font-semibold"
                            : "text-slate-600 hover:text-[#0F3E71] hover:bg-[#0F3E71]/5"
                        }`}
                      >
                        <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal sm:line-clamp-2">
                          {item.title}
                        </span>
                        {itemActive && (
                          <div className="w-2 h-2 rounded-full bg-[#0F3E71] flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {!shouldShowText && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
                  <div className="font-semibold mb-1">{section.title}</div>
                  <ul className="space-y-1">
                    {childItems.map((item) => (
                      <li key={item.id} className="text-xs text-gray-200">
                        {item.title}
                      </li>
                    ))}
                  </ul>
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
