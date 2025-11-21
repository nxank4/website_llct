"use client";

import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import Spinner from "@/components/ui/Spinner";
import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Edit,
  Eye,
  Trash2,
  Clock,
  Users,
  Search,
  Filter,
  Play,
  BarChart3,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Exercise {
  id: number;
  title: string;
  description: string;
  course_id: number;
  course_title: string;
  type: "quiz" | "assignment" | "exam";
  time_limit?: number;
  max_attempts: number;
  is_published: boolean;
  questions_count: number;
  created_at: string;
}

export default function InstructorExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/exercises");
      if (response.ok) {
        const data = await response.json();
        // Add mock course titles and questions count
        const exercisesWithDetails = data.map(
          (exercise: Record<string, unknown>) => ({
            ...exercise,
            course_title: `Khóa học ${exercise.course_id}`,
            questions_count: Math.floor(Math.random() * 10) + 5,
          })
        );
        setExercises(exercisesWithDetails);
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || exercise.type === filterType;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && exercise.is_published) ||
      (filterStatus === "draft" && !exercise.is_published);
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "quiz":
        return "Trắc nghiệm";
      case "assignment":
        return "Bài tập";
      case "exam":
        return "Kiểm tra";
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "quiz":
        return "bg-blue-100 text-blue-800";
      case "assignment":
        return "bg-green-100 text-green-800";
      case "exam":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <ProtectedRouteWrapper requiredRole="instructor">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Quản lý bài tập
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Tạo và quản lý bài tập, kiểm tra cho sinh viên
                </p>
              </div>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Tạo bài tập mới</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tổng bài tập
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {exercises.length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Trắc nghiệm
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {exercises.filter((e) => e.type === "quiz").length}
                  </p>
                </div>
                <Play className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Bài tập
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {exercises.filter((e) => e.type === "assignment").length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Kiểm tra
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {exercises.filter((e) => e.type === "exam").length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài tập..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả loại</SelectItem>
                      <SelectItem value="quiz">Trắc nghiệm</SelectItem>
                      <SelectItem value="assignment">Bài tập</SelectItem>
                      <SelectItem value="exam">Kiểm tra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="published">Đã xuất bản</SelectItem>
                    <SelectItem value="draft">Bản nháp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Exercises List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Danh sách bài tập
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-transparent dark:border dark:border-white/40 rounded-lg flex items-center justify-center text-gray-400 dark:text-white">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {exercise.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                              exercise.type
                            )} dark:bg-opacity-80`}
                          >
                            {getTypeLabel(exercise.type)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              exercise.is_published
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                            }`}
                          >
                            {exercise.is_published ? "Đã xuất bản" : "Bản nháp"}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {exercise.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" />
                            <span>{exercise.course_title}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FileText className="h-4 w-4" />
                            <span>{exercise.questions_count} câu hỏi</span>
                          </div>
                          {exercise.time_limit && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{exercise.time_limit} phút</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>Tối đa {exercise.max_attempts} lần làm</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredExercises.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Không có bài tập
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm || filterType !== "all" || filterStatus !== "all"
                    ? "Không tìm thấy bài tập phù hợp với bộ lọc"
                    : "Bắt đầu tạo bài tập đầu tiên của bạn"}
                </p>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Tạo bài tập mới
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
