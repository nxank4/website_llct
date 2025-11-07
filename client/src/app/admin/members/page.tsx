"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Users,
  UserPlus,
  Shield,
  Edit,
  Trash2,
  Search,
  BarChart3,
  Brain,
  BookOpen,
  FileText,
  MessageSquare,
} from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useAuth } from "@/contexts/AuthContext";
import { getFullUrl } from "@/lib/api";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showAddModal, setShowAddModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_editingUser, setEditingUser] = useState<User | null>(null);
  const { authFetch, hasRole } = useAuth();

  // Only admin can manage users
  const isAdmin = hasRole("admin");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Try API first
      try {
        const response = await authFetch(getFullUrl("/api/v1/auth/users"));
        if (response.ok) {
          const data = await response.json();
          console.log("Users data from API:", data);

          // Chuyển đổi dữ liệu từ API sang format của component
          const formattedUsers: User[] = data.map(
            (user: Record<string, unknown>) => ({
              id: user.id,
              email: user.email,
              full_name: user.full_name || user.username || "Chưa có tên",
              role:
                user.role === "ADMIN"
                  ? "admin"
                  : user.role === "INSTRUCTOR"
                  ? "instructor"
                  : "student",
              is_active: user.is_active,
              created_at: user.created_at,
              last_login: user.last_login,
              total_assessments: 0,
              total_results: 0,
            })
          );

          setUsers(formattedUsers);
          return;
        }
      } catch {
        console.log("API not available, using mock data");
      }

      // Fallback to mock data
      const mockUsers: User[] = [
        {
          id: "1",
          email: "admin@demo.com",
          full_name: "Admin User",
          role: "admin",
          is_active: true,
          created_at: "2024-10-17T00:00:00Z",
          last_login: "2024-10-18T00:00:00Z",
          total_assessments: 0,
          total_results: 0,
        },
        {
          id: "2",
          email: "instructor@demo.com",
          full_name: "Instructor User",
          role: "instructor",
          is_active: true,
          created_at: "2024-10-17T00:00:00Z",
          last_login: "2024-10-18T00:00:00Z",
          total_assessments: 5,
          total_results: 25,
        },
        {
          id: "3",
          email: "student@demo.com",
          full_name: "Student User",
          role: "student",
          is_active: true,
          created_at: "2024-10-17T00:00:00Z",
          last_login: "2024-10-18T00:00:00Z",
          total_assessments: 0,
          total_results: 12,
        },
        {
          id: "4",
          email: "test@demo.com",
          full_name: "Test User",
          role: "student",
          is_active: true,
          created_at: "2024-10-12T00:00:00Z",
          total_assessments: 0,
          total_results: 0,
        },
        {
          id: "5",
          email: "khoanguyse182284@fpt.edu.vn",
          full_name: "Ngô Quốc Anh Khoa",
          role: "instructor",
          is_active: false,
          created_at: "2024-10-12T00:00:00Z",
          total_assessments: 0,
          total_results: 0,
        },
      ];

      // Load additional users from localStorage
      if (typeof window !== "undefined") {
        const storedUsers = localStorage.getItem("mockUsers");
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers) as Record<
            string,
            Record<string, unknown>
          >;
          Object.values(parsedUsers).forEach((user) => {
            const userRecord = user as Record<string, unknown>;
            if (!mockUsers.find((u) => u.email === userRecord.email)) {
              mockUsers.push({
                id: userRecord.id?.toString() || Date.now().toString(),
                email: userRecord.email as string,
                full_name: userRecord.full_name as string,
                role: (Array.isArray(userRecord.roles)
                  ? userRecord.roles[0]
                  : userRecord.roles || "student") as
                  | "admin"
                  | "instructor"
                  | "student",
                is_active: userRecord.is_active !== false,
                created_at:
                  (userRecord.created_at as string) || new Date().toISOString(),
                total_assessments: 0,
                total_results: 0,
              });
            }
          });
        }
      }

      setUsers(mockUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

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
          getFullUrl(`/api/v1/auth/users/${userId}`),
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: newRole }),
          }
        );

        if (response.ok) {
          setUsers(
            users.map((user) =>
              user.id === userId ? { ...user, role: newRole } : user
            )
          );
          console.log(`Updated user ${userId} role to ${newRole}`);
          return;
        }
      } catch {
        console.log("API not available, using mock role change");
      }

      // Mock role change
      const userToUpdate = users.find((user) => user.id === userId);
      if (userToUpdate) {
        // Update in state
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );

        // Update in localStorage if exists
        if (typeof window !== "undefined") {
          const storedUsers = localStorage.getItem("mockUsers");
          if (storedUsers) {
            const parsedUsers = JSON.parse(storedUsers);
            Object.keys(parsedUsers).forEach((key) => {
              if (parsedUsers[key].email === userToUpdate.email) {
                parsedUsers[key].roles = [newRole];
              }
            });
            localStorage.setItem("mockUsers", JSON.stringify(parsedUsers));
          }
        }

        console.log(`Updated user ${userId} role to ${newRole}`);
        alert(
          `Đã cập nhật vai trò thành ${
            newRole === "admin"
              ? "Quản trị viên"
              : newRole === "instructor"
              ? "Giảng viên"
              : "Sinh viên"
          }`
        );
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Lỗi khi cập nhật vai trò người dùng");
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const response = await authFetch(
        getFullUrl(`/api/v1/auth/users/${userId}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: !user.is_active }),
        }
      );

      if (response.ok) {
        setUsers(
          users.map((u) =>
            u.id === userId ? { ...u, is_active: !u.is_active } : u
          )
        );
      } else {
        console.error("Failed to toggle user status:", response.status);
        alert("Không thể thay đổi trạng thái người dùng");
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      alert("Lỗi khi thay đổi trạng thái người dùng");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;

    try {
      // Try API first
      try {
        const response = await authFetch(
          getFullUrl(`/api/v1/auth/users/${userId}`),
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          setUsers(users.filter((user) => user.id !== userId));
          alert("Đã xóa người dùng thành công");
          return;
        }
      } catch {
        console.log("API not available, using mock deletion");
      }

      // Mock deletion - remove from state and localStorage
      const userToDelete = users.find((user) => user.id === userId);
      if (userToDelete) {
        // Remove from state
        setUsers(users.filter((user) => user.id !== userId));

        // Remove from localStorage if it exists there
        if (typeof window !== "undefined") {
          const storedUsers = localStorage.getItem("mockUsers");
          const storedPasswords = localStorage.getItem("mockPasswords");

          if (storedUsers) {
            const parsedUsers = JSON.parse(storedUsers);
            delete parsedUsers[userToDelete.email];
            if (userToDelete.email !== userToDelete.full_name) {
              // Also try to delete by username if different from email
              Object.keys(parsedUsers).forEach((key) => {
                if (parsedUsers[key].email === userToDelete.email) {
                  delete parsedUsers[key];
                }
              });
            }
            localStorage.setItem("mockUsers", JSON.stringify(parsedUsers));
          }

          if (storedPasswords) {
            const parsedPasswords = JSON.parse(storedPasswords);
            delete parsedPasswords[userToDelete.email];
            // Also delete by username if exists
            Object.keys(parsedPasswords).forEach((key) => {
              const user = JSON.parse(storedUsers || "{}")[key];
              if (user && user.email === userToDelete.email) {
                delete parsedPasswords[key];
              }
            });
            localStorage.setItem(
              "mockPasswords",
              JSON.stringify(parsedPasswords)
            );
          }
        }

        alert("Đã xóa người dùng thành công");
      } else {
        alert("Không tìm thấy người dùng");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Lỗi khi xóa người dùng");
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "instructor":
        return "bg-blue-100 text-blue-800";
      case "student":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
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
      <ProtectedRouteWrapper requiredRoles={["admin"]}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRouteWrapper>
    );
  }

  const sidebarItems = [
    {
      id: "dashboard",
      title: "Bảng tổng kết",
      icon: BarChart3,
      color: "#125093",
      href: "/admin/dashboard",
    },
    {
      id: "ai-data",
      title: "Dữ liệu AI",
      icon: Brain,
      color: "#00CBB8",
      href: "/admin/ai-data",
    },
    {
      id: "library",
      title: "Thư viện môn học",
      icon: BookOpen,
      color: "#5B72EE",
      href: "/admin/library",
    },
    {
      id: "products",
      title: "Sản phẩm học tập",
      icon: FileText,
      color: "#F48C06",
      href: "/admin/products",
    },
    {
      id: "tests",
      title: "Bài kiểm tra",
      icon: FileText,
      color: "#29B9E7",
      href: "/admin/tests",
    },
    {
      id: "news",
      title: "Tin tức",
      icon: MessageSquare,
      color: "#00CBB8",
      href: "/admin/news",
    },
    {
      id: "members",
      title: "Thành viên",
      icon: Users,
      color: "#8B5CF6",
      href: "/admin/members",
      active: true,
    },
  ];

  return (
    <ProtectedRouteWrapper requiredRoles={["admin", "instructor"]}>
      <div className="min-h-screen bg-white flex">
        {/* Sidebar */}
        <div className="w-56 bg-white p-4 border-r border-gray-100">
          {/* Logo */}
          <div className="mb-6">
            <Image
              src="https://placehold.co/192x192"
              alt="Logo"
              width={128}
              height={128}
              className="w-24 h-24 md:w-32 md:h-32 mb-6"
            />
          </div>

          {/* Sidebar Menu */}
          <div className="space-y-8">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-4 hover:opacity-90"
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded"
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div
                    className={`flex-1 text-sm md:text-base ${
                      isActive
                        ? "font-bold text-gray-900"
                        : "font-medium text-gray-800"
                    }`}
                  >
                    {item.title}
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Quản lý thành viên
                  </h1>
                  <p className="text-gray-600 mt-2">
                    {isAdmin
                      ? "Quản lý người dùng và phân quyền hệ thống"
                      : "Xem danh sách thành viên hệ thống"}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Thêm thành viên</span>
                  </button>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Tổng thành viên
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Đang hoạt động
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.active}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Quản trị viên
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.admins}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Giảng viên
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.instructors}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Sinh viên
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.students}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="sm:w-48">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="admin">Quản trị viên</option>
                      <option value="instructor">Giảng viên</option>
                      <option value="student">Sinh viên</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thành viên
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vai trò
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hoạt động
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thống kê
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <Users className="h-6 w-6 text-gray-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === "admin" ? (
                            <span className="px-3 py-2 bg-purple-100 text-purple-800 text-sm font-medium rounded-md">
                              Quản trị viên (Cố định)
                            </span>
                          ) : isAdmin ? (
                            <select
                              value={user.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  user.id,
                                  e.target.value as
                                    | "admin"
                                    | "instructor"
                                    | "student"
                                )
                              }
                              className={`px-2 py-1 text-xs font-semibold rounded-full border-0 ${getRoleColor(
                                user.role
                              )}`}
                            >
                              <option value="student">Sinh viên</option>
                              <option value="instructor">Giảng viên</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                                user.role
                              )}`}
                            >
                              {user.role === "instructor"
                                ? "Giảng viên"
                                : "Sinh viên"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === "admin" ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Luôn hoạt động
                            </span>
                          ) : isAdmin ? (
                            <button
                              onClick={() => handleToggleActive(user.id)}
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                user.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.is_active ? "Hoạt động" : "Bị khóa"}
                            </button>
                          ) : (
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                user.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.is_active ? "Hoạt động" : "Bị khóa"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div>
                              Tham gia:{" "}
                              {new Date(user.created_at).toLocaleDateString(
                                "vi-VN"
                              )}
                            </div>
                            {user.last_login && (
                              <div>
                                Truy cập:{" "}
                                {new Date(user.last_login).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {user.role === "instructor" && (
                              <div>Đề thi: {user.total_assessments || 0}</div>
                            )}
                            {user.role === "student" && (
                              <div>Bài làm: {user.total_results || 0}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isAdmin ? (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingUser(user)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {user.role !== "admin" && (
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              Chỉ xem
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Không tìm thấy thành viên
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
