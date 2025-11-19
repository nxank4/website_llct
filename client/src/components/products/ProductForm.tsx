"use client";

import { useEffect } from "react";
import {
  useForm,
  useFieldArray,
  Resolver,
  FieldArrayPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/contexts/ToastContext";

// ProductType enum matching backend
const ProductTypeEnum = z.enum(["project", "assignment", "presentation", "other"]);

// Zod schema matching backend ProductCreate/ProductUpdate
const productSchema = z.object({
  title: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  description: z.string().optional(),
  subject: z.string().optional(),
  subject_name: z.string().optional(),
  group: z.string().optional(),
  members: z.array(z.string()).default([]),
  instructor: z.string().optional(),
  semester: z.string().optional(),
  type: ProductTypeEnum.optional(),
  technologies: z.array(z.string()).default([]),
  file_url: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      { message: "URL không hợp lệ" }
    ),
  demo_url: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      { message: "URL không hợp lệ" }
    ),
});

export type ProductFormData = z.infer<typeof productSchema>;
type ProductFormValues = ProductFormData &
  Record<string, unknown> & {
    members: string[];
    technologies: string[];
  };

interface ProductFormProps {
  product?: {
    id: number;
    title?: string;
    description?: string;
    subject?: string;
    subject_name?: string;
    group?: string;
    members?: string[];
    instructor?: string;
    semester?: string;
    type?: string;
    technologies?: string[];
    file_url?: string;
    demo_url?: string;
  } | null;
  onSave: (data: ProductFormData) => Promise<void> | void;
  onClose: () => void;
  isLoading?: boolean;
}

const PRODUCT_TYPES = [
  { value: "project", label: "Dự án" },
  { value: "assignment", label: "Bài tập" },
  { value: "presentation", label: "Thuyết trình" },
  { value: "other", label: "Khác" },
] as const;

const SUBJECTS = [
  { code: "MLN111", name: "Triết học Mác - Lê-nin" },
  { code: "MLN122", name: "Kinh tế chính trị Mác - Lê-nin" },
  { code: "HCM202", name: "Tư tưởng Hồ Chí Minh" },
  { code: "VNR202", name: "Lịch sử Đảng Cộng sản Việt Nam" },
] as const;

export default function ProductForm({
  product,
  onSave,
  onClose,
  isLoading = false,
}: ProductFormProps) {
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormData>,
    defaultValues: {
      title: product?.title || "",
      description: product?.description || "",
      subject: product?.subject || "",
      subject_name: product?.subject_name || "",
      group: product?.group || "",
      members: product?.members && product.members.length > 0 ? product.members : [""],
      instructor: product?.instructor || "",
      semester: product?.semester || "",
      type: (product?.type as "project" | "assignment" | "presentation" | "other") || undefined,
      technologies:
        product?.technologies && product.technologies.length > 0
          ? product.technologies
          : [""],
      file_url: product?.file_url || "",
      demo_url: product?.demo_url || "",
    },
  });

  const {
    fields: memberFields,
    append: appendMember,
    remove: removeMember,
  } = useFieldArray<ProductFormValues, FieldArrayPath<ProductFormValues>>({
    control,
    name: "members" as FieldArrayPath<ProductFormValues>,
  });

  const {
    fields: techFields,
    append: appendTech,
    remove: removeTech,
  } = useFieldArray<ProductFormValues, FieldArrayPath<ProductFormValues>>({
    control,
    name: "technologies" as FieldArrayPath<ProductFormValues>,
  });

  // Update subject_name when subject changes
  const selectedSubject = watch("subject");
  useEffect(() => {
    if (selectedSubject) {
      const subject = SUBJECTS.find((s) => s.code === selectedSubject);
      if (subject) {
        setValue("subject_name", subject.name);
      }
    }
  }, [selectedSubject, setValue]);

  const onSubmit = async (data: ProductFormValues) => {
    try {
      // Clean up empty strings from arrays
      const cleanedData: ProductFormData = {
        ...data,
        members: data.members?.filter((m) => m.trim()) || [],
        technologies: data.technologies?.filter((t) => t.trim()) || [],
        file_url: data.file_url?.trim() || undefined,
        demo_url: data.demo_url?.trim() || undefined,
      };

      await onSave(cleanedData);
    } catch (error) {
      console.error("Error saving product:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: error instanceof Error ? error.message : "Không thể lưu sản phẩm",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            disabled={isSubmitting || isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Title - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              {...register("title")}
              className="w-full"
              placeholder="Nhập tên sản phẩm..."
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Description - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            <Textarea
              {...register("description")}
              rows={3}
              className="w-full"
              placeholder="Nhập mô tả sản phẩm..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Subject and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Môn học <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Select
                value={watch("subject") || ""}
                onValueChange={(value) => {
                  setValue("subject", value);
                  const subject = SUBJECTS.find((s) => s.code === value);
                  if (subject) {
                    setValue("subject_name", subject.name);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn môn học" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject.code} value={subject.code}>
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại sản phẩm <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Select
                value={watch("type") || ""}
                onValueChange={(value) =>
                  setValue("type", value as "project" | "assignment" | "presentation" | "other")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn loại sản phẩm" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>
          </div>

          {/* Group and Instructor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhóm <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Input
                type="text"
                {...register("group")}
                className="w-full"
                placeholder="Nhóm 1"
              />
              {errors.group && (
                <p className="mt-1 text-sm text-red-600">{errors.group.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giảng viên <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Input
                type="text"
                {...register("instructor")}
                className="w-full"
                placeholder="Tên giảng viên"
              />
              {errors.instructor && (
                <p className="mt-1 text-sm text-red-600">{errors.instructor.message}</p>
              )}
            </div>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Học kỳ <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            <Input
              type="text"
              {...register("semester")}
              className="w-full"
              placeholder="HK1 2024-2025"
            />
            {errors.semester && (
              <p className="mt-1 text-sm text-red-600">{errors.semester.message}</p>
            )}
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thành viên nhóm <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            {memberFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <Input
                  type="text"
                  {...register(`members.${index}`)}
                  className="flex-1"
                  placeholder="Tên thành viên"
                />
                {memberFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendMember("")}
              className="text-sm text-[#125093] hover:text-[#0f4278] font-medium"
            >
              + Thêm thành viên
            </button>
          </div>

          {/* Technologies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Công nghệ sử dụng <span className="text-gray-400 text-xs">(Tùy chọn)</span>
            </label>
            {techFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <Input
                  type="text"
                  {...register(`technologies.${index}`)}
                  className="flex-1"
                  placeholder="Tên công nghệ"
                />
                {techFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTech(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => appendTech("")}
              className="text-sm text-[#125093] hover:text-[#0f4278] font-medium"
            >
              + Thêm công nghệ
            </button>
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link file/source <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Input
                type="url"
                {...register("file_url")}
                className="w-full"
                placeholder="https://github.com/..."
              />
              {errors.file_url && (
                <p className="mt-1 text-sm text-red-600">{errors.file_url.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link demo <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Input
                type="url"
                {...register("demo_url")}
                className="w-full"
                placeholder="https://demo.com/..."
              />
              {errors.demo_url && (
                <p className="mt-1 text-sm text-red-600">{errors.demo_url.message}</p>
              )}
            </div>
          </div>

          {/* Form Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Vui lòng kiểm tra lại các trường bắt buộc
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-[#125093] hover:bg-[#0f4278]"
            >
              {isSubmitting || isLoading
                ? "Đang lưu..."
                : product
                ? "Cập nhật"
                : "Thêm sản phẩm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

