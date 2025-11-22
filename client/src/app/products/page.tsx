"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuthFetch } from "@/lib/auth";
import { listProducts } from "@/services/products";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Spinner from "@/components/ui/Spinner";
import {
  Search,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Calendar,
  Users,
  BookOpen,
  Filter,
  Package,
} from "lucide-react";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";
import { handleImageError } from "@/lib/imageFallback";
import ErrorPage from "@/components/error/ErrorPage";
import { useLocale } from "@/providers/LocaleProvider";

interface Product {
  id: number;
  title: string;
  description?: string;
  subject?: string;
  subject_name?: string;
  group?: string;
  members?: string[];
  instructor?: string;
  semester?: string;
  type?: string;
  technologies?: string[];
  file_url?: string;
  demo_url?: string;
  downloads?: number;
  views?: number;
  image_url?: string;
  thumbnail_url?: string;
  created_at?: string;
  submitted_date?: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const { t } = useLocale();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Create a fetch function that works with or without auth
  // Products API is public, so we don't require auth token
  const fetchLike = useMemo(
    () =>
      async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : input.url;
        
        // Try to use authFetch if available (for tracking views/downloads)
        // But fallback to regular fetch if no auth
        if (authFetch) {
          try {
            return await authFetch(url, init);
          } catch (err) {
            // If auth fails, fallback to regular fetch (public endpoint)
            console.warn("Auth fetch failed, using public fetch:", err);
          }
        }
        
        // Public fetch without auth token
        return fetch(url, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...(init?.headers || {}),
          },
        });
      },
    [authFetch]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await listProducts(fetchLike);
      return Array.isArray(res) ? (res as Product[]) : [];
    },
    enabled: true, // Always enabled, doesn't require auth
    retry: false,
  });

  const productsData = useMemo(() => data ?? [], [data]);

  const filteredProducts = productsData.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubject =
      selectedSubject === "all" || product.subject === selectedSubject;

    const matchesType = selectedType === "all" || product.type === selectedType;

    return matchesSearch && matchesSubject && matchesType;
  });

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    productsData.forEach((p) => {
      if (p.subject) subjects.add(p.subject);
    });
    return Array.from(subjects).sort();
  }, [productsData]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    productsData.forEach((p) => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types).sort();
  }, [productsData]);

  const handleDownload = async (product: Product) => {
    if (!product.file_url) {
      showToast({
        type: "warning",
        title: t("common.error", "Cảnh báo"),
        message: t("products.noFile", "Sản phẩm này không có file để tải xuống"),
      });
      return;
    }

    try {
      // Track download if authenticated
      if (authFetch && product.id) {
        try {
          await authFetch(
            getFullUrl(API_ENDPOINTS.PRODUCT_DOWNLOAD(String(product.id))),
            { method: "POST" }
          );
        } catch (err) {
          console.error("Failed to track download:", err);
        }
      }

      window.open(product.file_url, "_blank");
    } catch (err) {
      console.error("Failed to open download URL:", err);
            showToast({
              type: "error",
              title: t("common.error", "Lỗi"),
              message: t("products.downloadError", "Không thể tải xuống file. Vui lòng thử lại."),
            });
    }
  };

  const handleViewDemo = (demoUrl: string) => {
    window.open(demoUrl, "_blank");
  };

  const getTypeBadgeClasses = (type?: string) => {
    switch (type) {
      case "project":
        return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
      case "assignment":
        return "bg-emerald-500/15 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400";
      case "presentation":
        return "bg-purple-500/15 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400";
      case "other":
        return "bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Products page is public - no need to check authentication
  // Auth is only needed for tracking views/downloads (optional)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner size="xl" text={t("products.loading", "Đang tải sản phẩm...")} />
      </div>
    );
  }

  if (isError) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : t("errors.networkError", "Đã xảy ra lỗi khi tải danh sách sản phẩm");

    return (
      <ErrorPage
        title={t("errors.serverError", "Không thể tải dữ liệu")}
        message={errorMessage}
        error={error instanceof Error ? error : null}
        showRetry={true}
        onRetry={() => window.location.reload()}
        backHref="/"
        backLabel={t("errors.goHome", "Về trang chủ")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 poppins-bold">
            {t("products.title", "Sản phẩm")}
          </h1>
          <p className="text-muted-foreground">
            {t("products.description", "Khám phá các dự án, bài tập và sản phẩm học tập từ sinh viên")}
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("common.search", "Tìm kiếm") + " " + t("products.title", "sản phẩm") + "..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <SelectValue placeholder={t("products.allSubjects", "Tất cả môn học")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("products.allSubjects", "Tất cả môn học")}</SelectItem>
                  {uniqueSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <SelectValue placeholder={t("products.allTypes", "Tất cả loại")} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("products.allTypes", "Tất cả loại")}</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "project"
                        ? t("products.project", "Dự án")
                        : type === "assignment"
                        ? t("products.assignment", "Bài tập")
                        : type === "presentation"
                        ? t("products.presentation", "Thuyết trình")
                        : type === "other"
                        ? t("products.other", "Khác")
                        : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4 dark:bg-transparent dark:border dark:border-white/40">
                  <Package className="w-8 h-8 text-muted-foreground dark:text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t("products.noProducts", "Không tìm thấy sản phẩm")}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ||
                  selectedSubject !== "all" ||
                  selectedType !== "all"
                    ? t("products.noProductsDesc", "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm")
                    : t("products.noProductsDesc", "Chưa có sản phẩm nào được đăng tải")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/products/${product.id}`)}
              >
                {/* Product Image */}
                {(product.thumbnail_url || product.image_url) && (
                  <div className="relative w-full h-48 bg-muted overflow-hidden">
                    <Image
                      src={product.thumbnail_url || product.image_url || ""}
                      alt={product.title}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(event) =>
                        handleImageError(event, 400, 300, product.title)
                      }
                    />
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-xl font-bold text-foreground line-clamp-2">
                      {product.title}
                    </CardTitle>
                    {product.type && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "flex-shrink-0",
                          getTypeBadgeClasses(product.type)
                        )}
                      >
                        {product.type === "project"
                          ? t("products.project", "Dự án")
                          : product.type === "assignment"
                          ? t("products.assignment", "Bài tập")
                          : product.type === "presentation"
                          ? t("products.presentation", "Thuyết trình")
                          : product.type === "other"
                          ? t("products.other", "Khác")
                          : product.type}
                      </Badge>
                    )}
                  </div>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {product.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Product Info */}
                  <div className="space-y-2 text-sm">
                    {product.subject && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span>
                          {product.subject}
                          {product.subject_name && ` - ${product.subject_name}`}
                        </span>
                      </div>
                    )}
                    {product.group && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{product.group}</span>
                      </div>
                    )}
                    {product.instructor && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>{product.instructor}</span>
                      </div>
                    )}
                    {product.semester && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{product.semester}</span>
                      </div>
                    )}
                  </div>

                  {/* Technologies */}
                  {product.technologies && product.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {product.technologies.map((tech, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t border-border">
                    {product.views !== undefined && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{product.views}</span>
                      </div>
                    )}
                    {product.downloads !== undefined && (
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{product.downloads}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {product.file_url && (
                      <Button
                        onClick={() => handleDownload(product)}
                        variant="default"
                        size="sm"
                        className="flex-1"
                      >
                        <Download className="w-4 h-4" />
                        {t("products.download", "Tải xuống")}
                      </Button>
                    )}
                    {product.demo_url && (
                      <Button
                        onClick={() => handleViewDemo(product.demo_url!)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t("products.viewDemo", "Xem demo")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
