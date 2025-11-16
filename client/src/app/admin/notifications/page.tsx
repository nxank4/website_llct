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
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

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
  type: "news" | "document" | "assignment" | "announcement";
  link_url: string;
  user_ids: number[] | null; // null = all users
}

export default function AdminNotificationsPage() {
  const authFetch = useAuthFetch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allUsers, setAllUsers] = useState<
    Array<{ id: number; full_name: string; email: string }>
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
      const payload = {
        ...formData,
        user_ids:
          formData.user_ids && formData.user_ids.length > 0
            ? formData.user_ids
            : null,
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
          <AlertDialog.Overlay
            className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          />
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
  users: Array<{ id: number; full_name: string; email: string }>;
  onClose: () => void;
  onSubmit: (data: NotificationFormData) => void;
}) {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: "",
    message: "",
    type: "announcement",
    link_url: "",
    user_ids: null, // null = all users
  });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Gửi thông báo</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập tiêu đề thông báo..."
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung *
            </label>
            <textarea
              required
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập nội dung thông báo..."
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại thông báo
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as NotificationFormData["type"],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="announcement">Thông báo</option>
              <option value="news">Tin tức</option>
              <option value="document">Tài liệu</option>
              <option value="assignment">Bài kiểm tra</option>
            </select>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Liên kết (tùy chọn)
            </label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) =>
                setFormData({ ...formData, link_url: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Người nhận
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={sendToAll}
                  onChange={() => {
                    setSendToAll(true);
                    setSelectedUserIds([]);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Tất cả học viên</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={!sendToAll}
                  onChange={() => setSendToAll(false)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Chọn học viên cụ thể
                </span>
              </label>
              {!sendToAll && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds([...selectedUserIds, user.id]);
                          } else {
                            setSelectedUserIds(
                              selectedUserIds.filter((id) => id !== user.id)
                            );
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {user.full_name} ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-[#125093] text-white rounded-lg hover:bg-[#0f4278] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
