"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";

interface Assessment {
  id: number;
  title: string;
  description?: string;
  assessment_type: string;
  subject_id: number;
  time_limit_minutes?: number;
  max_attempts?: number;
  is_published: boolean;
  is_randomized: boolean;
}

interface EditAssessmentModalProps {
  assessment: Assessment;
  onClose: () => void;
  onSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function EditAssessmentModal({
  assessment,
  onClose,
  onSuccess,
  authFetch,
}: EditAssessmentModalProps) {
  const [formData, setFormData] = useState({
    title: assessment.title,
    description: assessment.description || "",
    assessment_type: assessment.assessment_type as
      | "pre_test"
      | "post_test"
      | "quiz"
      | "assignment",
    subject_id: String(assessment.subject_id),
    time_limit_minutes: assessment.time_limit_minutes
      ? String(assessment.time_limit_minutes)
      : "",
    max_attempts: assessment.max_attempts
      ? String(assessment.max_attempts)
      : "",
    is_published: assessment.is_published,
    is_randomized: assessment.is_randomized,
  });
  const [subjects, setSubjects] = useState<
    Array<{ id: number; name: string; code?: string }>
  >([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await authFetch(getFullUrl("/api/v1/admin/subjects"));
        if (response.ok) {
          const data = await response.json();
          const subjectsList = Array.isArray(data)
            ? data.map(
                (s: {
                  id: number;
                  name: string;
                  code?: string;
                }) => ({
                  id: s.id,
                  name: s.name || `Subject ${s.id}`,
                  code: s.code,
                })
              )
            : [];
          setSubjects(subjectsList);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [authFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        assessment_type: formData.assessment_type,
        subject_id: parseInt(formData.subject_id),
        time_limit_minutes: formData.time_limit_minutes
          ? parseInt(formData.time_limit_minutes) || null
          : null,
        max_attempts: formData.max_attempts
          ? parseInt(formData.max_attempts) || 0
          : 0,
        is_published: formData.is_published,
        is_randomized: formData.is_randomized,
      };

      const response = await authFetch(
        getFullUrl(`${API_ENDPOINTS.ASSESSMENTS}/${assessment.id}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        showToast({
          type: "success",
          title: "Thành công",
          message: "Đã cập nhật bài kiểm tra thành công",
        });
        onSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast({
          type: "error",
          title: "Lỗi",
          message: errorData.detail || "Không thể cập nhật bài kiểm tra",
        });
      }
    } catch (error) {
      console.error("Error updating assessment:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi cập nhật bài kiểm tra",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa bài kiểm tra</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại bài kiểm tra <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.assessment_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assessment_type: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
              >
                <option value="quiz">Quiz</option>
                <option value="pre_test">Kiểm tra đầu kỳ</option>
                <option value="post_test">Kiểm tra cuối kỳ</option>
                <option value="assignment">Bài tập</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Môn học <span className="text-red-500">*</span>
              </label>
              {loadingSubjects ? (
                <div className="px-3 py-2 text-sm text-gray-500">Đang tải...</div>
              ) : (
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) =>
                    setFormData({ ...formData, subject_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                >
                  <option value="">Chọn môn học</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code ? `${subject.code} - ` : ""}
                      {subject.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian (phút) <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.time_limit_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    time_limit_minutes: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                placeholder="Để trống = không giới hạn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lần làm tối đa <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.max_attempts}
                onChange={(e) =>
                  setFormData({ ...formData, max_attempts: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
                placeholder="Để trống = không giới hạn"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="is_published_edit"
                checked={formData.is_published}
                onChange={(e) =>
                  setFormData({ ...formData, is_published: e.target.checked })
                }
                className="h-5 w-5 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="is_published_edit"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-gray-900">
                  Đăng ngay
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Bài kiểm tra sẽ được hiển thị ngay cho sinh viên
                </p>
              </label>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="is_randomized_edit"
                checked={formData.is_randomized}
                onChange={(e) =>
                  setFormData({ ...formData, is_randomized: e.target.checked })
                }
                className="h-5 w-5 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="is_randomized_edit"
                className="ml-3 flex-1 cursor-pointer"
              >
                <span className="text-base font-medium text-gray-900">
                  Xáo trộn câu hỏi
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Thứ tự câu hỏi sẽ được xáo trộn ngẫu nhiên cho mỗi lần làm bài
                </p>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex-1 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <span>Cập nhật</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

