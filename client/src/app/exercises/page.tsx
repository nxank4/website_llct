"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Building,
  BookOpen,
  Users,
  FileText,
  ClipboardCheck,
  Search,
  LayoutGrid,
  List,
  ChevronRight,
} from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useAuthFetch } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
import { Input } from "@/components/ui/input";
import { useThemePreference } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Subject {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}

// Icon mapping based on subject code patterns
const getSubjectIcon = (code: string) => {
  if (code.includes("MLN")) return BookOpen;
  if (code.includes("HCM")) return Users;
  if (code.includes("VNR")) return Building;
  return FileText;
};

// Color mapping
const getSubjectColor = (_code: string, index: number, isDarkMode = false) => {
  const lightColors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--brand-teal))",
    "#5B72EE",
    "#8C7AFF",
  ];
  const darkColors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(var(--brand-teal))",
    "hsl(var(--primary) / 0.7)",
  ];
  const palette = isDarkMode ? darkColors : lightColors;
  return palette[index % palette.length];
};

export default function ExercisesPage() {
  const authFetch = useAuthFetch();
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await authFetch(
          `${getFullUrl(
            API_ENDPOINTS.LIBRARY_SUBJECTS
          )}?is_active=true&limit=100`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch subjects");
        }
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [authFetch]);

  // Filter subjects by search query
  const filteredSubjects = subjects.filter((subject) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      subject.name.toLowerCase().includes(query) ||
      subject.code.toLowerCase().includes(query) ||
      (subject.description?.toLowerCase().includes(query) ?? false)
    );
  });

  // Pagination - only show if more than 5 items
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by filteredSubjects
  };

  const heroSectionClass = useMemo(
    () =>
      cn(
        "relative overflow-hidden py-12 xl:py-20 px-4 transition-colors",
        isDarkMode
          ? "bg-gradient-to-b from-background via-background to-background text-foreground"
          : "bg-gradient-to-b from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.85)] to-[#0a2d5a] text-primary-foreground"
      ),
    [isDarkMode]
  );

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-background text-foreground">
        {/* Hero Section */}
        <div className={heroSectionClass}>
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 opacity-20 hidden lg:block">
            <ClipboardCheck
              className={cn(
                "w-12 xl:w-16 h-12 xl:h-16",
                isDarkMode ? "text-emerald-300" : "text-[hsl(var(--secondary))]"
              )}
            />
          </div>
          <div className="absolute top-20 right-20 opacity-20 hidden lg:block">
            <div
              className={cn(
                "w-12 xl:w-16 h-12 xl:h-16 rounded-lg flex items-center justify-center border backdrop-blur",
                isDarkMode
                  ? "bg-card/80 border-border/70"
                  : "bg-white border-white/20"
              )}
            >
              <div className="grid grid-cols-2 gap-1">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-1.5 xl:w-2 h-1.5 xl:h-2 rounded",
                      isDarkMode
                        ? "bg-emerald-300/80"
                        : "bg-[hsl(var(--secondary))]"
                    )}
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Dots */}
          <div
            className={cn(
              "absolute top-32 left-1/4 w-2 xl:w-3 h-2 xl:h-3 rounded-full opacity-60 hidden md:block",
              isDarkMode ? "bg-emerald-300/70" : "bg-[hsl(var(--secondary))]"
            )}
          ></div>
          <div
            className={cn(
              "absolute top-40 right-1/3 w-1.5 xl:w-2 h-1.5 xl:h-2 rounded-full opacity-60 hidden md:block",
              isDarkMode ? "bg-cyan-300/70" : "bg-[hsl(var(--accent))]"
            )}
          ></div>
          <div
            className={cn(
              "absolute top-16 right-1/4 w-1.5 xl:w-2 h-1.5 xl:h-2 rounded-full opacity-60 hidden md:block",
              isDarkMode ? "bg-purple-300/70" : "bg-[#8C7AFF]"
            )}
          ></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1
              className={cn(
                "text-3xl xl:text-5xl font-bold mb-4 xl:mb-6 leading-tight poppins-bold",
                isDarkMode ? "text-foreground" : "text-primary-foreground"
              )}
            >
              Kiểm tra
            </h1>
            <p
              className={cn(
                "text-base xl:text-xl mb-8 xl:mb-12 max-w-2xl mx-auto leading-relaxed arimo-regular",
                isDarkMode ? "text-foreground/80" : "text-primary-foreground/90"
              )}
            >
              Kiểm tra và củng cố kiến thức để chuẩn bị cho những bài test sắp
              tới của bộ môn Kỹ năng mềm tại trường ĐH FPT
            </p>
          </div>
        </div>

        {/* Subject Selection Section */}
        <div className="relative z-10 py-12 md:py-16 bg-background">
          <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4 leading-tight poppins-bold">
                Chọn môn học và
                <br className="hidden md:block" />
                <span className="md:hidden"> </span>
                kiểm tra xem bạn có &quot;pass&quot; hay không nhé!
              </h2>
            </div>

            {/* Search Bar and View Mode Toggle */}
            {!loading && subjects.length > 0 && (
              <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <form
                  onSubmit={handleSearch}
                  className="w-full sm:flex-1 max-w-2xl"
                >
                  <div
                    className={cn(
                      "relative flex rounded-lg shadow-md border overflow-hidden",
                      isDarkMode
                        ? "bg-card border-border text-foreground"
                        : "bg-white border-gray-200 text-gray-900"
                    )}
                  >
                    <div className="flex items-center pl-3 xl:pl-4">
                      <Search
                        className={cn(
                          "w-5 h-5 xl:w-6 xl:h-6",
                          isDarkMode ? "text-muted-foreground" : "text-gray-400"
                        )}
                      />
                    </div>
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm môn học... (Ví dụ: MLN, HCM, VNR)"
                      className={cn(
                        "flex-1 border-0 focus-visible:ring-0 text-sm xl:text-base bg-transparent placeholder:text-muted-foreground",
                        isDarkMode && "text-foreground"
                      )}
                    />
                  </div>
                </form>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      viewMode === "grid"
                        ? "bg-background text-primary shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Xem dạng lưới"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("compact")}
                    className={cn(
                      "p-2 rounded-md transition-all duration-200",
                      viewMode === "compact"
                        ? "bg-background text-primary shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Xem dạng danh sách"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Spinner size="xl" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2 poppins-semibold">
                  Chưa có môn học
                </h3>
                <p className="text-muted-foreground arimo-regular">
                  Hiện tại chưa có môn học nào được kích hoạt.
                </p>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2 poppins-semibold">
                  Không tìm thấy môn học
                </h3>
                <p className="text-muted-foreground arimo-regular">
                  Không có môn học nào phù hợp với từ khóa &quot;{searchQuery}
                  &quot;.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                  {paginatedSubjects.map((subject, cardIndex) => {
                    const Icon = getSubjectIcon(subject.code);
                    const accentColor = getSubjectColor(
                      subject.code,
                      cardIndex,
                      isDarkMode
                    );
                    return (
                      <Link
                        key={subject.id}
                        href={`/exercises/${subject.code.toLowerCase()}`}
                        className="group"
                      >
                        <div
                          className={cn(
                            "w-full h-[200px] md:h-[220px] rounded-3xl flex flex-col justify-center items-center gap-4 md:gap-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-2 relative overflow-hidden group/card border shadow-md",
                            isDarkMode
                              ? "bg-card border-border/80 hover:border-[hsl(var(--primary))]/60 hover:shadow-[0_25px_45px_rgba(0,0,0,0.45)]"
                              : "bg-white border-[hsl(var(--primary))]/40 hover:border-[hsl(var(--primary)/0.85)] hover:shadow-2xl"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute inset-0 opacity-[0.02] group-hover/card:opacity-[0.05] transition-opacity duration-300",
                              isDarkMode && "opacity-[0.04]"
                            )}
                            style={{
                              backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
                              backgroundSize: "24px 24px",
                            }}
                          ></div>

                          <div className="flex flex-col justify-center items-center gap-4 md:gap-6 relative z-10">
                            <div
                              className={cn(
                                "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                                isDarkMode
                                  ? "border border-white/40 text-white shadow-[0_18px_30px_rgba(0,0,0,0.6)] bg-transparent"
                                  : "shadow-[0_20px_35px_rgba(59,130,246,0.25)] text-white"
                              )}
                              style={
                                !isDarkMode
                                  ? { backgroundColor: accentColor }
                                  : undefined
                              }
                            >
                              <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            </div>
                            <div
                              className={cn(
                                "text-3xl md:text-4xl lg:text-5xl font-bold leading-tight poppins-bold transition-colors duration-300",
                                isDarkMode
                                  ? "text-foreground"
                                  : "text-[hsl(var(--primary))]",
                                "group-hover:text-[hsl(var(--primary)/0.85)]"
                              )}
                            >
                              {subject.code}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination - only show if more than 5 items */}
                {filteredSubjects.length > itemsPerPage && (
                  <Pagination className="mt-8">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) => Math.max(1, prev - 1));
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            );
                          }}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedSubjects.map((subject, index) => {
                    const Icon = getSubjectIcon(subject.code);
                    const color = getSubjectColor(
                      subject.code,
                      index,
                      isDarkMode
                    );
                    return (
                      <Link
                        key={subject.id}
                        href={`/exercises/${subject.code.toLowerCase()}`}
                        className="group"
                      >
                        <div
                          className={cn(
                            "w-full flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 shadow-md",
                            isDarkMode
                              ? "bg-card border-border/80 hover:border-[hsl(var(--primary))]/60 hover:shadow-[0_20px_35px_rgba(0,0,0,0.45)]"
                              : "bg-white border-[hsl(var(--primary))]/40 hover:border-[hsl(var(--primary)/0.85)] hover:shadow-xl"
                          )}
                        >
                          <div
                            className={cn(
                              "w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110",
                              isDarkMode
                                ? "border border-white/40 bg-transparent text-white"
                                : "shadow-md group-hover:shadow-lg text-white"
                            )}
                            style={
                              !isDarkMode
                                ? { backgroundColor: color }
                                : undefined
                            }
                          >
                            <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "text-lg md:text-xl font-bold poppins-bold transition-colors",
                                isDarkMode
                                  ? "text-foreground"
                                  : "text-gray-900",
                                "group-hover:text-[hsl(var(--primary))]"
                              )}
                            >
                              {subject.code}
                            </div>
                            {subject.name && (
                              <div
                                className={cn(
                                  "text-sm md:text-base arimo-regular truncate mt-0.5",
                                  isDarkMode
                                    ? "text-muted-foreground"
                                    : "text-gray-600"
                                )}
                              >
                                {subject.name}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                                isDarkMode
                                  ? "border border-white/40 text-white"
                                  : "text-white shadow-[0_12px_25px_rgba(59,130,246,0.3)]"
                              )}
                              style={
                                !isDarkMode
                                  ? { backgroundColor: color }
                                  : undefined
                              }
                            >
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination - only show if more than 5 items */}
                {filteredSubjects.length > itemsPerPage && (
                  <Pagination className="mt-8">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) => Math.max(1, prev - 1));
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            );
                          }}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
