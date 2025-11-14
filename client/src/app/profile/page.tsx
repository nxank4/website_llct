"use client";

import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  User,
  Mail,
  Shield,
  GraduationCap,
  BookOpen,
  Camera,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  IdCard,
  Copy,
  CalendarClock,
} from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";

interface ProfileResponse {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_instructor: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  avatar_url?: string | null;
  bio?: string | null;
  student_code?: string | null;
  roles?: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const user = session?.user;
  const isAuthenticated = !!session;
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    []
  );

  const fetchProfile = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setProfileLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setProfileError(null);

        const response = await authFetch(`${apiBase}/api/v1/users/me`);
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Không thể tải thông tin người dùng" }));
          throw new Error(
            errorData?.detail ||
              `Không thể tải thông tin người dùng (HTTP ${response.status})`
          );
        }

        const data: ProfileResponse = await response.json();
        setProfile(data);
        setAvatarUrl(data.avatar_url || null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Không thể tải thông tin người dùng";
        setProfileError(message);
        showToast({
          type: "error",
          message,
        });
      } finally {
        setProfileLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiBase, authFetch, showToast]
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [fetchProfile, isAuthenticated]);

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  const handleAvatarClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        type: "error",
        message: "Vui lòng chọn file ảnh",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast({
        type: "error",
        message: "File ảnh quá lớn. Tối đa 5MB",
      });
      return;
    }

    const userId =
      (user as { id?: string })?.id ||
      profile?.id ||
      (session?.user as { id?: string })?.id;
    if (!userId) {
      showToast({
        type: "error",
        message: "Không tìm thấy thông tin người dùng",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;

      const response = await authFetch(`${apiBase}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatar_url: newAvatarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Lỗi khi cập nhật avatar" }));
        throw new Error(errorData.detail || "Lỗi khi cập nhật avatar");
      }

      setAvatarUrl(newAvatarUrl);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: newAvatarUrl,
            }
          : prev
      );

      await updateSession();
      await fetchProfile(true);

      showToast({
        type: "success",
        message: "Cập nhật avatar thành công!",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Lỗi khi tải lên avatar",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const roleBadge = useMemo(() => {
    const meta = {
      admin: {
        text: "Quản trị viên",
        color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200",
        icon: Shield,
      },
      instructor: {
        text: "Giảng viên",
        color:
          "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
        icon: GraduationCap,
      },
      student: {
        text: "Sinh viên",
        color:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
        icon: BookOpen,
      },
    } as const;

    const primaryRole =
      profile?.roles?.[0]?.toLowerCase() ||
      (profile?.is_superuser
        ? "admin"
        : profile?.is_instructor
        ? "instructor"
        : "student");

    return meta[primaryRole as keyof typeof meta] ?? meta.student;
  }, [profile]);

  const RoleIcon = roleBadge.icon;

  const formatDateTime = useCallback((value?: string | null) => {
    if (!value) return "Chưa cập nhật";
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return value;
    }
  }, []);

  const statusChips = useMemo(
    () => [
      {
        label: profile?.email_verified
          ? "Email đã xác minh"
          : "Email chưa xác minh",
        icon: profile?.email_verified ? CheckCircle2 : XCircle,
        tone: profile?.email_verified
          ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200",
      },
      {
        label: profile?.is_active
          ? "Tài khoản đang hoạt động"
          : "Tài khoản tạm khóa",
        icon: profile?.is_active ? CheckCircle2 : XCircle,
        tone: profile?.is_active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
          : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
      },
    ],
    [profile?.email_verified, profile?.is_active]
  );

  const handleRefreshProfile = useCallback(async () => {
    await fetchProfile(true);
  }, [fetchProfile]);

  const handleCopyValue = useCallback(
    async (value: string | undefined | null, label: string) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        showToast({
          type: "success",
          message: `${label} đã được sao chép`,
        });
      } catch {
        showToast({
          type: "error",
          message: `Không thể sao chép ${label}`,
        });
      }
    },
    [showToast]
  );

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-gradient-to-r from-blue-200 via-cyan-200 to-emerald-200 rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 bg-white/60 dark:bg-gray-800/60 rounded-2xl" />
              <div className="h-24 bg-white/60 dark:bg-gray-800/60 rounded-2xl" />
              <div className="h-24 bg-white/60 dark:bg-gray-800/60 rounded-2xl" />
            </div>
            <div className="h-80 bg-white dark:bg-gray-800 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (profileError && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/40 rounded-2xl p-8 text-center space-y-3">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Không thể tải hồ sơ người dùng
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {profileError}
            </p>
            <button
              onClick={() => fetchProfile()}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    profile?.full_name ||
    (user as { full_name?: string; name?: string })?.full_name ||
    (user as { name?: string })?.name ||
    (user?.email?.split("@")[0] ?? "Người dùng");

  const displayEmail = profile?.email || user?.email || "Chưa cập nhật email";
  const displayUsername = profile?.username;
  const displayStudentCode = profile?.student_code;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 dark:from-sky-600 dark:via-blue-700 dark:to-indigo-700 blur-3xl opacity-40 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 relative">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="px-6 sm:px-10 py-8 sm:py-10">
              <div className="flex flex-col md:flex-row md:items-start md:space-x-8 space-y-6 md:space-y-0">
                <div className="relative shrink-0">
                  <div
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden flex items-center justify-center border border-white/70 dark:border-white/20 bg-gradient-to-br from-blue-500 to-indigo-500 text-white cursor-pointer transition-transform hover:scale-[1.02] ${
                      uploading
                        ? "ring-2 ring-blue-300 dark:ring-blue-500/40"
                        : ""
                    }`}
                    onClick={handleAvatarClick}
                    role="button"
                    aria-label="Thay đổi ảnh đại diện"
                  >
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Avatar"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="h-12 w-12" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    {!uploading && (
                      <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur px-2 py-1 rounded-full flex items-center text-xs font-medium text-gray-700 dark:text-gray-200">
                        <Camera className="w-3.5 h-3.5 mr-1" />
                        Cập nhật
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2">
                        <IdCard className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
                          {displayName}
                        </h1>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <div className="inline-flex items-center gap-1.5">
                          <Mail className="w-4 h-4" />
                          <span>{displayEmail}</span>
                        </div>
                        {displayUsername && (
                          <div className="inline-flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>{displayUsername}</span>
                          </div>
                        )}
                        {displayStudentCode && (
                          <button
                            onClick={() =>
                              handleCopyValue(
                                displayStudentCode,
                                "Mã số sinh viên"
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium hover:bg-emerald-200 transition-colors dark:bg-emerald-500/20 dark:text-emerald-200"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>{displayStudentCode}</span>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-medium shadow-sm ${roleBadge.color}`}
                      >
                        <RoleIcon className="w-4 h-4 mr-1" />
                        {roleBadge.text}
                      </span>
                      <button
                        onClick={handleRefreshProfile}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-60 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            isRefreshing ? "animate-spin" : ""
                          }`}
                        />
                        Làm mới
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {statusChips.map(({ label, icon: Icon, tone }) => (
                      <span
                        key={label}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${tone}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Ngày tham gia
                  </div>
                  <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                    {formatDateTime(profile?.created_at)}
                  </div>
                  <div className="mt-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Cập nhật gần nhất: {formatDateTime(profile?.updated_at)}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Trạng thái tài khoản
                  </div>
                  <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                    {profile?.is_active ? "Đang hoạt động" : "Bị tạm khóa"}
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {profile?.is_active
                      ? "Bạn có thể sử dụng đầy đủ các tính năng của nền tảng."
                      : "Vui lòng liên hệ quản trị viên để được hỗ trợ kích hoạt."}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Quyền hạn
                  </div>
                  <div className="mt-2 font-semibold text-gray-900 dark:text-white capitalize">
                    {profile?.roles?.join(", ") || roleBadge.text}
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {profile?.is_superuser
                      ? "Bạn có quyền quản trị hệ thống."
                      : profile?.is_instructor
                      ? "Bạn có thể tạo khóa học và nội dung giảng dạy."
                      : "Bạn có quyền truy cập nội dung học tập và bài kiểm tra."}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 p-5 shadow-sm">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Bảo mật tài khoản
                  </div>
                  <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                    {profile?.email_verified
                      ? "Email đã xác minh"
                      : "Email chưa xác minh"}
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {profile?.email_verified
                      ? "Email của bạn đã được xác minh. Hãy giữ an toàn thông tin đăng nhập."
                      : "Vui lòng kiểm tra hộp thư để xác minh email và tăng cường bảo mật."}
                  </p>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                    Thông tin tài khoản
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <div className="space-y-1">
                      <span className="block text-gray-500 dark:text-gray-400">
                        Họ và tên
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {displayName}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-gray-500 dark:text-gray-400">
                        Email
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {displayEmail}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-gray-500 dark:text-gray-400">
                        Tên đăng nhập
                      </span>
                      <div className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                        {displayUsername || "Chưa cập nhật"}
                        {displayUsername && (
                          <button
                            onClick={() =>
                              handleCopyValue(displayUsername, "Tên đăng nhập")
                            }
                            className="inline-flex items-center justify-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            aria-label="Sao chép tên đăng nhập"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-gray-500 dark:text-gray-400">
                        Mã số sinh viên
                      </span>
                      <div className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                        {displayStudentCode || "Chưa cập nhật"}
                        {displayStudentCode && (
                          <button
                            onClick={() =>
                              handleCopyValue(
                                displayStudentCode,
                                "Mã số sinh viên"
                              )
                            }
                            className="inline-flex items-center justify-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            aria-label="Sao chép mã số sinh viên"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-gray-500 dark:text-gray-400">
                        Vai trò
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white capitalize">
                        {profile?.roles?.join(", ") || roleBadge.text}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-gray-500 dark:text-gray-400">
                        Trạng thái email
                      </span>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {profile?.email_verified
                          ? "Đã xác minh"
                          : "Chưa xác minh"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Ghi chú & Hồ sơ
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {profile?.bio ||
                      "Bạn chưa cập nhật phần giới thiệu bản thân. Hãy chia sẻ đôi chút về bạn để giảng viên và bạn học hiểu rõ hơn."}
                  </p>
                  <button
                    onClick={() => router.push("/settings")}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    Cập nhật hồ sơ
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/60 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                    Hoạt động gần đây
                  </h3>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    Lịch sử hoạt động và tiến độ học tập của bạn sẽ sớm được
                    hiển thị tại đây. Tiếp tục học tập để mở khóa thông tin thú
                    vị nhé!
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/60 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                    Nhật ký hệ thống
                  </h3>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    Thông tin đăng nhập và các thay đổi quan trọng sẽ được ghi
                    nhận để đảm bảo an toàn cho tài khoản của bạn.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
