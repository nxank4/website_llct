"use client";

import { useAuthFetch } from "@/lib/auth";
import { listProducts, getProductsStats } from "@/services/products";
import { getFullUrl } from "@/lib/api";
import {
  RefreshCw,
  FileText,
  Download,
  Eye,
  BookOpen,
  Newspaper,
  Brain,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart as ReAreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

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
  views?: number;
  downloads?: number;
  [key: string]: unknown;
}

export default function AdminDashboardPage() {
  const authFetch = useAuthFetch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total_products: number;
    total_downloads: number;
    total_views: number;
    total_subjects: number;
    total_groups: number;
    by_subject: {
      _id: string | null;
      subject_name?: string | null;
      count: number;
    }[];
    by_type: { _id: string | null; count: number }[];
  } | null>(null);
  const [dashboardStats, setDashboardStats] = useState<{
    total_subjects: number;
    total_lectures: number;
    total_news: number;
    total_ai_files: number;
  } | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listProducts(
        authFetch as unknown as (
          input: RequestInfo | URL,
          init?: RequestInit
        ) => Promise<Response>
      );
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
      const data = await getProductsStats(
        authFetch as unknown as (
          input: RequestInfo | URL,
          init?: RequestInit
        ) => Promise<Response>
      );
      setStats({
        total_products: data.total_products || 0,
        total_downloads: data.total_downloads || 0,
        total_views: data.total_views || 0,
        total_subjects:
          data.total_subjects ??
          (Array.isArray(data.by_subject)
            ? data.by_subject.filter(
                (item: { _id?: string | null }) => !!item?._id
              ).length
            : 0),
        total_groups: data.total_groups || 0,
        by_subject: Array.isArray(data.by_subject) ? data.by_subject : [],
        by_type: Array.isArray(data.by_type) ? data.by_type : [],
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats({
        total_products: 0,
        total_downloads: 0,
        total_views: 0,
        total_subjects: 0,
        total_groups: 0,
        by_subject: [],
        by_type: [],
      });
    }
  }, [authFetch]);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await authFetch(
        getFullUrl("/api/v1/admin/dashboard/stats")
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
      }
      const data = await response.json();
      setDashboardStats({
        total_subjects: data.total_subjects || 0,
        total_lectures: data.total_lectures || 0,
        total_news: data.total_news || 0,
        total_ai_files: data.total_ai_files || 0,
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setDashboardStats({
        total_subjects: 0,
        total_lectures: 0,
        total_news: 0,
        total_ai_files: 0,
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
          await Promise.all([
            fetchProducts(),
            fetchStats(),
            fetchDashboardStats(),
          ]);
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

  const activityTrendData = useMemo(() => {
    const aggregates = new Map<
      string,
      { date: string; products: number; views: number; downloads: number }
    >();

    products.forEach((product) => {
      if (!product.created_at) {
        return;
      }

      const parsedDate = new Date(product.created_at);
      if (Number.isNaN(parsedDate.getTime())) {
        return;
      }

      const key = parsedDate.toISOString().slice(0, 10);
      if (!aggregates.has(key)) {
        aggregates.set(key, {
          date: key,
          products: 0,
          views: 0,
          downloads: 0,
        });
      }

      const entry = aggregates.get(key)!;
      entry.products += 1;
      entry.views += typeof product.views === "number" ? product.views : 0;
      entry.downloads +=
        typeof product.downloads === "number" ? product.downloads : 0;
    });

    const sorted = Array.from(aggregates.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (sorted.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return [{ date: today, products: 0, views: 0, downloads: 0 }];
    }

    return sorted;
  }, [products]);

  const subjectDistribution = useMemo(
    () =>
      (stats?.by_subject || []).map((item) => ({
        name: item.subject_name || item._id || "Khác",
        value: item.count,
      })),
    [stats?.by_subject]
  );

  const typeDistribution = useMemo(
    () =>
      (stats?.by_type || []).map((item) => ({
        name: item._id || "Khác",
        value: item.count,
      })),
    [stats?.by_type]
  );

  const topDownloadedProducts = useMemo(() => {
    if (!products.length) return [] as { name: string; value: number }[];

    return products
      .map((product) => ({
        name: product.title,
        value: typeof product.downloads === "number" ? product.downloads : 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [products]);

  const valueFormatter = useCallback((value: number | undefined) => {
    const safeValue = typeof value === "number" ? value : 0;
    return safeValue.toLocaleString("vi-VN");
  }, []);

  const tooltipFormatter = useCallback(
    (value: number | string | Array<number | string>) => {
      if (Array.isArray(value)) {
        return value.map((v) =>
          typeof v === "number" ? valueFormatter(v) : String(v)
        );
      }
      return typeof value === "number" ? valueFormatter(value) : value;
    },
    [valueFormatter]
  );

  const subjectColors = [
    "#0ea5e9",
    "#06b6d4",
    "#7c3aed",
    "#d946ef",
    "#f97316",
    "#f43f5e",
  ];

  const downloadsBarColor = "#00CBB8";
  const productsAreaColor = "#1d4ed8";
  const viewsAreaColor = "#38bdf8";
  const downloadsAreaColor = "#34d399";

  const hasStatsNumbers =
    !!stats &&
    (stats.total_products > 0 ||
      stats.total_downloads > 0 ||
      stats.total_views > 0 ||
      stats.total_subjects > 0);

  const hasVisualizationData =
    (products.length > 0 &&
      activityTrendData.some(
        (d) => d.products > 0 || d.views > 0 || d.downloads > 0
      )) ||
    subjectDistribution.length > 0 ||
    typeDistribution.length > 0 ||
    topDownloadedProducts.length > 0 ||
    (stats?.total_views || 0) > 0 ||
    (stats?.total_downloads || 0) > 0;

  const shouldShowAnalytics =
    !loading && !error && stats && hasVisualizationData;
  const shouldShowAnalyticsEmptyState =
    !loading && !error && stats && !hasVisualizationData;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#125093] mb-2 poppins-bold">
              Bảng tổng kết
            </h1>
            <p className="text-gray-600 text-base">
              Tổng quan về hệ thống và hoạt động của nền tảng học tập
            </p>
          </div>
          <Button
            onClick={() => {
              fetchProducts();
              fetchStats();
              fetchDashboardStats();
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

      <div className="max-w-7.5xl mx-auto">
        {/* Statistics Cards - Always show, even with 0 values */}
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
                {stats?.total_products || 0}
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
                {stats?.total_downloads || 0}
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
                {stats?.total_views || 0}
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
                <FileText className="h-5 w-5 text-[#8B5CF6]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#8B5CF6] poppins-bold">
                {stats?.total_subjects || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Môn học có tài nguyên đang hoạt động
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="border-l-4 border-l-[#10B981] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Môn học
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-[#10B981]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#10B981] poppins-bold">
                {dashboardStats?.total_subjects || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tổng số môn học trong hệ thống
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#F59E0B] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tài liệu
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-[#F59E0B]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#F59E0B] poppins-bold">
                {dashboardStats?.total_lectures || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tổng số tài liệu học tập
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#EF4444] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tin tức
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
                <Newspaper className="h-5 w-5 text-[#EF4444]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#EF4444] poppins-bold">
                {dashboardStats?.total_news || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tổng số tin tức đã xuất bản
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#8B5CF6] shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Dữ liệu AI
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-[#8B5CF6]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#8B5CF6] poppins-bold">
                {dashboardStats?.total_ai_files || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tổng số file đã upload cho AI
              </p>
            </CardContent>
          </Card>
        </div>

        {!loading && !error && stats && !hasStatsNumbers && (
          <div className="mb-8 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-gray-600">
            <p className="font-medium text-gray-800 mb-1">
              Chưa có dữ liệu thống kê
            </p>
            <p className="text-sm">
              Hãy thêm tài nguyên mới hoặc cập nhật lượt xem/tải xuống để bảng
              tổng kết hiển thị số liệu trực quan hơn.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State - Only show if stats not loaded yet */}
        {loading && !stats && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="xl" text="Đang tải dữ liệu..." />
          </div>
        )}

        {/* Analytics Sections */}
        {shouldShowAnalytics && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Xu hướng hoạt động</CardTitle>
                  <p className="text-sm text-gray-500">
                    Lượng tài nguyên mới, tổng lượt xem và tải xuống theo thời
                    gian
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-72 min-h-[288px] w-full">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minHeight={288}
                    >
                      <ReAreaChart data={activityTrendData}>
                        <defs>
                          <linearGradient
                            id="colorProducts"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={productsAreaColor}
                              stopOpacity={0.7}
                            />
                            <stop
                              offset="95%"
                              stopColor={productsAreaColor}
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorViews"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={viewsAreaColor}
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor={viewsAreaColor}
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorDownloads"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={downloadsAreaColor}
                              stopOpacity={0.6}
                            />
                            <stop
                              offset="95%"
                              stopColor={downloadsAreaColor}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          stroke="#9ca3af"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          stroke="#9ca3af"
                          tickFormatter={valueFormatter}
                        />
                        <Tooltip formatter={tooltipFormatter} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="products"
                          stroke={productsAreaColor}
                          fill="url(#colorProducts)"
                          name="Tài nguyên"
                        />
                        <Area
                          type="monotone"
                          dataKey="views"
                          stroke={viewsAreaColor}
                          fill="url(#colorViews)"
                          name="Lượt xem"
                        />
                        <Area
                          type="monotone"
                          dataKey="downloads"
                          stroke={downloadsAreaColor}
                          fill="url(#colorDownloads)"
                          name="Lượt tải"
                        />
                      </ReAreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phân bố môn học</CardTitle>
                  <p className="text-sm text-gray-500">
                    Tỷ trọng tài nguyên theo mã môn học hoặc bộ môn
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  {subjectDistribution.length > 0 ? (
                    <div className="h-72 min-h-[288px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minHeight={288}
                      >
                        <PieChart>
                          <Pie
                            data={subjectDistribution}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={4}
                          >
                            {subjectDistribution.map((entry, index) => (
                              <Cell
                                key={`subject-${entry.name}-${index}`}
                                fill={
                                  subjectColors[index % subjectColors.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={tooltipFormatter} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Chưa có dữ liệu môn học để hiển thị.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top tài nguyên được tải nhiều</CardTitle>
                  <p className="text-sm text-gray-500">
                    Tính theo lượt tải xuống
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  {topDownloadedProducts.length > 0 ? (
                    <div className="h-72 min-h-[288px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minHeight={288}
                      >
                        <BarChart
                          data={topDownloadedProducts}
                          layout="vertical"
                          margin={{ left: 40 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            type="number"
                            tickFormatter={valueFormatter}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={180}
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <Tooltip formatter={tooltipFormatter} />
                          <Bar
                            dataKey="value"
                            fill={downloadsBarColor}
                            radius={[6, 6, 6, 6]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Chưa có lượt tải xuống được ghi nhận.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loại tài nguyên phổ biến</CardTitle>
                  <p className="text-sm text-gray-500">
                    Phân loại theo Product Type
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  {typeDistribution.length > 0 ? (
                    <div className="h-72 min-h-[288px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minHeight={288}
                      >
                        <BarChart
                          data={typeDistribution}
                          margin={{ top: 16, right: 16, left: 16, bottom: 16 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            tickFormatter={valueFormatter}
                            stroke="#9ca3af"
                          />
                          <Tooltip formatter={tooltipFormatter} />
                          <Bar
                            dataKey="value"
                            fill="#8B5CF6"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Chưa có dữ liệu phân loại theo loại tài nguyên.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {shouldShowAnalyticsEmptyState && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Chưa có dữ liệu để hiển thị biểu đồ
            </h3>
            <p className="text-sm mb-4">
              Khi có tài nguyên được thêm hoặc có lượt xem/tải xuống, các biểu
              đồ phân tích sẽ được cập nhật tự động.
            </p>
            <Button
              onClick={() => {
                fetchProducts();
                fetchStats();
                fetchDashboardStats();
              }}
              variant="outline"
              className="border-[#125093] text-[#125093]"
            >
              Làm mới dữ liệu
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
