"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Save,
  User,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  Bell,
} from "lucide-react";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import Spinner from "@/components/ui/Spinner";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from "@/services/notifications";
import { useThemePreference } from "@/providers/ThemeProvider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileResponse {
  id: string;
  email: string;
  username: string;
  full_name: string;
  bio?: string | null;
  student_code?: string | null;
  roles?: string[];
  is_active: boolean;
  is_instructor: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface SettingsForm {
  full_name: string;
  bio: string;
  locale: string;
  theme: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAuthenticated = !!session;
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    full_name: "",
    bio: "",
    locale: "vi",
    theme: "light",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences | null>(null);
  const [prefsSnapshot, setPrefsSnapshot] =
    useState<NotificationPreferences | null>(null);
  const normalizeNotificationPrefs = useCallback(
    (prefs?: NotificationPreferences | null): NotificationPreferences => {
      const system = prefs?.system ?? true;
      return {
        system,
        instructor: prefs?.instructor ?? true,
        general: prefs?.general ?? true,
        alert: system,
      };
    },
    []
  );

  const syncPrefsState = useCallback(
    (prefs: NotificationPreferences) => {
      const normalized = normalizeNotificationPrefs(prefs);
      setNotificationPrefs(normalized);
      setPrefsSnapshot(normalized);
      setPrefsDirty(false);
    },
    [normalizeNotificationPrefs]
  );

  const [prefsLoading, setPrefsLoading] = useState(true);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsDirty, setPrefsDirty] = useState(false);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    []
  );
  const { theme: activeTheme, setTheme } = useThemePreference();

  useEffect(() => {
    setForm((prev) =>
      prev.theme === activeTheme ? prev : { ...prev, theme: activeTheme }
    );
  }, [activeTheme]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const fetchProfile = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);

        const response = await authFetch(`${apiBase}/api/v1/users/me`);
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Không thể tải thông tin tài khoản" }));
          throw new Error(
            errorData?.detail ||
              `Không thể tải thông tin tài khoản (HTTP ${response.status})`
          );
        }

        const data: ProfileResponse = await response.json();
        setProfile(data);
        setForm((prev) => ({
          ...prev,
          full_name: data.full_name || "",
          bio: data.bio || "",
        }));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Không thể tải thông tin tài khoản";
        setError(message);
        showToast({
          type: "error",
          message,
        });
      } finally {
        setLoading(false);
      }
    },
    [apiBase, authFetch, showToast]
  );

  const fetchNotificationPrefs = useCallback(async () => {
    try {
      setPrefsLoading(true);
      const prefs = await fetchNotificationPreferences((input, init) =>
        authFetch(typeof input === "string" ? input : input.toString(), init)
      );
      syncPrefsState(prefs);
    } catch (err) {
      console.error("Error fetching notification preferences:", err);
      showToast({
        type: "error",
        message: "Không thể tải cài đặt thông báo",
      });
    } finally {
      setPrefsLoading(false);
    }
  }, [authFetch, showToast, syncPrefsState]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchNotificationPrefs();
    }
  }, [fetchProfile, fetchNotificationPrefs, isAuthenticated]);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
      if (name === "theme" && (value === "light" || value === "dark")) {
        setTheme(value);
      }
    },
    [setTheme]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        const payload = {
          full_name: form.full_name,
          bio: form.bio,
        };

        const response = await authFetch(`${apiBase}/api/v1/users/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Không thể cập nhật hồ sơ" }));
          throw new Error(errorData.detail || "Không thể cập nhật hồ sơ");
        }

        await fetchProfile(true);
        showToast({
          type: "success",
          message: "Đã lưu thay đổi hồ sơ",
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Không thể lưu thay đổi";
        showToast({
          type: "error",
          message,
        });
      } finally {
        setSaving(false);
      }
    },
    [apiBase, authFetch, fetchProfile, form.bio, form.full_name, showToast]
  );

  const handlePreferenceToggle = useCallback(
    (key: keyof NotificationPreferences) => {
      setNotificationPrefs((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (key === "system") {
          const toggled = !prev.system;
          next.system = toggled;
          next.alert = toggled;
        } else {
          next[key] = !prev[key];
        }
        const snapshot = prefsSnapshot || prev;
        setPrefsDirty(JSON.stringify(next) !== JSON.stringify(snapshot));
        return next;
      });
    },
    [prefsSnapshot]
  );

  const handleResetPreferences = useCallback(() => {
    const defaults = normalizeNotificationPrefs({
      system: true,
      instructor: true,
      general: true,
      alert: true,
    });
    setNotificationPrefs(defaults);
    setPrefsDirty(
      JSON.stringify(defaults) !== JSON.stringify(prefsSnapshot || defaults)
    );
  }, [normalizeNotificationPrefs, prefsSnapshot]);

  const handleSavePreferences = useCallback(async () => {
    if (!notificationPrefs) return;
    setPrefsSaving(true);
    try {
      const updated = await updateNotificationPreferences(
        (input, init) =>
          authFetch(typeof input === "string" ? input : input.toString(), init),
        notificationPrefs
      );
      syncPrefsState(updated);
      showToast({
        type: "success",
        message: "Đã lưu cài đặt",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể lưu cài đặt thông báo";
      showToast({
        type: "error",
        message,
      });
    } finally {
      setPrefsSaving(false);
    }
  }, [authFetch, notificationPrefs, showToast, syncPrefsState]);

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

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
          <div className="h-44 bg-gradient-to-r from-blue-200 via-cyan-200 to-emerald-200 rounded-3xl" />
          <div className="h-96 bg-white/80 dark:bg-gray-800/80 rounded-3xl border border-white/60 dark:border-white/10" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-500/40 rounded-2xl p-8 text-center space-y-3">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Không thể tải cài đặt
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
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

  const primaryRole =
    profile?.roles?.[0]?.toLowerCase() ||
    (profile?.is_superuser
      ? "admin"
      : profile?.is_instructor
      ? "instructor"
      : "student");

  const roleBadge = {
    text:
      primaryRole === "admin"
        ? "Quản trị viên"
        : primaryRole === "instructor"
        ? "Giảng viên"
        : "Sinh viên",
    tone:
      primaryRole === "admin"
        ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200"
        : primaryRole === "instructor"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
    icon: primaryRole === "admin" ? Shield : User,
  };

  const notificationPreferenceList: Array<{
    key: keyof NotificationPreferences;
    label: string;
    description: string;
  }> = [
    {
      key: "system",
      label: "Thông báo hệ thống & cảnh báo",
      description:
        "Cập nhật quan trọng, bảo trì, bảo mật và cảnh báo khẩn cấp.",
    },
    {
      key: "instructor",
      label: "Thông báo từ giảng viên",
      description: "Tài liệu mới, bài tập, nhắc nhở do giảng viên gửi.",
    },
    {
      key: "general",
      label: "Thông báo chung",
      description: "Tin tức, sự kiện và lời nhắc chung từ hệ thống.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-16">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 dark:from-sky-600 dark:via-blue-700 dark:to-indigo-700 blur-3xl opacity-40 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 relative">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-white/60 dark:border-white/10 overflow-hidden">
            <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white">
                    Cài đặt tài khoản
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl">
                    Điều chỉnh thông tin cá nhân, hồ sơ và tùy chọn giao diện
                    của bạn. Các thay đổi được lưu sẽ áp dụng trên toàn bộ nền
                    tảng.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium ${roleBadge.tone}`}
                    >
                      <roleBadge.icon className="w-4 h-4" />
                      {roleBadge.text}
                    </span>
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

              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Hồ sơ cá nhân
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-sm text-gray-500 dark:text-gray-400">
                          Họ và tên
                        </label>
                        <Input
                          name="full_name"
                          value={form.full_name}
                          onChange={handleChange}
                          className="w-full dark:bg-gray-900/60"
                          placeholder="Nhập họ và tên đầy đủ của bạn"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm text-gray-500 dark:text-gray-400">
                          Giới thiệu
                        </label>
                        <Textarea
                          name="bio"
                          value={form.bio}
                          onChange={handleChange}
                          rows={4}
                          className="w-full dark:bg-gray-900/60"
                          placeholder="Chia sẻ đôi nét về bản thân bạn..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Ngôn ngữ & Giao diện
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm text-gray-500 dark:text-gray-400">
                          Ngôn ngữ
                        </label>
                        <Select
                          value={form.locale}
                          onValueChange={(value) =>
                            handleChange({
                              target: { name: "locale", value },
                            } as React.ChangeEvent<HTMLInputElement>)
                          }
                        >
                          <SelectTrigger className="w-full rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm text-gray-500 dark:text-gray-400">
                          Giao diện
                        </label>
                        <Select
                          value={form.theme}
                          onValueChange={(value) =>
                            handleChange({
                              target: { name: "theme", value },
                            } as React.ChangeEvent<HTMLInputElement>)
                          }
                        >
                          <SelectTrigger className="w-full rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Sáng</SelectItem>
                            <SelectItem value="dark">Tối</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                      Trạng thái tài khoản
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {profile?.is_active
                        ? "Tài khoản của bạn đang hoạt động bình thường. Bạn có thể truy cập tất cả các tính năng."
                        : "Tài khoản hiện bị tạm khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ."}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                      Email xác minh
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {profile?.email_verified
                        ? "Email của bạn đã được xác minh. Không cần hành động thêm."
                        : "Bạn chưa xác minh email. Vui lòng kiểm tra hộp thư để xác nhận."}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" inline />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Thay đổi của bạn sẽ được áp dụng ngay sau khi lưu.
                  </p>
                </div>
              </form>
            </div>
            <div
              id="notifications"
              className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500 dark:text-blue-300" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Cài đặt thông báo
                </h3>
              </div>
              {prefsLoading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Spinner size="sm" inline />
                  Đang tải cài đặt...
                </div>
              ) : notificationPrefs ? (
                <div className="space-y-4">
                  {notificationPreferenceList.map(
                    ({ key, label, description }) => (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-3 border border-gray-100 dark:border-gray-700 rounded-2xl p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePreferenceToggle(key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                            notificationPrefs[key]
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {notificationPrefs[key] ? "Bật" : "Tắt"}
                        </button>
                      </div>
                    )
                  )}
                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleResetPreferences}
                      className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white"
                    >
                      Khôi phục mặc định
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePreferences}
                      disabled={!prefsDirty || prefsSaving}
                      className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#125093] hover:bg-[#0f4278] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {prefsSaving ? (
                        <>
                          <Spinner size="sm" inline />
                          <span className="ml-2">Đang lưu...</span>
                        </>
                      ) : (
                        "Lưu cài đặt"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-500">
                  Không thể tải cài đặt thông báo.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
