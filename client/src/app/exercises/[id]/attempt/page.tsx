"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, AlertTriangle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import { useThemePreference } from "@/providers/ThemeProvider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface Question {
  _id?: string;
  question_text?: string;
  options?: string[];
  correct_answer?: string;
  [key: string]: unknown;
}

interface Assessment {
  title?: string;
  subject_code?: string;
  subject_name?: string;
  time_limit_minutes?: number;
  max_attempts?: number;
  subject_id?: string;
  [key: string]: unknown;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Trắc nghiệm",
  essay: "Tự luận",
  fill_in_blank: "Điền vào chỗ trống",
};

const computeWarningThreshold = (totalSeconds: number | null | undefined) => {
  if (!totalSeconds || totalSeconds <= 0 || !Number.isFinite(totalSeconds)) {
    return 60;
  }
  const quarter = Math.floor(totalSeconds * 0.25);
  return Math.max(30, Math.min(300, quarter));
};

const normalizeMultiAnswer = (value?: string) => {
  if (!value) return "";
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "vi"))
    .join(",");
};

const parseMultiAnswer = (value?: string) => {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
};

export default function TestAttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("assessmentId");
  const isQuickTest = searchParams.get("quickTest") === "true";
  const storageKey = searchParams.get("storageKey"); // For quick test data
  const { data: session } = useSession();

  // Type-safe access to user with extended properties
  const user = session?.user as
    | {
        id?: string;
        full_name?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      }
    | undefined;
  const authFetch = useAuthFetch();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(3600); // Will be updated from assessment data
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(3600);
  const [warningThresholdSeconds, setWarningThresholdSeconds] = useState(
    computeWarningThreshold(3600)
  );
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(
    new Set()
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { showToast } = useToast();

  const warningShownRef = useRef(false);
  const submittedRef = useRef(false); // Prevent double submission

  const subjectInfo = {
    mln111: { code: "MLN111", name: "Triết học Mác - Lê-nin" },
    mln122: { code: "MLN122", name: "Kinh tế chính trị Mác - Lê-nin" },
    mln131: { code: "MLN131", name: "Chủ nghĩa xã hội khoa học" },
    hcm202: { code: "HCM202", name: "Tư tưởng Hồ Chí Minh" },
    vnr202: { code: "VNR202", name: "Lịch sử Đảng Cộng sản Việt Nam" },
  };

  const currentSubject =
    subjectInfo[resolvedParams.id as keyof typeof subjectInfo] ||
    subjectInfo.mln111;

  // Load assessment and questions
  useEffect(() => {
    const loadAssessmentData = async () => {
      // Handle quick test (temporary assessment from sessionStorage)
      if (isQuickTest && storageKey) {
        try {
          const storedData = sessionStorage.getItem(storageKey);
          if (!storedData) {
            throw new Error("Quick test data not found in session storage");
          }

          const decodedData = JSON.parse(storedData);
          setAssessment(decodedData as Assessment);
          setQuestions(decodedData.questions || []);

          // Set timer from assessment data
          if (typeof decodedData.time_limit_minutes === "number") {
            const seconds = Math.max(decodedData.time_limit_minutes, 1) * 60;
            setTimeLeft(seconds);
            setTimeLimitSeconds(seconds);
            setWarningThresholdSeconds(computeWarningThreshold(seconds));
          }

          // Quick tests always start at attempt 1
          setAttemptNumber(1);

          // Reset submission ref when starting new attempt
          submittedRef.current = false;

          // Clean up sessionStorage after loading (optional, or clean after submit)
          // sessionStorage.removeItem(storageKey);
        } catch (error) {
          console.error("Error loading quick test data:", error);
          showToast({
            type: "error",
            title: "Lỗi",
            message:
              "Không thể tải dữ liệu bài kiểm tra nhanh. Vui lòng thử lại.",
            duration: 5000,
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      // Regular assessment loading
      if (!assessmentId) {
        setLoading(false);
        return;
      }

      try {
        // Load assessment details
        const assessmentRes = await authFetch(
          getFullUrl(API_ENDPOINTS.ASSESSMENT_DETAIL(Number(assessmentId)))
        );
        const assessmentData = (await assessmentRes.json()) as Assessment;
        setAssessment(assessmentData);

        // Load questions
        const questionsRes = await authFetch(
          getFullUrl(API_ENDPOINTS.ASSESSMENT_QUESTIONS(Number(assessmentId)))
        );
        const questionsData = await questionsRes.json();
        const questionsList = Array.isArray(questionsData)
          ? (questionsData as Question[])
          : [];
        setQuestions(questionsList);

        // Set timer from assessment data
        if (typeof assessmentData.time_limit_minutes === "number") {
          const seconds = Math.max(assessmentData.time_limit_minutes, 1) * 60;
          setTimeLeft(seconds);
          setTimeLimitSeconds(seconds);
          setWarningThresholdSeconds(computeWarningThreshold(seconds));
        } else {
          setTimeLimitSeconds(timeLeft);
          setWarningThresholdSeconds(computeWarningThreshold(timeLeft));
        }

        // Get attempt number from backend (optimized endpoint)
        try {
          const studentId = user?.id?.toString() || "anonymous";
          const attemptRes = await authFetch(
            getFullUrl(API_ENDPOINTS.STUDENT_ATTEMPT_NUMBER(studentId)) +
              `?assessment_id=${assessmentId}`
          );
          if (attemptRes.ok) {
            const attemptData = await attemptRes.json();
            setAttemptNumber(attemptData.next_attempt_number || 1);
          } else {
            // Fallback: try old endpoint
            const resultsRes = await authFetch(
              getFullUrl(API_ENDPOINTS.STUDENT_RESULTS(studentId)) +
                `?assessment_id=${assessmentId}`
            );
            if (resultsRes.ok) {
              const resultsData = await resultsRes.json();
              const resultsList = Array.isArray(resultsData) ? resultsData : [];
              const attemptNum = resultsList.length + 1;
              setAttemptNumber(attemptNum);
            } else {
              setAttemptNumber(1);
            }
          }
        } catch {
          // If can't get attempt number, default to 1
          setAttemptNumber(1);
        }

        // Test attempt tracking is now handled by assessment_results

        // Reset submission ref when starting new attempt
        submittedRef.current = false;
      } catch (error) {
        console.error("Error loading assessment:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAssessmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, isQuickTest, storageKey, authFetch, user]);

  useEffect(() => {
    if (!assessment || submitting) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [assessment, submitting]);

  useEffect(() => {
    warningShownRef.current = false;
  }, [assessmentId, timeLimitSeconds]);

  const calculateScore = useCallback(() => {
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    questions.forEach((question, index) => {
      const questionId = String(question._id ?? index);
      const userAnswer = answers[questionId];
      const correctAnswer = String(question.correct_answer ?? "");

      if (!userAnswer || !correctAnswer) {
        return;
      }

      if (
        question.question_type === "multiple_choice" &&
        question.allow_multiple_selection
      ) {
        const normalizedUser = normalizeMultiAnswer(userAnswer);
        const normalizedCorrect = normalizeMultiAnswer(correctAnswer);
        if (normalizedUser && normalizedUser === normalizedCorrect) {
          correctAnswers++;
        }
      } else if (question.question_type === "fill_in_blank") {
        if (
          userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
        ) {
          correctAnswers++;
        }
      } else {
        if (userAnswer === correctAnswer) {
          correctAnswers++;
        }
      }
    });

    const score =
      totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    return {
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      correctAnswers,
      totalQuestions,
    };
  }, [questions, answers]);

  const handleSubmitClick = useCallback(() => {
    if (submitting || !assessment || questions.length === 0) return;
    setShowConfirmDialog(true);
  }, [submitting, assessment, questions.length]);

  const handleSubmit = useCallback(async () => {
    // Prevent double submission - check both state and ref
    if (submitting || !assessment || submittedRef.current) return;

    // Set flags immediately to prevent race conditions
    submittedRef.current = true;
    setShowConfirmDialog(false);
    setSubmitting(true);

    try {
      const { score, correctAnswers, totalQuestions } = calculateScore();

      const timeLimitMinutes =
        typeof assessment.time_limit_minutes === "number"
          ? assessment.time_limit_minutes
          : 60;

      // Save result to backend
      // Convert answers from object to array format expected by backend
      // Backend expects: List[Dict[str, Any]] where each dict has question_id and answer
      const answersArray = Object.entries(answers).map(
        ([questionId, answer]) => ({
          question_id: questionId,
          answer: String(answer),
        })
      );

      // Ensure student_id is a valid UUID
      if (!user?.id) {
        throw new Error("Bạn cần đăng nhập để nộp bài");
      }

      const resultData = {
        student_id: user.id, // UUID format expected by backend
        student_name: user?.full_name || user?.email || "Anonymous",
        assessment_id: isQuickTest ? null : assessmentId, // Null for quick tests
        assessment_title: String(assessment.title ?? ""),
        subject_code: String(assessment.subject_code ?? ""),
        subject_name: String(assessment.subject_name ?? ""),
        answers: answersArray, // Array of objects: [{ question_id: "...", answer: "..." }, ...]
        score: score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_taken: timeLimitMinutes * 60 - timeLeft,
        max_time: timeLimitMinutes * 60,
        is_quick_test: isQuickTest, // Flag for quick tests
      };

      // Save to API (PostgreSQL assessment results)
      try {
        const res = await authFetch(
          getFullUrl(API_ENDPOINTS.ASSESSMENT_RESULTS),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resultData),
          }
        );
        if (!res.ok) throw new Error("Failed to save result");
      } catch (apiError) {
        console.error(
          "Error saving to API, falling back to localStorage:",
          apiError
        );
        // Fallback to localStorage if API fails
        const existingResults = JSON.parse(
          localStorage.getItem("assessment_results") || "[]"
        );
        existingResults.push({
          ...resultData,
          completed_at: new Date().toISOString(),
        });
        localStorage.setItem(
          "assessment_results",
          JSON.stringify(existingResults)
        );
      }

      // Redirect to result page with score data
      const resultParams = new URLSearchParams({
        assessmentId: isQuickTest ? "" : assessmentId || "",
        score: score.toString(),
        correctAnswers: correctAnswers.toString(),
        totalQuestions: totalQuestions.toString(),
        timeTaken: (timeLimitMinutes * 60 - timeLeft).toString(),
        isQuickTest: isQuickTest ? "true" : "false",
      });

      // Clean up sessionStorage after successful submit
      if (isQuickTest && storageKey) {
        sessionStorage.removeItem(storageKey);
      }

      // Show success notification
      showToast({
        type: "success",
        title: "Nộp bài thành công",
        message: `Bạn đã nộp bài thành công! Điểm số: ${score}/${totalQuestions}`,
        duration: 5000,
      });

      router.push(
        `/exercises/${resolvedParams.id}/result?${resultParams.toString()}`
      );
    } catch (error) {
      console.error("Error submitting assessment:", error);
      // Reset flags on error to allow retry
      submittedRef.current = false;
      setSubmitting(false);
      showToast({
        type: "error",
        title: "Nộp bài thất bại",
        message: "Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.",
        duration: 6000,
      });
    }
  }, [
    submitting,
    answers,
    assessment,
    assessmentId,
    timeLeft,
    user,
    authFetch,
    router,
    resolvedParams.id,
    calculateScore,
    showToast,
    isQuickTest,
    storageKey,
  ]);

  // Timer countdown + warning
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Check both state and ref to prevent double submission
          if (!submitting && !submittedRef.current && questions.length > 0) {
            handleSubmit();
          }
          return 0;
        }
        if (
          !warningShownRef.current &&
          warningThresholdSeconds > 0 &&
          prev <= warningThresholdSeconds
        ) {
          warningShownRef.current = true;
          const minutesLeft = Math.max(1, Math.ceil(prev / 60));
          showToast({
            type: "warning",
            title: "Sắp hết giờ",
            message:
              minutesLeft > 1
                ? `Bạn chỉ còn khoảng ${minutesLeft} phút. Vui lòng kiểm tra và nộp bài kịp thời.`
                : "Bạn chỉ còn dưới 1 phút. Vui lòng nộp bài ngay!",
          });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    submitting,
    questions.length,
    handleSubmit,
    showToast,
    warningThresholdSeconds,
  ]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const question = questions[questionIndex];
    const questionId = String(question?._id ?? questionIndex);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleMultiSelectToggle = (
    questionIndex: number,
    optionValue: string
  ) => {
    const question = questions[questionIndex];
    const questionId = String(question?._id ?? questionIndex);
    const currentValues = parseMultiAnswer(answers[questionId]);

    let nextValues: string[];
    if (currentValues.includes(optionValue)) {
      nextValues = currentValues.filter((value) => value !== optionValue);
    } else {
      nextValues = [...currentValues, optionValue];
    }

    const serialized = normalizeMultiAnswer(nextValues.join(","));
    setAnswers((prev) => ({
      ...prev,
      [questionId]: serialized,
    }));
  };

  const handleClearAnswer = (questionIndex: number) => {
    const question = questions[questionIndex];
    const questionId = String(question?._id ?? questionIndex);
    setAnswers((prev) => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
  };

  const handleMarkQuestion = (questionIndex: number) => {
    setMarkedQuestions((prev) => {
      const newMarked = new Set(prev);
      if (newMarked.has(questionIndex)) {
        newMarked.delete(questionIndex);
      } else {
        newMarked.add(questionIndex);
      }
      return newMarked;
    });
  };

  const getQuestionStatus = (questionIndex: number) => {
    if (questionIndex === currentQuestion) return "current";
    const question = questions[questionIndex];
    const questionId = String(question?._id ?? questionIndex);
    if (answers[questionId] !== undefined) return "answered";
    return "unanswered";
  };

  if (loading) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <Spinner size="xl" />
      </div>
    );
  }

  const isAutoSubmitting = submitting && timeLeft <= 1;

  // For quick test, assessmentId is not required (it's loaded from sessionStorage)
  // For regular assessment, both assessmentId and assessment are required
  if ((!isQuickTest && !assessmentId) || !assessment) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <div className="text-center space-y-3">
          <h2
            className={cn(
              "text-xl font-bold",
              isDarkMode ? "text-foreground" : "text-gray-900"
            )}
          >
            Không tìm thấy bài kiểm tra
          </h2>
          <p
            className={cn(
              isDarkMode ? "text-muted-foreground" : "text-gray-600"
            )}
          >
            {isQuickTest
              ? "Không thể tải dữ liệu bài kiểm tra nhanh. Vui lòng thử lại."
              : "Đề bài có thể đã bị xóa hoặc bạn không có quyền truy cập."}
          </p>
          <Link
            href={`/exercises/${resolvedParams.id}`}
            className={cn(
              "hover:underline font-medium transition-colors",
              isDarkMode
                ? "text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.85)]"
                : "text-blue-600 hover:text-blue-700"
            )}
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center px-4 transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <div className="text-center space-y-3 max-w-md">
          <h2
            className={cn(
              "text-2xl font-bold",
              isDarkMode ? "text-foreground" : "text-gray-900"
            )}
          >
            Bài kiểm tra chưa có câu hỏi
          </h2>
          <p
            className={cn(
              isDarkMode ? "text-muted-foreground" : "text-gray-600"
            )}
          >
            Xin lỗi, bài kiểm tra này chưa được thêm câu hỏi. Vui lòng quay lại
            sau hoặc liên hệ giảng viên để được hỗ trợ.
          </p>
          <Link
            href={`/exercises/${resolvedParams.id}`}
            className="inline-flex justify-center px-4 py-2 rounded-full bg-[hsl(var(--primary))] text-primary-foreground font-semibold hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-background" : "bg-white"
      )}
    >
      {/* Header */}
      <header
        className={cn(
          "border-b transition-colors",
          isDarkMode ? "bg-card border-border" : "bg-white border-gray-200"
        )}
      >
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 md:py-6 gap-3">
            <Link
              href={`/exercises/${resolvedParams.id}`}
              className="flex items-center"
            >
              <ArrowLeft
                className={cn(
                  "h-6 w-6 md:h-7 md:w-7 transition-colors",
                  isDarkMode
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-gray-600 hover:text-gray-800"
                )}
              />
            </Link>
            <div className="text-center flex-1">
              <h1
                className={cn(
                  "text-2xl md:text-3xl lg:text-4xl font-bold mb-1 poppins-bold",
                  isDarkMode ? "text-foreground" : "text-gray-900"
                )}
              >
                {currentSubject.code}
              </h1>
              <div
                className={cn(
                  "text-sm md:text-base space-y-0.5 arimo-regular",
                  isDarkMode ? "text-muted-foreground" : "text-gray-700"
                )}
              >
                <div className="font-semibold poppins-semibold">
                  {isQuickTest
                    ? "Kiểm tra nhanh"
                    : String(assessment.title ?? "")}
                </div>
                <div>Lần {attemptNumber}</div>
              </div>
            </div>
            <div className="w-6 md:w-7"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Questions */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {questions.map((question, index) => {
                const questionId = String(question._id ?? index);
                const questionText = String(question.question_text ?? "");
                const options = Array.isArray(question.options)
                  ? question.options
                  : [];
                const questionType = String(
                  question.question_type ?? "multiple_choice"
                );
                const isMultipleChoice = questionType === "multiple_choice";
                const isEssay = questionType === "essay";
                const isFillInBlank = questionType === "fill_in_blank";
                const allowMulti = Boolean(question.allow_multiple_selection);
                const selectedMultiValues = parseMultiAnswer(
                  answers[questionId]
                );
                const questionTypeLabel =
                  QUESTION_TYPE_LABELS[questionType] ?? "Câu hỏi";
                const wordLimit =
                  typeof question.word_limit === "number"
                    ? question.word_limit
                    : undefined;
                const rawInputType =
                  typeof question.input_type === "string"
                    ? question.input_type
                    : undefined;
                const inputType = rawInputType === "number" ? "number" : "text";
                return (
                  <div
                    key={questionId}
                    id={`question-${index}`}
                    className={cn(
                      "border rounded-xl p-6 md:p-8 shadow-md hover:shadow-lg transition-all",
                      isDarkMode
                        ? "bg-card border-border"
                        : "bg-white border-gray-200"
                    )}
                  >
                    {/* Question Header */}
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                      <h3
                        className={cn(
                          "text-lg md:text-xl font-semibold poppins-semibold",
                          isDarkMode ? "text-foreground" : "text-gray-900"
                        )}
                      >
                        Câu {index + 1}
                      </h3>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-semibold text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-3 py-1 rounded-full uppercase tracking-wide">
                          {questionTypeLabel}
                          {isMultipleChoice && allowMulti
                            ? " (Nhiều đáp án)"
                            : ""}
                        </span>
                        <span
                          className={cn(
                            "text-sm md:text-base font-medium px-3 py-1.5 rounded-full arimo-medium transition-colors",
                            isDarkMode
                              ? "text-muted-foreground bg-muted"
                              : "text-gray-700 bg-gray-100"
                          )}
                        >
                          1 điểm
                        </span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <p
                      className={cn(
                        "text-base md:text-lg mb-6 md:mb-8 leading-relaxed arimo-regular",
                        isDarkMode ? "text-foreground" : "text-gray-700"
                      )}
                    >
                      {questionText}
                    </p>

                    {/* Answer Options */}
                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                      {isMultipleChoice && options.length > 0 ? (
                        allowMulti ? (
                          // Multiple choice with checkboxes
                          options.map(
                            (option: unknown, optionIndex: number) => {
                              const optionStr = String(option);
                              const isSelected =
                                selectedMultiValues.includes(optionStr);
                              return (
                                <label
                                  key={optionIndex}
                                  className={`flex items-start space-x-3 md:space-x-4 cursor-pointer p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                                    isSelected
                                      ? "border-[hsl(var(--brand-teal))] bg-[hsl(var(--brand-teal))]/10"
                                      : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() =>
                                      handleMultiSelectToggle(index, optionStr)
                                    }
                                    className="mt-0.5"
                                  />
                                  <span className="text-base md:text-lg text-foreground flex-1 arimo-regular leading-relaxed">
                                    {optionStr}
                                  </span>
                                </label>
                              );
                            }
                          )
                        ) : (
                          // Single choice with RadioGroup
                          <RadioGroup
                            value={answers[questionId] || ""}
                            onValueChange={(value) =>
                              handleAnswerChange(index, value)
                            }
                            className="space-y-3 md:space-y-4"
                          >
                            {options.map(
                              (option: unknown, optionIndex: number) => {
                                const optionStr = String(option);
                                const isSelected =
                                  answers[questionId] === optionStr;
                                return (
                                  <div
                                    key={optionIndex}
                                    className={cn(
                                      "flex items-start space-x-3 md:space-x-4 cursor-pointer p-3 md:p-4 rounded-lg border-2 transition-all duration-200",
                                      isSelected
                                        ? "border-[hsl(var(--brand-teal))] bg-[hsl(var(--brand-teal))]/10"
                                        : isDarkMode
                                        ? "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                  >
                                    <RadioGroupItem
                                      value={optionStr}
                                      id={`question-${questionId}-option-${optionIndex}`}
                                      className="mt-0.5"
                                    />
                                    <Label
                                      htmlFor={`question-${questionId}-option-${optionIndex}`}
                                      className={cn(
                                        "text-base md:text-lg flex-1 arimo-regular leading-relaxed cursor-pointer",
                                        isDarkMode
                                          ? "text-foreground"
                                          : "text-gray-700"
                                      )}
                                    >
                                      {optionStr}
                                    </Label>
                                  </div>
                                );
                              }
                            )}
                          </RadioGroup>
                        )
                      ) : isEssay ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Nhập câu trả lời của bạn..."
                            value={answers[questionId] || ""}
                            onChange={(e) =>
                              handleAnswerChange(index, e.target.value)
                            }
                            rows={5}
                            className="w-full border-2 text-base md:text-lg arimo-regular"
                          />
                          {wordLimit ? (
                            <p
                              className={cn(
                                "text-sm",
                                isDarkMode
                                  ? "text-muted-foreground"
                                  : "text-gray-500"
                              )}
                            >
                              Giới hạn {wordLimit} từ. Vui lòng trả lời ngắn
                              gọn.
                            </p>
                          ) : (
                            <p
                              className={cn(
                                "text-sm",
                                isDarkMode
                                  ? "text-muted-foreground"
                                  : "text-gray-500"
                              )}
                            >
                              Câu hỏi tự luận – hệ thống sẽ lưu nguyên văn câu
                              trả lời của bạn.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type={isFillInBlank ? inputType : "text"}
                            placeholder={
                              isFillInBlank
                                ? "Nhập đáp án chính xác..."
                                : "Nhập câu trả lời của bạn"
                            }
                            value={answers[questionId] || ""}
                            onChange={(e) =>
                              handleAnswerChange(index, e.target.value)
                            }
                            className="w-full border-2 text-base md:text-lg arimo-regular"
                          />
                          {isFillInBlank && (
                            <p
                              className={cn(
                                "text-sm",
                                isDarkMode
                                  ? "text-muted-foreground"
                                  : "text-gray-500"
                              )}
                            >
                              Câu hỏi điền vào chỗ trống – lưu ý viết đúng chính
                              tả. Hệ thống chấp nhận đáp án trùng khớp.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div
                      className={cn(
                        "flex justify-between items-center pt-4 border-t transition-colors",
                        isDarkMode ? "border-border" : "border-gray-200"
                      )}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => handleClearAnswer(index)}
                        className={cn(
                          "text-sm md:text-base arimo-regular",
                          isDarkMode
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-gray-600 hover:text-gray-800"
                        )}
                      >
                        Xóa câu trả lời
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleMarkQuestion(index)}
                        className={cn(
                          "flex items-center space-x-2 text-sm md:text-base arimo-regular",
                          isDarkMode
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-gray-600 hover:text-gray-800"
                        )}
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 md:h-5 md:w-5 transition-colors",
                            markedQuestions.has(index)
                              ? "text-yellow-500 fill-current"
                              : isDarkMode
                              ? "text-muted-foreground"
                              : "text-gray-400"
                          )}
                        />
                        <span>Đánh dấu câu hỏi</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Timer and Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Timer */}
              <div
                className={cn(
                  "border rounded-xl p-6 shadow-lg transition-colors",
                  isDarkMode
                    ? "bg-card border-border"
                    : "bg-white border-gray-200"
                )}
              >
                <h3
                  className={cn(
                    "text-center text-base md:text-lg font-semibold mb-4 arimo-semibold",
                    isDarkMode ? "text-foreground" : "text-gray-900"
                  )}
                >
                  Thời gian làm bài còn:
                </h3>
                <div className="text-center">
                  <div
                    className={cn(
                      "text-2xl md:text-3xl font-bold poppins-bold",
                      timeLeft < 300
                        ? "text-red-600 dark:text-red-400"
                        : timeLeft < 600
                        ? "text-orange-600 dark:text-orange-400"
                        : isDarkMode
                        ? "text-foreground"
                        : "text-gray-900"
                    )}
                  >
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Question Navigation Grid */}
              <div
                className={cn(
                  "border rounded-xl p-6 shadow-lg transition-colors",
                  isDarkMode
                    ? "bg-card border-border"
                    : "bg-white border-gray-200"
                )}
              >
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  {questions.map((_, index) => {
                    const questionNumber = index + 1;
                    const status = getQuestionStatus(index);
                    const isMarked = markedQuestions.has(index);
                    const questionId = String(questions[index]?._id ?? index);
                    const isAnswered = answers[questionId] !== undefined;

                    return (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCurrentQuestion(index);
                          // Scroll to question
                          const questionElement = document.getElementById(
                            `question-${index}`
                          );
                          if (questionElement) {
                            questionElement.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                        }}
                        className={cn(
                          "w-10 h-10 md:w-12 md:h-12 rounded-full text-sm md:text-base font-medium transition-all duration-200 relative p-0",
                          status === "current"
                            ? "bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 scale-110 hover:bg-orange-600"
                            : isAnswered
                            ? "bg-[hsl(var(--brand-teal))] text-white hover:bg-[hsl(var(--brand-teal)/0.85)]"
                            : isDarkMode
                            ? "bg-muted text-muted-foreground hover:bg-muted/80"
                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                        )}
                        title={`Câu ${questionNumber}${
                          isMarked ? " (Đã đánh dấu)" : ""
                        }`}
                      >
                        {questionNumber}
                        {isMarked && (
                          <Star className="absolute -top-1 -right-1 h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-current" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitClick}
                disabled={submitting || questions.length === 0}
                className={cn(
                  "w-full py-3 md:py-4 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center justify-center gap-2 poppins-semibold text-base md:text-lg",
                  submitting || questions.length === 0
                    ? isDarkMode
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-[hsl(var(--primary))] text-primary-foreground hover:bg-[hsl(var(--primary)/0.85)] hover:shadow-xl hover:scale-105"
                )}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" inline />
                    <span>
                      {isAutoSubmitting
                        ? "Hết giờ, đang nộp..."
                        : "Đang nộp bài..."}
                    </span>
                  </>
                ) : (
                  "Nộp bài"
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Confirm Submit Dialog */}
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setShowConfirmDialog(false);
          }
        }}
      >
        <AlertDialogContent className="max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <AlertDialogTitle>Xác nhận nộp bài</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 space-y-2">
              <p className="text-foreground arimo-regular">
                Bạn có chắc chắn muốn nộp bài?
              </p>
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <p className="text-muted-foreground arimo-regular">
                  <span className="font-semibold">Số câu đã trả lời:</span>{" "}
                  {Object.keys(answers).length}/{questions.length}
                </p>
                <p className="text-muted-foreground arimo-regular">
                  <span className="font-semibold">Thời gian còn lại:</span>{" "}
                  {formatTime(timeLeft)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={submitting}>
                Hủy
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="default"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" inline />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  "Nộp bài"
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
