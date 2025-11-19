"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Mail, Phone, AlertTriangle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    if (submitting || !assessment) return;

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
          if (!submitting && questions.length > 0) {
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  const isAutoSubmitting = submitting && timeLeft <= 1;

  if (!assessmentId || !assessment) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold text-gray-900">
            Không tìm thấy bài kiểm tra
          </h2>
          <p className="text-gray-600">
            Đề bài có thể đã bị xóa hoặc bạn không có quyền truy cập.
          </p>
          <Link
            href={`/exercises/${resolvedParams.id}`}
            className="text-blue-600 hover:underline font-medium"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900">
            Bài kiểm tra chưa có câu hỏi
          </h2>
          <p className="text-gray-600">
            Xin lỗi, bài kiểm tra này chưa được thêm câu hỏi. Vui lòng quay lại
            sau hoặc liên hệ giảng viên để được hỗ trợ.
          </p>
          <Link
            href={`/exercises/${resolvedParams.id}`}
            className="inline-flex justify-center px-4 py-2 rounded-full bg-[#125093] text-white font-semibold hover:bg-[#0f4278] transition-colors"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 md:h-24">
            <Link
              href={`/exercises/${resolvedParams.id}`}
              className="flex items-center"
            >
              <ArrowLeft className="h-6 w-6 md:h-7 md:w-7 text-gray-600 hover:text-gray-800 transition-colors" />
            </Link>
            <div className="text-center flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 poppins-bold">
                {currentSubject.code}
              </h1>
              <div className="text-sm md:text-base text-gray-700 space-y-0.5 arimo-regular">
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
                    className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow"
                  >
                    {/* Question Header */}
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 poppins-semibold">
                        Câu {index + 1}
                      </h3>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs font-semibold text-[#125093] bg-[#125093]/10 px-3 py-1 rounded-full uppercase tracking-wide">
                          {questionTypeLabel}
                          {isMultipleChoice && allowMulti
                            ? " (Nhiều đáp án)"
                            : ""}
                        </span>
                        <span className="text-sm md:text-base font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full arimo-medium">
                          1 điểm
                        </span>
                      </div>
                    </div>

                    {/* Question Content */}
                    <p className="text-base md:text-lg text-gray-700 mb-6 md:mb-8 leading-relaxed arimo-regular">
                      {questionText}
                    </p>

                    {/* Answer Options */}
                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                      {isMultipleChoice && options.length > 0 ? (
                        options.map((option: unknown, optionIndex: number) => {
                          const optionStr = String(option);
                          const isSelected = allowMulti
                            ? selectedMultiValues.includes(optionStr)
                            : answers[questionId] === optionStr;
                          return (
                            <label
                              key={optionIndex}
                              className={`flex items-start space-x-3 md:space-x-4 cursor-pointer p-3 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                                isSelected
                                  ? "border-[#49BBBD] bg-[#49BBBD]/10"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type={allowMulti ? "checkbox" : "radio"}
                                name={`question-${questionId}${
                                  allowMulti ? `-${optionIndex}` : ""
                                }`}
                                value={optionStr}
                                checked={isSelected}
                                onChange={() =>
                                  allowMulti
                                    ? handleMultiSelectToggle(index, optionStr)
                                    : handleAnswerChange(index, optionStr)
                                }
                                className="w-5 h-5 md:w-6 md:h-6 mt-0.5 text-[#49BBBD] focus:ring-[#49BBBD] border-gray-300 cursor-pointer"
                              />
                              <span className="text-base md:text-lg text-gray-700 flex-1 arimo-regular leading-relaxed">
                                {optionStr}
                              </span>
                            </label>
                          );
                        })
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
                            <p className="text-sm text-gray-500">
                              Giới hạn {wordLimit} từ. Vui lòng trả lời ngắn
                              gọn.
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">
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
                            <p className="text-sm text-gray-500">
                              Câu hỏi điền vào chỗ trống – lưu ý viết đúng chính
                              tả. Hệ thống chấp nhận đáp án trùng khớp.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        onClick={() => handleClearAnswer(index)}
                        className="text-sm md:text-base text-gray-600 hover:text-gray-800 arimo-regular"
                      >
                        Xóa câu trả lời
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleMarkQuestion(index)}
                        className="flex items-center space-x-2 text-sm md:text-base text-gray-600 hover:text-gray-800 arimo-regular"
                      >
                        <Star
                          className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${
                            markedQuestions.has(index)
                              ? "text-yellow-500 fill-current"
                              : "text-gray-400"
                          }`}
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
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                <h3 className="text-center text-base md:text-lg font-semibold text-gray-900 mb-4 arimo-semibold">
                  Thời gian làm bài còn:
                </h3>
                <div className="text-center">
                  <div
                    className={`text-2xl md:text-3xl font-bold poppins-bold ${
                      timeLeft < 300
                        ? "text-red-600"
                        : timeLeft < 600
                        ? "text-orange-600"
                        : "text-gray-900"
                    }`}
                  >
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Question Navigation Grid */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
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
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full text-sm md:text-base font-medium transition-all duration-200 relative p-0 ${
                          status === "current"
                            ? "bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 scale-110 hover:bg-orange-600"
                            : isAnswered
                            ? "bg-[#49BBBD] text-white hover:bg-[#3da8aa]"
                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                        }`}
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
                className={`w-full py-3 md:py-4 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                  submitting || questions.length === 0
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-[#125093] text-white hover:bg-[#0f4278] hover:shadow-xl hover:scale-105"
                } poppins-semibold text-base md:text-lg`}
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
      <AlertDialog.Root
        open={showConfirmDialog}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setShowConfirmDialog(false);
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[425px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
            )}
          >
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <AlertDialog.Title className="text-lg font-semibold">
                  Xác nhận nộp bài
                </AlertDialog.Title>
              </div>
              <AlertDialog.Description className="text-sm text-gray-600 pt-2 space-y-2">
                <p className="text-gray-700 arimo-regular">
                  Bạn có chắc chắn muốn nộp bài?
                </p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="text-gray-600 arimo-regular">
                    <span className="font-semibold">Số câu đã trả lời:</span>{" "}
                    {Object.keys(answers).length}/{questions.length}
                  </p>
                  <p className="text-gray-600 arimo-regular">
                    <span className="font-semibold">Thời gian còn lại:</span>{" "}
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </AlertDialog.Description>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" disabled={submitting}>
                  Hủy
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
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
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Footer */}
      <footer className="bg-[#125093] text-white">
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SS</span>
                </div>
                <div className="text-white">
                  <div className="text-lg font-semibold">
                    Soft Skills Department
                  </div>
                  <div className="text-sm opacity-90">Trường ĐH FPT</div>
                </div>
              </div>
            </div>

            {/* Center Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">
                Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay
              </h3>
              <div className="space-y-2 text-sm text-white/90">
                <div className="font-semibold text-white">
                  Văn phòng Bộ môn Kỹ năng mềm
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Email: vanbinh@fpt.edu.vn</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>Zalo: 090.xxx.xxx</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">
                Thầy Văn Bình
              </h3>
              <div className="space-y-2 text-sm text-white/90">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Email: vanbinh@fpt.edu.vn</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>Zalo: 090.xxx.xxx</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Line */}
          <div className="border-t border-white/20 mt-8 pt-8 text-center">
            <p className="text-sm text-white/80">
              Soft Skills Department | Trường Đại học FPT
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
