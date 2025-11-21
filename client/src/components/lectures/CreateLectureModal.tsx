"use client";

import { useState, useEffect, useRef } from "react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { Upload, Plus } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import TiptapEditor from "@/components/ui/TiptapEditor";
import Link from "next/link";

interface Subject {
  id: number;
  name: string;
  code?: string;
}

interface Lecture {
  id: number;
  title: string;
  description?: string;
  subject_id: number;
  material_type?: string; // Loại tài liệu (book, video, slide, document, audio, image, other)
  is_published: boolean;
  chapter_number?: number;
  chapter_title?: string;
  lesson_number?: number;
  lesson_title?: string;
  file_url?: string;
  file_type?: string;
  content_html?: string; // Rich text editor content
}

interface CreateLectureModalProps {
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lecture?: Lecture | null; // Optional lecture for edit mode
}

export default function CreateLectureModal({
  subjects,
  onClose,
  onSuccess,
  authFetch,
  lecture = null,
}: CreateLectureModalProps) {
  const { showToast } = useToast();
  const isEditMode = !!lecture;
  const [formData, setFormData] = useState({
    title: lecture?.title || "",
    description: lecture?.description || "",
    subject_id: lecture?.subject_id?.toString() || "",
    material_type: lecture?.material_type || "",
    is_published: lecture?.is_published || false,
    chapter_number: lecture?.chapter_number as number | undefined,
    chapter_title: lecture?.chapter_title || "",
    lesson_number: lecture?.lesson_number as number | undefined,
    content_html:
      (lecture as Lecture & { content_html?: string })?.content_html || "", // Rich text editor content
    // lesson_title is not needed - it will use title from formData.title
  });

  // Material type options
  const materialTypeOptions = [
    { value: "book", label: "Sách" },
    { value: "video", label: "Video" },
    { value: "slide", label: "Slide/Presentation" },
    { value: "document", label: "Tài liệu văn bản" },
    { value: "audio", label: "Audio" },
    { value: "image", label: "Hình ảnh" },
    { value: "other", label: "Khác" },
  ];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<
    Array<{ number: number; title: string }>
  >([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chapters from library when subject is selected
  useEffect(() => {
    const fetchChapters = async () => {
      if (!formData.subject_id) {
        setChapters([]);
        setFormData((prev) => ({
          ...prev,
          chapter_number: undefined,
          chapter_title: "",
        }));
        return;
      }

      const selectedSubject = subjects.find(
        (s) => s.id.toString() === formData.subject_id
      );
      if (!selectedSubject?.code) {
        setChapters([]);
        setFormData((prev) => ({
          ...prev,
          chapter_number: undefined,
          chapter_title: "",
        }));
        return;
      }

      setLoadingChapters(true);
      try {
        const response = await authFetch(
          getFullUrl(API_ENDPOINTS.LIBRARY_CHAPTERS(selectedSubject.code))
        );
        if (response.ok) {
          const chaptersData = await response.json();
          const uniqueChapters = chaptersData.map(
            (ch: { chapter_number: number; chapter_title: string }) => ({
              number: ch.chapter_number,
              title: ch.chapter_title,
            })
          );
          setChapters(uniqueChapters);
        } else {
          console.error("Failed to fetch chapters:", response.status);
          setChapters([]);
        }
      } catch (err) {
        console.error("Error fetching chapters:", err);
        setChapters([]);
      } finally {
        setLoadingChapters(false);
      }
    };

    fetchChapters();
  }, [formData.subject_id, subjects, authFetch]);

  // Helper function to validate and set file
  const processFile = (file: File) => {
    // Validate file type
    const allowedExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".ppt",
      ".pptx",
      ".mp4",
      ".avi",
      ".mov",
      ".webm",
      ".mp3",
      ".wav",
      ".jpg",
      ".jpeg",
      ".png",
    ];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      setError(
        "Loại file không được hỗ trợ. Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, MP4, AVI, MOV, WEBM, MP3, WAV, JPG, PNG"
      );
      return;
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setError("File quá lớn. Tối đa 500MB");
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle click on upload area
  const handleUploadAreaClick = () => {
    if (!selectedFile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }

    if (!formData.subject_id) {
      setError("Vui lòng chọn môn học");
      return;
    }

    if (!formData.chapter_number || !formData.chapter_title) {
      setError("Vui lòng chọn chương từ thư viện");
      return;
    }

    if (!formData.lesson_number) {
      setError("Vui lòng nhập số bài học");
      return;
    }

    // No validation for file or content_html - both are optional
    // If both are empty, that's fine - user can add content later

    setUploading(true);
    setError(null);

    try {
      let fileUrl: string | null = null;
      let fileType: string | null = null;
      let fileSize = 0;

      // Upload file to Supabase Storage via server proxy if provided
      if (selectedFile) {
        // Upload file to server endpoint (which uses service role key to bypass RLS)
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadResponse = await authFetch(
          getFullUrl(`${API_ENDPOINTS.LECTURES}/upload`),
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(
            errorData.detail ||
              `Lỗi khi upload file: ${uploadResponse.statusText}`
          );
        }

        const uploadData = await uploadResponse.json();
        fileUrl = uploadData.file_url;
        fileType = uploadData.file_type;
        fileSize = uploadData.file_size;
      }

      // Prepare request body - only include fields that are being updated
      const requestBody: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || "",
        subject_id: parseInt(formData.subject_id),
        material_type: formData.material_type || null,
        is_published: formData.is_published,
        chapter_number: formData.chapter_number,
        chapter_title: formData.chapter_title,
        lesson_number: formData.lesson_number,
      };

      // Include content_html if provided
      if (formData.content_html.trim()) {
        requestBody.content_html = formData.content_html;
      }

      // Only include file fields if a new file was uploaded
      if (fileUrl) {
        requestBody.file_url = fileUrl;
        requestBody.file_type = fileType;
        requestBody.file_size = fileSize;
      }

      // Send lecture data to server
      const url = isEditMode
        ? getFullUrl(`${API_ENDPOINTS.LECTURES}/${lecture!.id}`)
        : getFullUrl(API_ENDPOINTS.LECTURES);
      const method = isEditMode ? "PATCH" : "POST";

      const response = await authFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            (isEditMode
              ? "Không thể cập nhật tài liệu"
              : "Không thể tạo tài liệu")
        );
      }

      showToast({
        type: "success",
        message: isEditMode
          ? "Cập nhật tài liệu thành công!"
          : "Tạo tài liệu thành công!",
      });
      onSuccess();
      // Reset form only if creating new lecture
      if (!isEditMode) {
        setFormData({
          title: "",
          description: "",
          subject_id: "",
          material_type: "",
          is_published: false,
          chapter_number: undefined,
          chapter_title: "",
          lesson_number: undefined,
          content_html: "",
        });
        setChapters([]);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (err) {
      console.error("Error creating lecture:", err);
      setError(err instanceof Error ? err.message : "Lỗi khi tạo tài liệu");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !uploading) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden p-0 bg-card text-card-foreground border border-border shadow-2xl">
        <div className="flex flex-col h-full">
          <div className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-2xl font-bold text-foreground">
                {isEditMode ? "Chỉnh sửa tài liệu" : "Tạo tài liệu mới"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Điền thông tin chi tiết cho tài liệu bài giảng
              </DialogDescription>
            </DialogHeader>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-card"
          >
            <FieldGroup>
            {/* Subject - Must select first */}
            <Field>
              <FieldLabel htmlFor="lecture-subject">
                Môn học <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                required
                value={formData.subject_id}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    subject_id: value,
                    chapter_number: undefined,
                    chapter_title: "",
                    lesson_number: undefined,
                  })
                }
              >
                <SelectTrigger id="lecture-subject" className="w-full">
                  <SelectValue placeholder="Chọn môn học..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.code || ""} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Chapter Selection - Required after subject */}
            {formData.subject_id && (
              <Field>
                <FieldLabel htmlFor="lecture-chapter">
                  Chương <span className="text-destructive">*</span>
                </FieldLabel>
                {loadingChapters ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size="sm" inline />
                    <span>Đang tải danh sách chương...</span>
                  </div>
                ) : chapters.length > 0 ? (
                  <Select
                    value={
                      formData.chapter_number
                        ? formData.chapter_number.toString()
                        : ""
                    }
                    onValueChange={(value) => {
                      const chapterNum = value ? parseInt(value) : undefined;
                      const selectedChapter = chapters.find(
                        (c) => c.number === chapterNum
                      );
                      setFormData({
                        ...formData,
                        chapter_number: chapterNum,
                        chapter_title: selectedChapter?.title || "",
                      });
                    }}
                    required
                  >
                    <SelectTrigger id="lecture-chapter" className="w-full">
                      <SelectValue placeholder="Chọn chương..." />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((chapter) => (
                        <SelectItem
                          key={chapter.number}
                          value={chapter.number.toString()}
                        >
                          Chương {chapter.number}: {chapter.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-amber-800 mb-2">
                        ⚠️ Môn học này chưa có chương nào trong thư viện. Vui
                        lòng nhập thủ công
                      </p>
                      <Link
                        href={`/admin/library?subject_id=${formData.subject_id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tạo chương mới cho môn học này</span>
                      </Link>
                    </div>
                  </div>
                )}
              </Field>
            )}

            {/* Material Type */}
            <Field>
              <FieldLabel htmlFor="lecture-material-type">
                Loại tài liệu{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <Select
                value={formData.material_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, material_type: value })
                }
              >
                <SelectTrigger id="lecture-material-type" className="w-full">
                  <SelectValue placeholder="Chọn loại tài liệu..." />
                </SelectTrigger>
                <SelectContent>
                  {materialTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Lesson Number and Title - Same row */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="lecture-lesson-number">
                  Bài số <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="lecture-lesson-number"
                  type="number"
                  min="1"
                  required
                  placeholder="1, 2, 3..."
                  value={formData.lesson_number || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lesson_number: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lecture-title">
                  Tiêu đề tài liệu <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="lecture-title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full"
                  placeholder="Nhập tiêu đề tài liệu..."
                />
              </Field>
            </div>
            {formData.lesson_number && (
              <p className="text-xs text-muted-foreground -mt-2">
                Tiêu đề bài học sẽ lấy từ tiêu đề tài liệu
              </p>
            )}

            {/* Description */}
            <Field>
              <FieldLabel htmlFor="lecture-description">
                Mô tả{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <Textarea
                id="lecture-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full"
                placeholder="Nhập mô tả..."
              />
            </Field>

            {/* Rich Text Editor Section */}
            <Field>
              <FieldLabel htmlFor="lecture-content">
                Nội dung Rich Text Editor{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <TiptapEditor
                content={formData.content_html}
                onChange={(content) =>
                  setFormData({ ...formData, content_html: content })
                }
                placeholder="Nhập nội dung bài giảng..."
                className="w-full"
              />
            </Field>

            {/* File Upload */}
            <Field>
              <FieldLabel>
                File tài liệu{" "}
                <span className="text-muted-foreground/70 text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  selectedFile
                    ? "border-border"
                    : "border-border hover:border-[hsl(var(--primary))] cursor-pointer"
                }`}
                onClick={handleUploadAreaClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.avi,.mov,.webm,.mp3,.wav,.jpg,.jpeg,.png"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="text-foreground font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering upload area click
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Xóa file
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering upload area click
                        fileInputRef.current?.click();
                      }}
                      className="text-[hsl(var(--primary))] hover:underline"
                    >
                      Chọn file
                    </button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, MP4, AVI, MOV, WEBM,
                      MP3, WAV, JPG, PNG (Tối đa 500MB)
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Hoặc kéo thả file vào đây
                    </p>
                  </>
                )}
              </div>
            </Field>

            {/* Published */}
            <Field
              orientation="horizontal"
              className="bg-muted/40 border border-border rounded-lg p-4"
            >
              <Checkbox
                id="lecture-published"
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    is_published: checked === true,
                  })
                }
              />
              <FieldLabel
                htmlFor="lecture-published"
                className="font-normal cursor-pointer flex-1"
              >
                <span className="text-sm font-medium text-foreground">
                  Đăng ngay
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tài liệu sẽ được hiển thị công khai ngay sau khi tạo
                </p>
              </FieldLabel>
            </Field>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </FieldGroup>

          {/* Actions */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <DialogClose asChild>
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" inline />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>
                    {isEditMode ? "Cập nhật tài liệu" : "Tạo tài liệu"}
                  </span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
