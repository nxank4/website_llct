"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthFetch } from "@/lib/auth";
import { getFullUrl } from "@/lib/api";
import ProtectedRouteWrapper from "@/components/auth/ProtectedRouteWrapper";
import Spinner from "@/components/ui/Spinner";
import {
  Search,
  GraduationCap,
  BookOpen,
  FileText,
  Play,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Grid3x3,
  List,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subject {
  id: number;
  code: string;
  name: string;
  description?: string;
  total_documents?: number;
  is_active?: boolean;
}

interface Chapter {
  number: number;
  title: string;
  lectures: Lecture[]; // Changed from documents to lectures
}

interface Lecture {
  id: number;
  title: string;
  description?: string;
  chapter_number?: number;
  chapter_title?: string;
  lesson_number?: number;
  lesson_title?: string;
  file_url?: string;
  file_type?: string;
  content_html?: string; // Rich text editor content
  is_published: boolean;
}

type SortOption = "title" | "chapter_number" | "material_type" | "created_at";
type SortOrder = "asc" | "desc";
type ViewMode = "grid" | "list";

export default function LibraryPage() {
  const authFetch = useAuthFetch();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("libraryViewMode");
      return saved === "grid" || saved === "list" ? saved : "grid";
    }
    return "grid";
  });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(
    new Set()
  );
  const [subjectDocumentCounts, setSubjectDocumentCounts] = useState<
    Map<number, number>
  >(new Map());

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Save view mode to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("libraryViewMode", viewMode);
    }
  }, [viewMode]);

  // Fetch subjects from API (public endpoint, no auth required)
  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      // Use public endpoint that doesn't require authentication
      const response = await fetch(
        getFullUrl("/api/v1/library/public/subjects/")
      );
      if (response.ok) {
        const data = await response.json();
        setSubjects(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch subjects:", response.status);
        setSubjects([]);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Fetch lectures and group by chapter when subject is selected
  const fetchSubjectDetails = useCallback(
    async (subject: Subject) => {
      setLoadingDetails(true);
      try {
        // Fetch lectures from materials table (requires auth)
        let lecturesData: Lecture[] = [];
        if (authFetch) {
          try {
            // Build query params for search and sort
            const params = new URLSearchParams({
              subject_id: subject.id.toString(),
              limit: "200",
            });

            // Add search query if provided
            if (debouncedSearchQuery.trim()) {
              params.append("q", debouncedSearchQuery.trim());
            }

            // Add sort params
            params.append("sortBy", sortBy);
            params.append("order", sortOrder);

            const lecturesUrl = getFullUrl(
              `/api/v1/lectures/?${params.toString()}`
            );
            const lecturesResponse = await authFetch(lecturesUrl);
            if (lecturesResponse.ok) {
              lecturesData = await lecturesResponse.json();
            }
          } catch (lectureError) {
            console.warn(
              "Failed to fetch lectures (auth required):",
              lectureError
            );
            // Continue without lectures
          }
        }

        // Group lectures by chapter (from materials table)
        const chapterMap = new Map<number, Chapter>();
        lecturesData.forEach((lecture) => {
          if (lecture.chapter_number && lecture.chapter_title) {
            if (!chapterMap.has(lecture.chapter_number)) {
              chapterMap.set(lecture.chapter_number, {
                number: lecture.chapter_number,
                title: lecture.chapter_title,
                lectures: [],
              });
            }
            chapterMap.get(lecture.chapter_number)!.lectures.push(lecture);
          }
        });

        // Convert to array and sort
        const chaptersArray = Array.from(chapterMap.values()).sort(
          (a, b) => a.number - b.number
        );

        // Filter published lectures (for display in Lectures section)
        const publishedLectures = lecturesData.filter(
          (lecture) => lecture.is_published
        );

        // Calculate total documents count (only lectures from materials table)
        const totalDocumentsCount = publishedLectures.length;

        setChapters(chaptersArray);
        setLectures(publishedLectures);

        // Update document count for this subject
        setSubjectDocumentCounts((prev) => {
          const newMap = new Map(prev);
          newMap.set(subject.id, totalDocumentsCount);
          return newMap;
        });
      } catch (error) {
        console.error("Error fetching subject details:", error);
        setChapters([]);
        setLectures([]);
      } finally {
        setLoadingDetails(false);
      }
    },
    [authFetch, debouncedSearchQuery, sortBy, sortOrder]
  );

  const handleSubjectClick = (subject: Subject) => {
    if (selectedSubject?.id === subject.id) {
      // If same subject clicked, close it
      setSelectedSubject(null);
      setChapters([]);
      setLectures([]);
      setSearchQuery(""); // Reset search when closing
    } else {
      // Open new subject
      setSelectedSubject(subject);
      setSearchQuery(""); // Reset search when opening new subject
      fetchSubjectDetails(subject);
    }
  };

  // Refetch when search, sort, or order changes (only if subject is selected)
  useEffect(() => {
    if (selectedSubject) {
      fetchSubjectDetails(selectedSubject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, sortBy, sortOrder, selectedSubject?.id]);

  const toggleChapter = (chapterNumber: number) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterNumber)) {
      newExpanded.delete(chapterNumber);
    } else {
      newExpanded.add(chapterNumber);
    }
    setExpandedChapters(newExpanded);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter subjects by search query
    // This is handled by filteredSubjects below
  };

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

  // Get icon and color for subject (based on code or name)
  const getSubjectStyle = (subject: Subject) => {
    const colors = [
      "bg-blue-900",
      "bg-blue-500",
      "bg-teal-500",
      "bg-cyan-400",
      "bg-purple-600",
      "bg-indigo-600",
      "bg-pink-500",
      "bg-orange-500",
    ];
    const icons = [
      GraduationCap,
      BookOpen,
      FileText,
      Play,
      GraduationCap,
      BookOpen,
      FileText,
      Play,
    ];
    const index = subject.id % colors.length;
    return {
      bgColor: colors[index],
      icon: icons[index],
    };
  };

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 py-12 xl:py-20 px-4 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 opacity-20 hidden lg:block">
            <BookOpen className="w-12 xl:w-16 h-12 xl:h-16 text-blue-300" />
          </div>
          <div className="absolute top-20 right-20 opacity-20 hidden lg:block">
            <div className="w-12 xl:w-16 h-12 xl:h-16 bg-white rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-2 gap-1">
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-blue-500 rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-blue-500 rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-blue-500 rounded"></div>
                <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-blue-500 rounded"></div>
              </div>
            </div>
          </div>

          {/* Floating Dots */}
          <div className="absolute top-32 left-1/4 w-2 xl:w-3 h-2 xl:h-3 bg-blue-400 rounded-full opacity-60 hidden md:block"></div>
          <div className="absolute top-40 right-1/3 w-1.5 xl:w-2 h-1.5 xl:h-2 bg-green-400 rounded-full opacity-60 hidden md:block"></div>
          <div className="absolute top-16 right-1/4 w-1.5 xl:w-2 h-1.5 xl:h-2 bg-purple-400 rounded-full opacity-60 hidden md:block"></div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-3xl xl:text-5xl font-bold text-white mb-4 xl:mb-6">
              Thư viện môn học
            </h1>
            <p className="text-base xl:text-xl text-white/90 mb-8 xl:mb-12 max-w-2xl mx-auto">
              Nơi giải đáp thắc mắc cho sinh viên về khái niệm và gợi ý tài liệu
              học tập.
            </p>

            {/* Search Bar */}
            {!selectedSubject && (
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                <div className="relative flex bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="flex items-center pl-3 xl:pl-4">
                    <Search className="w-5 h-5 xl:w-6 xl:h-6 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập từ khóa.... (Ví dụ: Hồ Chí Minh, Mác Lê - nin,.....)"
                    className="flex-1 px-3 xl:px-4 py-3 xl:py-4 text-sm xl:text-base text-gray-700 placeholder-gray-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-teal-500 hover:bg-teal-600 text-white px-6 xl:px-8 py-3 xl:py-4 text-sm xl:text-base font-medium transition-colors"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7.5xl mx-auto px-4 py-12 xl:py-16">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="xl" text="Đang tải danh sách môn học..." />
            </div>
          ) : selectedSubject ? (
            /* Subject Details View */
            <div className="space-y-6">
              {/* Back Button */}
              <button
                onClick={() => {
                  setSelectedSubject(null);
                  setChapters([]);
                  setLectures([]);
                  setExpandedChapters(new Set());
                }}
                className="flex items-center gap-2 text-[#125093] hover:text-[#0f4278] transition-colors mb-4"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Quay lại danh sách môn học</span>
              </button>

              {/* Subject Header */}
              <div className="bg-gradient-to-r from-[#125093] to-[#0f4278] rounded-xl shadow-lg p-6 xl:p-8 text-white">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl xl:text-3xl font-bold mb-2">
                      {selectedSubject.code} - {selectedSubject.name}
                    </h2>
                    {selectedSubject.description && (
                      <p className="text-white/90 text-sm xl:text-base">
                        {selectedSubject.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm xl:text-base">
                    {loadingDetails ? (
                      <div className="bg-white/20 rounded-lg px-4 py-2 flex items-center gap-2">
                        <Spinner size="sm" inline />
                        <span className="text-white/80">Đang tải...</span>
                      </div>
                    ) : (
                      (() => {
                        // Calculate total documents count (all library documents + all lectures)
                        // Use calculated count from state if available, otherwise calculate from current data
                        // Count actual documents, not chapters
                        const calculatedCount = subjectDocumentCounts.get(
                          selectedSubject.id
                        );
                        // If we have calculated count, use it (it's documents.length + lectures.length)
                        // Otherwise, count documents in chapters + documents without chapters + lectures
                        // Note: We need to count all documents, not just those in chapters
                        // So we use the calculated count from fetchSubjectDetails which uses documents.length
                        const totalCount = calculatedCount ?? 0;

                        return totalCount > 0 ? (
                          <div className="bg-white/20 rounded-lg px-4 py-2">
                            <span className="font-semibold">{totalCount}</span>{" "}
                            tài liệu
                          </div>
                        ) : null;
                      })()
                    )}
                  </div>
                </div>
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" text="Đang tải chi tiết môn học..." />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Search, Sort, and View Mode Controls */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 xl:p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                      {/* Search Bar */}
                      <div className="flex-1 w-full md:w-auto">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm kiếm tài liệu..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Sort Controls */}
                      <div className="flex items-center gap-3">
                        <Select
                          value={sortBy}
                          onValueChange={(value) =>
                            setSortBy(value as SortOption)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sắp xếp theo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="created_at">Ngày tạo</SelectItem>
                            <SelectItem value="title">Tiêu đề</SelectItem>
                            <SelectItem value="chapter_number">
                              Chương
                            </SelectItem>
                            <SelectItem value="material_type">
                              Loại tài liệu
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={sortOrder}
                          onValueChange={(value) =>
                            setSortOrder(value as SortOrder)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Thứ tự" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="desc">Giảm dần</SelectItem>
                            <SelectItem value="asc">Tăng dần</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                          <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded transition-colors ${
                              viewMode === "grid"
                                ? "bg-[#125093] text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                            title="Chế độ lưới"
                          >
                            <Grid3x3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded transition-colors ${
                              viewMode === "list"
                                ? "bg-[#125093] text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                            title="Chế độ danh sách"
                          >
                            <List className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chapters Section */}
                  {chapters.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 xl:p-8">
                      <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4 xl:mb-6 flex items-center gap-2">
                        <FileText className="w-6 h-6 xl:w-7 xl:h-7 text-[#125093]" />
                        Chương ({chapters.length})
                      </h3>
                      <div className="space-y-3">
                        {chapters.map((chapter) => {
                          const isExpanded = expandedChapters.has(
                            chapter.number
                          );
                          return (
                            <div
                              key={chapter.number}
                              className="border border-gray-200 rounded-lg overflow-hidden"
                            >
                              <button
                                onClick={() => toggleChapter(chapter.number)}
                                className="w-full flex items-center justify-between p-4 xl:p-5 bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-left">
                                    <h4 className="font-semibold text-gray-900 text-base xl:text-lg">
                                      Chương {chapter.number}: {chapter.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {chapter.lectures.length} tài liệu
                                    </p>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </button>
                              {isExpanded && (
                                <div className="p-4 xl:p-5 bg-white border-t border-gray-200">
                                  <div className="space-y-2">
                                    {chapter.lectures
                                      .filter((lecture) => lecture.is_published)
                                      .map((lecture) => (
                                        <a
                                          key={lecture.id}
                                          href={`/library/lectures/${lecture.id}`}
                                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                                        >
                                          <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#125093] transition-colors" />
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm xl:text-base truncate">
                                              {lecture.title}
                                            </p>
                                            {lecture.description && (
                                              <p className="text-xs xl:text-sm text-gray-600 line-clamp-1">
                                                {lecture.description}
                                              </p>
                                            )}
                                            {lecture.lesson_number && (
                                              <p className="text-xs text-gray-500 mt-1">
                                                Bài {lecture.lesson_number}
                                                {lecture.lesson_title &&
                                                  `: ${lecture.lesson_title}`}
                                              </p>
                                            )}
                                          </div>
                                          {lecture.file_type && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                              {lecture.file_type.toUpperCase()}
                                            </span>
                                          )}
                                        </a>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lectures Section - Only show lectures without chapters */}
                  {lectures.filter((lecture) => !lecture.chapter_number)
                    .length > 0 && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 xl:p-8">
                      <h3 className="text-xl xl:text-2xl font-bold text-gray-900 mb-4 xl:mb-6 flex items-center gap-2">
                        <Play className="w-6 h-6 xl:w-7 xl:h-7 text-[#125093]" />
                        Tài liệu (
                        {
                          lectures.filter((lecture) => !lecture.chapter_number)
                            .length
                        }
                        )
                      </h3>
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6">
                          {lectures
                            .filter((lecture) => !lecture.chapter_number)
                            .map((lecture) => (
                              <div
                                key={lecture.id}
                                className="border border-gray-200 rounded-lg p-4 xl:p-5 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-sm xl:text-base mb-1 line-clamp-2">
                                      {lecture.title}
                                    </h4>
                                    {lecture.lesson_number && (
                                      <p className="text-xs xl:text-sm text-gray-500 mt-1">
                                        Bài {lecture.lesson_number}
                                        {lecture.lesson_title &&
                                          `: ${lecture.lesson_title}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {lecture.description && (
                                  <p className="text-xs xl:text-sm text-gray-600 mb-3 line-clamp-2">
                                    {lecture.description}
                                  </p>
                                )}
                                <a
                                  href={`/library/lectures/${lecture.id}`}
                                  className="inline-flex items-center gap-2 text-[#125093] hover:text-[#0f4278] text-sm xl:text-base font-medium transition-colors"
                                >
                                  <Play className="w-4 h-4" />
                                  Xem tài liệu
                                </a>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {lectures
                            .filter((lecture) => !lecture.chapter_number)
                            .map((lecture) => (
                              <a
                                key={lecture.id}
                                href={`/library/lectures/${lecture.id}`}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group border border-gray-200"
                              >
                                <FileText className="w-5 h-5 text-gray-400 group-hover:text-[#125093] transition-colors" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 text-sm xl:text-base truncate">
                                    {lecture.title}
                                  </p>
                                  {lecture.description && (
                                    <p className="text-xs xl:text-sm text-gray-600 line-clamp-1">
                                      {lecture.description}
                                    </p>
                                  )}
                                  {lecture.lesson_number && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Bài {lecture.lesson_number}
                                      {lecture.lesson_title &&
                                        `: ${lecture.lesson_title}`}
                                    </p>
                                  )}
                                </div>
                                {lecture.file_type && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                    {lecture.file_type.toUpperCase()}
                                  </span>
                                )}
                              </a>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {chapters.length === 0 &&
                    lectures.filter((lecture) => !lecture.chapter_number)
                      .length === 0 && (
                      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg xl:text-xl font-semibold text-gray-900 mb-2">
                          Chưa có nội dung
                        </h3>
                        <p className="text-gray-600 text-sm xl:text-base">
                          Môn học này chưa có chương hoặc tài liệu nào.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          ) : (
            /* Subjects List View */
            <>
              <h2 className="text-2xl xl:text-3xl font-bold text-gray-900 mb-8 xl:mb-12">
                {filteredSubjects.length > 0
                  ? "Khám phá thư viện giáo trình đầy đủ"
                  : "Không tìm thấy môn học"}
              </h2>

              {filteredSubjects.length === 0 && !loading ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg xl:text-xl font-semibold text-gray-900 mb-2">
                    Không tìm thấy môn học
                  </h3>
                  <p className="text-gray-600 text-sm xl:text-base mb-4">
                    Không có môn học nào khớp với từ khóa &quot;{searchQuery}
                    &quot;
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[#125093] hover:text-[#0f4278] font-medium"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
                  {filteredSubjects.map((subject) => {
                    const { bgColor, icon: IconComponent } =
                      getSubjectStyle(subject);
                    return (
                      <button
                        key={subject.id}
                        onClick={() => handleSubjectClick(subject)}
                        className={`${bgColor} rounded-lg p-6 xl:p-8 text-center text-white cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl block w-full`}
                      >
                        <div className="flex justify-center mb-4 xl:mb-6">
                          <IconComponent className="w-12 h-12 xl:w-16 xl:h-16" />
                        </div>
                        <h3 className="text-xl xl:text-2xl font-bold mb-2">
                          {subject.code}
                        </h3>
                        <p className="text-white/80 text-xs xl:text-sm mb-3">
                          {subject.name}
                        </p>
                        {loading ? (
                          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-center gap-2">
                            <Spinner size="sm" inline />
                            <p className="text-xs xl:text-sm text-white/70">
                              Đang tải...
                            </p>
                          </div>
                        ) : (
                          (() => {
                            // Use calculated count if available, otherwise use total_documents from API
                            const documentCount =
                              subjectDocumentCounts.get(subject.id) ??
                              subject.total_documents ??
                              0;
                            return documentCount > 0 ? (
                              <div className="mt-4 pt-4 border-t border-white/20">
                                <p className="text-xs xl:text-sm text-white/70">
                                  {documentCount} tài liệu
                                </p>
                              </div>
                            ) : null;
                          })()
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
