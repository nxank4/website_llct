"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Play,
  FileText,
  MessageSquare,
  Download,
  Clock,
  Users,
  Star,
  Search,
  Grid,
  List,
  ChevronDown,
  Share2,
  Bookmark,
  TrendingUp,
} from "lucide-react";
import { useAuthFetch } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Course {
  id: number | string;
  title: string;
  subject: string;
  subjectName?: string;
  description: string;
  materials: number;
  videos: number;
  quizzes: number;
  students: number;
  rating: number;
  duration?: string;
  instructor: string;
  lastUpdated: string;
  price?: number;
  level?: string;
  thumbnail?: string;
  isEnrolled?: boolean;
  progress?: number;
  [key: string]: unknown;
}

export default function CoursesPage() {
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const authFetch = useAuthFetch();

  const subjects = [
    { id: "all", name: "Tất cả môn học", color: "bg-gray-500", count: 156 },
    { id: "math", name: "Toán học", color: "bg-blue-500", count: 45 },
    { id: "physics", name: "Vật lý", color: "bg-green-500", count: 32 },
    { id: "chemistry", name: "Hóa học", color: "bg-purple-500", count: 28 },
    { id: "biology", name: "Sinh học", color: "bg-red-500", count: 25 },
    { id: "english", name: "Tiếng Anh", color: "bg-yellow-500", count: 26 },
  ];

  const mockCourses = useMemo(
    () => [
      {
        id: 1,
        title: "Đại số tuyến tính",
        subject: "math",
        subjectName: "Toán học",
        description:
          "Khóa học về ma trận, định thức và không gian vector. Phù hợp cho sinh viên năm nhất.",
        materials: 25,
        videos: 12,
        quizzes: 8,
        students: 150,
        rating: 4.8,
        duration: "8 tuần",
        instructor: "TS. Nguyễn Văn A",
        lastUpdated: "2 ngày trước",
        price: 0,
        level: "Cơ bản",
        thumbnail: "/api/placeholder/300/200",
        isEnrolled: true,
        progress: 75,
      },
      {
        id: 2,
        title: "Cơ học lượng tử",
        subject: "physics",
        subjectName: "Vật lý",
        description:
          "Nguyên lý cơ bản của cơ học lượng tử và ứng dụng trong vật lý hiện đại.",
        materials: 30,
        videos: 15,
        quizzes: 10,
        students: 120,
        rating: 4.9,
        duration: "10 tuần",
        instructor: "PGS.TS. Trần Thị B",
        lastUpdated: "1 ngày trước",
        price: 0,
        level: "Nâng cao",
        thumbnail: "/api/placeholder/300/200",
        isEnrolled: false,
        progress: 0,
      },
      {
        id: 3,
        title: "Hóa học hữu cơ",
        subject: "chemistry",
        subjectName: "Hóa học",
        description:
          "Cấu trúc và phản ứng của các hợp chất hữu cơ trong hóa học.",
        materials: 28,
        videos: 18,
        quizzes: 12,
        students: 180,
        rating: 4.7,
        duration: "12 tuần",
        instructor: "TS. Lê Văn C",
        lastUpdated: "3 ngày trước",
        price: 0,
        level: "Trung bình",
        thumbnail: "/api/placeholder/300/200",
        isEnrolled: true,
        progress: 30,
      },
      {
        id: 4,
        title: "Sinh học phân tử",
        subject: "biology",
        subjectName: "Sinh học",
        description:
          "Nghiên cứu về cấu trúc và chức năng của các phân tử sinh học.",
        materials: 22,
        videos: 14,
        quizzes: 6,
        students: 95,
        rating: 4.6,
        duration: "9 tuần",
        instructor: "TS. Phạm Thị D",
        lastUpdated: "5 ngày trước",
        price: 0,
        level: "Trung bình",
        thumbnail: "/api/placeholder/300/200",
        isEnrolled: false,
        progress: 0,
      },
      {
        id: 5,
        title: "Tiếng Anh chuyên ngành",
        subject: "english",
        subjectName: "Tiếng Anh",
        description:
          "Phát triển kỹ năng tiếng Anh chuyên ngành cho sinh viên kỹ thuật.",
        materials: 20,
        videos: 16,
        quizzes: 8,
        students: 200,
        rating: 4.5,
        duration: "6 tuần",
        instructor: "ThS. Hoàng Văn E",
        lastUpdated: "1 tuần trước",
        price: 0,
        level: "Cơ bản",
        thumbnail: "/api/placeholder/300/200",
        isEnrolled: true,
        progress: 90,
      },
      {
        id: 6,
        title: "Giải tích hàm",
        subject: "math",
        subjectName: "Toán học",
        description:
          "Khóa học nâng cao về giải tích hàm và ứng dụng trong toán học.",
        materials: 35,
        videos: 20,
        quizzes: 15,
        students: 80,
        rating: 4.9,
        duration: "14 tuần",
        instructor: "PGS.TS. Vũ Thị F",
        lastUpdated: "4 ngày trước",
        price: 0,
        level: "Nâng cao",
        thumbnail: "/api/placeholder/300/200",
        isEnrolled: false,
        progress: 0,
      },
    ],
    []
  );

  const fetchCourses = useCallback(async () => {
    try {
      const res = await authFetch("http://127.0.0.1:8000/api/v1/courses");
      if (res.ok) {
        const data = await res.json();
        // Ensure data is an array and cast to Course[]
        const coursesData = Array.isArray(data)
          ? (data as Course[])
          : mockCourses;
        setCourses(coursesData);
      } else {
        setCourses(mockCourses);
      }
    } catch {
      setCourses(mockCourses);
    } finally {
      setLoading(false);
    }
  }, [authFetch, mockCourses]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = courses.filter((course) => {
    const matchesSubject =
      selectedSubject === "all" || course.subject === selectedSubject;
    const title = String(course.title ?? "");
    const description = String(course.description ?? "");
    const instructor = String(course.instructor ?? "");
    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (
          new Date(String(b.lastUpdated ?? "")).getTime() -
          new Date(String(a.lastUpdated ?? "")).getTime()
        );
      case "oldest":
        return (
          new Date(String(a.lastUpdated ?? "")).getTime() -
          new Date(String(b.lastUpdated ?? "")).getTime()
        );
      case "rating":
        return (
          (typeof b.rating === "number" ? b.rating : 0) -
          (typeof a.rating === "number" ? a.rating : 0)
        );
      case "students":
        return (
          (typeof b.students === "number" ? b.students : 0) -
          (typeof a.students === "number" ? a.students : 0)
        );
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 xl:py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white">
                Khóa học
              </h1>
              <p className="text-sm xl:text-base text-gray-600 dark:text-gray-400 mt-1 xl:mt-2">
                Khám phá và học tập với {courses.length} khóa học chất lượng
              </p>
            </div>

            <div className="flex items-center space-x-3 xl:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 xl:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 xl:h-5 xl:w-5 text-gray-400 z-10" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 xl:pl-10 pr-3 xl:pr-4 text-sm xl:text-base dark:bg-gray-700 dark:text-white w-48 xl:w-64"
                />
              </div>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 xl:px-4 py-1.5 xl:py-2 text-sm xl:text-base text-gray-900 dark:text-white w-[160px] xl:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="oldest">Cũ nhất</SelectItem>
                  <SelectItem value="rating">Đánh giá cao</SelectItem>
                  <SelectItem value="students">Nhiều học viên</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 xl:p-2 ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <Grid className="h-3 w-3 xl:h-4 xl:w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 xl:p-2 ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <List className="h-3 w-3 xl:h-4 xl:w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 xl:py-8">
        {/* Subject Filter */}
        <div className="mb-6 xl:mb-8">
          <h2 className="text-base xl:text-lg font-semibold text-gray-900 dark:text-white mb-3 xl:mb-4">
            Lọc theo môn học
          </h2>
          <div className="flex flex-wrap gap-2 xl:gap-3">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`px-3 xl:px-4 py-1.5 xl:py-2 rounded-full text-xs xl:text-sm font-medium transition-colors flex items-center space-x-1.5 xl:space-x-2 ${
                  selectedSubject === subject.id
                    ? `${subject.color} text-white`
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                <span>{subject.name}</span>
                <span
                  className={`px-1.5 xl:px-2 py-0.5 xl:py-1 rounded-full text-xs ${
                    selectedSubject === subject.id
                      ? "bg-white bg-opacity-20"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  {subject.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Hiển thị {sortedCourses.length} trong {courses.length} khóa học
          </p>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Khóa học phổ biến
            </span>
          </div>
        </div>

        {/* Courses Grid/List */}
        {loading ? (
          <div
            className={`grid gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1"
            }`}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden animate-pulse"
              >
                <div className="h-48 bg-gray-200 dark:bg-gray-700"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1"
            }`}
          >
            {sortedCourses.map((course) => (
              <div
                key={course.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow ${
                  viewMode === "list" ? "flex" : ""
                }`}
              >
                {viewMode === "grid" ? (
                  <>
                    <div className="relative">
                      <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <BookOpen className="h-16 w-16 text-gray-400" />
                      </div>
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                            subjects.find((s) => s.id === course.subject)
                              ?.color || "bg-gray-500"
                          }`}
                        >
                          {String(course.subjectName ?? course.subject ?? "")}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <button className="p-2 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-colors">
                          <Bookmark className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="ml-1 text-sm font-medium">
                            {typeof course.rating === "number"
                              ? course.rating
                              : 0}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {String(course.level ?? "")}
                        </span>
                      </div>

                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 text-sm">
                        {course.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          {typeof course.materials === "number"
                            ? course.materials
                            : 0}{" "}
                          tài liệu
                        </div>
                        <div className="flex items-center">
                          <Play className="h-4 w-4 mr-2" />
                          {typeof course.videos === "number"
                            ? course.videos
                            : 0}{" "}
                          video
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {typeof course.quizzes === "number"
                            ? course.quizzes
                            : 0}{" "}
                          quiz
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          {typeof course.students === "number"
                            ? course.students
                            : 0}{" "}
                          học viên
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {String(course.duration ?? "")}
                        </div>
                        <span>Cập nhật {String(course.lastUpdated ?? "")}</span>
                      </div>

                      <div className="space-y-3">
                        <Link
                          href={`/courses/${course.id}`}
                          className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
                        >
                          {course.isEnrolled ? "Tiếp tục học" : "Xem chi tiết"}
                        </Link>
                        <div className="flex space-x-2">
                          <button className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
                            <Download className="h-4 w-4 mr-2" />
                            Tài liệu
                          </button>
                          <button className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Diễn đàn
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-48 h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-gray-400" />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                                subjects.find((s) => s.id === course.subject)
                                  ?.color || "bg-gray-500"
                              }`}
                            >
                              {String(
                                course.subjectName ?? course.subject ?? ""
                              )}
                            </span>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="ml-1 text-sm font-medium">
                                {typeof course.rating === "number"
                                  ? course.rating
                                  : 0}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {String(course.level ?? "")}
                            </span>
                          </div>

                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            {course.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-3 text-sm">
                            {course.description}
                          </p>

                          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-3">
                            <span className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {typeof course.materials === "number"
                                ? course.materials
                                : 0}{" "}
                              tài liệu
                            </span>
                            <span className="flex items-center">
                              <Play className="h-4 w-4 mr-1" />
                              {typeof course.videos === "number"
                                ? course.videos
                                : 0}{" "}
                              video
                            </span>
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {typeof course.students === "number"
                                ? course.students
                                : 0}{" "}
                              học viên
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {String(course.duration ?? "")}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Link
                            href={`/courses/${course.id}`}
                            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                          >
                            {course.isEnrolled
                              ? "Tiếp tục học"
                              : "Xem chi tiết"}
                          </Link>
                          <div className="flex space-x-2">
                            <button className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                            <button className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <Share2 className="h-4 w-4" />
                            </button>
                            <button className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <Bookmark className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && sortedCourses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Không tìm thấy khóa học
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
