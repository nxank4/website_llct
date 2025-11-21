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
import { X, Trash2 } from "lucide-react";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ProductType enum matching backend
const ProductTypeEnum = z.enum([
  "project",
  "assignment",
  "presentation",
  "other",
]);

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
      members:
        product?.members && product.members.length > 0 ? product.members : [""],
      instructor: product?.instructor || "",
      semester: product?.semester || "",
      type:
        (product?.type as
          | "project"
          | "assignment"
          | "presentation"
          | "other") || undefined,
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
        message:
          error instanceof Error ? error.message : "Không thể lưu sản phẩm",
      });
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting && !isLoading) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground rounded-xl border border-border shadow-xl p-0">
        <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                {product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Điền thông tin chi tiết để lưu sản phẩm học tập
              </DialogDescription>
            </div>
            <DialogClose
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              disabled={isSubmitting || isLoading}
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <FieldGroup>
            {/* Title - Required */}
            <Field data-invalid={!!errors.title}>
              <FieldLabel htmlFor="product-title">
                Tên sản phẩm <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="product-title"
                type="text"
                {...register("title")}
                className="w-full"
                placeholder="Nhập tên sản phẩm..."
                aria-invalid={!!errors.title}
              />
              <FieldError>{errors.title?.message}</FieldError>
            </Field>

            {/* Description - Optional */}
            <Field data-invalid={!!errors.description}>
              <FieldLabel htmlFor="product-description">
                Mô tả{" "}
                <span className="text-muted-foreground text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <Textarea
                id="product-description"
                {...register("description")}
                rows={3}
                className="w-full"
                placeholder="Nhập mô tả sản phẩm..."
                aria-invalid={!!errors.description}
              />
              <FieldError>{errors.description?.message}</FieldError>
            </Field>

            {/* Subject and Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field data-invalid={!!errors.subject}>
                <FieldLabel htmlFor="product-subject">
                  Môn học{" "}
                  <span className="text-muted-foreground text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
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
                  <SelectTrigger
                    id="product-subject"
                    className="w-full"
                    aria-invalid={!!errors.subject}
                  >
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
                <FieldError>{errors.subject?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="product-type">
                  Loại sản phẩm{" "}
                  <span className="text-muted-foreground text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Select
                  value={watch("type") || ""}
                  onValueChange={(value) =>
                    setValue(
                      "type",
                      value as
                        | "project"
                        | "assignment"
                        | "presentation"
                        | "other"
                    )
                  }
                >
                  <SelectTrigger
                    id="product-type"
                    className="w-full"
                    aria-invalid={!!errors.type}
                  >
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
                <FieldError>{errors.type?.message}</FieldError>
              </Field>
            </div>

            {/* Group and Instructor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field data-invalid={!!errors.group}>
                <FieldLabel htmlFor="product-group">
                  Nhóm{" "}
                  <span className="text-muted-foreground text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Input
                  id="product-group"
                  type="text"
                  {...register("group")}
                  className="w-full"
                  placeholder="Nhóm 1"
                  aria-invalid={!!errors.group}
                />
                <FieldError>{errors.group?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.instructor}>
                <FieldLabel htmlFor="product-instructor">
                  Giảng viên{" "}
                  <span className="text-muted-foreground text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Input
                  id="product-instructor"
                  type="text"
                  {...register("instructor")}
                  className="w-full"
                  placeholder="Tên giảng viên"
                  aria-invalid={!!errors.instructor}
                />
                <FieldError>{errors.instructor?.message}</FieldError>
              </Field>
            </div>

            {/* Semester */}
            <Field data-invalid={!!errors.semester}>
              <FieldLabel htmlFor="product-semester">
                Học kỳ{" "}
                <span className="text-muted-foreground text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <Input
                id="product-semester"
                type="text"
                {...register("semester")}
                className="w-full"
                placeholder="HK1 2024-2025"
                aria-invalid={!!errors.semester}
              />
              <FieldError>{errors.semester?.message}</FieldError>
            </Field>

            {/* Members */}
            <Field>
              <FieldLabel>
                Thành viên nhóm{" "}
                <span className="text-muted-foreground text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
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
                      className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendMember("")}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                + Thêm thành viên
              </button>
            </Field>

            {/* Technologies */}
            <Field>
              <FieldLabel>
                Công nghệ sử dụng{" "}
                <span className="text-muted-foreground text-xs">
                  (Tùy chọn)
                </span>
              </FieldLabel>
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
                      className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendTech("")}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                + Thêm công nghệ
              </button>
            </Field>

            {/* URLs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field data-invalid={!!errors.file_url}>
                <FieldLabel htmlFor="product-file-url">
                  Link file/source{" "}
                  <span className="text-muted-foreground text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Input
                  id="product-file-url"
                  type="url"
                  {...register("file_url")}
                  className="w-full"
                  placeholder="https://github.com/..."
                  aria-invalid={!!errors.file_url}
                />
                <FieldError>{errors.file_url?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.demo_url}>
                <FieldLabel htmlFor="product-demo-url">
                  Link demo{" "}
                  <span className="text-muted-foreground text-xs">
                    (Tùy chọn)
                  </span>
                </FieldLabel>
                <Input
                  id="product-demo-url"
                  type="url"
                  {...register("demo_url")}
                  className="w-full"
                  placeholder="https://demo.com/..."
                  aria-invalid={!!errors.demo_url}
                />
                <FieldError>{errors.demo_url?.message}</FieldError>
              </Field>
            </div>

            {/* Form Errors */}
            {Object.keys(errors).length > 0 && (
              <FieldError>Vui lòng kiểm tra lại các trường bắt buộc</FieldError>
            )}

            {/* Actions */}
            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border mt-4">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting || isLoading}
                >
                  Hủy
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting || isLoading
                  ? "Đang lưu..."
                  : product
                  ? "Cập nhật"
                  : "Thêm sản phẩm"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
