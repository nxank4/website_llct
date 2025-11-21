"use client";


import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Save, Eye, ArrowLeft, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export default function CreateCoursePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    level: "beginner",
    duration: "",
    price: 0,
    thumbnail: null as File | null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const subjects = [
    "Toán học",
    "Vật lý",
    "Hóa học",
    "Sinh học",
    "Lịch sử",
    "Địa lý",
    "Văn học",
    "Tiếng Anh",
    "Tin học",
    "Kinh tế",
    "Triết học",
    "Khác",
  ];

  const levels = [
    { value: "beginner", label: "Cơ bản" },
    { value: "intermediate", label: "Trung bình" },
    { value: "advanced", label: "Nâng cao" },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, thumbnail: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/instructor/courses");
      } else {
        console.error("Error creating course");
      }
    } catch (error) {
      console.error("Error creating course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = () => {
    // Save as draft logic
    console.log("Saving as draft...");
  };

  if (previewMode) {
    return (
      <ProtectedRouteWrapper requiredRole="instructor">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPreviewMode(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Xem trước khóa học
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setPreviewMode(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? "Đang tạo..." : "Tạo khóa học"}
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-white" />
              </div>
              <div className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  {formData.title || "Tên khóa học"}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {formData.description || "Mô tả khóa học"}
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Môn học
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formData.subject || "Chưa chọn"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Trình độ
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {levels.find((l) => l.value === formData.level)?.label ||
                        "Cơ bản"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Thời lượng
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formData.duration || "Chưa xác định"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Giá
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formData.price > 0
                        ? `${formData.price.toLocaleString()} VNĐ`
                        : "Miễn phí"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRouteWrapper>
    );
  }

  return (
    <ProtectedRouteWrapper requiredRole="instructor">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tạo khóa học mới
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSaveDraft}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Lưu nháp
              </button>
              <button
                onClick={() => setPreviewMode(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Xem trước</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Thông tin cơ bản
              </h2>

              <FieldGroup>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Title */}
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="title">
                      Tên khóa học <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      type="text"
                      id="title"
                      name="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full dark:bg-gray-700 dark:text-white"
                      placeholder="Nhập tên khóa học"
                    />
                  </Field>

                  {/* Description */}
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="description">
                      Mô tả khóa học <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      id="description"
                      name="description"
                      required
                      rows={4}
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full dark:bg-gray-700 dark:text-white"
                      placeholder="Mô tả chi tiết về khóa học"
                    />
                  </Field>

                  {/* Subject */}
                  <Field>
                    <FieldLabel htmlFor="subject">
                      Môn học <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      required
                      value={formData.subject}
                      onValueChange={(value) =>
                        handleInputChange({
                          target: { name: "subject", value },
                        } as React.ChangeEvent<HTMLInputElement>)
                      }
                    >
                      <SelectTrigger id="subject" className="w-full">
                        <SelectValue placeholder="Chọn môn học" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Level */}
                  <Field>
                    <FieldLabel htmlFor="level">
                      Trình độ <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Select
                      required
                      value={formData.level}
                      onValueChange={(value) =>
                        handleInputChange({
                          target: { name: "level", value },
                        } as React.ChangeEvent<HTMLInputElement>)
                      }
                    >
                      <SelectTrigger id="level" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Duration */}
                  <Field>
                    <FieldLabel htmlFor="duration">
                      Thời lượng <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      type="text"
                      id="duration"
                      name="duration"
                      required
                      value={formData.duration}
                      onChange={handleInputChange}
                      className="w-full dark:bg-gray-700 dark:text-white"
                      placeholder="Ví dụ: 12 tuần, 3 tháng"
                    />
                  </Field>

                  {/* Price */}
                  <Field>
                    <FieldLabel htmlFor="price">
                      Giá khóa học (VNĐ) <span className="text-gray-400 text-xs">(Tùy chọn)</span>
                    </FieldLabel>
                    <Input
                      type="number"
                      id="price"
                      name="price"
                      min="0"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                    />
                  </Field>
                </div>
              </FieldGroup>
            </div>

            {/* Thumbnail Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Hình ảnh khóa học
              </h2>

              <Field>
                <FieldLabel htmlFor="thumbnail">
                  Hình ảnh khóa học
                </FieldLabel>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  {formData.thumbnail ? (
                    <div className="space-y-4">
                      <div className="w-32 h-32 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formData.thumbnail.name}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, thumbnail: null }))
                          }
                          className="text-destructive hover:text-destructive/80 text-sm"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Kéo thả hình ảnh vào đây hoặc
                        </p>
                        <label htmlFor="thumbnail" className="cursor-pointer">
                          <span className="text-primary hover:text-primary/80 text-sm font-medium">
                            Chọn file
                          </span>
                          <input
                            type="file"
                            id="thumbnail"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF tối đa 10MB
                      </p>
                    </div>
                  )}
                </div>
              </Field>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? "Đang tạo..." : "Tạo khóa học"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
