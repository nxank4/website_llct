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
import { cn } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import ProductForm, {
  ProductFormData,
} from "@/components/products/ProductForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

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
    mutationFn: ({ id, data }: { id: number; data: ProductFormData }) =>
      updateProduct(fetchLike, id, data),
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

  const getTypeBadgeClasses = (type?: string) => {
    switch (type) {
      case "project":
        return "bg-primary/10 text-primary";
      case "assignment":
        return "bg-emerald-500/15 text-emerald-500";
      case "presentation":
        return "bg-purple-500/15 text-purple-500";
      case "other":
        return "bg-amber-500/15 text-amber-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Loading state: Hiển thị spinner LẦN ĐẦU TIÊN
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="xl" text="Đang tải dữ liệu..." />
      </div>
    );
  }

  // Error state: Hiển thị thông báo lỗi, useQuery sẽ dừng gọi sau khi retry thất bại
  if (isError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card text-card-foreground rounded-lg border border-border shadow-lg p-6 text-center">
          <div className="text-destructive mb-4">
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
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Không thể tải dữ liệu
          </h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi khi tải danh sách sản phẩm"}
          </p>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["products"] })
            }
            variant="default"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground">
      <div className="max-w-7.5xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 poppins-bold">
                Sản phẩm học tập
              </h1>
              <p className="text-muted-foreground">
                Quản lý và xem các sản phẩm học tập của sinh viên
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["products"] })
                }
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                title="Xuất CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span>Thêm sản phẩm</span>
              </button>
            </div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Tổng sản phẩm
                </p>
                <p className="text-2xl font-bold text-primary poppins-bold">
                  {stats.totalProducts}
                </p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Tổng lượt tải
                </p>
                <p className="text-2xl font-bold text-foreground poppins-bold">
                  {stats.totalDownloads}
                </p>
              </div>
              <Eye className="h-8 w-8 text-emerald-500" />
            </div>
          </div>

          <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Tổng nhóm
                </p>
                <p className="text-2xl font-bold text-foreground poppins-bold">
                  {stats.totalGroups}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-4 md:p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span>Bộ lọc</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc mô tả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
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
              <label className="block text-sm font-medium text-foreground mb-1">
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
                className="w-full px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/70 hover:bg-muted/70">
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sản phẩm
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nhóm
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Môn học
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Loại
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Thống kê
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-accent/60">
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {product.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {product.description}
                      </div>
                      <div className="text-xs text-muted-foreground/80 mt-1">
                        Giảng viên: {String(product.instructor ?? "")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {String(product.group ?? "")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Array.isArray(product.members)
                        ? product.members.join(", ")
                        : ""}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {String(product.subject ?? "")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {String(product.subjectName ?? "")}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex px-2 py-1 text-xs font-semibold rounded-full",
                        getTypeBadgeClasses(product.type as string | undefined)
                      )}
                    >
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
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      👁️ {typeof product.views === "number" ? product.views : 0}{" "}
                      lượt xem
                    </div>
                    <div className="flex items-center gap-1">
                      ⬇️{" "}
                      {typeof product.downloads === "number"
                        ? product.downloads
                        : 0}{" "}
                      lượt tải
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-primary hover:text-primary/80"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <AlertDialog
          open={deleteConfirmDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteConfirmDialog({ isOpen: false, productId: null });
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
                Bạn có chắc chắn muốn xóa sản phẩm này?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline">Hủy</Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteProduct}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
