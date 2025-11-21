"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import QuestionForm from "./QuestionForm";
import Spinner from "@/components/ui/Spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const fetchQuestions = useCallback(async () => {
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
  }, [assessment.id, authFetch, showToast]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

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
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
      >
        <DialogContent className="max-w-5xl w-full max-h-[90vh] p-0 flex flex-col bg-card text-card-foreground border border-border shadow-xl">
          <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4 pr-12">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-foreground">
                  Quản lý câu hỏi
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {assessment.title}
                </DialogDescription>
              </div>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setShowQuestionForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm câu hỏi</span>
              </button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Chưa có câu hỏi nào</p>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setShowQuestionForm(true);
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[hsl(var(--primary))] text-primary-foreground rounded-lg hover:bg-[hsl(var(--primary)/0.85)] transition-colors"
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
                    className="border border-border rounded-lg p-4 bg-card/70 hover:bg-card transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Câu {index + 1}
                          </span>
                          <span className="text-xs px-2 py-1 bg-[hsl(var(--info))]/15 text-[hsl(var(--info))] rounded">
                            {question.question_type === "multiple_choice"
                              ? "Trắc nghiệm"
                              : question.question_type === "essay"
                              ? "Tự luận"
                              : "Điền vào chỗ trống"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {question.points} điểm
                          </span>
                        </div>
                        <p className="text-foreground font-medium mb-2">
                          {question.question_text}
                        </p>
                        {question.options && question.options.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-2">
                            {question.options.map((option, optIdx) => (
                              <li key={optIdx}>{option}</li>
                            ))}
                          </ul>
                        )}
                        <p className="text-sm text-muted-foreground">
                          <strong>Đáp án đúng:</strong>{" "}
                          {question.correct_answer}
                        </p>
                        {question.explanation && (
                          <p className="text-sm text-muted-foreground mt-1">
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
                          className="text-primary hover:text-primary/80"
                          title="Chỉnh sửa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="text-destructive hover:text-destructive/80"
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
        </DialogContent>
      </Dialog>

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
      <AlertDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, questionId: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Bạn có chắc chắn muốn xóa câu hỏi này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Hủy</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDeleteQuestion}>
                Xóa
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
