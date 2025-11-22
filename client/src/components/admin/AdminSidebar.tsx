"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useThemePreference } from "@/providers/ThemeProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

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

// Sidebar sections structure - titles will be translated in component
const getSidebarSections = (t: (key: string, fallback?: string) => string): SidebarSection[] => [
  {
    id: "dashboard",
    title: t("admin.sidebar.dashboard", "Bảng tổng kết"),
    icon: BarChart3,
    color: "hsl(var(--primary))",
    href: "/admin/dashboard",
  },
  {
    id: "learning",
    title: t("admin.sidebar.learningResources", "Tài nguyên học tập"),
    icon: BookOpen,
    color: "hsl(var(--brand-violet))",
    defaultOpen: true,
    items: [
      { id: "subjects", title: t("admin.sidebar.subjects", "Môn học"), href: "/admin/subjects" },
      { id: "library", title: t("admin.sidebar.library", "Thư viện môn học"), href: "/admin/library" },
      { id: "products", title: t("admin.sidebar.products", "Sản phẩm học tập"), href: "/admin/products" },
      { id: "ai-data", title: t("admin.sidebar.aiData", "Dữ liệu AI"), href: "/admin/ai-data" },
    ],
  },
  {
    id: "assessment",
    title: t("admin.sidebar.assessment", "Kiểm tra & Đánh giá"),
    icon: Brain,
    color: "hsl(var(--secondary))",
    defaultOpen: true,
    items: [
      { id: "tests", title: t("admin.sidebar.tests", "Ngân hàng bài kiểm tra"), href: "/admin/tests" },
      {
        id: "student-test",
        title: t("admin.sidebar.studentResults", "Kết quả sinh viên"),
        href: "/admin/student-test",
      },
      { id: "reports", title: t("admin.sidebar.reports", "Báo cáo đánh giá"), href: "/admin/reports" },
    ],
  },
  {
    id: "communications",
    title: t("admin.sidebar.communications", "Tin tức & thông báo"),
    icon: MessageSquare,
    color: "hsl(var(--warning))",
    defaultOpen: false,
    items: [
      { id: "news", title: t("admin.sidebar.news", "Tin tức"), href: "/admin/news" },
      { id: "notifications", title: t("admin.sidebar.notifications", "Thông báo"), href: "/admin/notifications" },
    ],
  },
  {
    id: "members",
    title: t("admin.sidebar.members", "Quản lý thành viên"),
    icon: Users,
    color: "hsl(var(--brand-violet))",
    href: "/admin/members",
  },
  {
    id: "metrics",
    title: t("admin.sidebar.metrics", "System Metrics"),
    icon: BarChart3,
    color: "hsl(var(--primary))",
    href: "/admin/metrics",
  },
];

const ACTIVE_ITEM_CLASS =
  "bg-primary/10 border-l-4 border-primary shadow-sm text-primary";
const INACTIVE_ITEM_CLASS =
  "hover:bg-muted/40 hover:border-l-4 hover:border-primary/30";
const ACTIVE_TEXT_CLASS = "text-primary";
const INACTIVE_TEXT_CLASS = "text-muted-foreground";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useThemePreference();
  const [isMounted, setIsMounted] = useState(false);
  const isDarkMode = theme === "dark";
  const resolvedDarkMode = isMounted ? isDarkMode : false;
  
  const sidebarSections = useMemo(() => getSidebarSections(t), [t]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  }, [sidebarSections]);

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
  }, [pathname, sidebarSections]);

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
      className="bg-card text-card-foreground border-r border-border sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="px-4 py-4">
        {/* Toggle Button - Full Width */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground group/button"
          aria-label={isCollapsed ? t("admin.sidebar.openSidebar", "Mở sidebar") : t("admin.sidebar.closeSidebar", "Đóng sidebar")}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5 flex-shrink-0" />
              {shouldShowText && (
                <span className="text-sm font-medium text-left flex-1">
                  {t("admin.sidebar.collapse", "Thu gọn")}
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
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-transform duration-300 flex-shrink-0",
                sectionActive
                  ? "scale-105 shadow-md"
                  : "group-hover:scale-105 group-hover:shadow-sm"
              )}
              style={{
                backgroundColor: resolvedDarkMode
                  ? `${section.color}40`
                  : section.color,
                opacity: sectionActive ? 1 : 0.9,
              }}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  resolvedDarkMode ? "text-white" : "text-white"
                )}
              />
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
                      } group-hover:text-primary`}
                    >
                      {section.title}
                    </div>
                  )}
                  {shouldShowText && sectionActive && (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                  )}
                </Link>
                {!shouldShowText && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg border border-border opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
                    {section.title}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover rotate-45 border border-border border-t-0 border-r-0"></div>
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
                  <div className="flex items-center justify-between flex-1 text-left text-sm font-medium text-muted-foreground group-hover:text-primary min-w-0">
                    <span
                      className={`text-left whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal sm:line-clamp-2 ${
                        sectionActive ? ACTIVE_TEXT_CLASS : ""
                      }`}
                    >
                      {section.title}
                    </span>
                    {isGroupOpen ? (
                      <ChevronUp className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
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
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                        }`}
                      >
                        <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal sm:line-clamp-2">
                          {item.title}
                        </span>
                        {itemActive && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {!shouldShowText && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg border border-border opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 whitespace-nowrap pointer-events-none">
                  <div className="font-semibold mb-1">{section.title}</div>
                  <ul className="space-y-1">
                    {childItems.map((item) => (
                      <li
                        key={item.id}
                        className="text-xs text-muted-foreground"
                      >
                        {item.title}
                      </li>
                    ))}
                  </ul>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover rotate-45 border border-border border-t-0 border-r-0"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
