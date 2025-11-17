"use client";

import { useState, useMemo, useCallback } from "react";
import React from "react";
import { useAuthFetch } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct as deleteProductApi,
} from "@/services/products";
import {
  BarChart3,
  FileText,
  Edit,
  Trash2,
  Plus,
  Eye,
  Search,
  RefreshCw,
  Filter,
  Download,
  AlertCircle,
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import ProductForm, { ProductFormData } from "@/components/products/ProductForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminProductsPage() {
  const authFetch = useAuthFetch();

  // Wrapper to convert authFetch to FetchLike type
  const fetchLike = useCallback(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      return authFetch(url, init);
    },
    [authFetch]
  );

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
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    productId: number | null;
  }>({ isOpen: false, productId: null });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await listProducts(fetchLike);
      return Array.isArray(res) ? (res as Product[]) : [];
    },
    enabled: Boolean(authFetch),
    retry: false, // Disable retry at query level (handled by provider)
  });
  const productsData = useMemo(() => data ?? [], [data]);
  const stats = useMemo(() => {
    return {
      totalProducts: productsData.length || 0,
      totalDownloads: productsData.reduce(
        (sum: number, p: Product) => sum + ((p.downloads as number) || 0),
        0
      ),
      totalGroups: new Set(productsData.map((p: Product) => p.group)).size,
    };
  }, [productsData]);

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

  // Dùng React Query nên không cần fetchProducts thủ công

  const addMutation = useMutation({
    mutationFn: (productData: ProductFormData) =>
      createProduct(fetchLike, productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowAddModal(false);
      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã tạo sản phẩm thành công",
      });
    },
    onError: (error: Error) => {
      showToast({
        type: "error",
        title: "Lỗi",
        message: error.message || "Không thể tạo sản phẩm",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: ProductFormData;
    }) => updateProduct(fetchLike, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingProduct(null);
      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã cập nhật sản phẩm thành công",
      });
    },
    onError: (error: Error) => {
      showToast({
        type: "error",
        title: "Lỗi",
        message: error.message || "Không thể cập nhật sản phẩm",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProductApi(fetchLike, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteConfirmDialog({ isOpen: false, productId: null });
      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã xóa sản phẩm thành công",
      });
    },
    onError: (error: Error) => {
      showToast({
        type: "error",
        title: "Lỗi",
        message: error.message || "Không thể xóa sản phẩm",
      });
      setDeleteConfirmDialog({ isOpen: false, productId: null });
    },
  });

  const handleAddProduct = async (productData: ProductFormData) => {
    await addMutation.mutateAsync(productData);
  };

  const handleEditProduct = async (productData: ProductFormData) => {
    if (!editingProduct) return;
    await updateMutation.mutateAsync({
      id: editingProduct.id,
      data: productData,
    });
  };

  const handleDeleteProduct = (id: number) => {
    setDeleteConfirmDialog({ isOpen: true, productId: id });
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirmDialog.productId) return;
    await deleteMutation.mutateAsync(deleteConfirmDialog.productId);
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

  // Loading state: Hiển thị spinner LẦN ĐẦU TIÊN
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" text="Đang tải dữ liệu..." />
      </div>
    );
  }

  // Error state: Hiển thị thông báo lỗi, useQuery sẽ dừng gọi sau khi retry thất bại
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Không thể tải dữ liệu
          </h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi khi tải danh sách sản phẩm"}
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["products"] })
            }
            variant="default"
          >
            Thử lại
          </Button>
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
                Sản phẩm học tập
              </h1>
              <p className="text-gray-600">
                Quản lý và xem các sản phẩm học tập của sinh viên
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["products"] })
                }
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Làm mới"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => {
                  try {
                    const headers = ["title", "group", "downloads"];
                    const rows = filteredProducts.map((p) => [
                      p.title,
                      p.group || "",
                      String(p.downloads ?? 0),
                    ]);
                    const csv = [
                      headers.join(","),
                      ...rows.map((x) =>
                        x
                          .map(
                            (value) =>
                              `"${String(value ?? "").replaceAll('"', '""')}"`
                          )
                          .join(",")
                      ),
                    ].join("\n");
                    const blob = new Blob([csv], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "products.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error("Export CSV failed", error);
                    showToast({
                      type: "error",
                      title: "Lỗi",
                      message: "Không thể xuất CSV",
                    });
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                title="Xuất CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>Thêm sản phẩm</span>
              </button>
            </div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Tổng sản phẩm
                </p>
                <p className="text-2xl font-bold text-[#125093] poppins-bold">
                  {stats.totalProducts}
                </p>
              </div>
              <FileText className="h-8 w-8 text-[#125093]" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Tổng lượt tải
                </p>
                <p className="text-2xl font-bold text-green-600 poppins-bold">
                  {stats.totalDownloads}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Tổng nhóm
                </p>
                <p className="text-2xl font-bold text-purple-600 poppins-bold">
                  {stats.totalGroups}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 md:p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Filter className="h-4 w-4" />
            <span>Bộ lọc</span>
          </div>
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
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả môn học" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả môn học</SelectItem>
                  <SelectItem value="MLN111">MLN111</SelectItem>
                  <SelectItem value="MLN122">MLN122</SelectItem>
                  <SelectItem value="HCM202">HCM202</SelectItem>
                  <SelectItem value="VNR202">VNR202</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại sản phẩm
              </label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tất cả loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="project">Dự án</SelectItem>
                  <SelectItem value="assignment">Bài tập</SelectItem>
                  <SelectItem value="presentation">Thuyết trình</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
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
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
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
                        {product.type === "project"
                          ? "Dự án"
                          : product.type === "assignment"
                          ? "Bài tập"
                          : product.type === "presentation"
                          ? "Thuyết trình"
                          : product.type === "other"
                          ? "Khác"
                          : String(product.type ?? "")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        👁️{" "}
                        {typeof product.views === "number" ? product.views : 0}{" "}
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

        {/* Add/Edit Product Modal */}
        {(showAddModal || editingProduct) && (
          <ProductForm
            product={editingProduct || undefined}
            onSave={editingProduct ? handleEditProduct : handleAddProduct}
            onClose={() => {
              setShowAddModal(false);
              setEditingProduct(null);
            }}
            isLoading={addMutation.isPending || updateMutation.isPending}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog.Root
          open={deleteConfirmDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmDialog({ isOpen: false, productId: null });
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
                  Bạn có chắc chắn muốn xóa sản phẩm này?
                </AlertDialog.Description>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <AlertDialog.Cancel asChild>
                  <Button variant="outline">Hủy</Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button
                    variant="destructive"
                    onClick={confirmDeleteProduct}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
}
