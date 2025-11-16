"use client";

import { useState, useEffect } from "react";
import { X, Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import QuestionForm from "./QuestionForm";
import Spinner from "@/components/ui/Spinner";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Assessment {
  id: number;
  title: string;
}

interface Question {
  id: number;
  question_text: string;
  question_type: "multiple_choice" | "essay" | "fill_in_blank";
  options?: string[] | null;
  correct_answer: string;
  explanation?: string | null;
  points: number;
  difficulty_level: number;
  tags?: string[] | null;
  allow_multiple_selection?: boolean;
  word_limit?: number | null;
  input_type?: "text" | "number" | null;
}

interface ManageQuestionsModalProps {
  assessment: Assessment;
  onClose: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function ManageQuestionsModal({
  assessment,
  onClose,
  authFetch,
}: ManageQuestionsModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    questionId: number | null;
  }>({ isOpen: false, questionId: null });
  const { showToast } = useToast();

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.ASSESSMENT_QUESTIONS(assessment.id))
      );
      if (response.ok) {
        const data = await response.json();
        setQuestions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Không thể tải danh sách câu hỏi",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [assessment.id]);

  const handleDeleteQuestion = (questionId: number) => {
    setDeleteConfirmDialog({ isOpen: true, questionId });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteConfirmDialog.questionId) return;

    try {
      const response = await authFetch(
        getFullUrl(
          `${API_ENDPOINTS.ASSESSMENTS}/${assessment.id}/questions/${deleteConfirmDialog.questionId}`
        ),
        { method: "DELETE" }
      );

      if (response.ok) {
        showToast({
          type: "success",
          title: "Thành công",
          message: "Đã xóa câu hỏi thành công",
        });
        fetchQuestions();
        setDeleteConfirmDialog({ isOpen: false, questionId: null });
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast({
          type: "error",
          title: "Lỗi",
          message: errorData.detail || "Không thể xóa câu hỏi",
        });
        setDeleteConfirmDialog({ isOpen: false, questionId: null });
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi xóa câu hỏi",
      });
      setDeleteConfirmDialog({ isOpen: false, questionId: null });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Quản lý câu hỏi
            </h2>
            <p className="text-sm text-gray-600 mt-1">{assessment.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingQuestion(null);
                setShowQuestionForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm câu hỏi</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Chưa có câu hỏi nào</p>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionForm(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm câu hỏi đầu tiên</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          Câu {index + 1}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {question.question_type === "multiple_choice"
                            ? "Trắc nghiệm"
                            : question.question_type === "essay"
                            ? "Tự luận"
                            : "Điền vào chỗ trống"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {question.points} điểm
                        </span>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">
                        {question.question_text}
                      </p>
                      {question.options && question.options.length > 0 && (
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-2">
                          {question.options.map((option, optIdx) => (
                            <li key={optIdx}>{option}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-sm text-gray-600">
                        <strong>Đáp án đúng:</strong> {question.correct_answer}
                      </p>
                      {question.explanation && (
                        <p className="text-sm text-gray-500 mt-1">
                          <strong>Giải thích:</strong> {question.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingQuestion(question);
                          setShowQuestionForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showQuestionForm && (
        <QuestionForm
          assessmentId={assessment.id}
          question={editingQuestion}
          onClose={() => {
            setShowQuestionForm(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setShowQuestionForm(false);
            setEditingQuestion(null);
            fetchQuestions();
          }}
          authFetch={authFetch}
        />
      )}

      {/* Delete Question Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, questionId: null });
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          />
          <AlertDialog.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[425px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
            )}
          >
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <AlertDialog.Title className="text-lg font-semibold">
                  Xác nhận xóa
                </AlertDialog.Title>
              </div>
              <AlertDialog.Description className="text-sm text-gray-600 pt-2">
                Bạn có chắc chắn muốn xóa câu hỏi này?
              </AlertDialog.Description>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Hủy</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="destructive" onClick={confirmDeleteQuestion}>
                  Xóa
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

