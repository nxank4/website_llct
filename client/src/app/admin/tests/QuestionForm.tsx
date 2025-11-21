"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Question {
  id?: number;
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

interface QuestionFormProps {
  assessmentId: number;
  question?: Question | null;
  onClose: () => void;
  onSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// Hàm chuyển đổi index thành label: A, B, C, D... a, b, c, d... 1, 2, 3, 4...
function getOptionLabel(index: number): string {
  // A-Z (0-25)
  if (index < 26) {
    return String.fromCharCode(65 + index); // 65 = 'A'
  }
  // a-z (26-51)
  if (index < 52) {
    return String.fromCharCode(97 + index - 26); // 97 = 'a'
  }
  // 1, 2, 3, 4... (52+)
  return String(index - 51);
}

export default function QuestionForm({
  assessmentId,
  question,
  onClose,
  onSuccess,
  authFetch,
}: QuestionFormProps) {
  const isEditing = !!question;
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    question_text: question?.question_text || "",
    question_type: (question?.question_type ||
      "multiple_choice") as Question["question_type"],
    options: question?.options || ["", "", "", ""],
    correct_answer: question?.correct_answer || "",
    explanation: question?.explanation || "",
    points: question?.points || 1.0,
    difficulty_level: question?.difficulty_level || 1,
    tags: question?.tags || [],
    allow_multiple_selection: question?.allow_multiple_selection || false,
    word_limit: question?.word_limit ? String(question.word_limit) : "",
    input_type: question?.input_type || "text",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleAddOption = () => {
    // Giới hạn tối đa 10 options (A-J hoặc a-j hoặc 1-10)
    if (formData.options && formData.options.length >= 10) {
      showToast({
        type: "warning",
        title: "Cảnh báo",
        message: "Số lượng lựa chọn tối đa là 10",
      });
      return;
    }
    setFormData({
      ...formData,
      options: [...(formData.options || []), ""],
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = formData.options?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, options: newOptions });
    // Reset correct_answer if it references removed option
    if (formData.question_type === "multiple_choice") {
      const removedLabel = getOptionLabel(index);
      const currentAnswers = formData.correct_answer
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a !== removedLabel);
      setFormData({
        ...formData,
        options: newOptions,
        correct_answer: currentAnswers.join(", "),
      });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submit
    if (submitting) return;

    setSubmitting(true);

    try {
      // Validate multiple choice questions
      if (
        formData.question_type === "multiple_choice" &&
        (!formData.options ||
          formData.options.filter((o) => o.trim()).length < 2)
      ) {
        showToast({
          type: "error",
          title: "Lỗi",
          message: "Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn",
        });
        setSubmitting(false);
        return;
      }

      // Validate correct answer for multiple choice
      if (formData.question_type === "multiple_choice") {
        if (!formData.correct_answer.trim()) {
          showToast({
            type: "error",
            title: "Lỗi",
            message: "Vui lòng chọn đáp án đúng",
          });
          setSubmitting(false);
          return;
        }
      }

      interface QuestionPayload {
        question_text: string;
        question_type: "multiple_choice" | "essay" | "fill_in_blank";
        correct_answer: string;
        explanation: string | null;
        points: number;
        difficulty_level: number;
        tags: string[];
        allow_multiple_selection: boolean;
        word_limit: number | null;
        input_type: "text" | "number" | null;
        options?: string[];
      }

      const payload: QuestionPayload = {
        question_text: formData.question_text,
        question_type: formData.question_type,
        correct_answer: formData.correct_answer,
        explanation: formData.explanation || null,
        points: formData.points,
        difficulty_level: formData.difficulty_level,
        tags: formData.tags.filter((t) => t.trim()),
        allow_multiple_selection:
          formData.question_type === "multiple_choice"
            ? formData.allow_multiple_selection
            : false,
        word_limit:
          formData.question_type === "essay" && formData.word_limit
            ? parseInt(formData.word_limit) || null
            : null,
        input_type:
          formData.question_type === "essay" ||
          formData.question_type === "fill_in_blank"
            ? formData.input_type
            : null,
      };

      if (formData.question_type === "multiple_choice") {
        payload.options = formData.options?.filter((o) => o.trim()) || [];
      }

      const url = isEditing
        ? `${API_ENDPOINTS.ASSESSMENTS}/${assessmentId}/questions/${question.id}`
        : `${API_ENDPOINTS.ASSESSMENTS}/${assessmentId}/questions`;

      const response = await authFetch(getFullUrl(url), {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast({
          type: "success",
          title: "Thành công",
          message: isEditing
            ? "Đã cập nhật câu hỏi thành công"
            : "Đã tạo câu hỏi thành công",
        });
        onSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast({
          type: "error",
          title: "Lỗi",
          message: errorData.detail || "Không thể lưu câu hỏi",
        });
      }
    } catch (error) {
      console.error("Error saving question:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi lưu câu hỏi",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validOptions = formData.options?.filter((o) => o.trim()) || [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto p-0 bg-card text-card-foreground border border-border">
        <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-foreground">
                {isEditing ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Nhập nội dung và cấu hình cho câu hỏi của bài kiểm tra
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="question-type">
                Loại câu hỏi <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={formData.question_type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    question_type: value as Question["question_type"],
                    // Reset options when changing type
                    options:
                      value === "multiple_choice" ? ["", "", "", ""] : [],
                    correct_answer: "",
                  })
                }
              >
                <SelectTrigger id="question-type" className="w-full">
                  <SelectValue placeholder="Chọn loại câu hỏi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Trắc nghiệm</SelectItem>
                  <SelectItem value="essay">Tự luận</SelectItem>
                  <SelectItem value="fill_in_blank">
                    Điền vào chỗ trống
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="question-text">
                Nội dung câu hỏi <span className="text-destructive">*</span>
              </FieldLabel>
              <Textarea
                id="question-text"
                required
                value={formData.question_text}
                onChange={(e) =>
                  setFormData({ ...formData, question_text: e.target.value })
                }
                rows={3}
                className="w-full"
                placeholder="Nhập nội dung câu hỏi..."
              />
            </Field>

            {formData.question_type === "multiple_choice" && (
              <Field>
                <FieldLabel>
                  Các lựa chọn <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="space-y-2">
                  {formData.options?.map((option, index) => {
                    const label = getOptionLabel(index);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="w-8 text-center font-semibold text-muted-foreground">
                          {label}.
                        </span>
                        <Input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            handleOptionChange(index, e.target.value)
                          }
                          placeholder={`Nhập nội dung lựa chọn ${label}`}
                          className="flex-1"
                        />
                        {formData.options && formData.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Xóa lựa chọn"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {formData.options && formData.options.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded-lg border border-[hsl(var(--primary))]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm lựa chọn</span>
                    </button>
                  )}
                </div>
              </Field>
            )}

            {formData.question_type === "multiple_choice" && (
              <Field>
                <FieldLabel htmlFor="question-answer-mode">
                  Chế độ chọn đáp án{" "}
                  <span className="text-muted-foreground/70 text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Select
                  value={
                    formData.allow_multiple_selection ? "multiple" : "single"
                  }
                  onValueChange={(value) => {
                    const isMultiple = value === "multiple";
                    setFormData({
                      ...formData,
                      allow_multiple_selection: isMultiple,
                      // Reset to first answer if switching from multiple to single
                      correct_answer: isMultiple
                        ? ""
                        : formData.correct_answer.split(",")[0]?.trim() || "",
                    });
                  }}
                >
                  <SelectTrigger id="question-answer-mode" className="w-full">
                    <SelectValue placeholder="Chọn chế độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Chọn một đáp án</SelectItem>
                    <SelectItem value="multiple">Chọn nhiều đáp án</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="question-correct-answer">
                Đáp án đúng <span className="text-destructive">*</span>
              </FieldLabel>
              {formData.question_type === "multiple_choice" ? (
                formData.allow_multiple_selection ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Chọn tất cả các đáp án đúng (có thể chọn nhiều):
                    </p>
                    {validOptions.length === 0 ? (
                      <div className="p-4 bg-yellow-50/70 border border-yellow-300 rounded-lg">
                        <p className="text-sm text-yellow-900">
                          ⚠️ Vui lòng nhập ít nhất 2 lựa chọn ở trên trước khi
                          chọn đáp án đúng
                        </p>
                      </div>
                    ) : (
                      validOptions.map((_, index) => {
                        const label = getOptionLabel(index);
                        const isSelected = formData.correct_answer
                          .split(",")
                          .map((a) => a.trim())
                          .includes(label);
                        return (
                          <label
                            key={index}
                            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 shadow-sm"
                                : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center flex-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentAnswers = formData.correct_answer
                                    .split(",")
                                    .map((a) => a.trim())
                                    .filter((a) => a);
                                  if (checked) {
                                    if (!currentAnswers.includes(label)) {
                                      currentAnswers.push(label);
                                    }
                                  } else {
                                    const idx = currentAnswers.indexOf(label);
                                    if (idx > -1) {
                                      currentAnswers.splice(idx, 1);
                                    }
                                  }
                                  setFormData({
                                    ...formData,
                                    correct_answer: currentAnswers.join(", "),
                                  });
                                }}
                              />
                              <div className="ml-3 flex-1">
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold mr-3 ${
                                    isSelected
                                      ? "bg-[hsl(var(--primary))] text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {label}
                                </span>
                                <span className="text-foreground">
                                  {formData.options?.[index] || (
                                    <span className="text-muted-foreground italic">
                                      (Chưa nhập nội dung)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="ml-2">
                                <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-secondary-foreground"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path d="M5 13l4 4L19 7"></path>
                                  </svg>
                                </div>
                              </div>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Chọn một đáp án đúng duy nhất:
                    </p>
                    {validOptions.length === 0 ? (
                      <div className="p-4 bg-yellow-50/70 border border-yellow-300 rounded-lg">
                        <p className="text-sm text-yellow-900">
                          ⚠️ Vui lòng nhập ít nhất 2 lựa chọn ở trên trước khi
                          chọn đáp án đúng
                        </p>
                      </div>
                    ) : (
                      <Select
                        value={formData.correct_answer.trim()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            correct_answer: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Chọn đáp án đúng" />
                        </SelectTrigger>
                        <SelectContent>
                          {validOptions.map((_, index) => {
                            const label = getOptionLabel(index);
                            const optionText = formData.options?.[index] || "";
                            return (
                              <SelectItem key={index} value={label}>
                                <span className="font-semibold mr-2">
                                  {label}.
                                </span>
                                {optionText || (
                                  <span className="text-muted-foreground italic">
                                    (Chưa nhập nội dung)
                                  </span>
                                )}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )
              ) : (
                <Textarea
                  required
                  value={formData.correct_answer}
                  onChange={(e) =>
                    setFormData({ ...formData, correct_answer: e.target.value })
                  }
                  rows={2}
                  className="w-full"
                  placeholder="Nhập đáp án mẫu hoặc để trống"
                />
              )}
            </Field>

            {(formData.question_type === "essay" ||
              formData.question_type === "fill_in_blank") && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="question-word-limit">
                    Giới hạn số từ{" "}
                    <span className="text-muted-foreground/70 text-xs">
                      (Tùy chọn)
                    </span>
                  </FieldLabel>
                  <Input
                    id="question-word-limit"
                    type="number"
                    min="0"
                    value={formData.word_limit || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, word_limit: e.target.value })
                    }
                    className="w-full"
                    placeholder="Để trống = không giới hạn"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="question-input-type">
                    Loại đầu vào{" "}
                    <span className="text-muted-foreground/70 text-xs">
                      (Tùy chọn)
                    </span>
                  </FieldLabel>
                  <Select
                    value={formData.input_type || "text"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        input_type: value as "text" | "number",
                      })
                    }
                  >
                    <SelectTrigger id="question-input-type" className="w-full">
                      <SelectValue placeholder="Chọn loại đầu vào" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Văn bản</SelectItem>
                      <SelectItem value="number">Số</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="question-points">
                  Điểm số cả câu <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="question-points"
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={formData.points}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      points: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="question-difficulty">
                  Độ khó (1-5){" "}
                  <span className="text-muted-foreground/70 text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Input
                  id="question-difficulty"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.difficulty_level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      difficulty_level: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="question-explanation">
                Giải thích{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <Textarea
                id="question-explanation"
                value={formData.explanation || ""}
                onChange={(e) =>
                  setFormData({ ...formData, explanation: e.target.value })
                }
                rows={2}
                className="w-full"
                placeholder="Giải thích cho đáp án đúng..."
              />
            </Field>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <DialogClose asChild>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" inline />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>{isEditing ? "Cập nhật" : "Tạo câu hỏi"}</span>
                )}
              </button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
