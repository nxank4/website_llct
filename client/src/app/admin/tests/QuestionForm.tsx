"use client";

import { useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";

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
    setSubmitting(true);

    try {
      // Validate multiple choice questions
      if (
        formData.question_type === "multiple_choice" &&
        (!formData.options || formData.options.filter((o) => o.trim()).length < 2)
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
        const validOptions = formData.options?.filter((o) => o.trim()) || [];
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

      const payload: any = {
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
          formData.question_type === "essay" || formData.question_type === "fill_in_blank"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại câu hỏi <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.question_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  question_type: e.target.value as Question["question_type"],
                  // Reset options when changing type
                  options:
                    e.target.value === "multiple_choice"
                      ? ["", "", "", ""]
                      : [],
                  correct_answer: "",
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            >
              <option value="multiple_choice">Trắc nghiệm</option>
              <option value="essay">Tự luận</option>
              <option value="fill_in_blank">Điền vào chỗ trống</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung câu hỏi <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.question_text}
              onChange={(e) =>
                setFormData({ ...formData, question_text: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              placeholder="Nhập nội dung câu hỏi..."
            />
          </div>

          {formData.question_type === "multiple_choice" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Các lựa chọn <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {formData.options?.map((option, index) => {
                  const label = getOptionLabel(index);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-8 text-center font-semibold text-gray-700">
                        {label}.
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Nhập nội dung lựa chọn ${label}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
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
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-[#125093] hover:bg-blue-50 rounded-lg border border-[#125093]"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Thêm lựa chọn</span>
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="allow_multiple"
                  checked={formData.allow_multiple_selection}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allow_multiple_selection: e.target.checked,
                      // Reset correct_answer when toggling
                      correct_answer: e.target.checked ? "" : formData.correct_answer.split(",")[0] || "",
                    })
                  }
                  className="h-4 w-4 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="allow_multiple"
                  className="ml-2 text-sm text-gray-700 cursor-pointer"
                >
                  Cho phép chọn nhiều đáp án
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đáp án đúng <span className="text-red-500">*</span>
            </label>
            {formData.question_type === "multiple_choice" ? (
              formData.allow_multiple_selection ? (
                <div className="space-y-2">
                  {validOptions.map((_, index) => {
                    const label = getOptionLabel(index);
                    const isSelected = formData.correct_answer
                      .split(",")
                      .map((a) => a.trim())
                      .includes(label);
                    return (
                      <label
                        key={index}
                        className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const currentAnswers = formData.correct_answer
                              .split(",")
                              .map((a) => a.trim())
                              .filter((a) => a);
                            if (e.target.checked) {
                              // Thêm label vào danh sách
                              if (!currentAnswers.includes(label)) {
                                currentAnswers.push(label);
                              }
                            } else {
                              // Xóa label khỏi danh sách
                              const index = currentAnswers.indexOf(label);
                              if (index > -1) {
                                currentAnswers.splice(index, 1);
                              }
                            }
                            setFormData({
                              ...formData,
                              correct_answer: currentAnswers.join(", "),
                            });
                          }}
                          className="h-4 w-4 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
                        />
                        <span className="ml-3 flex-1">
                          <span className="font-semibold text-gray-900">{label}.</span>{" "}
                          <span className="text-gray-700">{formData.options?.[index]}</span>
                        </span>
                      </label>
                    );
                  })}
                  {validOptions.length === 0 && (
                    <p className="text-sm text-gray-500 italic">
                      Vui lòng nhập ít nhất 2 lựa chọn ở trên
                    </p>
                  )}
                </div>
              ) : (
                <select
                  required
                  value={formData.correct_answer.trim()}
                  onChange={(e) =>
                    setFormData({ ...formData, correct_answer: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                >
                  <option value="">Chọn đáp án đúng</option>
                  {validOptions.map((_, index) => {
                    const label = getOptionLabel(index);
                    return (
                      <option key={index} value={label}>
                        {label}. {formData.options?.[index]}
                      </option>
                    );
                  })}
                </select>
              )
            ) : (
              <textarea
                required
                value={formData.correct_answer}
                onChange={(e) =>
                  setFormData({ ...formData, correct_answer: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                placeholder="Nhập đáp án mẫu hoặc để trống"
              />
            )}
          </div>

          {(formData.question_type === "essay" ||
            formData.question_type === "fill_in_blank") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Giới hạn số từ <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.word_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, word_limit: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                  placeholder="Để trống = không giới hạn"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại đầu vào <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                </label>
                <select
                  value={formData.input_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      input_type: e.target.value as "text" | "number",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                >
                  <option value="text">Văn bản</option>
                  <option value="number">Số</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Điểm số cả câu <span className="text-red-500">*</span>
              </label>
              <input
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Độ khó (1-5) <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <input
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Giải thích <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              placeholder="Giải thích cho đáp án đúng..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEditing ? "Cập nhật" : "Tạo câu hỏi"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
