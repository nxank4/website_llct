'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Mail, Phone } from 'lucide-react';
import { API_ENDPOINTS, getFullUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function TestAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const { authFetch, user } = useAuth();
  const router = useRouter();
  
  const [timeLeft, setTimeLeft] = useState(3600); // Will be updated from assessment data
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
  const [questions, setQuestions] = useState<any[]>([]);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  const subjectInfo = {
    'mln111': { code: 'MLN111', name: 'Triết học Mác - Lê-nin' },
    'mln122': { code: 'MLN122', name: 'Kinh tế chính trị Mác - Lê-nin' },
    'mln131': { code: 'MLN131', name: 'Chủ nghĩa xã hội khoa học' },
    'hcm202': { code: 'HCM202', name: 'Tư tưởng Hồ Chí Minh' },
    'vnr202': { code: 'VNR202', name: 'Lịch sử Đảng Cộng sản Việt Nam' }
  };

  const currentSubject = subjectInfo[resolvedParams.id as keyof typeof subjectInfo] || subjectInfo.mln111;

  // Load assessment and questions
  useEffect(() => {
    const loadAssessmentData = async () => {
      if (!assessmentId) {
        setLoading(false);
        return;
      }

      try {
        // Load assessment details
        const assessmentRes = await authFetch(getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENT_DETAIL(assessmentId)));
        const assessmentData = await assessmentRes.json();
        setAssessment(assessmentData);

        // Load questions
        const questionsRes = await authFetch(getFullUrl(API_ENDPOINTS.MONGO_ASSESSMENT_QUESTIONS(assessmentId)));
        const questionsData = await questionsRes.json();
        setQuestions(questionsData);

        // Set timer from assessment data
        if (assessmentData.time_limit_minutes) {
          setTimeLeft(assessmentData.time_limit_minutes * 60);
        }

        // Start test attempt (backend result tracking)
        try {
          const startRes = await authFetch(getFullUrl(API_ENDPOINTS.TEST_RESULTS_START), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              test_id: assessmentId,
              test_title: assessmentData.title,
              subject_id: assessmentData.subject_id || resolvedParams.id,
              subject_name: assessmentData.subject_name || currentSubject.name,
              total_questions: (questionsData || []).length,
              time_limit: assessmentData.time_limit_minutes,
              max_attempts: assessmentData.max_attempts || 1,
              passing_score: 60,
            }),
          });
          if (startRes.ok) {
            const startData = await startRes.json();
            setResultId(startData.id);
          }
        } catch (e) {
          console.warn('Could not start test tracking, will still allow attempt.');
        }
      } catch (error) {
        console.error('Error loading assessment:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssessmentData();
  }, [assessmentId, authFetch]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
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
  }, [submitting, questions.length]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateScore = () => {
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    questions.forEach((question, index) => {
      const questionId = question._id || index.toString();
      const userAnswer = answers[questionId];
      const correctAnswer = question.correct_answer;

      if (userAnswer && correctAnswer && userAnswer === correctAnswer) {
        correctAnswers++;
      }
    });

    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    return {
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      correctAnswers,
      totalQuestions
    };
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const confirmSubmit = window.confirm(
      `Bạn có chắc chắn muốn nộp bài?\n\nSố câu đã trả lời: ${Object.keys(answers).length}/${questions.length}\nThời gian còn lại: ${formatTime(timeLeft)}`
    );

    if (!confirmSubmit) return;

    setSubmitting(true);

    try {
      const { score, correctAnswers, totalQuestions } = calculateScore();
      
      // Save result to backend
      const resultData = {
        student_id: user?.id?.toString() || 'anonymous',
        student_name: user?.full_name || user?.email || 'Anonymous',
        assessment_id: assessmentId,
        assessment_title: assessment.title,
        subject_code: assessment.subject_code,
        subject_name: assessment.subject_name,
        answers: Object.fromEntries(
          Object.entries(answers).map(([qid, answerIndex]) => [qid, String(answerIndex)])
        ),
        score: score,
        correct_answers: correctAnswers,
        total_questions: totalQuestions,
        time_taken: (assessment.time_limit_minutes * 60) - timeLeft,
        max_time: assessment.time_limit_minutes * 60
      };

      // Save to MongoDB via API (Beanie assessment results)
      try {
        const res = await authFetch(getFullUrl(API_ENDPOINTS.ASSESSMENT_RESULTS), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultData),
        });
        if (!res.ok) throw new Error('Failed to save result to Mongo');
      } catch (apiError) {
        console.error('Error saving to API, falling back to localStorage:', apiError);
        // Fallback to localStorage if API fails
        const existingResults = JSON.parse(localStorage.getItem('assessment_results') || '[]');
        existingResults.push({...resultData, completed_at: new Date().toISOString()});
        localStorage.setItem('assessment_results', JSON.stringify(existingResults));
      }

      // Redirect to result page with score data
      const resultParams = new URLSearchParams({
        assessmentId: assessmentId || '',
        score: score.toString(),
        correctAnswers: correctAnswers.toString(),
        totalQuestions: totalQuestions.toString(),
        timeTaken: ((assessment.time_limit_minutes * 60) - timeLeft).toString()
      });

      router.push(`/exercises/${resolvedParams.id}/result?${resultParams.toString()}`);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Có lỗi xảy ra khi nộp bài. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    const questionId = questions[questionIndex]?._id || questionIndex.toString();
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleClearAnswer = (questionIndex: number) => {
    const questionId = questions[questionIndex]?._id || questionIndex.toString();
    setAnswers(prev => {
      const newAnswers = { ...prev };
      delete newAnswers[questionId];
      return newAnswers;
    });
  };

  const handleMarkQuestion = (questionIndex: number) => {
    setMarkedQuestions(prev => {
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
    if (questionIndex === currentQuestion) return 'current';
    const questionId = questions[questionIndex]?._id || questionIndex.toString();
    if (answers[questionId] !== undefined) return 'answered';
    return 'unanswered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-orange-500 text-white';
      case 'answered': return 'bg-teal-500 text-white';
      case 'unanswered': return 'bg-gray-300 text-white';
      default: return 'bg-gray-300 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessmentId || !assessment || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy bài kiểm tra</h2>
          <Link href={`/exercises/${resolvedParams.id}`} className="text-blue-600 hover:underline">
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
          <div className="flex items-center justify-between h-16">
            <Link href={`/exercises/${resolvedParams.id}`} className="flex items-center">
              <ArrowLeft className="h-6 w-6 text-gray-600 hover:text-gray-800 transition-colors" />
            </Link>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">{currentSubject.code}</h1>
              <div className="text-sm text-gray-600 space-y-1">
                <div>{assessment.title}</div>
                <div>{currentSubject.name}</div>
                <div>{questions.length} câu hỏi</div>
              </div>
            </div>
            <div className="w-6"></div> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Questions */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question._id || index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  {/* Question Header */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Câu {index + 1}</h3>
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      1 điểm
                    </span>
                  </div>

                  {/* Question Content */}
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {question.question_text}
                  </p>

                  {/* Answer Options */}
                  <div className="space-y-3 mb-6">
                    {question.options && question.options.length > 0 ? (
                      question.options.map((option: string, optionIndex: number) => (
                        <label key={optionIndex} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${question._id || index}`}
                            value={option}
                            checked={answers[question._id || index] === option}
                            onChange={() => handleAnswerChange(index, option)}
                            className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      ))
                    ) : (
                      <input
                        type="text"
                        placeholder="Nhập câu trả lời của bạn"
                        value={answers[question._id || index] || ''}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleClearAnswer(index)}
                      className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Xóa câu trả lời
                    </button>
                    <button
                      onClick={() => handleMarkQuestion(index)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <Star 
                        className={`h-4 w-4 ${markedQuestions.has(index) ? 'text-yellow-500 fill-current' : ''}`} 
                      />
                      <span>Đánh dấu câu hỏi</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Timer and Navigation */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Timer */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-center text-lg font-semibold text-gray-900 mb-4">
                  Thời gian làm bài còn
                </h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Question Navigation Grid */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  Điều hướng câu hỏi
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {questions.map((_, index) => {
                    const questionNumber = index + 1;
                    const status = getQuestionStatus(index);
                    const isMarked = markedQuestions.has(index);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestion(index)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors relative ${getStatusColor(status)}`}
                      >
                        {questionNumber}
                        {isMarked && (
                          <Star className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 fill-current" />
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
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors shadow-md ${
                  submitting || questions.length === 0
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {submitting ? 'Đang nộp bài...' : 'Nộp bài'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">SS</span>
                </div>
                <div className="text-white">
                  <div className="text-lg font-semibold">Soft Skills Department</div>
                  <div className="text-sm opacity-90">Trường ĐH FPT</div>
                </div>
              </div>
            </div>

            {/* Center Column */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Văn phòng Bộ môn Kỹ năng mềm</strong>
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
              <h3 className="text-lg font-semibold mb-4">Thầy Văn Bình</h3>
              <div className="space-y-2 text-sm">
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
          <div className="border-t border-blue-700 mt-8 pt-8 text-center">
            <p className="text-sm opacity-90">
              Soft Skills Department | Trường Đại học FPT
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}