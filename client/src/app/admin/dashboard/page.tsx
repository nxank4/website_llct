"use client";

import Image from "next/image";
import { useAuthFetch } from "@/lib/auth";
import { listProducts, getProductsStats } from "@/services/products";
import {
  Trash2,
  RefreshCw,
  FileText,
  Download,
  Eye,
  BookOpen,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";

interface Product {
  id: number;
  title: string;
  subject?: string;
  subject_code?: string;
  subject_name?: string;
  instructor_name?: string;
  instructor?: {
    full_name?: string;
    username?: string;
  };
  created_at?: string;
  image_url?: string;
  thumbnail_url?: string;
  [key: string]: unknown;
}

interface CourseGroup {
  code: string;
  name?: string;
  products: Product[];
}

export default function AdminDashboardPage() {
  const authFetch = useAuthFetch();
  const [products, setProducts] = useState<Product[]>([]);
  const [courses, setCourses] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total_products?: number;
    total_downloads?: number;
    total_views?: number;
  } | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listProducts(authFetch);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Không thể tải danh sách sản phẩm");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getProductsStats(authFetch);
      setStats({
        total_products: data.total_products || 0,
        total_downloads: data.total_downloads || 0,
        total_views: data.total_views || 0,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats({
        total_products: 0,
        total_downloads: 0,
        total_views: 0,
      });
    }
  }, [authFetch]);

  // Fetch data only once when component mounts or authFetch changes
  useEffect(() => {
    if (!authFetch) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let isFetching = false;

    const fetchData = async () => {
      if (mounted && !isFetching) {
        isFetching = true;
        try {
          await fetchProducts();
          await fetchStats();
        } finally {
          if (mounted) {
            isFetching = false;
          }
        }
      }
    };

    // Small delay to prevent rapid successive calls during HMR
    timeoutId = setTimeout(() => {
      fetchData();
    }, 200);

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]); // Only depend on authFetch, not on callbacks

  // Group products by subject/course code
  useEffect(() => {
    if (products.length === 0) {
      setCourses([]);
      return;
    }

    const grouped = products.reduce((acc, product) => {
      const code = product.subject_code || product.subject || "Khác";
      const existing = acc.find((c) => c.code === code);

      if (existing) {
        existing.products.push(product);
      } else {
        acc.push({
          code,
          name: product.subject_name || code,
          products: [product],
        });
      }

      return acc;
    }, [] as CourseGroup[]);

    setCourses(grouped);
  }, [products]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getInstructorName = (product: Product) => {
    return (
      product.instructor_name ||
      product.instructor?.full_name ||
      product.instructor?.username ||
      "Chưa có thông tin"
    );
  };

  const getProductImage = (product: Product) => {
    return (
      product.image_url ||
      product.thumbnail_url ||
      "https://placehold.co/415x240"
    );
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Bảng điều khiển
            </h1>
            <p className="text-gray-600 text-base">
              Tổng quan về hệ thống và hoạt động của nền tảng học tập
            </p>
          </div>
          <Button
            onClick={() => {
              fetchProducts();
              fetchStats();
            }}
            disabled={loading}
            variant="default"
            size="default"
            className="bg-[#125093] hover:bg-[#0f4278] text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Cập nhật</span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <Card className="border-l-4 border-l-[#125093] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Tổng sản phẩm
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-[#125093]/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-[#125093]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#125093] poppins-bold">
                  {stats.total_products || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sản phẩm học tập hiện có
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#00CBB8] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Tổng lượt tải
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-[#00CBB8]/10 flex items-center justify-center">
                  <Download className="h-5 w-5 text-[#00CBB8]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#00CBB8] poppins-bold">
                  {stats.total_downloads || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Lượt tải xuống tổng cộng
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#49BBBD] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Tổng lượt xem
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-[#49BBBD]/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-[#49BBBD]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#49BBBD] poppins-bold">
                  {stats.total_views || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">Lượt xem tổng cộng</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#8B5CF6] shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Môn học
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-[#8B5CF6]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-[#8B5CF6] poppins-bold">
                  {courses.length}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Số môn học có sản phẩm
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="xl" text="Đang tải dữ liệu..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Course Sections */}
        {!loading && !error && (
          <div className="space-y-8">
            {courses.length === 0 ? (
              <Card className="shadow-lg">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Chưa có sản phẩm nào
                    </h3>
                    <p className="text-gray-500">
                      Hãy bắt đầu bằng cách thêm sản phẩm học tập đầu tiên
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              courses.map((course) => (
                <Card key={course.code} className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl md:text-2xl text-[#125093]">
                          {course.code}
                          {course.name &&
                            course.name !== course.code &&
                            ` - ${course.name}`}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {course.products.length} sản phẩm học tập
                        </CardDescription>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-[#125093]/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-[#125093]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Products Grid */}
                    {course.products.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {course.products.map((product) => (
                          <Card
                            key={product.id}
                            className="overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200"
                          >
                            <div className="relative w-full h-48 overflow-hidden">
                              <Image
                                src={getProductImage(product)}
                                alt={product.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <CardHeader>
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-base font-semibold line-clamp-2 flex-1">
                                  {product.title}
                                </CardTitle>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded flex-shrink-0">
                                  {course.code}
                                </span>
                              </div>
                              <CardDescription className="text-sm">
                                {getInstructorName(product)}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                  {formatDate(product.created_at as string)}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      console.log("Edit clicked", product.id)
                                    }
                                    className="h-8 text-[#00CBB8] hover:text-[#00b8a8] hover:bg-[#00CBB8]/10"
                                  >
                                    Chỉnh sửa
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      console.log("Delete clicked", product.id)
                                    }
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="text-base font-semibold text-gray-900 mb-2">
                          Chưa có sản phẩm
                        </h4>
                        <p className="text-sm text-gray-500">
                          Môn học này chưa có sản phẩm học tập nào
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
