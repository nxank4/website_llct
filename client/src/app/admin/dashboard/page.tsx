"use client";

import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { listProducts, getProductsStats } from "@/services/products";
import { Trash2, Loader2 } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
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
  const { authFetch } = useAuth();
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
    <div className="p-6 md:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Sản phẩm học tập
            </h1>
            <p className="text-gray-600">
              Quản lý và xem các sản phẩm học tập của sinh viên
            </p>
          </div>
          <button
            onClick={() => fetchProducts()}
            className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <span>Cập nhật</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#125093]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Tổng sản phẩm
                  </p>
                  <p className="text-2xl font-bold text-[#125093] poppins-bold">
                    {stats.total_products || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#00CBB8]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Tổng lượt tải
                  </p>
                  <p className="text-2xl font-bold text-[#00CBB8] poppins-bold">
                    {stats.total_downloads || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#49BBBD]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Tổng lượt xem
                  </p>
                  <p className="text-2xl font-bold text-[#49BBBD] poppins-bold">
                    {stats.total_views || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-48">
              <Spinner />
            </div>
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
          <div className="space-y-12">
            {courses.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">Chưa có sản phẩm nào</p>
              </div>
            ) : (
              courses.map((course) => (
                <div key={course.code} className="space-y-6">
                  {/* Course Title */}
                  <h2 className="text-lg md:text-xl font-bold text-black">
                    {course.code}{" "}
                    {course.name &&
                      course.name !== course.code &&
                      `- ${course.name}`}
                  </h2>

                  {/* Products Grid */}
                  {course.products.length > 0 ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {course.products.map((product) => (
                          <div
                            key={product.id}
                            className="bg-white rounded-2xl shadow-md border border-gray-100 pb-6 flex flex-col gap-4 hover:shadow-lg transition-shadow"
                          >
                            <div className="flex flex-col gap-6">
                              <Image
                                src={getProductImage(product)}
                                alt={product.title}
                                width={415}
                                height={240}
                                className="w-full h-40 sm:h-44 md:h-48 object-cover rounded-t-2xl"
                              />
                              <div className="px-6 flex flex-col gap-3">
                                <div className="flex items-center justify-between h-8">
                                  <div className="text-gray-900 text-base font-semibold line-clamp-2">
                                    {product.title}
                                  </div>
                                  <div className="text-gray-700 text-xs font-medium ml-2 flex-shrink-0">
                                    {course.code}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <div className="text-gray-500 text-sm">
                                    {getInstructorName(product)}
                                  </div>
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="text-gray-500 text-sm">
                                      {formatDate(product.created_at as string)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="px-6 flex items-center justify-between">
                              <button
                                onClick={() =>
                                  console.log("Edit clicked", product.id)
                                }
                                className="px-4 py-2 bg-[#00CBB8] text-white text-sm rounded-full shadow hover:bg-[#00b8a8] transition-colors"
                              >
                                Chỉnh sửa
                              </button>
                              <button
                                onClick={() =>
                                  console.log("Delete clicked", product.id)
                                }
                                className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="flex items-center gap-5">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 pb-6 flex flex-col gap-6">
                        <div className="flex flex-col gap-6">
                          <div className="w-full sm:w-[360px] h-40 bg-gray-200 rounded-t-2xl"></div>
                          <div className="w-20 h-20 mx-auto">
                            <div className="w-16 h-16 border-4 border-gray-400 rounded-full"></div>
                          </div>
                          <div className="px-6 flex flex-col gap-3">
                            <div className="h-8 flex flex-col justify-start gap-4">
                              <div className="text-gray-900 text-base font-semibold">
                                Chưa có sản phẩm
                              </div>
                            </div>
                            <div className="flex flex-col gap-3">
                              <div className="text-gray-500 text-sm">
                                Hiện tại môn học này chưa có sản phẩm học tập
                                nào, hãy cập nhật ngay !
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
