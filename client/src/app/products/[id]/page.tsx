"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Eye,
  Calendar,
  Users,
  BookOpen,
  Edit,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useAuthFetch } from "@/lib/auth";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { handleImageError } from "@/lib/imageFallback";
import { useThemePreference } from "@/providers/ThemeProvider";
import { useLocale } from "@/providers/LocaleProvider";
import RTEContentDisplay from "@/components/library/RTEContentDisplay";
import { getFullUrl } from "@/lib/api";

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
  content_html?: string;
  downloads?: number;
  views?: number;
  image_url?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
  submitted_date?: string;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const authFetch = useAuthFetch();
  const { theme } = useThemePreference();
  const { t } = useLocale();
  const isDarkMode = theme === "dark";
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incrementingView, setIncrementingView] = useState(false);

  const productId = parseInt(resolvedParams.id, 10);

  useEffect(() => {
    if (isNaN(productId)) {
      setError(t("products.invalidId", "ID sản phẩm không hợp lệ"));
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch product (public endpoint, doesn't require auth)
        const url = getFullUrl(`/api/v1/products/${productId}`);
        // Try with auth if available, otherwise use public fetch
        let res: Response;
        if (authFetch) {
          try {
            res = await authFetch(url);
          } catch (err) {
            console.warn("Auth fetch failed, trying public fetch:", err);
            res = await fetch(url);
          }
        } else {
          res = await fetch(url);
        }
        
        if (!res.ok) {
          throw new Error(`Failed to fetch product: ${res.status}`);
        }
        
        const data = await res.json();
        if (mounted) {
          setProduct(data);
          // Increment view count (optional, only if authenticated)
          if (!incrementingView && authFetch) {
            setIncrementingView(true);
            try {
              await authFetch(getFullUrl(`/api/v1/products/${productId}/view`), {
                method: "POST",
              });
            } catch (err) {
              console.error("Failed to increment view:", err);
              // Not critical, continue anyway
            } finally {
              setIncrementingView(false);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
              if (mounted) {
                setError(t("products.notFound", "Không tìm thấy sản phẩm hoặc sản phẩm đã bị xoá."));
              }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      mounted = false;
    };
  }, [productId, authFetch, incrementingView, t]);

  const handleDownload = async () => {
    if (!product?.file_url) return;

    try {
      // Increment download count
      await authFetch(getFullUrl(`/api/v1/products/${product.id}/download`), {
        method: "POST",
      });

      // Open download link
      window.open(product.file_url, "_blank");
    } catch (err) {
      console.error("Failed to increment download:", err);
      // Still open the link even if increment fails
      window.open(product.file_url, "_blank");
    }
  };

  const handleViewDemo = () => {
    if (product?.demo_url) {
      window.open(product.demo_url, "_blank");
    }
  };

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "min-h-[60vh] flex items-center justify-center transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <Spinner size="xl" text={t("products.loading", "Đang tải sản phẩm...")} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div
        className={cn(
          "min-h-[60vh] flex items-center justify-center p-6 transition-colors",
          isDarkMode ? "bg-background" : "bg-white"
        )}
      >
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {error || t("products.notFound", "Không tìm thấy sản phẩm")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("products.notFoundDesc", "Sản phẩm bạn đang tìm có thể đã bị xoá hoặc không tồn tại.")}
          </p>
          <Button onClick={() => router.push("/products")} variant="default">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("products.backToList", "Quay lại danh sách")}
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-background" : "bg-white"
      )}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("products.backToList", "Quay lại danh sách sản phẩm")}</span>
        </Link>

        {/* Product Image */}
        {(product.thumbnail_url || product.image_url) && (
          <div className="relative w-full h-64 md:h-96 bg-muted rounded-lg overflow-hidden mb-6">
            <Image
              src={product.thumbnail_url || product.image_url || ""}
              alt={product.title}
              fill
              className="object-cover"
              unoptimized
              onError={(event) =>
                handleImageError(event, 800, 600, product.title)
              }
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                {product.title}
              </h1>
              {product.type && (
                <Badge
                  className={cn("mb-4", getTypeBadgeClasses(product.type))}
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
            {isAdmin && (
              <Link href={`/admin/products?edit=${product.id}`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  {t("products.edit", "Chỉnh sửa")}
                </Button>
              </Link>
            )}
          </div>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            {product.subject && (
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>
                  {product.subject}
                  {product.subject_name && ` - ${product.subject_name}`}
                </span>
              </div>
            )}
            {product.group && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{product.group}</span>
              </div>
            )}
            {product.semester && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{product.semester}</span>
              </div>
            )}
            {product.views !== undefined && (
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{product.views} {t("products.views", "lượt xem")}</span>
              </div>
            )}
            {product.downloads !== undefined && (
              <div className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                <span>{product.downloads} {t("products.downloads", "lượt tải")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("products.description", "Mô tả")}
            </h2>
            <p className="text-foreground leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* Rich Text Content */}
        {product.content_html && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {t("products.detailContent", "Chi tiết sản phẩm")}
            </h2>
            <div
              className={cn(
                "prose prose-sm sm:prose lg:prose-lg max-w-none",
                isDarkMode
                  ? "prose-invert prose-p:text-foreground prose-headings:text-foreground"
                  : "prose-p:text-gray-700 prose-headings:text-gray-900"
              )}
            >
              <RTEContentDisplay content={product.content_html} />
            </div>
          </div>
        )}

        {/* Members */}
        {product.members && product.members.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("products.members", "Thành viên nhóm")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {product.members.map((member, index) => (
                <Badge key={index} variant="outline">
                  {member}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Technologies */}
        {product.technologies && product.technologies.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("products.technologies", "Công nghệ sử dụng")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {product.technologies.map((tech, index) => (
                <Badge key={index} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Instructor */}
        {product.instructor && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t("products.instructor", "Giảng viên hướng dẫn")}
            </h2>
            <p className="text-foreground">{product.instructor}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-border">
          {product.file_url && (
            <Button
              onClick={handleDownload}
              variant="default"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("products.download", "Tải xuống")}
            </Button>
          )}
          {product.demo_url && (
            <Button
              onClick={handleViewDemo}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t("products.viewDemo", "Xem demo")}
            </Button>
          )}
        </div>

        {/* Dates */}
        {(product.created_at || product.submitted_date) && (
          <div className="mt-6 pt-6 border-t border-border text-sm text-muted-foreground">
            {product.submitted_date && (
              <p>
                {t("products.submittedDate", "Ngày nộp")}: {formatDate(product.submitted_date) || "N/A"}
              </p>
            )}
            {product.created_at && (
              <p>{t("products.createdDate", "Ngày tạo")}: {formatDate(product.created_at) || "N/A"}</p>
            )}
            {product.updated_at && product.updated_at !== product.created_at && (
              <p>
                {t("products.lastUpdated", "Cập nhật lần cuối")}: {formatDate(product.updated_at) || "N/A"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

