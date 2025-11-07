"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import React from "react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import { useAuth } from "@/contexts/AuthContext";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct as deleteProductApi,
} from "@/services/products";
import {
  BarChart3,
  Brain,
  BookOpen,
  FileText,
  MessageSquare,
  Edit,
  Trash2,
  Plus,
  Eye,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function AdminProductsPage() {
  const { authFetch } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  interface Product {
    id: number;
    title: string;
    description: string;
    downloads?: number;
    group?: string;
    [key: string]: unknown;
  }
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDownloads: 0,
    totalGroups: 0,
  });

  // Mock data for now (not used currently)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _mockProducts = [
    {
      id: 1,
      title: "Website E-Learning Platform",
      description: "Nền tảng học tập trực tuyến với AI",
      subject: "MLN111",
      subjectName: "Triết học Mác - Lê-nin",
      group: "Nhóm 1",
      members: ["Nguyễn Văn A", "Trần Thị B"],
      instructor: "TS. Nguyễn Văn C",
      semester: "HK1 2024-2025",
      type: "website",
      technologies: ["React", "Node.js", "PostgreSQL"],
      fileUrl: "https://github.com/example/project",
      demoUrl: "https://demo.example.com",
      downloads: 45,
      views: 120,
    },
  ];

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listProducts(authFetch);
      setProductsData(Array.isArray(data) ? data : []);
      setStats({
        totalProducts: data.length || 0,
        totalDownloads: (data || []).reduce(
          (sum: number, p: Product) => sum + ((p.downloads as number) || 0),
          0
        ),
        totalGroups: new Set((data || []).map((p: Product) => p.group)).size,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  // Fetch products from API
  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [fetchProducts]);

  const fetchStats = async () => {
    // Mock stats for now
  };

  const handleAddProduct = async (productData: Record<string, unknown>) => {
    await createProduct(authFetch, productData);
    await fetchProducts();
    setShowAddModal(false);
  };

  const handleEditProduct = async (
    productData: Record<string, unknown> & { id: number }
  ) => {
    await updateProduct(authFetch, productData.id, productData);
    await fetchProducts();
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    await deleteProductApi(authFetch, id);
    await fetchProducts();
  };

  const filteredProducts = productsData.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject =
      selectedSubject === "all" || product.subject === selectedSubject;
    const matchesType = selectedType === "all" || product.type === selectedType;

    return matchesSearch && matchesSubject && matchesType;
  });

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
      active: true,
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
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                <Link
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
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white">
          {/* Header */}
          <div className="flex items-center gap-6 md:gap-8 p-4 md:p-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="mb-1">
                <span className="text-gray-900 text-base md:text-lg">
                  Chào mừng,{" "}
                </span>
                <span className="text-[#125093] text-xl md:text-2xl font-bold">
                  Admin User
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-gray-900 text-base md:text-lg font-semibold">
                  Quản trị viên
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <main className="flex-1 p-4 md:p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Sản phẩm học tập
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Tổng sản phẩm
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalProducts}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Tổng lượt tải
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalDownloads}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Tổng nhóm
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats.totalGroups}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tìm kiếm
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc mô tả..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Môn học
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tất cả môn học</option>
                    <option value="MLN111">MLN111</option>
                    <option value="MLN122">MLN122</option>
                    <option value="HCM202">HCM202</option>
                    <option value="VNR202">VNR202</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại sản phẩm
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tất cả loại</option>
                    <option value="website">Website</option>
                    <option value="mobile-app">Ứng dụng di động</option>
                    <option value="web-system">Hệ thống web</option>
                    <option value="presentation">Thuyết trình</option>
                    <option value="video">Video</option>
                    <option value="document">Tài liệu</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedSubject("all");
                      setSelectedType("all");
                    }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sản phẩm
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nhóm
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Môn học
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loại
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thống kê
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Giảng viên: {String(product.instructor ?? "")}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {String(product.group ?? "")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {Array.isArray(product.members)
                              ? product.members.join(", ")
                              : ""}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {String(product.subject ?? "")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {String(product.subjectName ?? "")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {String(product.type ?? "")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            👁️{" "}
                            {typeof product.views === "number"
                              ? product.views
                              : 0}{" "}
                            lượt xem
                          </div>
                          <div>
                            ⬇️{" "}
                            {typeof product.downloads === "number"
                              ? product.downloads
                              : 0}{" "}
                            lượt tải
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>

          {/* Add/Edit Product Modal */}
          {(showAddModal || editingProduct) && (
            <ProductModal
              product={editingProduct}
              onSave={
                editingProduct
                  ? (product: Record<string, unknown>) =>
                      handleEditProduct(
                        product as Record<string, unknown> & { id: number }
                      )
                  : handleAddProduct
              }
              onClose={() => {
                setShowAddModal(false);
                setEditingProduct(null);
              }}
            />
          )}
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}

// Product Modal Component
function ProductModal({
  product,
  onSave,
  onClose,
}: {
  product?: { id: number; [key: string]: unknown } | null;
  onSave: (product: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    subject: string;
    subjectName: string;
    group: string;
    members: string[];
    instructor: string;
    semester: string;
    type: string;
    technologies: string[];
    fileUrl: string;
    demoUrl: string;
  }>({
    title: String(product?.title || ""),
    description: String(product?.description || ""),
    subject: String(product?.subject || "MLN111"),
    subjectName: String(product?.subjectName || "Triết học Mác - Lê-nin"),
    group: String(product?.group || ""),
    members: Array.isArray(product?.members)
      ? product.members.map((m: unknown) => String(m))
      : [""],
    instructor: String(product?.instructor || ""),
    semester: String(product?.semester || "HK1 2024-2025"),
    type: String(product?.type || "website"),
    technologies: Array.isArray(product?.technologies)
      ? product.technologies.map((t: unknown) => String(t))
      : [""],
    fileUrl: String(product?.fileUrl || ""),
    demoUrl: String(product?.demoUrl || ""),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData: Record<string, unknown> = {
      ...formData,
      members: formData.members.filter((m: string) => m.trim()),
      technologies: formData.technologies.filter((t: string) => t.trim()),
      ...(product && { id: product.id }),
    };
    onSave(productData);
  };

  const addMember = () => {
    setFormData({ ...formData, members: [...formData.members, ""] });
  };

  const removeMember = (index: number) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_: string, i: number) => i !== index),
    });
  };

  const addTechnology = () => {
    setFormData({ ...formData, technologies: [...formData.technologies, ""] });
  };

  const removeTechnology = (index: number) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter(
        (_: string, i: number) => i !== index
      ),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {product ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên sản phẩm
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Môn học
              </label>
              <select
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MLN111">MLN111</option>
                <option value="MLN122">MLN122</option>
                <option value="HCM202">HCM202</option>
                <option value="VNR202">VNR202</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại sản phẩm
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="website">Website</option>
                <option value="mobile-app">Ứng dụng di động</option>
                <option value="web-system">Hệ thống web</option>
                <option value="presentation">Thuyết trình</option>
                <option value="video">Video</option>
                <option value="document">Tài liệu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nhóm
              </label>
              <input
                type="text"
                required
                value={formData.group}
                onChange={(e) =>
                  setFormData({ ...formData, group: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhóm 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Giảng viên
              </label>
              <input
                type="text"
                required
                value={formData.instructor}
                onChange={(e) =>
                  setFormData({ ...formData, instructor: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thành viên nhóm
            </label>
            {formData.members.map((member: string, index: number) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => {
                    const newMembers = [...formData.members];
                    newMembers[index] = e.target.value;
                    setFormData({ ...formData, members: newMembers });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tên thành viên"
                />
                {formData.members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addMember}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Thêm thành viên
            </button>
          </div>

          {/* Technologies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Công nghệ sử dụng
            </label>
            {formData.technologies.map((tech: string, index: number) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tech}
                  onChange={(e) => {
                    const newTech = [...formData.technologies];
                    newTech[index] = e.target.value;
                    setFormData({ ...formData, technologies: newTech });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tên công nghệ"
                />
                {formData.technologies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTechnology(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTechnology}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Thêm công nghệ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link file/source
              </label>
              <input
                type="url"
                value={formData.fileUrl}
                onChange={(e) =>
                  setFormData({ ...formData, fileUrl: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://github.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link demo
              </label>
              <input
                type="url"
                value={formData.demoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, demoUrl: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://demo.com/..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {product ? "Cập nhật" : "Thêm sản phẩm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
