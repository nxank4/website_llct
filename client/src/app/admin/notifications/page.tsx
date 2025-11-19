"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthFetch } from "@/lib/auth";
import { getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import {
  Bell,
  Plus,
  Trash2,
  Send,
  User,
  CheckCircle,
  X,
  RefreshCw,
  AlertCircle,
  Shield,
  GraduationCap,
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
  user_id?: number;
  user_name?: string;
}

interface NotificationFormData {
  title: string;
  message: string;
  type: "system" | "instructor";
  link_url: string;
  user_ids: string[] | null; // null = all users, array of Supabase UUIDs
}

export default function AdminNotificationsPage() {
  const authFetch = useAuthFetch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allUsers, setAllUsers] = useState<
    Array<{ id: string; full_name: string; email: string }>
  >([]);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    notificationId: number | null;
  }>({ isOpen: false, notificationId: null });
  const { showToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch(
        getFullUrl("/api/v1/notifications/?limit=100")
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await authFetch(getFullUrl("/api/v1/admin/users/"));
      if (response.ok) {
        const data = await response.json();
        setAllUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, [fetchNotifications, fetchUsers]);

  const handleCreateNotification = async (formData: NotificationFormData) => {
    try {
      // Convert user_ids to UUIDs (they should already be UUIDs from /api/v1/admin/users/)
      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        link_url: formData.link_url || null,
        user_ids:
          formData.user_ids && formData.user_ids.length > 0
            ? formData.user_ids // Already UUIDs from admin/users endpoint
            : null, // null = send to all users
      };

      const response = await authFetch(
        getFullUrl("/api/v1/notifications/bulk"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        await fetchNotifications();
        setShowCreateModal(false);
        showToast({
          type: "success",
          title: "Thành công",
          message: "Đã gửi thông báo thành công!",
        });
      } else {
        const errorData = await response.json();
        showToast({
          type: "error",
          title: "Lỗi",
          message: errorData.detail || "Không thể gửi thông báo",
        });
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Lỗi khi gửi thông báo",
      });
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmDialog({ isOpen: true, notificationId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmDialog.notificationId) return;

    try {
      // Note: Backend may not have delete endpoint, skip for now
      showToast({
        type: "info",
        title: "Thông báo",
        message: "Chức năng xóa thông báo chưa được hỗ trợ",
      });
      setDeleteConfirmDialog({ isOpen: false, notificationId: null });
    } catch (error) {
      console.error("Error deleting notification:", error);
      setDeleteConfirmDialog({ isOpen: false, notificationId: null });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" text="Đang tải thông báo..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Quản lý thông báo
            </h1>
            <p className="text-gray-600">
              Gửi và quản lý thông báo đến học viên
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Gửi thông báo</span>
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 inline-block">
          <span className="bg-[#00CBB8]/10 text-[#00CBB8] text-sm font-medium px-3 py-1 rounded-full">
            {notifications.length} thông báo
          </span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#125093] poppins-semibold">
            Danh sách thông báo
          </h2>
        </div>
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Bell className="h-5 w-5 text-[#125093]" />
                    <h3 className="text-lg font-medium text-gray-900 poppins-medium">
                      {notification.title}
                    </h3>
                    {notification.is_read ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="h-2 w-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-gray-600 mb-3">{notification.message}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {notification.user_name && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{notification.user_name}</span>
                      </div>
                    )}
                    <span>
                      {new Date(notification.created_at).toLocaleDateString(
                        "vi-VN"
                      )}
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {notification.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2 poppins-medium">
                Chưa có thông báo nào
              </h3>
              <p className="text-gray-600 mb-4">
                Gửi thông báo đầu tiên đến học viên
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Gửi thông báo mới
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <CreateNotificationModal
          users={allUsers}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateNotification}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, notificationId: null });
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialog.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[425px] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
            )}
          >
            <div className="flex flex-col space-y-2 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <AlertDialog.Title className="text-lg font-semibold">
                  Xác nhận xóa
                </AlertDialog.Title>
              </div>
              <AlertDialog.Description className="text-sm text-gray-600 pt-2">
                Bạn có chắc chắn muốn xóa thông báo này?
              </AlertDialog.Description>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Hủy</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button variant="destructive" onClick={confirmDelete}>
                  Xóa
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

// Create Notification Modal Component
function CreateNotificationModal({
  users,
  onClose,
  onSubmit,
}: {
  users: Array<{ id: string; full_name: string; email: string }>;
  onClose: () => void;
  onSubmit: (data: NotificationFormData) => void;
}) {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: "",
    message: "",
    type: "system",
    link_url: "",
    user_ids: null, // null = all users
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submit
    if (submitting) return;

    if (!formData.title.trim()) {
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Vui lòng nhập tiêu đề",
      });
      return;
    }

    if (!formData.message.trim()) {
      showToast({
        type: "error",
        title: "Lỗi",
        message: "Vui lòng nhập nội dung thông báo",
      });
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        user_ids: sendToAll ? null : selectedUserIds,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open && !submitting) {
          onClose();
        }
      }}
    >
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Gửi thông báo
            </DialogTitle>
            <DialogDescription className="sr-only">
              Biểu mẫu gửi thông báo đến học viên
            </DialogDescription>
            <DialogClose
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              disabled={submitting}
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full"
                placeholder="Nhập tiêu đề thông báo..."
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nội dung <span className="text-red-500">*</span>
              </label>
              <Textarea
                required
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                rows={5}
                className="w-full"
                placeholder="Nhập nội dung thông báo..."
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại thông báo{" "}
                <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value as NotificationFormData["type"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn loại thông báo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span>Hệ thống</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="instructor">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-emerald-600" />
                      <span>Giảng viên</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Link URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Liên kết{" "}
                <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <Input
                type="url"
                value={formData.link_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, link_url: e.target.value })
                }
                className="w-full"
                placeholder="https://..."
              />
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Người nhận{" "}
                <span className="text-gray-400 text-xs">(Tùy chọn)</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={sendToAll}
                    onChange={() => {
                      setSendToAll(true);
                      setSelectedUserIds([]);
                    }}
                    disabled={submitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">Tất cả học viên</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!sendToAll}
                    onChange={() => setSendToAll(false)}
                    disabled={submitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">
                    Chọn học viên cụ thể
                  </span>
                </label>
                {!sendToAll && (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                      <Input
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm học viên..."
                        className="w-full pl-9 pr-3 text-sm"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-1">
                      {users
                        .filter(
                          (user) =>
                            user.full_name
                              .toLowerCase()
                              .includes(userSearchTerm.toLowerCase()) ||
                            user.email
                              .toLowerCase()
                              .includes(userSearchTerm.toLowerCase())
                        )
                        .map((user) => (
                          <label
                            key={user.id}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUserIds([
                                    ...selectedUserIds,
                                    user.id,
                                  ]);
                                } else {
                                  setSelectedUserIds(
                                    selectedUserIds.filter(
                                      (id) => id !== user.id
                                    )
                                  );
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                              disabled={submitting}
                            />
                            <span className="text-sm text-gray-700 flex-1">
                              {user.full_name} ({user.email})
                            </span>
                          </label>
                        ))}
                      {users.filter(
                        (user) =>
                          user.full_name
                            .toLowerCase()
                            .includes(userSearchTerm.toLowerCase()) ||
                          user.email
                            .toLowerCase()
                            .includes(userSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Không tìm thấy học viên nào
                        </div>
                      )}
                    </div>
                    {selectedUserIds.length > 0 && (
                      <div className="text-xs text-gray-500">
                        Đã chọn: {selectedUserIds.length} học viên
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#125093] hover:bg-[#0f4278] text-white"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" inline />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Gửi thông báo</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
