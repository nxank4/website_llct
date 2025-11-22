"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Save,
  User,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  Bell,
  Camera,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthFetch } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import Spinner from "@/components/ui/Spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from "@/services/notifications";
import { useThemePreference } from "@/providers/ThemeProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  username: string;
  student_code: string;
  bio: string;
  locale: string;
  theme: string;
}

type ProfileSnapshot = Pick<SettingsForm, "full_name" | "username" | "student_code" | "bio">;

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const isAuthenticated = !!session;
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    full_name: "",
    username: "",
    student_code: "",
    bio: "",
    locale: "vi",
    theme: "light",
  });
  const [profileSnapshot, setProfileSnapshot] =
    useState<ProfileSnapshot | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [localeSnapshot, setLocaleSnapshot] = useState("vi");
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof SettingsForm, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreferences | null>(null);
  const [prefsSnapshot, setPrefsSnapshot] =
    useState<NotificationPreferences | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const normalizeNotificationPrefs = useCallback(
    (prefs?: NotificationPreferences | null): NotificationPreferences => {
      const system = prefs?.system ?? true;
      return {
        system,
        instructor: prefs?.instructor ?? true,
        general: false, // Không còn sử dụng
        alert: system, // Gộp với system
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
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [restoringDefaults, setRestoringDefaults] = useState(false);

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    []
  );
  const { theme: activeTheme, setTheme } = useThemePreference();
  const { locale: currentLocale, setLocale: setLocaleFromProvider, t } = useLocale();

  // Sync locale from provider
  useEffect(() => {
    setLocaleSnapshot(currentLocale);
    setForm((prev) =>
      prev.locale === currentLocale ? prev : { ...prev, locale: currentLocale }
    );
  }, [currentLocale]);

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

  const computeProfileDirty = useCallback(
    (nextValues: ProfileSnapshot) => {
      if (!profileSnapshot) return true;
      return (
        profileSnapshot.full_name !== nextValues.full_name ||
        profileSnapshot.username !== nextValues.username ||
        profileSnapshot.student_code !== nextValues.student_code ||
        profileSnapshot.bio !== nextValues.bio
      );
    },
    [profileSnapshot]
  );

  const fetchProfile = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);

        let response: Response;
        try {
          response = await authFetch(`${apiBase}/api/v1/users/me`);
        } catch (networkErr) {
          // Handle network errors (CORS, connection failed, etc.)
          const isNetworkError =
            networkErr instanceof TypeError ||
            (networkErr instanceof Error &&
              (networkErr.message.includes("Failed to fetch") ||
                networkErr.message.includes("NetworkError") ||
                networkErr.message.includes("CORS")));

          if (isNetworkError) {
            throw new Error(
              t("settings.networkError", "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.")
            );
          }
          throw networkErr;
        }

        if (!response.ok) {
          let errorData: { detail?: string } = {};
          try {
            errorData = await response.json();
          } catch {
            // If response is not JSON, use status text
            errorData = { detail: response.statusText || t("settings.unknownError", "Lỗi không xác định") };
          }
          throw new Error(
            errorData?.detail ||
              `${t("settings.cannotLoadProfile", "Không thể tải thông tin tài khoản")} (HTTP ${response.status})`
          );
        }

        const data: ProfileResponse = await response.json();
        setProfile(data);
        setAvatarUrl(data.avatar_url || null);
        const nextValues: ProfileSnapshot = {
          full_name: (data.full_name || "").trim(),
          username: (data.username || "").trim(),
          student_code: (data.student_code || "").trim(),
          bio: data.bio || "",
        };
        setProfileSnapshot(nextValues);
        setForm((prev) => ({
          ...prev,
          ...nextValues,
        }));
        setProfileDirty(false);
        setFormErrors((prev) => ({ ...prev, full_name: undefined }));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("settings.cannotLoadProfile", "Không thể tải thông tin tài khoản");
        setError(message);
        if (!silent) {
          showToast({
            type: "error",
            message,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [apiBase, authFetch, showToast, t]
  );

  const fetchNotificationPrefs = useCallback(async () => {
    try {
      setPrefsLoading(true);
      const prefs = await fetchNotificationPreferences(async (input, init) => {
        try {
          return await authFetch(
            typeof input === "string" ? input : input.toString(),
            init
          );
        } catch (networkErr) {
          // Handle network errors (CORS, connection failed, etc.)
          const isNetworkError =
            networkErr instanceof TypeError ||
            (networkErr instanceof Error &&
              (networkErr.message.includes("Failed to fetch") ||
                networkErr.message.includes("NetworkError") ||
                networkErr.message.includes("CORS")));

          if (isNetworkError) {
            throw new Error(
              t("settings.networkErrorShort", "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.")
            );
          }
          throw networkErr;
        }
      });
      syncPrefsState(prefs);
    } catch (err) {
      console.error("Error fetching notification preferences:", err);
      // Only show toast for non-network errors to avoid spam
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          (err.message.includes("Failed to fetch") ||
            err.message.includes("NetworkError") ||
            err.message.includes("CORS")));

      if (!isNetworkError) {
        showToast({
          type: "error",
          message: t("settings.cannotLoadNotifications", "Không thể tải cài đặt thông báo"),
        });
      }
    } finally {
      setPrefsLoading(false);
    }
  }, [authFetch, showToast, syncPrefsState, t]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchNotificationPrefs();
    }
  }, [fetchProfile, fetchNotificationPrefs, isAuthenticated]);

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

  // Helper function để lấy initials từ tên
  const getInitials = (name: string | null | undefined): string => {
    if (!name || typeof name !== "string") {
      return "U";
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "U";
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    // Lấy chữ cái đầu của từ đầu và từ cuối
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[parts.length - 1].charAt(0).toUpperCase()
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        type: "error",
        message: t("settings.pleaseSelectImage", "Vui lòng chọn file ảnh"),
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast({
        type: "error",
        message: t("settings.imageTooLarge", "File ảnh quá lớn. Tối đa 5MB"),
      });
      return;
    }

    // Lấy userId từ session - hoạt động với cả email và OAuth login
    // Ưu tiên profile.id vì đó là ID chính xác từ database
    const userId =
      profile?.id ||
      (session?.user as { id?: string })?.id ||
      (session?.user as { sub?: string })?.sub;

    if (!userId) {
      showToast({
        type: "error",
        message: t("settings.userNotFound", "Không tìm thấy thông tin người dùng"),
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
          .catch(() => ({ detail: t("settings.avatarUpdateError", "Lỗi khi cập nhật avatar") }));
        throw new Error(errorData.detail || t("settings.avatarUpdateError", "Lỗi khi cập nhật avatar"));
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

      // Update session để UserMenu sync với avatar mới
      await updateSession();
      await fetchProfile(true);

      showToast({
        type: "success",
        message: t("settings.avatarUploaded", "Cập nhật avatar thành công!"),
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : t("settings.avatarUploadError", "Lỗi khi tải lên avatar"),
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    setUploading(true);

    try {
      const response = await authFetch(`${apiBase}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatar_url: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: t("settings.avatarRemoveError", "Lỗi khi xóa avatar") }));
        throw new Error(errorData.detail || t("settings.avatarRemoveError", "Lỗi khi xóa avatar"));
      }

      setAvatarUrl(null);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: null,
            }
          : prev
      );

      // Update session để UserMenu sync với avatar mới
      await updateSession();
      await fetchProfile(true);

      showToast({
        type: "success",
        message: t("settings.avatarRemoved", "Đã xóa avatar. Sử dụng avatar mặc định với chữ cái đầu."),
      });
    } catch (error) {
      console.error("Error removing avatar:", error);
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : t("settings.avatarRemoveError", "Lỗi khi xóa avatar"),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;

      setForm((prev) => {
        const nextForm = { ...prev, [name]: value };
        if (name === "full_name" || name === "username" || name === "student_code" || name === "bio") {
          const tentative: ProfileSnapshot = {
            full_name:
              name === "full_name" ? value.trim() : prev.full_name.trim(),
            username:
              name === "username" ? value.trim() : prev.username.trim(),
            student_code:
              name === "student_code" ? value.trim() : prev.student_code.trim(),
            bio: name === "bio" ? value : prev.bio,
          };
          setProfileDirty(computeProfileDirty(tentative));
        }
        return nextForm;
      });

      if (name === "full_name") {
        const trimmed = value.trim();
        setFormErrors((prev) => ({
          ...prev,
          full_name: trimmed ? undefined : t("settings.fullNameRequired", "Vui lòng nhập họ và tên"),
        }));
      }
    },
    [computeProfileDirty, t]
  );

  const handleResetProfile = useCallback(() => {
    if (!profileSnapshot) return;
    setForm((prev) => ({
      ...prev,
      ...profileSnapshot,
    }));
    setProfileDirty(false);
    setFormErrors((prev) => ({ 
      ...prev, 
      full_name: undefined,
      username: undefined,
      student_code: undefined,
    }));
  }, [profileSnapshot]);

  const saveProfileChanges = useCallback(async () => {
    const trimmedFullName = form.full_name.trim();
    if (!trimmedFullName) {
      setFormErrors((prev) => ({
        ...prev,
        full_name: t("settings.fullNameRequired", "Vui lòng nhập họ và tên"),
      }));
      throw new Error(t("settings.fullNameRequiredValid", "Vui lòng nhập họ và tên hợp lệ"));
    }

    const payload: {
      full_name: string;
      username?: string;
      student_code?: string;
      bio: string;
    } = {
      full_name: trimmedFullName,
      bio: form.bio ?? "",
    };

    // Chỉ thêm username và student_code nếu có giá trị
    const trimmedUsername = form.username.trim();
    if (trimmedUsername) {
      payload.username = trimmedUsername;
    }

    const trimmedStudentCode = form.student_code.trim();
    if (trimmedStudentCode) {
      payload.student_code = trimmedStudentCode;
    }

    let response: Response;
    try {
      response = await authFetch(`${apiBase}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      const isNetworkError =
        networkErr instanceof TypeError ||
        (networkErr instanceof Error &&
          (networkErr.message.includes("Failed to fetch") ||
            networkErr.message.includes("NetworkError") ||
            networkErr.message.includes("CORS")));

      if (isNetworkError) {
        throw new Error(
          t("settings.networkError", "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.")
        );
      }
      throw networkErr;
    }

    if (!response.ok) {
      let errorData: { detail?: string } = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText || t("settings.unknownError", "Lỗi không xác định") };
      }
      throw new Error(errorData.detail || t("settings.cannotUpdateProfile", "Không thể cập nhật hồ sơ"));
    }

    await fetchProfile(true);
    setProfileSnapshot({
      full_name: trimmedFullName,
      username: trimmedUsername || "",
      student_code: trimmedStudentCode || "",
      bio: payload.bio,
    });
    setProfileDirty(false);
    
    // Update session để UserMenu sync với tên mới
    // NextAuth sẽ tự động refetch session từ server
    await updateSession();
    
    showToast({
      type: "success",
      message: t("settings.profileSaved", "Đã lưu thay đổi hồ sơ"),
    });
  }, [apiBase, authFetch, fetchProfile, form.bio, form.full_name, form.username, form.student_code, showToast, updateSession, t]);

  const handlePreferenceToggle = useCallback(
    (key: keyof NotificationPreferences) => {
      setNotificationPrefs((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        // Toggle the selected preference
        next[key] = !prev[key];
        // Khi toggle "system" thì cũng toggle "alert" (gộp chung)
        if (key === "system") {
          next.alert = next.system;
        }
        // Tắt "general" vì không còn sử dụng
        next.general = false;
        const snapshot = prefsSnapshot || prev;
        setPrefsDirty(JSON.stringify(next) !== JSON.stringify(snapshot));
        return next;
      });
    },
    [prefsSnapshot]
  );

  const handleResetPreferences = useCallback(async () => {
    const defaults = normalizeNotificationPrefs({
      system: true,
      instructor: true,
      general: false,
      alert: true,
    });

    const previousPrefs = notificationPrefs;
    setNotificationPrefs(defaults);
    setPrefsDirty(false);
    setRestoringDefaults(true);

    try {
      const updated = await updateNotificationPreferences(
        async (input, init) => {
          try {
            return await authFetch(
              typeof input === "string" ? input : input.toString(),
              init
            );
          } catch (networkErr) {
            const isNetworkError =
              networkErr instanceof TypeError ||
              (networkErr instanceof Error &&
                (networkErr.message.includes("Failed to fetch") ||
                  networkErr.message.includes("NetworkError") ||
                  networkErr.message.includes("CORS")));

            if (isNetworkError) {
              throw new Error(
                "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng."
              );
            }
            throw networkErr;
          }
        },
        defaults
      );
      syncPrefsState(updated);
      showToast({
        type: "success",
        message: "Đã khôi phục cài đặt thông báo mặc định",
      });
    } catch (error) {
      console.error("Error restoring notification preferences:", error);
      if (previousPrefs) {
        setNotificationPrefs(previousPrefs);
        setPrefsDirty(
          JSON.stringify(previousPrefs) !==
            JSON.stringify(prefsSnapshot || previousPrefs)
        );
      }
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Không thể khôi phục cài đặt mặc định",
      });
    } finally {
      setRestoringDefaults(false);
    }
  }, [
    authFetch,
    normalizeNotificationPrefs,
    notificationPrefs,
    prefsSnapshot,
    showToast,
    syncPrefsState,
  ]);

  const saveNotificationPreferences = useCallback(async () => {
    if (!notificationPrefs) return;
    const updated = await updateNotificationPreferences(async (input, init) => {
      try {
        return await authFetch(
          typeof input === "string" ? input : input.toString(),
          init
        );
      } catch (networkErr) {
        const isNetworkError =
          networkErr instanceof TypeError ||
          (networkErr instanceof Error &&
            (networkErr.message.includes("Failed to fetch") ||
              networkErr.message.includes("NetworkError") ||
              networkErr.message.includes("CORS")));

        if (isNetworkError) {
          throw new Error(
            "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau."
          );
        }
        throw networkErr;
      }
    }, notificationPrefs);
    syncPrefsState(updated);
    showToast({
      type: "success",
      message: t("settings.notificationsSaved", "Đã lưu cài đặt thông báo"),
    });
  }, [authFetch, notificationPrefs, showToast, syncPrefsState, t]);

  const pendingThemeChange =
    form.theme === "light" || form.theme === "dark"
      ? form.theme !== activeTheme
      : false;
  const pendingLocaleChange = form.locale !== localeSnapshot;

  const handleSaveAll = useCallback(async () => {
    if (savingAll) return;
    const tasks: Promise<void>[] = [];

    if (profileDirty) {
      tasks.push(
        saveProfileChanges().catch((err) => {
          if (err instanceof Error) {
            showToast({ type: "error", message: err.message });
          }
          throw err;
        })
      );
    }

    if (prefsDirty && notificationPrefs) {
      tasks.push(
        saveNotificationPreferences().catch((err) => {
          if (err instanceof Error) {
            showToast({ type: "error", message: err.message });
          }
          throw err;
        })
      );
    }

    if (tasks.length === 0 && !pendingThemeChange && !pendingLocaleChange) {
      showToast({
        type: "info",
        message: t("settings.noChanges", "Không có thay đổi để lưu"),
      });
      return;
    }

    setSavingAll(true);
    try {
      await Promise.all(tasks);
      if (pendingThemeChange) {
        setTheme(form.theme as "light" | "dark");
        showToast({
          type: "success",
          message: t("settings.themeUpdated", "Đã áp dụng giao diện mới"),
        });
      }
      if (pendingLocaleChange) {
        const nextLocale = form.locale || "vi";
        await setLocaleFromProvider(nextLocale as "vi" | "en");
        setLocaleSnapshot(nextLocale);
        showToast({
          type: "success",
          message: t("settings.languageUpdated", "Đã cập nhật ngôn ngữ hiển thị"),
        });
      }
    } catch {
      // individual tasks already surface error
    } finally {
      setSavingAll(false);
    }
  }, [
    form.locale,
    form.theme,
    notificationPrefs,
    pendingLocaleChange,
    pendingThemeChange,
    prefsDirty,
    profileDirty,
    saveNotificationPreferences,
    saveProfileChanges,
    savingAll,
    setTheme,
    setLocaleFromProvider,
    showToast,
    t,
  ]);

  const statusChips = useMemo(
    () => [
      {
        label: profile?.email_verified
          ? t("settings.emailVerifiedStatus", "Email đã xác minh")
          : t("settings.emailNotVerifiedStatus", "Email chưa xác minh"),
        icon: profile?.email_verified ? CheckCircle2 : XCircle,
        tone: profile?.email_verified
          ? "bg-emerald-500/15 text-emerald-500"
          : "bg-amber-500/15 text-amber-500",
      },
      {
        label: profile?.is_active
          ? t("settings.accountActiveStatus", "Tài khoản đang hoạt động")
          : t("settings.accountInactiveStatus", "Tài khoản tạm khóa"),
        icon: profile?.is_active ? CheckCircle2 : XCircle,
        tone: profile?.is_active
          ? "bg-primary/15 text-primary"
          : "bg-rose-500/15 text-rose-500",
      },
    ],
    [profile?.email_verified, profile?.is_active, t]
  );

  const hasChanges =
    profileDirty || prefsDirty || pendingThemeChange || pendingLocaleChange;
  const saveDisabled =
    savingAll || loading || !!formErrors.full_name || !hasChanges;
  const canResetProfile = !!profileSnapshot && profileDirty && !savingAll;

  // Calculate notification preference list before early returns (React Hooks rule)
  const notificationPreferenceList: Array<{
    key: keyof NotificationPreferences;
    label: string;
    description: string;
  }> = useMemo(() => [
    {
      key: "system",
      label: t("settings.systemNotificationsFull", "Thông báo hệ thống"),
      description: t("settings.systemNotificationsFullDesc", "Cập nhật quan trọng, bảo trì, bảo mật, cảnh báo khẩn cấp và thông báo từ hệ thống."),
    },
    {
      key: "instructor",
      label: t("settings.instructorNotificationsFull", "Thông báo từ giảng viên"),
      description: t("settings.instructorNotificationsFullDesc", "Tài liệu mới, bài tập, nhắc nhở do giảng viên gửi."),
    },
  ], [t]);

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
          <div className="h-44 rounded-3xl bg-gradient-to-r from-primary/30 via-sky-400/30 to-emerald-400/30" />
          <div className="h-96 rounded-3xl border border-border bg-card/80" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-card text-card-foreground border border-border rounded-2xl p-8 text-center space-y-3">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h2 className="text-lg font-semibold">{t("settings.cannotLoadSettings", "Không thể tải cài đặt")}</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => fetchProfile()}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("settings.tryAgain", "Thử lại")}
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
        ? t("settings.admin", "Quản trị viên")
        : primaryRole === "instructor"
        ? t("settings.instructor", "Giảng viên")
        : t("settings.student", "Sinh viên"),
    tone:
      primaryRole === "admin"
        ? "bg-destructive/10 text-destructive"
        : primaryRole === "instructor"
        ? "bg-primary/15 text-primary"
        : "bg-emerald-500/15 text-emerald-500",
    icon: primaryRole === "admin" ? Shield : User,
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-r from-sky-400/40 via-blue-500/40 to-indigo-500/40 dark:from-sky-600/40 dark:via-blue-700/40 dark:to-indigo-700/40 blur-3xl opacity-40 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 relative">
          <div className="bg-card text-card-foreground rounded-3xl shadow-xl border border-border overflow-hidden">
            <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-10">
              {/* Page Header */}
              <section className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                      {t("settings.overview", "Tổng quan")}
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-semibold text-foreground">
                      {t("settings.accountSettings", "Cài đặt tài khoản")}
                    </h1>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                    {t("settings.description", "Tùy chỉnh thông tin cá nhân, ngôn ngữ, giao diện và thông báo. Các thay đổi chỉ được áp dụng sau khi nhấn \"Lưu thay đổi\".")}
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
                {/* Avatar Section */}
                <div className="relative shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "relative group",
                          uploading && "pointer-events-none"
                        )}
                        disabled={uploading}
                        aria-label={t("settings.changeAvatar", "Thay đổi ảnh đại diện")}
                      >
                        <Avatar
                          className={cn(
                            "w-24 h-24 sm:w-28 sm:h-28 cursor-pointer transition-transform hover:scale-[1.02] border-2",
                            uploading && "ring-2 ring-primary/40"
                          )}
                        >
                          <AvatarImage
                            src={avatarUrl || undefined}
                            alt={profile?.full_name || "User"}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl sm:text-3xl font-semibold">
                            {getInitials(profile?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Spinner size="md" className="text-white" />
                          </div>
                        )}
                        {!uploading && (
                          <div className="absolute bottom-0 right-0 backdrop-blur px-2 py-1 rounded-full flex items-center text-xs font-medium bg-card/80 text-foreground border border-border shadow-sm">
                            <Camera className="w-3.5 h-3.5 mr-1" />
                            {t("settings.update", "Cập nhật")}
                          </div>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={handleAvatarClick}
                        className="cursor-pointer"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {t("settings.uploadAvatar", "Tải ảnh lên")}
                      </DropdownMenuItem>
                      {avatarUrl && (
                        <DropdownMenuItem
                          onClick={handleRemoveAvatar}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("settings.removeAvatar", "Xóa avatar")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </section>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveAll();
                }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <div className="lg:col-span-2 space-y-6">
                  {/* Profile Section */}
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                          {t("settings.profile", "Hồ sơ")}
                        </p>
                        <h2 className="text-lg font-semibold text-foreground">
                          {t("settings.personalInfo", "Thông tin cá nhân")}
                        </h2>
                      </div>
                    </div>

                    <FieldGroup>
                      <Field data-invalid={!!formErrors.full_name}>
                        <FieldLabel htmlFor="settings-full-name">
                          {t("settings.fullName", "Họ và tên")}
                        </FieldLabel>
                        <Input
                          id="settings-full-name"
                          name="full_name"
                          value={form.full_name}
                          onChange={handleChange}
                          aria-invalid={!!formErrors.full_name}
                          className="w-full bg-background"
                          placeholder={t("settings.fullNamePlaceholder", "Nhập họ và tên đầy đủ của bạn")}
                        />
                        <FieldError>{formErrors.full_name}</FieldError>
                      </Field>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field data-invalid={!!formErrors.username}>
                          <FieldLabel htmlFor="settings-username">
                            {t("settings.username", "Tên người dùng")}
                          </FieldLabel>
                          <Input
                            id="settings-username"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            aria-invalid={!!formErrors.username}
                            className="w-full bg-background"
                            placeholder={t("settings.usernamePlaceholder", "Nhập tên người dùng (tùy chọn)")}
                          />
                          <FieldError>{formErrors.username}</FieldError>
                        </Field>

                        <Field data-invalid={!!formErrors.student_code}>
                          <FieldLabel htmlFor="settings-student-code">
                            {t("settings.studentCode", "Mã sinh viên")}
                          </FieldLabel>
                          <Input
                            id="settings-student-code"
                            name="student_code"
                            value={form.student_code}
                            onChange={handleChange}
                            aria-invalid={!!formErrors.student_code}
                            className="w-full bg-background"
                            placeholder={t("settings.studentCodePlaceholder", "Nhập mã sinh viên (tùy chọn)")}
                          />
                          <FieldError>{formErrors.student_code}</FieldError>
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel htmlFor="settings-bio">
                          {t("settings.bio", "Giới thiệu")}
                        </FieldLabel>
                        <Textarea
                          id="settings-bio"
                          name="bio"
                          value={form.bio}
                          onChange={handleChange}
                          rows={4}
                          className="w-full bg-background"
                          placeholder={t("settings.bioPlaceholder", "Chia sẻ đôi nét về bản thân bạn...")}
                        />
                      </Field>
                    </FieldGroup>
                  </div>

                  {/* Language & Theme */}
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                          {t("settings.interface", "Giao diện")}
                        </p>
                        <h2 className="text-lg font-semibold text-foreground">
                          {t("settings.languageAndTheme", "Ngôn ngữ & Chủ đề")}
                        </h2>
                      </div>
                    </div>
                    <FieldGroup>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Field>
                          <FieldLabel htmlFor="settings-locale">
                            {t("settings.language", "Ngôn ngữ")}
                          </FieldLabel>
                          <Select
                            value={form.locale}
                            onValueChange={(value) =>
                              handleChange({
                                target: { name: "locale", value },
                              } as React.ChangeEvent<HTMLInputElement>)
                            }
                          >
                            <SelectTrigger
                              id="settings-locale"
                              className="w-full rounded-xl"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vi">Tiếng Việt</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="settings-theme">
                            {t("settings.theme", "Giao diện")}
                          </FieldLabel>
                          <Select
                            value={form.theme}
                            onValueChange={(value) =>
                              handleChange({
                                target: { name: "theme", value },
                              } as React.ChangeEvent<HTMLInputElement>)
                            }
                          >
                            <SelectTrigger
                              id="settings-theme"
                              className="w-full rounded-xl"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">{t("settings.light", "Sáng")}</SelectItem>
                              <SelectItem value="dark">{t("settings.dark", "Tối")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                    </FieldGroup>
                  </div>

                  {/* Notification Preferences */}
                  <div
                    id="notifications"
                    className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                          {t("settings.notifications", "Thông báo")}
                        </p>
                        <h2 className="text-lg font-semibold text-foreground">
                          {t("settings.customizeNotifications", "Tùy chỉnh kênh nhận thông tin")}
                        </h2>
                      </div>
                    </div>
                    {prefsLoading ? (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Spinner size="sm" inline />
                        {t("settings.loadingSettings", "Đang tải cài đặt...")}
                      </div>
                    ) : notificationPrefs ? (
                      <div className="space-y-4">
                        {notificationPreferenceList.map(
                          ({ key, label, description }) => (
                            <div
                              key={key}
                              className="flex items-start justify-between gap-3 border border-border rounded-2xl p-3"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {description}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePreferenceToggle(key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                                  notificationPrefs[key]
                                    ? "bg-emerald-500/15 text-emerald-500"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {notificationPrefs[key] ? t("settings.enable", "Bật") : t("settings.disable", "Tắt")}
                              </button>
                            </div>
                          )
                        )}
                        {prefsDirty && (
                          <p className="text-xs text-muted-foreground">
                            {t("settings.saveNotificationHint", "Nhấn \"Lưu thay đổi\" để áp dụng cài đặt thông báo.")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-500">
                        {t("settings.cannotLoadNotifications", "Không thể tải cài đặt thông báo.")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Snapshot */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      {t("settings.accountStatus", "Trạng thái tài khoản")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile?.is_active
                        ? t("settings.accountActive", "Tài khoản của bạn đang hoạt động bình thường. Bạn có thể truy cập tất cả các tính năng.")
                        : t("settings.accountInactive", "Tài khoản hiện bị tạm khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      {t("settings.emailVerification", "Email xác minh")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile?.email_verified
                        ? t("settings.emailVerified", "Email của bạn đã được xác minh. Không cần hành động thêm.")
                        : t("settings.emailNotVerified", "Bạn chưa xác minh email. Vui lòng kiểm tra hộp thư để xác nhận.")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                  {primaryRole === "admin" && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
                      <span>{t("settings.pendingChanges", "Thay đổi đang chờ")}</span>
                      <span className="font-semibold text-foreground">
                        {hasChanges ? t("settings.hasChanges", "Có") : t("settings.noPendingChanges", "Không")}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleResetPreferences}
                        disabled={restoringDefaults}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {restoringDefaults ? (
                          <>
                            <Spinner size="sm" inline />
                            {t("settings.restoring", "Đang khôi phục...")}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            {t("settings.restoreDefaults", "Khôi phục mặc định")}
                          </>
                        )}
                      </button>
                      {canResetProfile && (
                        <button
                          type="button"
                          onClick={handleResetProfile}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                          {t("settings.restoreProfile", "Khôi phục hồ sơ")}
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={saveDisabled}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingAll ? (
                        <>
                          <Spinner size="sm" inline />
                          {t("settings.saving", "Đang lưu...")}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {t("settings.saveChanges", "Lưu thay đổi")}
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.saveHint", "Thay đổi của bạn sẽ được áp dụng ngay sau khi lưu.")}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
