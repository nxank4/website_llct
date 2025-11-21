"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useAuthFetch, hasRole } from "@/lib/auth";
import { getFullUrl } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import {
  Users,
  UserPlus,
  Shield,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Filter,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "instructor" | "student";
  is_active: boolean;
  created_at: string;
  last_login?: string;
  total_assessments?: number;
  total_results?: number;
}

export default function MembersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sorting, setSorting] = useState<{
    field: string | null;
    order: "asc" | "desc";
  }>({ field: null, order: "asc" });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showAddModal, setShowAddModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    userId: string | null;
  }>({ isOpen: false, userId: null });
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();

  // Only admin can manage users
  const isAdmin = hasRole(session, "admin");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Build query params for server-side filtering and sorting
      const params = new URLSearchParams();
      params.append("limit", "100");

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      if (roleFilter && roleFilter !== "all") {
        params.append("role", roleFilter);
      }

      if (statusFilter && statusFilter !== "all") {
        params.append(
          "status",
          statusFilter === "active" ? "active" : "inactive"
        );
      }

      if (sorting.field) {
        params.append("sortBy", sorting.field);
        params.append("order", sorting.order);
      }

      const response = await authFetch(
        getFullUrl(`/api/v1/admin/users?${params.toString()}`)
      );

      if (response.ok) {
        const data = await response.json();

        // Chuyển đổi dữ liệu từ API sang format của component
        const formattedUsers: User[] = data.map(
          (user: Record<string, unknown>) => ({
            id: String(user.id),
            email: user.email as string,
            full_name: (user.full_name ||
              user.username ||
              "Chưa có tên") as string,
            role: (user.role ||
              (user.is_superuser
                ? "admin"
                : user.is_instructor
                ? "instructor"
                : "student")) as "admin" | "instructor" | "student",
            is_active: user.is_active as boolean,
            created_at: user.created_at as string,
            last_login: undefined, // Not available in database schema
            total_assessments: (user.total_assessments as number) || 0,
            total_results: (user.total_results as number) || 0,
          })
        );

        setUsers(formattedUsers);
      } else {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        throw new Error(
          `Không thể tải danh sách người dùng: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách người dùng từ server";
      showToast({
        type: "error",
        title: "Lỗi",
        message: `${errorMessage}\n\nVui lòng kiểm tra kết nối server và thử lại.`,
      });
    } finally {
      setLoading(false);
    }
  }, [authFetch, searchTerm, roleFilter, statusFilter, sorting, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (
    userId: string,
    newRole: "admin" | "instructor" | "student"
  ) => {
    try {
      // Try API first
      try {
        const response = await authFetch(
          getFullUrl(`/api/v1/admin/users/${userId}/set-role`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: newRole }),
          }
        );

        if (response.ok || response.status === 204) {
          // Refresh users list from database after successful update
          await fetchUsers();
          showToast({
            type: "success",
            title: "Thành công",
            message: `Đã cập nhật vai trò thành ${
              newRole === "admin"
                ? "Quản trị viên"
                : newRole === "instructor"
                ? "Giảng viên"
                : "Sinh viên"
            }`,
          });
          return;
        } else {
          const errorText = await response.text();
          throw new Error(
            `Không thể cập nhật vai trò: ${response.status} - ${errorText}`
          );
        }
      } catch (apiError) {
        console.error("API error updating role:", apiError);
        throw apiError;
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Lỗi khi cập nhật vai trò người dùng";
      showToast({
        type: "error",
        title: "Lỗi",
        message: errorMessage,
      });
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const response = await authFetch(getFullUrl(`/api/v1/users/${userId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (response.ok) {
        // Refresh users list from database after successful update
        await fetchUsers();
        showToast({
          type: "success",
          title: "Thành công",
          message: `Đã ${
            !user.is_active ? "kích hoạt" : "vô hiệu hóa"
          } người dùng thành công`,
        });
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to toggle user status:",
          response.status,
          errorText
        );
        throw new Error(
          `Không thể thay đổi trạng thái người dùng: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Lỗi khi thay đổi trạng thái người dùng";
      showToast({
        type: "error",
        title: "Lỗi",
        message: errorMessage,
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteConfirmDialog({ isOpen: true, userId });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirmDialog.userId) return;

    try {
      // Try API first
      try {
        const response = await authFetch(
          getFullUrl(`/api/v1/users/${deleteConfirmDialog.userId}`),
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          // Refresh users list from database after successful deletion
          await fetchUsers();
          showToast({
            type: "success",
            title: "Thành công",
            message: "Đã xóa người dùng thành công",
          });
          setDeleteConfirmDialog({ isOpen: false, userId: null });
          return;
        } else {
          const errorText = await response.text();
          throw new Error(
            `Không thể xóa người dùng: ${response.status} - ${errorText}`
          );
        }
      } catch (apiError) {
        console.error("API error deleting user:", apiError);
        throw apiError;
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi khi xóa người dùng";
      showToast({
        type: "error",
        title: "Lỗi",
        message: errorMessage,
      });
      setDeleteConfirmDialog({ isOpen: false, userId: null });
    }
  };

  // Server-side filtering is now handled in fetchUsers
  // No need for client-side filtering
  const filteredUsers = users;

  const handleSort = (field: string) => {
    setSorting((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "instructor":
        return "bg-blue-100 text-blue-800";
      case "student":
        return "bg-green-100 text-green-800";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getStats = () => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const admins = users.filter((u) => u.role === "admin").length;
    const instructors = users.filter((u) => u.role === "instructor").length;
    const students = users.filter((u) => u.role === "student").length;

    return { total, active, admins, instructors, students };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="xl" text="Đang tải danh sách thành viên..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] mb-2 poppins-bold">
              Quản lý thành viên
            </h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Quản lý người dùng và phân quyền hệ thống"
                : "Xem danh sách thành viên hệ thống"}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Làm mới danh sách"
            >
              <RefreshCw
                className={`h-4 w-4 md:h-5 md:w-5 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-primary-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <UserPlus className="h-5 w-5" />
                <span>Thêm thành viên</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7.5xl mx-auto">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-md border border-border p-6 border-l-4 border-l-[hsl(var(--primary))]">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-[hsl(var(--primary))]" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Tổng thành viên
                </p>
                <p className="text-2xl font-bold text-[hsl(var(--primary))] poppins-bold">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md border border-border p-6 border-l-4 border-l-green-500">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Đang hoạt động
                </p>
                <p className="text-2xl font-bold text-green-600 poppins-bold">
                  {stats.active}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md border border-border p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Quản trị viên
                </p>
                <p className="text-2xl font-bold text-purple-600 poppins-bold">
                  {stats.admins}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md border border-border p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Giảng viên
                </p>
                <p className="text-2xl font-bold text-blue-600 poppins-bold">
                  {stats.instructors}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md border border-border p-6 border-l-4 border-l-[hsl(var(--secondary))]">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-[hsl(var(--secondary))]/10 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-[hsl(var(--secondary))]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Sinh viên
                </p>
                <p className="text-2xl font-bold text-[hsl(var(--secondary))] poppins-bold">
                  {stats.students}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border mb-6">
          <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 w-full"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả vai trò</SelectItem>
                      <SelectItem value="admin">Quản trị viên</SelectItem>
                      <SelectItem value="instructor">Giảng viên</SelectItem>
                      <SelectItem value="student">Sinh viên</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="sm:w-48">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="active">Đang hoạt động</SelectItem>
                      <SelectItem value="inactive">Bị khóa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-card text-card-foreground rounded-lg shadow-md overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] text-primary-foreground">
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("full_name")}
                      className="w-full px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider poppins-semibold cursor-pointer hover:bg-[hsl(var(--primary)/0.85)] transition-colors flex items-center gap-2 text-primary-foreground"
                    >
                      Thành viên
                      {sorting.field === "full_name" && (
                        <span className="text-xs">
                          {sorting.order === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("role")}
                      className="w-full px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider poppins-semibold cursor-pointer hover:bg-[hsl(var(--primary)/0.85)] transition-colors flex items-center gap-2 text-primary-foreground"
                    >
                      Vai trò
                      {sorting.field === "role" && (
                        <span className="text-xs">
                          {sorting.order === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider poppins-semibold text-primary-foreground">
                    Trạng thái
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("created_at")}
                      className="w-full px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider poppins-semibold cursor-pointer hover:bg-[hsl(var(--primary)/0.85)] transition-colors flex items-center gap-2 text-primary-foreground"
                    >
                      Hoạt động
                      {sorting.field === "created_at" && (
                        <span className="text-xs">
                          {sorting.order === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider poppins-semibold text-primary-foreground">
                    Thống kê
                  </TableHead>
                  <TableHead className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider poppins-semibold text-primary-foreground">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-[hsl(var(--primary))]/5 transition-colors duration-150"
                  >
                    <TableCell className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] flex items-center justify-center shadow-md">
                            <Users className="h-6 w-6 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-foreground poppins-semibold">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 whitespace-nowrap">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full poppins-semibold shadow-sm">
                          <Shield className="h-3 w-3 mr-1.5" />
                          Quản trị viên
                        </span>
                      ) : isAdmin ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            handleRoleChange(
                              user.id,
                              value as "admin" | "instructor" | "student"
                            )
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-full border-0 h-auto poppins-semibold shadow-sm hover:shadow-md",
                              getRoleColor(user.role)
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Quản trị viên</SelectItem>
                            <SelectItem value="instructor">
                              Giảng viên
                            </SelectItem>
                            <SelectItem value="student">Sinh viên</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full poppins-semibold shadow-sm",
                            getRoleColor(user.role)
                          )}
                        >
                          {user.role === "instructor"
                            ? "Giảng viên"
                            : "Sinh viên"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-5 whitespace-nowrap">
                      {user.role === "admin" ? (
                        <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full poppins-semibold shadow-sm">
                          <span className="h-2 w-2 bg-green-500 rounded-full mr-1.5"></span>
                          Luôn hoạt động
                        </span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          className={cn(
                            "inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-all hover:shadow-md poppins-semibold",
                            user.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full mr-1.5",
                              user.is_active ? "bg-green-500" : "bg-red-500"
                            )}
                          ></span>
                          {user.is_active ? "Hoạt động" : "Bị khóa"}
                        </button>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full poppins-semibold shadow-sm",
                            user.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full mr-1.5",
                              user.is_active ? "bg-green-500" : "bg-red-500"
                            )}
                          ></span>
                          {user.is_active ? "Hoạt động" : "Bị khóa"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        <div className="font-medium text-foreground poppins-medium">
                          Tham gia
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(user.created_at).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {user.role === "instructor" && (
                          <div>
                            <div className="font-medium text-foreground poppins-medium">
                              Đề thi
                            </div>
                            <div className="text-xs text-[hsl(var(--primary))] font-semibold mt-0.5 poppins-semibold">
                              {user.total_assessments || 0}
                            </div>
                          </div>
                        )}
                        {user.role === "student" && (
                          <div>
                            <div className="font-medium text-foreground poppins-medium">
                              Bài làm
                            </div>
                            <div className="text-xs text-[hsl(var(--primary))] font-semibold mt-0.5 poppins-semibold">
                              {user.total_results || 0}
                            </div>
                          </div>
                        )}
                        {user.role === "admin" && (
                          <div className="text-xs text-muted-foreground/70">
                            -
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      {isAdmin ? (
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-150"
                            title="Chỉnh sửa"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {user.role !== "admin" && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-150"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Chỉ xem
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="bg-card rounded-lg shadow-md border border-border p-12">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground poppins-semibold mb-2">
                Không tìm thấy thành viên
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để tìm thấy kết quả
                phù hợp.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmDialog({ isOpen: false, userId: null });
          }
        }}
      >
        <AlertDialogContent className="max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Bạn có chắc chắn muốn xóa người dùng này?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Hủy</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDeleteUser}>
                Xóa
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
