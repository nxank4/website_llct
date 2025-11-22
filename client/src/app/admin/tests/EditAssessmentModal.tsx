"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  show_results?: boolean;
  show_explanations?: boolean;
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
    show_results: assessment.show_results ?? true,
    show_explanations: assessment.show_explanations ?? true,
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
            ? data.map((s: { id: number; name: string; code?: string }) => ({
                id: s.id,
                name: s.name || `Subject ${s.id}`,
                code: s.code,
              }))
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

    // Prevent double submit
    if (updating) return;

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
        show_results: formData.show_results,
        show_explanations: formData.show_explanations,
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !updating) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 bg-card text-card-foreground border border-border rounded-xl shadow-xl">
        <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <DialogTitle className="text-xl font-bold text-foreground">
            Chỉnh sửa bài kiểm tra
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Cập nhật thông tin và cấu hình cho bài kiểm tra này
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-assessment-title">
                Tiêu đề <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="edit-assessment-title"
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-assessment-description">
                Mô tả{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <Textarea
                id="edit-assessment-description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-assessment-type">
                  Loại bài kiểm tra <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  required
                  value={formData.assessment_type}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      assessment_type: value as
                        | "pre_test"
                        | "post_test"
                        | "quiz"
                        | "assignment",
                    })
                  }
                >
                  <SelectTrigger id="edit-assessment-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="pre_test">Kiểm tra đầu kỳ</SelectItem>
                    <SelectItem value="post_test">Kiểm tra cuối kỳ</SelectItem>
                    <SelectItem value="assignment">Bài tập</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-assessment-subject">
                  Môn học <span className="text-destructive">*</span>
                </FieldLabel>
                {loadingSubjects ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Đang tải...
                  </div>
                ) : (
                  <Select
                    required
                    value={String(formData.subject_id)}
                    onValueChange={(value) =>
                      setFormData({ ...formData, subject_id: value })
                    }
                  >
                    <SelectTrigger
                      id="edit-assessment-subject"
                      className="w-full"
                    >
                      <SelectValue placeholder="Chọn môn học" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={String(subject.id)}>
                          {subject.code ? `${subject.code} - ` : ""}
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-assessment-time-limit">
                  Thời gian (phút){" "}
                  <span className="text-muted-foreground/70 text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Input
                  id="edit-assessment-time-limit"
                  type="number"
                  min="0"
                  value={formData.time_limit_minutes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      time_limit_minutes: e.target.value,
                    })
                  }
                  className="w-full"
                  placeholder="Để trống = không giới hạn"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="edit-assessment-max-attempts">
                  Số lần làm tối đa{" "}
                  <span className="text-muted-foreground/70 text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Input
                  id="edit-assessment-max-attempts"
                  type="number"
                  min="0"
                  value={formData.max_attempts || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, max_attempts: e.target.value })
                  }
                  className="w-full"
                  placeholder="Để trống = không giới hạn"
                />
              </Field>
            </div>

            <div className="space-y-3">
              <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border">
                <Checkbox
                  id="is_published_edit"
                  checked={formData.is_published}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_published: checked === true })
                  }
                />
                <Label
                  htmlFor="is_published_edit"
                  className="ml-3 flex-1 cursor-pointer"
                >
                  <span className="text-base font-medium text-foreground">
                    Đăng ngay
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bài kiểm tra sẽ được hiển thị ngay cho sinh viên
                  </p>
                </Label>
              </div>

              <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border">
                <Checkbox
                  id="is_randomized_edit"
                  checked={formData.is_randomized}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      is_randomized: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="is_randomized_edit"
                  className="ml-3 flex-1 cursor-pointer"
                >
                  <span className="text-base font-medium text-foreground">
                    Xáo trộn câu hỏi
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Thứ tự câu hỏi sẽ được xáo trộn ngẫu nhiên cho mỗi lần làm
                    bài
                  </p>
                </Label>
              </div>
              <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border">
                <Checkbox
                  id="show_results_edit"
                  checked={formData.show_results}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, show_results: checked === true })
                  }
                />
                <Label
                  htmlFor="show_results_edit"
                  className="ml-3 flex-1 cursor-pointer"
                >
                  <span className="text-base font-medium text-foreground">
                    Cho phép xem kết quả đúng
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sinh viên có thể xem đáp án đúng sau khi hoàn thành bài kiểm
                    tra
                  </p>
                </Label>
              </div>
              <div className="flex items-center p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-border">
                <Checkbox
                  id="show_explanations_edit"
                  checked={formData.show_explanations}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      show_explanations: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="show_explanations_edit"
                  className="ml-3 flex-1 cursor-pointer"
                >
                  <span className="text-base font-medium text-foreground">
                    Cho phép xem giải thích
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sinh viên có thể xem giải thích cho từng câu hỏi sau khi
                    hoàn thành bài kiểm tra
                  </p>
                </Label>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <DialogClose asChild>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={updating}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
                >
                  Hủy
                </button>
              </DialogClose>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <Spinner size="sm" inline />
                    <span>Đang cập nhật...</span>
                  </>
                ) : (
                  <span>Cập nhật</span>
                )}
              </button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
