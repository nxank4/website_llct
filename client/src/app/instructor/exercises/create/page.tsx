"use client";

import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Question {
  id: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "essay";
  options: string[];
  correct_answer: string;
  points: number;
}

interface Course {
  id: number | string;
  title: string;
  [key: string]: unknown;
}

export default function CreateExercisePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    course_id: 1,
    type: "quiz" as "quiz" | "assignment" | "exam",
    time_limit: 0,
    max_attempts: 1,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/courses");
      if (response.ok) {
        const data = await response.json();
        const coursesList = Array.isArray(data) ? (data as Course[]) : [];
        setCourses(coursesList);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now(),
      question_text: "",
      question_type: "multiple_choice",
      options: ["", "", "", ""],
      correct_answer: "",
      points: 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (
    id: number,
    field: keyof Question,
    value: unknown
  ) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const addOption = (questionId: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ""] } : q
      )
    );
  };

  const updateOption = (
    questionId: number,
    optionIndex: number,
    value: string
  ) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, idx) =>
                idx === optionIndex ? value : opt
              ),
            }
          : q
      )
    );
  };

  const removeOption = (questionId: number, optionIndex: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.filter((_, idx) => idx !== optionIndex),
            }
          : q
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const exerciseData = {
        ...formData,
        questions: questions,
      };

      const response = await fetch("http://127.0.0.1:8000/api/v1/exercises", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exerciseData),
      });

      if (response.ok) {
        router.push("/instructor/exercises");
      } else {
        console.error("Error creating exercise");
      }
    } catch (error) {
      console.error("Error creating exercise:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRouteWrapper requiredRole="instructor">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tạo bài tập mới
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={addQuestion}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm câu hỏi</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Thông tin cơ bản
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Tên bài tập <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className="w-full dark:bg-gray-700 dark:text-white"
                    placeholder="Nhập tên bài tập"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Mô tả bài tập <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full dark:bg-gray-700 dark:text-white"
                    placeholder="Mô tả chi tiết về bài tập"
                  />
                </div>

                <div>
                  <label
                    htmlFor="course_id"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Khóa học <span className="text-red-500">*</span>
                  </label>
                  <Select
                    required
                    value={String(formData.course_id)}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        course_id: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn khóa học" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem
                          key={String(course.id)}
                          value={String(
                            typeof course.id === "number"
                              ? course.id
                              : parseInt(String(course.id), 10)
                          )}
                        >
                          {String(course.title ?? "")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Loại bài tập <span className="text-red-500">*</span>
                  </label>
                  <Select
                    required
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: value as "quiz" | "assignment" | "exam",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quiz">Trắc nghiệm</SelectItem>
                      <SelectItem value="assignment">Bài tập</SelectItem>
                      <SelectItem value="exam">Kiểm tra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="time_limit"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Thời gian làm bài (phút) <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                  </label>
                  <Input
                    type="number"
                    id="time_limit"
                    name="time_limit"
                    min="0"
                    value={formData.time_limit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        time_limit: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full dark:bg-gray-700 dark:text-white"
                    placeholder="0 (không giới hạn)"
                  />
                </div>

                <div>
                  <label
                    htmlFor="max_attempts"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Số lần làm tối đa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="max_attempts"
                    name="max_attempts"
                    min="1"
                    required
                    value={formData.max_attempts}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_attempts: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Câu hỏi
                </h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Thêm câu hỏi</span>
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Chưa có câu hỏi
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Thêm câu hỏi đầu tiên cho bài tập
                  </p>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Thêm câu hỏi
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          Câu hỏi {index + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nội dung câu hỏi <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={question.question_text}
                            onChange={(e) =>
                              updateQuestion(
                                question.id,
                                "question_text",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder="Nhập nội dung câu hỏi"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Loại câu hỏi <span className="text-red-500">*</span>
                            </label>
                            <Select
                              value={question.question_type}
                              onValueChange={(value) =>
                                updateQuestion(question.id, "question_type", value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple_choice">
                                  Trắc nghiệm
                                </SelectItem>
                                <SelectItem value="true_false">Đúng/Sai</SelectItem>
                                <SelectItem value="essay">Tự luận</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Điểm số <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={question.points}
                              onChange={(e) =>
                                updateQuestion(
                                  question.id,
                                  "points",
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Options for multiple choice */}
                        {question.question_type === "multiple_choice" && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Các lựa chọn <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => addOption(question.id)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                              >
                                Thêm lựa chọn
                              </button>
                            </div>
                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => (
                                <div
                                  key={optionIndex}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="radio"
                                    name={`correct_${question.id}`}
                                    value={option}
                                    checked={question.correct_answer === option}
                                    onChange={(e) =>
                                      updateQuestion(
                                        question.id,
                                        "correct_answer",
                                        e.target.value
                                      )
                                    }
                                    className="text-blue-600"
                                  />
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) =>
                                      updateOption(
                                        question.id,
                                        optionIndex,
                                        e.target.value
                                      )
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Lựa chọn ${optionIndex + 1}`}
                                  />
                                  {question.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeOption(question.id, optionIndex)
                                      }
                                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* True/False options */}
                        {question.question_type === "true_false" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Đáp án đúng <span className="text-red-500">*</span>
                            </label>
                            <div className="flex space-x-4">
                              <label className="flex items-center text-gray-700 dark:text-gray-300">
                                <input
                                  type="radio"
                                  name={`correct_${question.id}`}
                                  value="true"
                                  checked={question.correct_answer === "true"}
                                  onChange={(e) =>
                                    updateQuestion(
                                      question.id,
                                      "correct_answer",
                                      e.target.value
                                    )
                                  }
                                  className="text-blue-600 mr-2"
                                />
                                Đúng
                              </label>
                              <label className="flex items-center text-gray-700 dark:text-gray-300">
                                <input
                                  type="radio"
                                  name={`correct_${question.id}`}
                                  value="false"
                                  checked={question.correct_answer === "false"}
                                  onChange={(e) =>
                                    updateQuestion(
                                      question.id,
                                      "correct_answer",
                                      e.target.value
                                    )
                                  }
                                  className="text-blue-600 mr-2"
                                />
                                Sai
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Essay answer */}
                        {question.question_type === "essay" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Gợi ý đáp án <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                            </label>
                            <textarea
                              value={question.correct_answer}
                              onChange={(e) =>
                                updateQuestion(
                                  question.id,
                                  "correct_answer",
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={3}
                              placeholder="Nhập gợi ý đáp án (không bắt buộc)"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading || questions.length === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? "Đang tạo..." : "Tạo bài tập"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
