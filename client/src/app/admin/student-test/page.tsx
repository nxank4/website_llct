"use client";


import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import {
  Users,
  BookOpen,
  FileText,
  BarChart3,
  Brain,
  MessageSquare,
  Pencil,
  Plus,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function AdminTestsPage() {
  const { authFetch, isAuthenticated, hasRole, isLoading } = useAuth();
  const [assessments, setAssessments] = useState<Record<string, unknown>[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    string | null
  >(null);
  const [questions, setQuestions] = useState<Record<string, unknown>[]>([]);
  const [isTaking, setIsTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<null | { correct: number; total: number }>(
    null
  );
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState<{
    question_text: string;
    options: string;
    correct_answer: string;
    explanation?: string;
  }>({ question_text: "", options: "", correct_answer: "" });
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    question_type: "multiple_choice",
    options: "",
    correct_answer: "",
    explanation: "",
  });

  // Timer and attempts state
  const [timeLimit, setTimeLimit] = useState<number>(30); // minutes
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(0); // seconds
  const [currentAttempt, setCurrentAttempt] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Single question mode state
  const [singleQuestionMode, setSingleQuestionMode] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subject selection for publishing
  const [selectedSubject, setSelectedSubject] = useState<{
    code: string;
    name: string;
  }>({ code: "", name: "" });
  const subjects = [
    { code: "MLN111", name: "Triết học Mác - Lê-nin" },
    { code: "MLN122", name: "Kinh tế chính trị Mác - Lê-nin" },
    { code: "MLN131", name: "Chủ nghĩa xã hội khoa học" },
    { code: "HCM202", name: "Tư tưởng Hồ Chí Minh" },
    { code: "VNR202", name: "Lịch sử Đảng Cộng sản Việt Nam" },
  ];

  // View mode state
  const [viewMode, setViewMode] = useState<"overview" | "edit">("overview");
  const [publishedAssessments, setPublishedAssessments] = useState<
    Record<string, unknown>[]
  >([]);

  // Load assessments
  const fetchAssessments = useCallback(async () => {
    try {
      const res = await authFetch(getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENTS));
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as Record<string, unknown>)?.items)
        ? ((data as Record<string, unknown>).items as Record<string, unknown>[])
        : [];
      if (!Array.isArray(data)) {
        console.warn("Unexpected assessments response shape", data);
      }
      setAssessments(list);

      // Separate published assessments for overview
      const published = list.filter(
        (a: Record<string, unknown>) => a.is_published
      );
      setPublishedAssessments(published);

      if (list?.length) setSelectedAssessmentId(list[0]._id);
    } catch (e) {
      console.error("Failed to load assessments", e);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Load questions when assessment changes
  const fetchQuestions = useCallback(async () => {
    if (!selectedAssessmentId) return;
    try {
      const res = await authFetch(
        getFullUrl(
          API_ENDPOINTS.MONGO_ASSESSMENT_QUESTIONS(String(selectedAssessmentId))
        )
      );
      const data = await res.json();
      setQuestions(data);
    } catch (e) {
      console.error("Failed to load questions", e);
    }
  }, [selectedAssessmentId, authFetch]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Load attempts from localStorage
  useEffect(() => {
    if (selectedAssessmentId) {
      const attempts = localStorage.getItem(`attempts_${selectedAssessmentId}`);
      setCurrentAttempt(attempts ? parseInt(attempts) : 0);
    }
  }, [selectedAssessmentId]);

  const submitTaking = useCallback(() => {
    setIsTimerActive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const total = questions.length;
    let correct = 0;
    for (const q of questions) {
      const qId = String(q._id ?? q.id ?? "");
      const correctAnswer = String(q.correct_answer ?? "").trim();
      const userAnswer = (answers[qId] ?? "").trim();
      if (userAnswer === correctAnswer) correct += 1;
    }
    setScore({ correct, total });
    setIsTaking(false);
  }, [questions, answers]);

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isTimerActive && timeLeft === 0) {
      // Auto submit when time runs out
      submitTaking();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timeLeft, submitTaking]);

  const handleAddQuestion = async () => {
    if (!selectedAssessmentId) return;
    try {
      const payload: Record<string, unknown> = {
        question_text: newQuestion.question_text,
        question_type: newQuestion.question_type,
        correct_answer: newQuestion.correct_answer,
        explanation: newQuestion.explanation || undefined,
      };
      if (newQuestion.options.trim()) {
        payload.options = newQuestion.options
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      const res = await authFetch(
        getFullUrl(
          API_ENDPOINTS.MONGO_ASSESSMENT_QUESTIONS(String(selectedAssessmentId))
        ),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Failed to add question");
      setNewQuestion({
        question_text: "",
        question_type: "multiple_choice",
        options: "",
        correct_answer: "",
        explanation: "",
      });
      // reload
      const data = await res.json();
      setQuestions((prev) => [...prev, data]);
    } catch (e) {
      console.error(e);
      alert("Không thêm được câu hỏi");
    }
  };

  const startTaking = () => {
    if (currentAttempt >= maxAttempts) {
      alert(`Bạn đã hết lượt làm bài (${maxAttempts} lần)`);
      return;
    }

    setIsTaking(true);
    setAnswers({});
    setScore(null);
    setCurrentQuestionIndex(0);

    // Start timer
    setTimeLeft(timeLimit * 60); // convert minutes to seconds
    setIsTimerActive(true);

    // Increment attempt count
    const newAttempt = currentAttempt + 1;
    setCurrentAttempt(newAttempt);
    if (selectedAssessmentId) {
      localStorage.setItem(
        `attempts_${selectedAssessmentId}`,
        newAttempt.toString()
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const exportQuestions = () => {
    if (questions.length === 0) {
      alert("Không có câu hỏi để xuất");
      return;
    }

    const dataStr = JSON.stringify(questions, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `questions_${selectedAssessmentId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importQuestions = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAssessmentId) return;

    try {
      const text = await file.text();
      const importedQuestions = JSON.parse(text);

      if (!Array.isArray(importedQuestions)) {
        alert("File JSON không đúng định dạng");
        return;
      }

      // Add each question via API
      for (const q of importedQuestions) {
        const payload: Record<string, unknown> = {
          question_text: q.question_text,
          question_type: q.question_type || "multiple_choice",
          correct_answer: q.correct_answer,
          explanation: q.explanation || undefined,
        };
        if (q.options && Array.isArray(q.options)) {
          payload.options = q.options;
        }

        await authFetch(
          getFullUrl(
            API_ENDPOINTS.MONGO_ASSESSMENT_QUESTIONS(
              String(selectedAssessmentId)
            )
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      }

      // Reload questions
      const res = await authFetch(
        getFullUrl(
          API_ENDPOINTS.MONGO_ASSESSMENT_QUESTIONS(String(selectedAssessmentId))
        )
      );
      const data = await res.json();
      setQuestions(data);

      alert(`Đã import ${importedQuestions.length} câu hỏi`);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi import câu hỏi");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const publishAssessment = async () => {
    if (!selectedAssessmentId || !selectedSubject.code) {
      alert("Vui lòng chọn môn học trước khi đăng bài");
      return;
    }

    if (questions.length === 0) {
      alert("Bài kiểm tra phải có ít nhất 1 câu hỏi");
      return;
    }

    try {
      const res = await authFetch(
        getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENT_UPDATE(selectedAssessmentId)),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            is_published: true,
            subject_code: selectedSubject.code,
            subject_name: selectedSubject.name,
            time_limit_minutes: timeLimit,
            max_attempts: maxAttempts,
          }),
        }
      );
      if (!res.ok) throw new Error("publish failed");
      const updated = await res.json();
      setAssessments((prev) =>
        prev.map((a) => (a._id === updated._id ? updated : a))
      );
      setPublishedAssessments((prev) => [
        ...prev.filter((a) => a._id !== updated._id),
        updated,
      ]);
      alert("Đã đăng bài kiểm tra thành công!");
    } catch (e) {
      console.error(e);
      alert("Đăng bài thất bại");
    }
  };

  const enterEditMode = (assessmentId: string) => {
    setSelectedAssessmentId(assessmentId);
    setViewMode("edit");
  };

  const exitEditMode = () => {
    setViewMode("overview");
    setSelectedAssessmentId(null);
  };

  const renameAssessment = async () => {
    if (!selectedAssessmentId) return;
    try {
      const res = await authFetch(
        getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENT_UPDATE(selectedAssessmentId)),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editingTitle }),
        }
      );
      if (!res.ok) throw new Error("rename failed");
      const updated = await res.json();
      setAssessments((prev) =>
        prev.map((a) => (a._id === updated._id ? updated : a))
      );
    } catch {
      alert("Đổi tên thất bại");
    }
  };

  const deleteAssessment = async () => {
    if (!selectedAssessmentId) return;
    if (!confirm("Xóa đề này?")) return;
    try {
      const res = await authFetch(
        getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENT_DELETE(selectedAssessmentId)),
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("delete failed");
      setAssessments((prev) =>
        prev.filter((a) => a._id !== selectedAssessmentId)
      );
      setSelectedAssessmentId(null);
      setQuestions([]);
    } catch {
      alert("Xóa đề thất bại");
    }
  };

  const beginEditQuestion = (idx: number) => {
    setEditingIndex(idx);
    const q = questions[idx];
    setEditQuestion({
      question_text: String(q.question_text ?? ""),
      options: Array.isArray(q.options)
        ? q.options.map((o: unknown) => String(o)).join("\n")
        : "",
      correct_answer: String(q.correct_answer ?? ""),
      explanation: String(q.explanation ?? ""),
    });
  };

  const saveQuestion = async (idx: number) => {
    if (!selectedAssessmentId) return;
    try {
      const payload: Record<string, unknown> = {
        question_text: editQuestion.question_text,
        correct_answer: editQuestion.correct_answer,
        explanation: editQuestion.explanation || undefined,
        options: editQuestion.options.trim()
          ? editQuestion.options
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };
      const res = await authFetch(
        getFullUrl(
          API_ENDPOINTS.MONGO_QUESTION_UPDATE(selectedAssessmentId, idx)
        ),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("update question failed");
      const updated = await res.json();
      setQuestions((prev) =>
        prev.map((q, i) => (i === idx ? { ...q, ...updated } : q))
      );
      setEditingIndex(null);
    } catch {
      alert("Sửa câu hỏi thất bại");
    }
  };

  const removeQuestion = async (idx: number) => {
    if (!selectedAssessmentId) return;
    if (!confirm("Xóa câu hỏi này?")) return;
    try {
      const res = await authFetch(
        getFullUrl(
          API_ENDPOINTS.MONGO_QUESTION_DELETE(selectedAssessmentId, idx)
        ),
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("delete question failed");
      setQuestions((prev) => prev.filter((_, i) => i !== idx));
    } catch {
      alert("Xóa câu hỏi thất bại");
    }
  };

  const sidebarItems = [
    {
      id: "dashboard",
      label: "Bảng tổng kết",
      icon: BarChart3,
      color: "#125093",
      href: "/admin/dashboard",
    },
    {
      id: "ai-data",
      label: "Dữ liệu AI",
      icon: Brain,
      color: "#00CBB8",
      href: "/admin/ai-data",
    },
    {
      id: "library",
      label: "Thư viện môn học",
      icon: BookOpen,
      color: "#5B72EE",
      href: "/admin/library",
    },
    {
      id: "products",
      label: "Sản phẩm học tập",
      icon: FileText,
      color: "#F48C06",
      href: "/admin/products",
    },
    {
      id: "tests",
      label: "Bài kiểm tra",
      icon: FileText,
      color: "#29B9E7",
      href: "/admin/tests",
      active: true,
    },
    {
      id: "news",
      label: "Tin tức",
      icon: MessageSquare,
      color: "#00CBB8",
      href: "/admin/news",
    },
    {
      id: "members",
      label: "Thành viên",
      icon: Users,
      color: "#8B5CF6",
      href: "/admin/members",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !hasRole("admin")) {
    return null;
  }

  return (
    <ProtectedRouteWrapper requiredRoles={["admin", "instructor"]}>
      <div className="min-h-screen bg-white flex" suppressHydrationWarning>
        {/* Sidebar (match dashboard style) */}
        <div className="w-56 bg-white p-4 border-r border-gray-100">
          {/* Logo */}
          <div className="mb-6">
            <Image
              src="https://placehold.co/192x192"
              alt="Logo"
              width={128}
              height={128}
              className="w-24 h-24 md:w-32 md:h-32 mb-6"
            />
          </div>

          {/* Sidebar Menu */}
          <div className="space-y-8">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-4 hover:opacity-90"
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded"
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div
                    className={`flex-1 text-sm md:text-base ${
                      isActive
                        ? "font-bold text-gray-900"
                        : "font-medium text-gray-800"
                    }`}
                  >
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white">
          {/* Header (match dashboard style) */}
          <div className="flex items-center gap-6 md:gap-8 p-4 md:p-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="mb-1">
                <span className="text-gray-900 text-base md:text-lg">
                  Chào mừng,{" "}
                </span>
                <span className="text-[#125093] text-xl md:text-2xl font-bold">
                  Nguyễn Văn Bình
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-gray-900 text-base md:text-lg font-semibold">
                  Quản trị viên
                </div>
                <Pencil className="w-5 h-5 md:w-6 md:h-6 text-[#1A1A1A]" />
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 p-4 md:p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Bài kiểm tra
              </h2>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    key="overview-btn"
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "overview"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setViewMode("overview")}
                  >
                    📊 Tổng quan
                  </button>
                  <button
                    key="edit-btn"
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "edit"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setViewMode("edit")}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                </div>

                {viewMode === "edit" && (
                  <>
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm flex items-center gap-2"
                      onClick={async () => {
                        try {
                          const res = await authFetch(
                            getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENTS),
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                title: "Đề mới",
                                description: "",
                              }),
                            }
                          );
                          const data = await res.json();
                          setAssessments((prev: Record<string, unknown>[]) => [
                            data,
                            ...prev,
                          ]);
                          setSelectedAssessmentId(data._id);
                        } catch {
                          alert("Tạo đề thất bại");
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Tạo đề mới
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main Content Area */}
            {viewMode === "overview" ? (
              /* Overview Mode - Show published assessments by subject */
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Bài kiểm tra đã đăng
                  </h3>

                  {publishedAssessments.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Chưa có bài kiểm tra nào được đăng
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Tạo và đăng bài kiểm tra đầu tiên của bạn
                      </p>
                      <button
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        onClick={() => setViewMode("edit")}
                      >
                        Tạo bài kiểm tra mới
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subjects.map((subject) => {
                        const subjectAssessments = publishedAssessments.filter(
                          (a) => a.subject_code === subject.code
                        );
                        return (
                          <div
                            key={subject.code}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {subject.code}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {subject.name}
                                </p>
                              </div>
                            </div>

                            {subjectAssessments.length === 0 ? (
                              <div className="text-sm text-gray-500 py-2">
                                Chưa có bài kiểm tra
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {subjectAssessments.map((assessment) => {
                                  const assessmentId = String(
                                    assessment._id ?? assessment.id ?? ""
                                  );
                                  return (
                                    <div
                                      key={assessmentId}
                                      className="bg-gray-50 rounded p-3 hover:bg-gray-100 cursor-pointer transition-colors"
                                      onClick={() =>
                                        enterEditMode(assessmentId)
                                      }
                                    >
                                      <div className="font-medium text-sm text-gray-900">
                                        {String(assessment.title ?? "")}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {Array.isArray(assessment.questions)
                                          ? assessment.questions.length
                                          : 0}{" "}
                                        câu hỏi •{" "}
                                        {typeof assessment.time_limit_minutes ===
                                        "number"
                                          ? assessment.time_limit_minutes
                                          : 30}{" "}
                                        phút
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        Đăng:{" "}
                                        {assessment.updated_at
                                          ? new Date(
                                              String(assessment.updated_at)
                                            ).toLocaleDateString("vi-VN")
                                          : "N/A"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Edit Mode - Show editing tools */
              <div className="space-y-6">
                {/* Assessment Selection */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Chọn bài kiểm tra để chỉnh sửa
                    </h3>
                    <button
                      className="text-gray-600 hover:text-gray-900 text-sm"
                      onClick={exitEditMode}
                    >
                      ← Quay lại tổng quan
                    </button>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      className="border border-gray-300 rounded px-3 py-2 text-sm"
                      value={selectedAssessmentId ?? ""}
                      onChange={(e) => setSelectedAssessmentId(e.target.value)}
                    >
                      <option value="">-- Chọn bài kiểm tra --</option>
                      {(Array.isArray(assessments) ? assessments : []).map(
                        (a: Record<string, unknown>, idx: number) => {
                          const aId = String(a._id ?? a.id ?? idx);
                          return (
                            <option key={aId} value={aId}>
                              {String(a.title ?? "")}
                            </option>
                          );
                        }
                      )}
                    </select>

                    {selectedAssessmentId && (
                      <>
                        <input
                          className="border border-gray-300 rounded px-3 py-2 text-sm"
                          placeholder="Đổi tên đề"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                        />
                        <button
                          className="bg-gray-600 text-white px-3 py-2 rounded text-sm"
                          onClick={renameAssessment}
                        >
                          Đổi tên
                        </button>
                        <button
                          className="bg-red-600 text-white px-3 py-2 rounded text-sm"
                          onClick={deleteAssessment}
                        >
                          Xóa đề
                        </button>

                        {/* Export/Import buttons */}
                        <button
                          className="bg-green-600 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
                          onClick={exportQuestions}
                        >
                          <Download className="h-4 w-4" />
                          Export JSON
                        </button>
                        <button
                          className="bg-purple-600 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4" />
                          Import JSON
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={importQuestions}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                </div>

                {selectedAssessmentId && (
                  <>
                    {/* Questions for selected assessment + Practice panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                            Câu hỏi
                          </h3>
                          {questions.length === 0 ? (
                            <div className="text-sm text-gray-500">
                              Chưa có câu hỏi.
                            </div>
                          ) : (
                            <ul className="space-y-3">
                              {questions.map((q, idx) => {
                                const qId = String(q._id ?? q.id ?? idx);
                                return (
                                  <li
                                    key={qId}
                                    className="border border-gray-100 rounded p-3"
                                  >
                                    {editingIndex === idx ? (
                                      <div className="space-y-2">
                                        <input
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                          value={editQuestion.question_text}
                                          onChange={(e) =>
                                            setEditQuestion((s) => ({
                                              ...s,
                                              question_text: e.target.value,
                                            }))
                                          }
                                        />
                                        <textarea
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                          rows={3}
                                          value={editQuestion.options}
                                          onChange={(e) =>
                                            setEditQuestion((s) => ({
                                              ...s,
                                              options: e.target.value,
                                            }))
                                          }
                                        />
                                        <input
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                          placeholder="Đáp án đúng"
                                          value={editQuestion.correct_answer}
                                          onChange={(e) =>
                                            setEditQuestion((s) => ({
                                              ...s,
                                              correct_answer: e.target.value,
                                            }))
                                          }
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                                            onClick={() => saveQuestion(idx)}
                                          >
                                            Lưu
                                          </button>
                                          <button
                                            className="bg-gray-300 px-3 py-1 rounded text-xs"
                                            onClick={() =>
                                              setEditingIndex(null)
                                            }
                                          >
                                            Hủy
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="text-sm font-medium text-gray-900">
                                          {String(q.question_text ?? "")}
                                        </div>
                                        {Array.isArray(q.options) &&
                                        q.options.length > 0 ? (
                                          <ul className="list-disc pl-5 mt-1 text-sm text-gray-700">
                                            {q.options.map(
                                              (op: unknown, i: number) => (
                                                <li key={i}>{String(op)}</li>
                                              )
                                            )}
                                          </ul>
                                        ) : null}
                                        <div className="mt-1 text-xs text-gray-500">
                                          Đáp án:{" "}
                                          {String(q.correct_answer ?? "")}
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                          <button
                                            className="bg-gray-600 text-white px-3 py-1 rounded text-xs"
                                            onClick={() =>
                                              beginEditQuestion(idx)
                                            }
                                          >
                                            Sửa
                                          </button>
                                          <button
                                            className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                                            onClick={() => removeQuestion(idx)}
                                          >
                                            Xóa
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Add question form + Settings */}
                      <div className="space-y-6">
                        {/* Test Settings */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                            Cài đặt bài kiểm tra
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Chọn môn học
                              </label>
                              <select
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                value={selectedSubject.code}
                                onChange={(e) => {
                                  const subject = subjects.find(
                                    (s) => s.code === e.target.value
                                  );
                                  setSelectedSubject(
                                    subject || { code: "", name: "" }
                                  );
                                }}
                              >
                                <option value="">-- Chọn môn học --</option>
                                {subjects.map((subject) => (
                                  <option
                                    key={subject.code}
                                    value={subject.code}
                                  >
                                    {subject.code} - {subject.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Thời gian (phút)
                              </label>
                              <input
                                type="number"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                value={timeLimit}
                                onChange={(e) =>
                                  setTimeLimit(parseInt(e.target.value) || 30)
                                }
                                min="1"
                                max="180"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Số lượt làm tối đa
                              </label>
                              <input
                                type="number"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                value={maxAttempts}
                                onChange={(e) =>
                                  setMaxAttempts(parseInt(e.target.value) || 3)
                                }
                                min="1"
                                max="10"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="singleMode"
                                checked={singleQuestionMode}
                                onChange={(e) =>
                                  setSingleQuestionMode(e.target.checked)
                                }
                              />
                              <label
                                htmlFor="singleMode"
                                className="text-sm text-gray-700"
                              >
                                Chế độ làm từng câu
                              </label>
                            </div>
                            <button
                              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
                              onClick={publishAssessment}
                              disabled={
                                !selectedSubject.code || questions.length === 0
                              }
                            >
                              🚀 Đăng bài kiểm tra
                            </button>
                          </div>
                        </div>

                        {/* Add question form */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                            Thêm câu hỏi
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Nội dung câu hỏi
                              </label>
                              <textarea
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                rows={3}
                                value={newQuestion.question_text}
                                onChange={(e) =>
                                  setNewQuestion({
                                    ...newQuestion,
                                    question_text: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Đáp án đúng
                              </label>
                              <input
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                value={newQuestion.correct_answer}
                                onChange={(e) =>
                                  setNewQuestion({
                                    ...newQuestion,
                                    correct_answer: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Các lựa chọn (1 dòng 1 phương án)
                              </label>
                              <textarea
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                rows={4}
                                value={newQuestion.options}
                                onChange={(e) =>
                                  setNewQuestion({
                                    ...newQuestion,
                                    options: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 mb-1">
                                Giải thích (tuỳ chọn)
                              </label>
                              <textarea
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                rows={2}
                                value={newQuestion.explanation}
                                onChange={(e) =>
                                  setNewQuestion({
                                    ...newQuestion,
                                    explanation: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <button
                              onClick={handleAddQuestion}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                            >
                              Thêm câu hỏi
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Practice panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900">
                          Làm thử đề đang chọn
                        </h3>
                        <div className="flex items-center gap-3">
                          {/* Timer and attempts info */}
                          {isTaking && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-red-500" />
                              <span
                                className={`font-mono ${
                                  timeLeft < 300
                                    ? "text-red-500"
                                    : "text-gray-700"
                                }`}
                              >
                                {formatTime(timeLeft)}
                              </span>
                            </div>
                          )}
                          <div className="text-sm text-gray-600">
                            Lượt: {currentAttempt}/{maxAttempts}
                          </div>
                          {!isTaking ? (
                            <button
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                              onClick={startTaking}
                              disabled={
                                questions.length === 0 ||
                                currentAttempt >= maxAttempts
                              }
                            >
                              Bắt đầu
                            </button>
                          ) : (
                            <button
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                              onClick={submitTaking}
                            >
                              Nộp bài
                            </button>
                          )}
                        </div>
                      </div>

                      {!isTaking && !score && (
                        <div className="text-sm text-gray-600">
                          Nhấn &quot;Bắt đầu&quot; để làm đề. Có{" "}
                          {questions.length} câu hỏi. Thời gian: {timeLimit}{" "}
                          phút.
                          {currentAttempt >= maxAttempts && (
                            <span className="text-red-500 font-medium">
                              {" "}
                              (Đã hết lượt làm)
                            </span>
                          )}
                        </div>
                      )}

                      {isTaking && (
                        <div className="space-y-5">
                          {singleQuestionMode ? (
                            // Single question mode
                            <div>
                              <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-gray-600">
                                  Câu {currentQuestionIndex + 1} /{" "}
                                  {questions.length}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                    onClick={prevQuestion}
                                    disabled={currentQuestionIndex === 0}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                    Trước
                                  </button>
                                  <button
                                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                    onClick={nextQuestion}
                                    disabled={
                                      currentQuestionIndex ===
                                      questions.length - 1
                                    }
                                  >
                                    Sau
                                    <ChevronRight className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {questions[currentQuestionIndex] &&
                                (() => {
                                  const q = questions[currentQuestionIndex];
                                  const qId = String(q._id ?? q.id ?? "");
                                  return (
                                    <div className="border border-gray-100 rounded p-4">
                                      <div className="font-medium text-gray-900 mb-3">
                                        {currentQuestionIndex + 1}.{" "}
                                        {String(q.question_text ?? "")}
                                      </div>
                                      {Array.isArray(q.options) &&
                                      q.options.length > 0 ? (
                                        <div className="space-y-2">
                                          {q.options.map(
                                            (op: unknown, i: number) => (
                                              <label
                                                key={i}
                                                className="flex items-center gap-2 text-sm"
                                              >
                                                <input
                                                  type="radio"
                                                  name={`q_${qId}`}
                                                  value={String(op)}
                                                  checked={
                                                    answers[qId] === String(op)
                                                  }
                                                  onChange={(e) =>
                                                    setAnswers((prev) => ({
                                                      ...prev,
                                                      [qId]: e.target.value,
                                                    }))
                                                  }
                                                />
                                                <span>{String(op)}</span>
                                              </label>
                                            )
                                          )}
                                        </div>
                                      ) : (
                                        <input
                                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                          placeholder="Nhập câu trả lời"
                                          value={answers[qId] || ""}
                                          onChange={(e) =>
                                            setAnswers((prev) => ({
                                              ...prev,
                                              [qId]: e.target.value,
                                            }))
                                          }
                                        />
                                      )}
                                    </div>
                                  );
                                })()}
                            </div>
                          ) : (
                            // All questions mode
                            questions.map((q, idx) => {
                              const qId = String(q._id ?? q.id ?? idx);
                              return (
                                <div
                                  key={qId}
                                  className="border border-gray-100 rounded p-3"
                                >
                                  <div className="font-medium text-gray-900 mb-2">
                                    {idx + 1}. {String(q.question_text ?? "")}
                                  </div>
                                  {Array.isArray(q.options) &&
                                  q.options.length > 0 ? (
                                    <div className="space-y-2">
                                      {q.options.map(
                                        (op: unknown, i: number) => (
                                          <label
                                            key={i}
                                            className="flex items-center gap-2 text-sm"
                                          >
                                            <input
                                              type="radio"
                                              name={`q_${qId}`}
                                              value={String(op)}
                                              checked={
                                                answers[qId] === String(op)
                                              }
                                              onChange={(e) =>
                                                setAnswers((prev) => ({
                                                  ...prev,
                                                  [qId]: e.target.value,
                                                }))
                                              }
                                            />
                                            <span>{String(op)}</span>
                                          </label>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <input
                                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                      placeholder="Nhập câu trả lời"
                                      value={answers[qId] || ""}
                                      onChange={(e) =>
                                        setAnswers((prev) => ({
                                          ...prev,
                                          [qId]: e.target.value,
                                        }))
                                      }
                                    />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {score && (
                        <div className="p-4 rounded bg-green-50 border border-green-200">
                          <div className="text-green-700 font-medium mb-2">
                            Kết quả bài làm
                          </div>
                          <div className="text-green-700 text-sm">
                            Bạn đúng {score.correct}/{score.total} câu (
                            {Math.round((score.correct / score.total) * 100)}%)
                          </div>
                          <button
                            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                            onClick={() => {
                              setScore(null);
                              setAnswers({});
                              setCurrentQuestionIndex(0);
                            }}
                          >
                            Làm lại
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </main>

          {/* Footer removed to avoid duplication with global footer */}
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
