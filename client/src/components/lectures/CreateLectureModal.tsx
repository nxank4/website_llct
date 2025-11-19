"use client";

import { useState, useEffect, useRef } from "react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { X, Upload, Plus } from "lucide-react";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? "Chỉnh sửa tài liệu" : "Tạo tài liệu mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject - Must select first */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Môn học <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.subject_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subject_id: e.target.value,
                  chapter_number: undefined,
                  chapter_title: "",
                  lesson_number: undefined,
                })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            >
              <option value="">Chọn môn học...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code || ""} - {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Selection - Required after subject */}
          {formData.subject_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chương <span className="text-red-500">*</span>
              </label>
              {loadingChapters ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
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
                  <SelectTrigger className="w-full">
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
                      ⚠️ Môn học này chưa có chương nào trong thư viện. Vui lòng
                      nhập thủ công
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
            </div>
          )}

          {/* Material Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại tài liệu{" "}
              <span className="text-gray-500 text-xs">(Tùy chọn)</span>
            </label>
            <select
              value={formData.material_type}
              onChange={(e) =>
                setFormData({ ...formData, material_type: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#125093] focus:border-transparent"
            >
              <option value="">Chọn loại tài liệu...</option>
              {materialTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lesson Number and Title - Same row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bài số <span className="text-red-500">*</span>
              </label>
              <Input
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề tài liệu <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full"
                placeholder="Nhập tiêu đề tài liệu..."
              />
            </div>
          </div>
          {formData.lesson_number && (
            <p className="text-xs text-gray-500 -mt-2">
              Tiêu đề bài học sẽ lấy từ tiêu đề tài liệu
            </p>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full"
              placeholder="Nhập mô tả..."
            />
          </div>

          {/* Rich Text Editor Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung Rich Text Editor{" "}
              <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            <TiptapEditor
              content={formData.content_html}
              onChange={(content) =>
                setFormData({ ...formData, content_html: content })
              }
              placeholder="Nhập nội dung bài giảng..."
              className="w-full"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File tài liệu{" "}
              <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                selectedFile
                  ? "border-gray-300"
                  : "border-gray-300 hover:border-[#125093] cursor-pointer"
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
                  <p className="text-gray-700 font-medium">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
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
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering upload area click
                      fileInputRef.current?.click();
                    }}
                    className="text-[#125093] hover:underline"
                  >
                    Chọn file
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX, MP4, AVI, MOV, WEBM, MP3,
                    WAV, JPG, PNG (Tối đa 500MB)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Hoặc kéo thả file vào đây
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Published */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_published: e.target.checked,
                  })
                }
                className="h-5 w-5 text-[#125093] focus:ring-[#125093] border-gray-300 rounded cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Đăng ngay
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tài liệu sẽ được hiển thị công khai ngay sau khi tạo
                </p>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </div>
        </form>
      </div>
    </div>
  );
}
