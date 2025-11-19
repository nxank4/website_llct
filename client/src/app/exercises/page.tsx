"use client";

import { useState, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useAuthFetch } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
import { Input } from "@/components/ui/input";

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
const getSubjectColor = (code: string, index: number) => {
  const colors = ["#125093", "#29B9E7", "#49BBBD", "#5B72EE", "#8C7AFF"];
  return colors[index % colors.length];
};

export default function ExercisesPage() {
  const authFetch = useAuthFetch();
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

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-[#125093] via-[#0f4278] to-[#0a2d5a] py-12 xl:py-20 px-4 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 opacity-20 hidden lg:block">
            <ClipboardCheck className="w-12 xl:w-16 h-12 xl:h-16 text-[#00CBB8]" />
          </div>
          <div className="absolute top-20 right-20 opacity-20 hidden lg:block">
            <div className="w-12 xl:w-16 h-12 xl:h-16 bg-white rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[#00CBB8] rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[#00CBB8] rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[#00CBB8] rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[#00CBB8] rounded"></div>
              </div>
            </div>
          </div>

          {/* Floating Dots */}
          <div className="absolute top-32 left-1/4 w-2 xl:w-3 h-2 xl:h-3 bg-[#00CBB8] rounded-full opacity-60 hidden md:block"></div>
          <div className="absolute top-40 right-1/3 w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[#29B9E7] rounded-full opacity-60 hidden md:block"></div>
          <div className="absolute top-16 right-1/4 w-1.5 xl:w-2 h-1.5 xl:h-2 bg-[#8C7AFF] rounded-full opacity-60 hidden md:block"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-3xl xl:text-5xl font-bold text-white mb-4 xl:mb-6 leading-tight poppins-bold">
              Kiểm tra
            </h1>
            <p className="text-base xl:text-xl text-white/90 mb-8 xl:mb-12 max-w-2xl mx-auto leading-relaxed arimo-regular">
              Kiểm tra và củng cố kiến thức để chuẩn bị cho những bài test sắp
              tới của bộ môn Kỹ năng mềm tại trường ĐH FPT
            </p>
          </div>
        </div>

        {/* Subject Selection Section */}
        <div className="relative z-10 py-12 md:py-16 bg-white">
          <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4 leading-tight poppins-bold">
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
                  <div className="relative flex bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <div className="flex items-center pl-3 xl:pl-4">
                      <Search className="w-5 h-5 xl:w-6 xl:h-6 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm môn học... (Ví dụ: MLN, HCM, VNR)"
                      className="flex-1 border-0 focus-visible:ring-0 text-sm xl:text-base"
                    />
                  </div>
                </form>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === "grid"
                        ? "bg-white text-[#125093] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    title="Xem dạng lưới"
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("compact")}
                    className={`p-2 rounded-md transition-all duration-200 ${
                      viewMode === "compact"
                        ? "bg-white text-[#125093] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
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
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2 poppins-semibold">
                  Chưa có môn học
                </h3>
                <p className="text-gray-600 arimo-regular">
                  Hiện tại chưa có môn học nào được kích hoạt.
                </p>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2 poppins-semibold">
                  Không tìm thấy môn học
                </h3>
                <p className="text-gray-600 arimo-regular">
                  Không có môn học nào phù hợp với từ khóa &quot;{searchQuery}
                  &quot;.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                  {paginatedSubjects.map((subject) => {
                    const Icon = getSubjectIcon(subject.code);
                    return (
                      <Link
                        key={subject.id}
                        href={`/exercises/${subject.code.toLowerCase()}`}
                        className="group"
                      >
                        <div className="w-full h-[200px] md:h-[220px] rounded-3xl flex flex-col justify-center items-center gap-4 md:gap-6 bg-white border-2 border-[#125093] shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-2 hover:border-[#0f4278] relative overflow-hidden group/card">
                          {/* Subtle background pattern */}
                          <div
                            className="absolute inset-0 opacity-[0.02] group-hover/card:opacity-[0.04] transition-opacity duration-300"
                            style={{
                              backgroundImage: `radial-gradient(circle at 2px 2px, #125093 1px, transparent 0)`,
                              backgroundSize: "24px 24px",
                            }}
                          ></div>

                          <div className="flex flex-col justify-center items-center gap-4 md:gap-6 relative z-10">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#125093] to-[#0f4278] rounded-2xl flex items-center justify-center group-hover:from-[#0f4278] group-hover:to-[#0a2d5a] transition-all duration-300 shadow-lg group-hover:shadow-xl group-hover:scale-110">
                              <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                            </div>
                            <div className="text-[#125093] text-3xl md:text-4xl lg:text-5xl font-bold leading-tight poppins-bold group-hover:text-[#0f4278] transition-colors duration-300">
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
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            currentPage === page
                              ? "bg-[#125093] text-white border-[#125093]"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Trang sau"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedSubjects.map((subject, index) => {
                    const Icon = getSubjectIcon(subject.code);
                    const color = getSubjectColor(subject.code, index);
                    return (
                      <Link
                        key={subject.id}
                        href={`/exercises/${subject.code.toLowerCase()}`}
                        className="group"
                      >
                        <div className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-md hover:shadow-xl border-2 border-[#125093] hover:border-[#0f4278] transition-all duration-300 hover:-translate-y-1">
                          <div
                            className="w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-110"
                            style={{ backgroundColor: color }}
                          >
                            <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-lg md:text-xl font-bold text-gray-900 poppins-bold group-hover:text-[#125093] transition-colors">
                              {subject.code}
                            </div>
                            {subject.name && (
                              <div className="text-sm md:text-base text-gray-600 arimo-regular truncate mt-0.5">
                                {subject.name}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#125093] to-[#0f4278] text-white flex items-center justify-center group-hover:from-[#0f4278] group-hover:to-[#0a2d5a] transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-110">
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
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg border transition-colors ${
                            currentPage === page
                              ? "bg-[#125093] text-white border-[#125093]"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Trang sau"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
