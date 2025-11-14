"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, BookOpen, X } from "lucide-react";

import { useAuthFetch, hasRole } from "@/lib/auth";
import { listSubjects, createSubject } from "@/services/library";

interface Subject {
  id: number;
  code: string;
  name: string;
  description?: string;
  total_documents?: number;
  total_students?: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminSubjectsPage() {
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState({
    code: "",
    name: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = hasRole(
    session as { user?: { roles?: string[]; role?: string } } | null,
    "admin"
  );

  const {
    data: subjectsResponse,
    isLoading,
    isError,
    error,
  } = useQuery<Subject[]>({
    queryKey: ["admin-subjects"],
    enabled: Boolean(authFetch) && isAdmin,
    queryFn: async () => {
      if (!authFetch) throw new Error("authFetch not available");
      // Cast authFetch to match FetchLike type
      const fetchLike = authFetch as (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => Promise<Response>;
      const response = await listSubjects(fetchLike);
      if (Array.isArray(response)) {
        return response as Subject[];
      }
      if (Array.isArray(response?.items)) {
        return response.items as Subject[];
      }
      return [];
    },
  });

  const subjects = useMemo(() => subjectsResponse ?? [], [subjectsResponse]);

  const openModal = () => {
    setFormState({ code: "", name: "", description: "" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authFetch) return;

    const trimmedCode = formState.code.trim();
    const trimmedName = formState.name.trim();
    const trimmedDescription = formState.description.trim();

    if (!trimmedCode || !trimmedName) {
      setFormError("Mã môn học và tên môn học là bắt buộc");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      // Cast authFetch to match FetchLike type
      const fetchLike = authFetch as (
        input: RequestInfo | URL,
        init?: RequestInit
      ) => Promise<Response>;
      await createSubject(fetchLike, {
        code: trimmedCode,
        name: trimmedName,
        description: trimmedDescription || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ["admin-subjects"] });
      setIsModalOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể tạo môn học";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-amber-900">
          <h2 className="text-xl font-semibold">Quyền truy cập bị hạn chế</h2>
          <p className="mt-2 text-sm text-amber-800">
            Chỉ quản trị viên mới có thể quản lý danh sách môn học.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
                Quản lý môn học
              </h1>
              <p className="text-gray-600">
                Tạo và quản lý danh sách môn học được sử dụng trong thư viện,
                tài liệu và dữ liệu AI.
              </p>
            </div>
            <button
              onClick={openModal}
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span>Thêm môn học</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Đang tải danh sách môn học...</span>
            </div>
          </div>
        ) : isError ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 md:p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Không thể tải danh sách môn học
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {error instanceof Error
                ? error.message
                : "Đã xảy ra lỗi không xác định."}
            </p>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["admin-subjects"] })
              }
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <BookOpen className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Chưa có môn học nào
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Tạo môn học đầu tiên để sử dụng trong thư viện tài liệu và các
              công cụ quản lý.
            </p>
            <button
              onClick={openModal}
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Tạo môn học</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Mã môn học
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tên môn học
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Mô tả
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Tài liệu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Cập nhật
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {subject.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {subject.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {subject.description ? (
                        subject.description
                      ) : (
                        <span className="italic text-gray-400">
                          (Chưa có mô tả)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {subject.total_documents ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {subject.updated_at
                        ? new Date(subject.updated_at).toLocaleDateString(
                            "vi-VN"
                          )
                        : subject.created_at
                        ? new Date(subject.created_at).toLocaleDateString(
                            "vi-VN"
                          )
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Tạo môn học mới
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Thêm môn học để sử dụng ở thư viện, tài liệu và các công cụ
                  khác.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã môn học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      code: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#125093] focus:outline-none focus:ring-2 focus:ring-[#125093]/20"
                  placeholder="VD: POL101"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên môn học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#125093] focus:outline-none focus:ring-2 focus:ring-[#125093]/20"
                  placeholder="Tên môn học"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="w-full min-h-[96px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#125093] focus:outline-none focus:ring-2 focus:ring-[#125093]/20"
                  placeholder="Mô tả ngắn về môn học (tuỳ chọn)"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Tạo môn học"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
