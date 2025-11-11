"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Mail, Phone } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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

export default function TestAttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("assessmentId");
  const isQuickTest = searchParams.get("quickTest") === "true";
  const { authFetch, user } = useAuth();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(3600); // Will be updated from assessment data
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
          setTimeLeft(assessmentData.time_limit_minutes * 60);
        }

        // Get attempt number from backend (optimized endpoint)
        try {
          const studentId = user?.id?.toString() || "anonymous";
          const attemptRes = await authFetch(
            getFullUrl(API_ENDPOINTS.STUDENT_ATTEMPT_NUMBER(studentId)) + `?assessment_id=${assessmentId}`
          );
          if (attemptRes.ok) {
            const attemptData = await attemptRes.json();
            setAttemptNumber(attemptData.next_attempt_number || 1);
          } else {
            // Fallback: try old endpoint
            const resultsRes = await authFetch(
              getFullUrl(API_ENDPOINTS.STUDENT_RESULTS(studentId)) + `?assessment_id=${assessmentId}`
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

        // Start test attempt (backend result tracking)
        try {
          const startRes = await authFetch(
            getFullUrl(API_ENDPOINTS.TEST_RESULTS_START),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                test_id: assessmentId,
                test_title: String(assessmentData.title ?? ""),
                subject_id: String(
                  assessmentData.subject_id ?? resolvedParams.id
                ),
                subject_name: String(
                  assessmentData.subject_name ?? currentSubject.name
                ),
                total_questions: questionsList.length,
                time_limit:
                  typeof assessmentData.time_limit_minutes === "number"
                    ? assessmentData.time_limit_minutes
                    : 60,
                max_attempts:
                  typeof assessmentData.max_attempts === "number"
                    ? assessmentData.max_attempts
                    : 1,
                passing_score: 60,
              }),
            }
          );
          if (startRes.ok) {
            await startRes.json();
          }
        } catch {
          console.warn(
            "Could not start test tracking, will still allow attempt."
          );
        }
      } catch (error) {
        console.error("Error loading assessment:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAssessmentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, authFetch]);

  const calculateScore = useCallback(() => {
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    questions.forEach((question, index) => {
      const questionId = String(question._id ?? index);
      const userAnswer = answers[questionId];
      const correctAnswer = String(question.correct_answer ?? "");

      if (userAnswer && correctAnswer && userAnswer === correctAnswer) {
        correctAnswers++;
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

  const handleSubmit = useCallback(async () => {
    if (submitting || !assessment) return;

    const confirmSubmit = window.confirm(
      `Bạn có chắc chắn muốn nộp bài?\n\nSố câu đã trả lời: ${
        Object.keys(answers).length
      }/${questions.length}\nThời gian còn lại: ${formatTime(timeLeft)}`
    );

    if (!confirmSubmit) return;

    setSubmitting(true);

    try {
      const { score, correctAnswers, totalQuestions } = calculateScore();

      const timeLimitMinutes =
        typeof assessment.time_limit_minutes === "number"
          ? assessment.time_limit_minutes
          : 60;

      // Save result to backend
      const resultData = {
        student_id: user?.id?.toString() || "anonymous",
        student_name: user?.full_name || user?.email || "Anonymous",
        assessment_id: assessmentId,
        assessment_title: String(assessment.title ?? ""),
        subject_code: String(assessment.subject_code ?? ""),
        subject_name: String(assessment.subject_name ?? ""),
        answers: Object.fromEntries(
          Object.entries(answers).map(([qid, answerIndex]) => [
            qid,
            String(answerIndex),
          ])
        ),
        score: score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_taken: timeLimitMinutes * 60 - timeLeft,
        max_time: timeLimitMinutes * 60,
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
        assessmentId: assessmentId || "",
        score: score.toString(),
        correctAnswers: correctAnswers.toString(),
        totalQuestions: totalQuestions.toString(),
        timeTaken: (timeLimitMinutes * 60 - timeLeft).toString(),
      });

      router.push(
        `/exercises/${resolvedParams.id}/result?${resultParams.toString()}`
      );
    } catch (error) {
      console.error("Error submitting assessment:", error);
      alert("Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    answers,
    questions,
    assessment,
    assessmentId,
    timeLeft,
    user,
    authFetch,
    router,
    resolvedParams.id,
    calculateScore,
  ]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          if (!submitting && questions.length > 0) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitting, questions.length, handleSubmit]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "current":
        return "bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2";
      case "answered":
        return "bg-[#49BBBD] text-white";
      case "unanswered":
        return "bg-gray-300 text-gray-700";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!assessmentId || !assessment || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Không tìm thấy bài kiểm tra
          </h2>
          <Link
            href={`/exercises/${resolvedParams.id}`}
            className="text-blue-600 hover:underline"
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  {isQuickTest ? "Kiểm tra nhanh" : String(assessment.title ?? "")}
                </div>
                <div>Lần {attemptNumber}</div>
              </div>
            </div>
            <div className="w-6 md:w-7"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                      <span className="text-sm md:text-base font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full arimo-medium">
                        1 điểm
                      </span>
                    </div>

                    {/* Question Content */}
                    <p className="text-base md:text-lg text-gray-700 mb-6 md:mb-8 leading-relaxed arimo-regular">
                      {questionText}
                    </p>

                    {/* Answer Options */}
                    <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                      {options.length > 0 ? (
                        options.map((option: unknown, optionIndex: number) => {
                          const optionStr = String(option);
                          const isSelected = answers[questionId] === optionStr;
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
                                type="radio"
                                name={`question-${questionId}`}
                                value={optionStr}
                                checked={isSelected}
                                onChange={() =>
                                  handleAnswerChange(index, optionStr)
                                }
                                className="w-5 h-5 md:w-6 md:h-6 mt-0.5 text-[#49BBBD] focus:ring-[#49BBBD] border-gray-300 cursor-pointer"
                              />
                              <span className="text-base md:text-lg text-gray-700 flex-1 arimo-regular leading-relaxed">
                                {optionStr}
                              </span>
                            </label>
                          );
                        })
                      ) : (
                        <input
                          type="text"
                          placeholder="Nhập câu trả lời của bạn"
                          value={answers[questionId] || ""}
                          onChange={(e) =>
                            handleAnswerChange(index, e.target.value)
                          }
                          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent arimo-regular"
                        />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleClearAnswer(index)}
                        className="text-sm md:text-base text-gray-600 hover:text-gray-800 transition-colors arimo-regular"
                      >
                        Xóa câu trả lời
                      </button>
                      <button
                        onClick={() => handleMarkQuestion(index)}
                        className="flex items-center space-x-2 text-sm md:text-base text-gray-600 hover:text-gray-800 transition-colors arimo-regular"
                      >
                        <Star
                          className={`h-4 w-4 md:h-5 md:w-5 transition-colors ${
                            markedQuestions.has(index)
                              ? "text-yellow-500 fill-current"
                              : "text-gray-400"
                          }`}
                        />
                        <span>Đánh dấu câu hỏi</span>
                      </button>
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
                  <div className={`text-2xl md:text-3xl font-bold poppins-bold ${
                    timeLeft < 300 ? "text-red-600" : timeLeft < 600 ? "text-orange-600" : "text-gray-900"
                  }`}>
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
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentQuestion(index);
                          // Scroll to question
                          const questionElement = document.getElementById(`question-${index}`);
                          if (questionElement) {
                            questionElement.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-full text-sm md:text-base font-medium transition-all duration-200 relative flex items-center justify-center ${
                          status === "current"
                            ? "bg-orange-500 text-white ring-2 ring-orange-300 ring-offset-2 scale-110"
                            : isAnswered
                            ? "bg-[#49BBBD] text-white hover:bg-[#3da8aa]"
                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                        }`}
                        title={`Câu ${questionNumber}${isMarked ? " (Đã đánh dấu)" : ""}`}
                      >
                        {questionNumber}
                        {isMarked && (
                          <Star className="absolute -top-1 -right-1 h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-current" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || questions.length === 0}
                className={`w-full py-3 md:py-4 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg ${
                  submitting || questions.length === 0
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-[#125093] text-white hover:bg-[#0f4278] hover:shadow-xl hover:scale-105"
                } poppins-semibold text-base md:text-lg`}
              >
                {submitting ? "Đang nộp bài..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#125093] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
