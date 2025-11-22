"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthFetch } from "@/lib/auth";
import { getFullUrl, API_ENDPOINTS } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import { useToast } from "@/contexts/ToastContext";
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
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Database,
  Upload,
  Search,
  Edit,
  Trash2,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  RefreshCw,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
} from "lucide-react";

interface AIDataItem {
  // CORE & DB
  id: number;
  title: string;
  categoryId: number; // ID danh mục (ví dụ: môn học 1, 2, 3)
  description: string;

  // FILE & UPLOAD
  fileType?: string;
  fileSize?: number; // Lưu dưới dạng byte/KB/MB (dùng number)
  uploadDate?: number; // Timestamp (hoặc Date object)

  // RAG & INDEXING
  status: "PENDING" | "INDEXING" | "COMPLETED" | "FAILED"; // Nên là trường bắt buộc
  lastProcessed?: number; // Timestamp
  embeddings?: number; // Số vector nhúng
  chunks?: number; // Số chunks

  // UI & Metadata
  categoryName?: string; // Tên hiển thị (lookup)
  statusText?: string; // Trạng thái cho người dùng
  tags?: string[];
  thumbnailUrl?: string; // Đổi tên để rõ ràng là URL
  usage?: number; // Số lần dùng
  fileName?: string;
  displayName?: string;

  [key: string]: unknown;
}

type AIDataApiResponse = Partial<AIDataItem> & {
  display_name?: string;
  displayName?: string;
  subject_id?: number;
  subject_name?: string;
  category_id?: number;
  category_name?: string;
  description?: string;
  file_type?: string;
  mime_type?: string;
  file_size?: number;
  fileSize?: number;
  size_bytes?: number;
  sizeBytes?: number;
  upload_date?: string;
  created_at?: string;
  last_processed?: string;
  indexed_at?: string;
  status_text?: string;
  thumbnail_url?: string;
  file_name?: string;
  tags?: string[];
  [key: string]: unknown;
};

const mbToBytes = (mb: number): number => mb * 1024 * 1024;

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Chuẩn hóa tên file tiếng Việt thành tên file dễ search và gọn gàng
 * Loại bỏ dấu, ký tự đặc biệt, chuyển thành slug
 */
const normalizeFileName = (fileName: string): string => {
  if (!fileName) return "file";

  // Lấy tên file không có extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";

  // Bảng chuyển đổi tiếng Việt không dấu
  const vietnameseMap: Record<string, string> = {
    à: "a",
    á: "a",
    ạ: "a",
    ả: "a",
    ã: "a",
    â: "a",
    ầ: "a",
    ấ: "a",
    ậ: "a",
    ẩ: "a",
    ẫ: "a",
    ă: "a",
    ằ: "a",
    ắ: "a",
    ặ: "a",
    ẳ: "a",
    ẵ: "a",
    è: "e",
    é: "e",
    ẹ: "e",
    ẻ: "e",
    ẽ: "e",
    ê: "e",
    ề: "e",
    ế: "e",
    ệ: "e",
    ể: "e",
    ễ: "e",
    ì: "i",
    í: "i",
    ị: "i",
    ỉ: "i",
    ĩ: "i",
    ò: "o",
    ó: "o",
    ọ: "o",
    ỏ: "o",
    õ: "o",
    ô: "o",
    ồ: "o",
    ố: "o",
    ộ: "o",
    ổ: "o",
    ỗ: "o",
    ơ: "o",
    ờ: "o",
    ớ: "o",
    ợ: "o",
    ở: "o",
    ỡ: "o",
    ù: "u",
    ú: "u",
    ụ: "u",
    ủ: "u",
    ũ: "u",
    ư: "u",
    ừ: "u",
    ứ: "u",
    ự: "u",
    ử: "u",
    ữ: "u",
    ỳ: "y",
    ý: "y",
    ỵ: "y",
    ỷ: "y",
    ỹ: "y",
    đ: "d",
    À: "A",
    Á: "A",
    Ạ: "A",
    Ả: "A",
    Ã: "A",
    Â: "A",
    Ầ: "A",
    Ấ: "A",
    Ậ: "A",
    Ẩ: "A",
    Ẫ: "A",
    Ă: "A",
    Ằ: "A",
    Ắ: "A",
    Ặ: "A",
    Ẳ: "A",
    Ẵ: "A",
    È: "E",
    É: "E",
    Ẹ: "E",
    Ẻ: "E",
    Ẽ: "E",
    Ê: "E",
    Ề: "E",
    Ế: "E",
    Ệ: "E",
    Ể: "E",
    Ễ: "E",
    Ì: "I",
    Í: "I",
    Ị: "I",
    Ỉ: "I",
    Ĩ: "I",
    Ò: "O",
    Ó: "O",
    Ọ: "O",
    Ỏ: "O",
    Õ: "O",
    Ô: "O",
    Ồ: "O",
    Ố: "O",
    Ộ: "O",
    Ổ: "O",
    Ỗ: "O",
    Ơ: "O",
    Ờ: "O",
    Ớ: "O",
    Ợ: "O",
    Ở: "O",
    Ỡ: "O",
    Ù: "U",
    Ú: "U",
    Ụ: "U",
    Ủ: "U",
    Ũ: "U",
    Ư: "U",
    Ừ: "U",
    Ứ: "U",
    Ự: "U",
    Ử: "U",
    Ữ: "U",
    Ỳ: "Y",
    Ý: "Y",
    Ỵ: "Y",
    Ỷ: "Y",
    Ỹ: "Y",
    Đ: "D",
  };

  // Chuyển đổi tiếng Việt có dấu thành không dấu
  let normalized = nameWithoutExt
    .split("")
    .map((char) => vietnameseMap[char] || char)
    .join("");

  // Loại bỏ ký tự đặc biệt, chỉ giữ chữ, số, dấu gạch ngang và gạch dưới
  normalized = normalized.replace(/[^a-zA-Z0-9_-]/g, "-");

  // Loại bỏ nhiều dấu gạch ngang liên tiếp
  normalized = normalized.replace(/-+/g, "-");

  // Loại bỏ dấu gạch ngang ở đầu và cuối
  normalized = normalized.replace(/^-+|-+$/g, "");

  // Nếu sau khi normalize mà rỗng, dùng tên mặc định
  if (!normalized) {
    normalized = "file";
  }

  // Giới hạn độ dài tên file (tối đa 100 ký tự)
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100);
  }

  // Thêm extension nếu có
  return extension ? `${normalized}.${extension}` : normalized;
};

const statusTextMap: Record<AIDataItem["status"], string> = {
  PENDING: "Chưa xử lý",
  INDEXING: "Đang xử lý",
  COMPLETED: "Đã xử lý",
  FAILED: "Thất bại",
};

const mapApiResponseToItem = (item: AIDataApiResponse): AIDataItem => {
  const normalizeStatus = (value?: string): AIDataItem["status"] => {
    switch ((value || "").toUpperCase()) {
      case "INDEXING":
        return "INDEXING";
      case "COMPLETED":
        return "COMPLETED";
      case "FAILED":
        return "FAILED";
      case "PENDING":
      default:
        return "PENDING";
    }
  };

  const status = normalizeStatus(item.status);
  const fallbackStatusText =
    item.status_text || statusTextMap[status] || "Chưa xử lý";

  return {
    id: item.id ?? 0,
    title: item.title || (item.display_name as string) || "Tài liệu AI",
    categoryId: item.categoryId ?? item.subject_id ?? item.category_id ?? 1,
    categoryName:
      item.categoryName ||
      item.subject_name ||
      item.category_name ||
      "Tài liệu",
    description: item.description || "",
    fileType: (item.fileType || item.file_type || item.mime_type || "pdf")
      .toString()
      .toLowerCase(),
    fileSize:
      item.fileSize ?? item.file_size ?? item.size_bytes ?? item.sizeBytes ?? 0,
    uploadDate: item.uploadDate
      ? item.uploadDate
      : item.upload_date
      ? new Date(item.upload_date).getTime()
      : item.created_at
      ? new Date(item.created_at).getTime()
      : Date.now(),
    lastProcessed: item.lastProcessed
      ? item.lastProcessed
      : item.last_processed
      ? new Date(item.last_processed).getTime()
      : item.indexed_at
      ? new Date(item.indexed_at).getTime()
      : undefined,
    status,
    statusText: fallbackStatusText,
    embeddings: item.embeddings ?? 0,
    chunks: item.chunks ?? 0,
    usage: item.usage ?? 0,
    tags: Array.isArray(item.tags) ? item.tags : [],
    thumbnailUrl:
      item.thumbnailUrl || item.thumbnail_url || "/api/placeholder/300/200",
    fileName: item.fileName || item.file_name,
    displayName:
      item.displayName || (item.display_name as string) || item.title,
  };
};

const mockAIData: AIDataItem[] = [
  {
    id: 1,
    title: "Giáo trình Toán học cơ bản",
    categoryId: 1,
    categoryName: "Tài liệu",
    description: "Tài liệu học tập môn Toán học cơ bản cho sinh viên năm nhất",
    fileType: "pdf",
    fileSize: mbToBytes(2.5),
    uploadDate: new Date("2024-01-15").getTime(),
    lastProcessed: new Date("2024-01-15").getTime(),
    status: "COMPLETED",
    statusText: "Đã xử lý",
    embeddings: 1250,
    chunks: 45,
    usage: 89,
    tags: ["toán học", "cơ bản", "giáo trình"],
    thumbnailUrl: "/api/placeholder/300/200",
  },
  {
    id: 2,
    title: "Video tài liệu Vật lý đại cương",
    categoryId: 2,
    categoryName: "Video",
    description:
      "Video tài liệu về các khái niệm cơ bản trong vật lý đại cương",
    fileType: "mp4",
    fileSize: mbToBytes(125),
    uploadDate: new Date("2024-01-14").getTime(),
    lastProcessed: new Date("2024-01-14").getTime(),
    status: "INDEXING",
    statusText: "Đang xử lý",
    embeddings: 0,
    chunks: 0,
    usage: 0,
    tags: ["vật lý", "video", "tài liệu"],
    thumbnailUrl: "/api/placeholder/300/200",
  },
  {
    id: 3,
    title: "Hình ảnh minh họa Hóa học",
    categoryId: 3,
    categoryName: "Hình ảnh",
    description: "Bộ sưu tập hình ảnh minh họa các phản ứng hóa học",
    fileType: "jpg",
    fileSize: mbToBytes(8.2),
    uploadDate: new Date("2024-01-13").getTime(),
    lastProcessed: new Date("2024-01-13").getTime(),
    status: "COMPLETED",
    statusText: "Đã xử lý",
    embeddings: 320,
    chunks: 12,
    usage: 45,
    tags: ["hóa học", "hình ảnh", "minh họa"],
    thumbnailUrl: "/api/placeholder/300/200",
  },
  {
    id: 4,
    title: "Tài liệu âm thanh Sinh học",
    categoryId: 4,
    categoryName: "Âm thanh",
    description: "File âm thanh tài liệu về sinh học phân tử",
    fileType: "mp3",
    fileSize: mbToBytes(45),
    uploadDate: new Date("2024-01-12").getTime(),
    lastProcessed: new Date("2024-01-12").getTime(),
    status: "COMPLETED",
    statusText: "Đã xử lý",
    embeddings: 890,
    chunks: 28,
    usage: 67,
    tags: ["sinh học", "âm thanh", "phân tử"],
    thumbnailUrl: "/api/placeholder/300/200",
  },
  {
    id: 5,
    title: "Tài liệu tham khảo Tiếng Anh",
    categoryId: 1,
    categoryName: "Tài liệu",
    description: "Tài liệu tham khảo về ngữ pháp và từ vựng tiếng Anh",
    fileType: "docx",
    fileSize: mbToBytes(1.8),
    uploadDate: new Date("2024-01-11").getTime(),
    lastProcessed: new Date("2024-01-11").getTime(),
    status: "FAILED",
    statusText: "Lỗi xử lý",
    embeddings: 0,
    chunks: 0,
    usage: 0,
    tags: ["tiếng anh", "ngữ pháp", "từ vựng"],
    thumbnailUrl: "/api/placeholder/300/200",
  },
  {
    id: 6,
    title: "Video thí nghiệm Hóa học",
    categoryId: 2,
    categoryName: "Video",
    description: "Video ghi lại các thí nghiệm hóa học thực tế",
    fileType: "mp4",
    fileSize: mbToBytes(89),
    uploadDate: new Date("2024-01-10").getTime(),
    lastProcessed: new Date("2024-01-10").getTime(),
    status: "COMPLETED",
    statusText: "Đã xử lý",
    embeddings: 650,
    chunks: 22,
    usage: 123,
    tags: ["hóa học", "thí nghiệm", "video"],
    thumbnailUrl: "/api/placeholder/300/200",
  },
];

export default function AIDataPage() {
  const authFetch = useAuthFetch();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | number>(
    "all"
  );
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [aiData, setAiData] = useState<AIDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    fileId: number | null;
    fileName: string | null;
  }>({ isOpen: false, fileId: null, fileName: null });
  const [deleting, setDeleting] = useState(false);

  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    fileId: number | null;
  }>({ isOpen: false, fileId: null });
  const [detailData, setDetailData] = useState<AIDataItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchFileDetail = useCallback(
    async (fileId: number) => {
      if (!authFetch) return;
      try {
        setLoadingDetail(true);
        const response = await authFetch(
          getFullUrl(API_ENDPOINTS.AI_DATA_DETAIL(fileId)),
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Không thể tải chi tiết file");
        }

        const data = await response.json();
        const mappedData = mapApiResponseToItem(data);
        setDetailData(mappedData);
        setDetailModal({ isOpen: true, fileId });
      } catch (error) {
        console.error("Error fetching file detail:", error);
        showToast({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Không thể tải chi tiết file",
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [authFetch, showToast]
  );

  const refreshFileStatus = useCallback(
    async (fileId: number, successMessage?: string) => {
      if (!authFetch) return;
      try {
        setRefreshingId(fileId);

        // Lấy currentFile từ state hiện tại bằng cách sử dụng functional update
        let currentFile: AIDataItem | undefined;
        setAiData((prev) => {
          currentFile = prev.find((item) => item.id === fileId);
          return prev; // Không thay đổi state, chỉ lấy giá trị
        });

        // Gọi endpoint index để trigger refresh status từ Gemini
        const response = await authFetch(
          getFullUrl(API_ENDPOINTS.AI_DATA_INDEX(fileId)),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          // Nếu không có file_name trong DB, thử list files từ Gemini để tìm
          if (currentFile && !currentFile.fileName) {
            // Thử tìm file trong Gemini bằng display_name hoặc title
            try {
              const geminiFilesResponse = await authFetch(
                getFullUrl(API_ENDPOINTS.AI_DATA_FILES)
              );
              if (geminiFilesResponse.ok) {
                const geminiFiles = await geminiFilesResponse.json();
                const matchedFile = geminiFiles.find(
                  (f: AIDataApiResponse) =>
                    f.display_name === currentFile!.displayName ||
                    f.display_name === currentFile!.title ||
                    f.title === currentFile!.title
                );
                if (matchedFile) {
                  // File đã tồn tại trong Gemini, cập nhật status
                  const normalized = mapApiResponseToItem(matchedFile);
                  setAiData((prev) =>
                    prev.map((item) =>
                      item.id === fileId ? { ...item, ...normalized } : item
                    )
                  );
                  showToast({
                    type: "success",
                    title: "Đã đồng bộ",
                    message:
                      successMessage ||
                      "Đã tìm thấy file trong Gemini và cập nhật trạng thái.",
                  });
                  return;
                }
              }
            } catch (listError) {
              console.warn("Error listing Gemini files:", listError);
            }
          }
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(
            `HTTP error! status: ${response.status}, error: ${errorText}`
          );
        }

        const updatedData = await response.json();
        const normalized = mapApiResponseToItem(updatedData);

        setAiData((prev) => {
          const updated = prev.map((item) =>
            item.id === fileId ? { ...item, ...normalized } : item
          );

          // Chỉ hiển thị toast nếu status thay đổi hoặc có successMessage
          const oldFile = prev.find((item) => item.id === fileId);
          if (successMessage || oldFile?.status !== normalized.status) {
            showToast({
              type: "success",
              title: "Đã đồng bộ",
              message:
                successMessage ||
                "Trạng thái tài liệu đã được cập nhật từ Gemini.",
            });
          }
          return updated;
        });
      } catch (error) {
        console.error(
          `[DEBUG] Error refreshing file status for file_id=${fileId}:`,
          error
        );
        showToast({
          type: "error",
          title: "Lỗi",
          message: "Không thể đồng bộ trạng thái, vui lòng thử lại sau.",
        });
      } finally {
        setRefreshingId(null);
      }
    },
    [authFetch, showToast]
  );

  const [stats, setStats] = useState([
    {
      title: "Tổng dữ liệu",
      value: "0",
      change: "+0%",
      changeType: "positive" as const,
      icon: Database,
      color: "text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]",
    },
    {
      title: "Đã xử lý",
      value: "0",
      change: "+0%",
      changeType: "positive" as const,
      icon: CheckCircle,
      color: "text-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/0.12)]",
    },
    {
      title: "Đang xử lý",
      value: "0",
      change: "0%",
      changeType: "negative" as const,
      icon: Clock,
      color: "text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)]",
    },
    {
      title: "Lỗi xử lý",
      value: "0",
      change: "0%",
      changeType: "positive" as const,
      icon: AlertCircle,
      color: "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)]",
    },
  ]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!authFetch) return;
      try {
        // Fetch subjects from admin endpoint (organization.Subject model)
        const response = await authFetch(getFullUrl("/api/v1/admin/subjects"));
        if (response.ok) {
          const data = await response.json();
          const subjectsList = Array.isArray(data)
            ? data.map(
                (s: { id: number; name: string; description?: string }) => ({
                  id: s.id,
                  name: s.name || `Subject ${s.id}`,
                })
              )
            : [];

          // If no subjects found, use default categories
          if (subjectsList.length === 0) {
            setSubjects([
              { id: 1, name: "Tài liệu" },
              { id: 2, name: "Video" },
              { id: 3, name: "Hình ảnh" },
              { id: 4, name: "Âm thanh" },
            ]);
          } else {
            setSubjects(subjectsList);
          }
        } else {
          // Fallback to default subjects if fetch fails
          setSubjects([
            { id: 1, name: "Tài liệu" },
            { id: 2, name: "Video" },
            { id: 3, name: "Hình ảnh" },
            { id: 4, name: "Âm thanh" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        // Fallback to default subjects if fetch fails
        setSubjects([
          { id: 1, name: "Tài liệu" },
          { id: 2, name: "Video" },
          { id: 3, name: "Hình ảnh" },
          { id: 4, name: "Âm thanh" },
        ]);
      }
    };
    fetchSubjects();
  }, [authFetch]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!authFetch) return;
      try {
        const response = await authFetch(
          getFullUrl("/api/v1/admin/ai-data/stats"),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            console.warn("Unauthorized when fetching AI data stats (401)");
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Format numbers with commas
        const formatNumber = (num: number) => num.toLocaleString("vi-VN");

        setStats([
          {
            title: "Tổng dữ liệu",
            value: formatNumber(data.total_materials || 0),
            change: "+0%",
            changeType: "positive" as const,
            icon: Database,
            color: "text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)]",
          },
          {
            title: "Đã xử lý",
            value: formatNumber(data.processed_materials || 0),
            change: "+0%",
            changeType: "positive" as const,
            icon: CheckCircle,
            color:
              "text-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/0.12)]",
          },
          {
            title: "Đang xử lý",
            value: formatNumber(data.processing_materials || 0),
            change: "0%",
            changeType: "negative" as const,
            icon: Clock,
            color: "text-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.12)]",
          },
          {
            title: "Lỗi xử lý",
            value: formatNumber(data.failed_materials || 0),
            change: "0%",
            changeType: "positive" as const,
            icon: AlertCircle,
            color:
              "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)]",
          },
        ]);
      } catch (error) {
        console.error("Error fetching AI data stats:", error);
      }
    };
    fetchStats();
  }, [authFetch]);

  const fetchAIData = useCallback(
    async (refreshStatuses = false) => {
      if (!authFetch) return;
      try {
        setLoading(true);

        // Thử fetch từ endpoint list files từ Gemini trước
        let response = await authFetch(
          getFullUrl(API_ENDPOINTS.AI_DATA_FILES),
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        let data: AIDataApiResponse[] = [];
        let useFallback = false;

        if (!response.ok) {
          // Nếu endpoint files lỗi, fallback về endpoint list từ DB
          if (response.status === 401) {
            console.warn("Unauthorized when fetching AI data files (401)");
          } else {
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            console.warn(
              `Failed to fetch from AI_DATA_FILES (${response.status}): ${errorText}`
            );
          }
          useFallback = true;
        } else {
          // Response OK, kiểm tra data
          const filesData = await response.json();
          data = Array.isArray(filesData) ? filesData : [];

          // Nếu không có data từ Gemini, fallback về DB
          if (data.length === 0) {
            console.info(
              "AI_DATA_FILES returned empty array, falling back to DB endpoint"
            );
            useFallback = true;
          }
        }

        // Fallback: fetch từ DB endpoint nếu cần
        if (useFallback) {
          response = await authFetch(
            getFullUrl(`${API_ENDPOINTS.AI_DATA_LIST}?limit=100`),
            {
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!response.ok) {
            if (response.status === 401) {
              console.warn("Unauthorized when fetching AI data list (401)");
              setAiData(mockAIData);
              return;
            }
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            throw new Error(
              `HTTP error! status: ${response.status}, error: ${errorText}`
            );
          }

          const dbData = await response.json();
          data = Array.isArray(dbData) ? dbData : [];
        }

        const transformedData = data.map(mapApiResponseToItem);
        setAiData(transformedData);

        // Nếu refreshStatuses = true, tự động refresh status cho các file đang INDEXING hoặc PENDING
        if (refreshStatuses) {
          const indexingFiles = transformedData.filter(
            (item) => item.status === "INDEXING" || item.status === "PENDING"
          );

          // Refresh status cho từng file (không chờ kết quả)
          indexingFiles.forEach((file) => {
            if (file.id && refreshingId !== file.id) {
              refreshFileStatus(file.id).catch((error) => {
                console.warn(`Failed to refresh file ${file.id}:`, error);
              });
            }
          });
        }
      } catch (error) {
        console.error("Error fetching AI data:", error);
        // Chỉ dùng mock data nếu thực sự không thể fetch
        setAiData((prev) => {
          if (prev.length === 0) {
            return mockAIData;
          }
          return prev;
        });
      } finally {
        setLoading(false);
      }
    },
    [authFetch, refreshFileStatus, refreshingId]
  );

  useEffect(() => {
    fetchAIData(false); // Load data lần đầu, không refresh status ngay
  }, [fetchAIData]);

  // Sau khi load data xong lần đầu, tự động refresh status cho các file đang INDEXING/PENDING
  const hasAutoRefreshedRef = useRef(false);
  useEffect(() => {
    if (loading || aiData.length === 0 || hasAutoRefreshedRef.current) return;

    // Lấy danh sách file INDEXING/PENDING từ state hiện tại
    const indexingFiles = aiData.filter(
      (item) => item.status === "INDEXING" || item.status === "PENDING"
    );

    if (indexingFiles.length === 0) {
      hasAutoRefreshedRef.current = true; // Đánh dấu đã check
      return;
    }

    // Delay một chút trước khi refresh để tránh spam request ngay khi load
    const timeoutId = setTimeout(() => {
      indexingFiles.forEach((file) => {
        if (file.id) {
          refreshFileStatus(file.id).catch((error) => {
            console.warn(`Failed to refresh file ${file.id} on load:`, error);
          });
        }
      });
      hasAutoRefreshedRef.current = true; // Đánh dấu đã refresh
    }, 2000); // Delay 2 giây sau khi load xong

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, aiData.length]); // Chỉ phụ thuộc vào length và loading, không phụ thuộc vào toàn bộ aiData hoặc refreshFileStatus

  // Tự động refresh status cho các file đang INDEXING hoặc PENDING (mỗi 30 giây)
  useEffect(() => {
    if (!authFetch || loading) return;

    // Refresh status cho các file đang xử lý sau 30 giây
    const refreshInterval = setInterval(() => {
      // Lấy danh sách file hiện tại từ state
      setAiData((prev) => {
        const indexingFiles = prev.filter(
          (item) => item.status === "INDEXING" || item.status === "PENDING"
        );

        if (indexingFiles.length === 0) return prev;

        indexingFiles.forEach((file) => {
          if (file.id) {
            // Kiểm tra refreshingId từ state hiện tại
            setRefreshingId((currentRefreshingId) => {
              if (currentRefreshingId !== file.id) {
                refreshFileStatus(file.id).catch((error) => {
                  console.warn(
                    `Failed to auto-refresh file ${file.id}:`,
                    error
                  );
                });
              }
              return currentRefreshingId;
            });
          }
        });
        return prev; // Không thay đổi state
      });
    }, 30000); // 30 giây

    return () => clearInterval(refreshInterval);
  }, [authFetch, loading, refreshFileStatus]);

  const filteredData = aiData.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tags &&
        item.tags.some((tag: string) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    return matchesCategory && matchesSearch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (b.uploadDate || 0) - (a.uploadDate || 0);
      case "oldest":
        return (a.uploadDate || 0) - (b.uploadDate || 0);
      case "size":
        return (b.fileSize || 0) - (a.fileSize || 0);
      case "usage":
        return (b.usage || 0) - (a.usage || 0);
      default:
        return 0;
    }
  });

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return File;
    switch (fileType) {
      case "pdf":
      case "docx":
      case "doc":
        return FileText;
      case "mp4":
      case "avi":
      case "mov":
        return Video;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return ImageIcon;
      case "mp3":
      case "wav":
      case "aac":
        return File;
      default:
        return File;
    }
  };

  const getStatusColor = (status?: AIDataItem["status"]) => {
    if (!status) return "bg-muted text-muted-foreground";
    switch (status) {
      case "COMPLETED":
        return "bg-[hsl(var(--secondary))/0.18] text-[hsl(var(--secondary))]";
      case "INDEXING":
        return "bg-[hsl(var(--accent))/0.2] text-[hsl(var(--accent))]";
      case "PENDING":
        return "bg-[hsl(var(--primary))/0.15] text-[hsl(var(--primary))]";
      case "FAILED":
        return "bg-[hsl(var(--destructive))/0.18] text-[hsl(var(--destructive))]";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteConfirmDialog.fileId || !authFetch) return;

    setDeleting(true);
    try {
      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.AI_DATA_DELETE(deleteConfirmDialog.fileId)),
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Không thể xóa file");
      }

      showToast({
        type: "success",
        title: "Thành công",
        message: "Đã xóa file thành công",
      });

      // Remove file from state immediately
      setAiData((prev) =>
        prev.filter((item) => item.id !== deleteConfirmDialog.fileId)
      );

      // Close dialog
      setDeleteConfirmDialog({ isOpen: false, fileId: null, fileName: null });

      // Refresh data from backend to ensure sync
      await fetchAIData(false);
    } catch (error) {
      console.error("Error deleting file:", error);
      showToast({
        type: "error",
        title: "Lỗi",
        message: error instanceof Error ? error.message : "Không thể xóa file",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
      {/* Page Header */}
      <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6 md:p-8 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] mb-3 poppins-bold">
            Dữ liệu AI
          </h1>
          <p className="text-muted-foreground text-base">
            Quản lý và xử lý dữ liệu AI cho hệ thống học tập
          </p>
        </div>
      </div>
      <div className="max-w-7.5xl mx-auto space-y-8">
        <div className="bg-card text-card-foreground rounded-xl shadow-md border border-border p-6 md:p-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Upload và quản lý tài liệu để phục vụ hệ thống RAG - Tài liệu sẽ
                được xử lý, tạo embeddings và index để chatbot có thể truy xuất
                thông tin chính xác
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => fetchAIData(true)}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Làm mới danh sách và kiểm tra trạng thái các file đang xử lý"
              >
                {loading ? (
                  <Spinner size="sm" inline />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
                <span>Làm mới</span>
              </button>

              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-primary-foreground px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Upload className="h-5 w-5" />
                <span>Tải lên tài liệu RAG</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-lg shadow-md p-6 md:p-7 border-l-4 border-[hsl(var(--primary))] hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {stat.title}
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-[hsl(var(--primary))] poppins-bold mb-1">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <p
                        className={`text-xs md:text-sm flex items-center mt-2 ${
                          stat.changeType === "positive"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        {stat.change}
                      </p>
                    )}
                  </div>
                  <div
                    className={`p-3 md:p-4 rounded-lg flex-shrink-0 ${stat.color}`}
                  >
                    <Icon className="h-6 w-6 md:h-7 md:w-7" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters and Search */}
        <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border p-6 md:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm dữ liệu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 w-64"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === "all"
                      ? "bg-[hsl(var(--primary))] text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  Tất cả ({aiData.length})
                </button>
                {subjects.length > 0 ? (
                  subjects.map((subject) => {
                    const count = aiData.filter(
                      (item) => item.categoryId === subject.id
                    ).length;
                    return (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedCategory(subject.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCategory === subject.id
                            ? "bg-[hsl(var(--primary))] text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {subject.name} ({count})
                      </button>
                    );
                  })
                ) : (
                  // Show placeholder while loading
                  <>
                    <button
                      disabled
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground/60 cursor-not-allowed"
                    >
                      Đang tải môn học...
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-background border border-border rounded-lg px-3 py-2 text-foreground w-full sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="oldest">Cũ nhất</SelectItem>
                  <SelectItem value="size">Kích thước</SelectItem>
                  <SelectItem value="usage">Sử dụng</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-[hsl(var(--primary))] text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-colors ${
                    viewMode === "list"
                      ? "bg-[hsl(var(--primary))] text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Data Grid/List */}
          <div className="relative mt-6">
            {loading ? (
              <div
                className={`grid gap-6 md:gap-8 ${
                  viewMode === "grid"
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-card rounded-xl shadow-lg border border-border overflow-hidden"
                  >
                    <Skeleton className="h-48 w-full" />
                    <div className="p-6 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`grid gap-6 md:gap-8 ${
                  viewMode === "grid"
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {sortedData.map((item) => {
                  const FileIcon = getFileIcon(item.fileType);
                  return (
                    <div
                      key={item.id}
                      className={`bg-card text-card-foreground rounded-xl shadow-lg border border-border overflow-hidden hover:shadow-xl transition-all duration-200 ${
                        viewMode === "list" ? "flex flex-col sm:flex-row" : ""
                      }`}
                    >
                      {viewMode === "grid" ? (
                        <>
                          <div className="relative">
                            <div className="h-48 bg-muted flex items-center justify-center">
                              <FileIcon className="h-16 w-16 text-muted-foreground" />
                            </div>
                            <div className="absolute top-3 left-3">
                              <span className="px-3 py-1 bg-[hsl(var(--primary))]/80 text-primary-foreground text-xs font-medium rounded-full shadow">
                                {item.categoryName}
                              </span>
                            </div>
                            <div className="absolute top-3 right-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                  item.status
                                )}`}
                              >
                                {item.statusText}
                              </span>
                            </div>
                          </div>

                          <div className="p-6 md:p-7">
                            <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3 line-clamp-1">
                              {item.title}
                            </h3>
                            <p className="text-muted-foreground mb-5 line-clamp-2 text-sm md:text-base leading-relaxed">
                              {item.description}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-5 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Database className="h-4 w-4 mr-2" />
                                {item.embeddings} embeddings
                              </div>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                {item.chunks} chunks
                              </div>
                              <div className="flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {item.usage} sử dụng
                              </div>
                              <div className="flex items-center">
                                <FileIcon className="h-4 w-4 mr-2" />
                                {formatFileSize(item.fileSize)}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-5">
                              {(item.tags || [])
                                .slice(0, 3)
                                .map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2.5 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => fetchFileDetail(item.id)}
                                disabled={loadingDetail}
                                className="flex-1 bg-[hsl(var(--primary))] text-primary-foreground py-2 px-4 rounded-lg hover:bg-[hsl(var(--primary)/0.85)] transition-colors text-sm disabled:opacity-50"
                              >
                                {loadingDetail &&
                                detailModal.fileId === item.id ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <Spinner size="sm" inline />
                                    Đang tải...
                                  </span>
                                ) : (
                                  "Xem chi tiết"
                                )}
                              </button>
                              <button
                                onClick={() => refreshFileStatus(item.id)}
                                disabled={refreshingId === item.id}
                                className="p-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
                                title="Đồng bộ trạng thái với Gemini"
                              >
                                {refreshingId === item.id ? (
                                  <Spinner size="sm" inline />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </button>
                              {item.status === "PENDING" && (
                                <button
                                  onClick={() =>
                                    refreshFileStatus(
                                      item.id,
                                      "Đã kích hoạt kiểm tra trạng thái!"
                                    )
                                  }
                                  disabled={refreshingId === item.id}
                                  className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm disabled:opacity-50"
                                  title="Kích hoạt index"
                                >
                                  {refreshingId === item.id ? (
                                    <Spinner size="sm" inline />
                                  ) : (
                                    "Index"
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setDeleteConfirmDialog({
                                    isOpen: true,
                                    fileId: item.id,
                                    fileName: item.title,
                                  })
                                }
                                className="p-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                                title="Xóa file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-32 h-24 sm:w-40 sm:h-32 bg-muted flex items-center justify-center flex-shrink-0">
                            <FileIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                          </div>
                          <div className="flex-1 p-6 md:p-7 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                  <span className="px-3 py-1 bg-[hsl(var(--primary))]/80 text-primary-foreground text-xs font-medium rounded-full shadow">
                                    {item.categoryName}
                                  </span>
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                      item.status
                                    )}`}
                                  >
                                    {item.statusText}
                                  </span>
                                </div>

                                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-3 poppins-semibold">
                                  {item.title}
                                </h3>
                                <p className="text-muted-foreground mb-4 text-sm md:text-base leading-relaxed">
                                  {item.description}
                                </p>

                                <div className="flex items-center gap-4 md:gap-6 text-sm text-muted-foreground mb-4 flex-wrap">
                                  <span className="flex items-center">
                                    <Database className="h-4 w-4 mr-1" />
                                    {item.embeddings} embeddings
                                  </span>
                                  <span className="flex items-center">
                                    <FileText className="h-4 w-4 mr-1" />
                                    {item.chunks} chunks
                                  </span>
                                  <span className="flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    {item.usage} sử dụng
                                  </span>
                                  <span className="flex items-center">
                                    <FileIcon className="h-4 w-4 mr-1" />
                                    {formatFileSize(item.fileSize)}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {(item.tags || [])
                                    .slice(0, 4)
                                    .map((tag, index) => (
                                      <span
                                        key={index}
                                        className="px-2.5 py-1 bg-muted text-muted-foreground text-xs rounded-full"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <button
                                  onClick={() => fetchFileDetail(item.id)}
                                  disabled={loadingDetail}
                                  className="bg-[hsl(var(--primary))] text-primary-foreground py-2 px-4 rounded-lg hover:bg-[hsl(var(--primary)/0.85)] transition-colors text-sm disabled:opacity-50"
                                  style={{
                                    fontFamily: '"Arimo", sans-serif',
                                  }}
                                >
                                  {loadingDetail &&
                                  detailModal.fileId === item.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                      <Spinner size="sm" inline />
                                      Đang tải...
                                    </span>
                                  ) : (
                                    "Xem chi tiết"
                                  )}
                                </button>
                                <button
                                  onClick={() => refreshFileStatus(item.id)}
                                  disabled={refreshingId === item.id}
                                  className="px-3 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors text-sm disabled:opacity-50"
                                  title="Đồng bộ trạng thái với Gemini"
                                >
                                  {refreshingId === item.id ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <Spinner size="sm" inline />
                                      <span>Đang đồng bộ...</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-2">
                                      <RefreshCw className="h-4 w-4" />
                                      <span>Làm mới</span>
                                    </div>
                                  )}
                                </button>
                                {item.status === "PENDING" && (
                                  <button
                                    onClick={() =>
                                      refreshFileStatus(
                                        item.id,
                                        "Đã kích hoạt kiểm tra trạng thái!"
                                      )
                                    }
                                    disabled={refreshingId === item.id}
                                    className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm disabled:opacity-50"
                                    title="Kích hoạt index để tạo embeddings"
                                  >
                                    {refreshingId === item.id ? (
                                      <Spinner size="sm" inline />
                                    ) : (
                                      "Index"
                                    )}
                                  </button>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    className="p-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                                    title="Chỉnh sửa"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="p-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                                    title="Tải xuống"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeleteConfirmDialog({
                                        isOpen: true,
                                        fileId: item.id,
                                        fileName: item.title,
                                      })
                                    }
                                    className="p-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                                    title="Xóa file"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!loading && sortedData.length === 0 && (
            <div className="text-center py-16 md:py-20 bg-card border border-border rounded-xl mt-6">
              <Database className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-lg md:text-xl font-medium text-foreground mb-3 poppins-medium">
                Không tìm thấy dữ liệu
              </h3>
              <p className="text-muted-foreground text-sm md:text-base">
                Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
              </p>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <AIDataUploadModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              // Refresh data
              window.location.reload();
            }}
            authFetch={authFetch}
          />
        )}

        {/* File Detail Modal */}
        <Dialog
          open={detailModal.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDetailModal({ isOpen: false, fileId: null });
              setDetailData(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto p-0 bg-card text-card-foreground border border-border shadow-2xl">
            <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4 z-10">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Chi tiết tài liệu RAG
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Thông tin chi tiết về file đã upload và trạng thái xử lý
              </DialogDescription>
            </DialogHeader>

            {loadingDetail ? (
              <div className="p-6 flex items-center justify-center min-h-[200px]">
                <Spinner size="md" text="Đang tải chi tiết..." />
              </div>
            ) : detailData ? (
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Thông tin cơ bản
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tiêu đề</p>
                      <p className="text-base font-medium text-foreground">
                        {detailData.title}
                      </p>
                    </div>
                    {detailData.categoryName && (
                      <div>
                        <p className="text-sm text-muted-foreground">Môn học</p>
                        <p className="text-base font-medium text-foreground">
                          {detailData.categoryName}
                        </p>
                      </div>
                    )}
                    {detailData.displayName && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Tên file hiển thị
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {detailData.displayName}
                        </p>
                      </div>
                    )}
                    {detailData.fileName && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Tên file Gemini
                        </p>
                        <p className="text-xs font-mono text-foreground break-all">
                          {detailData.fileName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {detailData.description && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Mô tả
                    </h3>
                    <p className="text-base text-foreground whitespace-pre-wrap">
                      {detailData.description}
                    </p>
                  </div>
                )}

                {/* File Info */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <File className="h-5 w-5" />
                    Thông tin file
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailData.fileType && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Loại file
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {detailData.fileType}
                        </p>
                      </div>
                    )}
                    {detailData.fileSize && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Kích thước
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {formatFileSize(detailData.fileSize)}
                        </p>
                      </div>
                    )}
                    {detailData.uploadDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Ngày upload
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {new Date(detailData.uploadDate).toLocaleString(
                            "vi-VN"
                          )}
                        </p>
                      </div>
                    )}
                    {detailData.lastProcessed && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Lần xử lý cuối
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {new Date(detailData.lastProcessed).toLocaleString(
                            "vi-VN"
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & RAG Info */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Trạng thái & RAG
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Trạng thái
                      </p>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-1 ${getStatusColor(
                          detailData.status
                        )}`}
                      >
                        {detailData.statusText}
                      </span>
                    </div>
                    {detailData.embeddings !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Embeddings
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {detailData.embeddings.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    )}
                    {detailData.chunks !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Chunks</p>
                        <p className="text-base font-medium text-foreground">
                          {detailData.chunks.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    )}
                    {detailData.usage !== undefined && (
                      <div>
                        <p className="text-sm text-muted-foreground">Sử dụng</p>
                        <p className="text-base font-medium text-foreground">
                          {detailData.usage.toLocaleString("vi-VN")} lần
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {detailData.tags && detailData.tags.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {detailData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Không có dữ liệu để hiển thị
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmDialog.isOpen}
          onOpenChange={(open) =>
            setDeleteConfirmDialog({
              isOpen: open,
              fileId: deleteConfirmDialog.fileId,
              fileName: deleteConfirmDialog.fileName,
            })
          }
        >
          <AlertDialogContent className="max-w-[500px]">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle className="text-xl font-semibold">
                  Xác nhận xóa file
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-sm">
                Bạn có chắc chắn muốn xóa file{" "}
                <span className="font-semibold text-foreground">
                  {deleteConfirmDialog.fileName}
                </span>
                ? Hành động này sẽ xóa file khỏi cả Gemini File Search Store và
                cơ sở dữ liệu. Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button
                  variant="outline"
                  disabled={deleting}
                  className="px-4 py-2"
                >
                  Hủy
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={handleDeleteFile}
                  disabled={deleting}
                  className="px-4 py-2"
                >
                  {deleting ? (
                    <>
                      <Spinner size="sm" inline />
                      <span className="ml-2">Đang xóa...</span>
                    </>
                  ) : (
                    "Xóa"
                  )}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// AI Data Upload Modal Component
function AIDataUploadModal({
  onClose,
  onSuccess,
  authFetch,
}: {
  onClose: () => void;
  onSuccess: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
    categoryId: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>(
    []
  );
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Fetch subjects on mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await authFetch(getFullUrl("/api/v1/admin/subjects"));
        if (response.ok) {
          const data = await response.json();
          const subjectsList = Array.isArray(data)
            ? data.map(
                (s: { id: number; name: string; description?: string }) => ({
                  id: s.id,
                  name: s.name || `Subject ${s.id}`,
                })
              )
            : [];

          // If no subjects found, use default categories
          if (subjectsList.length === 0) {
            setSubjects([
              { id: 1, name: "Tài liệu" },
              { id: 2, name: "Video" },
              { id: 3, name: "Hình ảnh" },
              { id: 4, name: "Âm thanh" },
            ]);
          } else {
            setSubjects(subjectsList);
          }
        } else {
          // Fallback to default subjects if fetch fails
          setSubjects([
            { id: 1, name: "Tài liệu" },
            { id: 2, name: "Video" },
            { id: 3, name: "Hình ảnh" },
            { id: 4, name: "Âm thanh" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching subjects:", error);
        // Fallback to default subjects
        setSubjects([
          { id: 1, name: "Tài liệu" },
          { id: 2, name: "Video" },
          { id: 3, name: "Hình ảnh" },
          { id: 4, name: "Âm thanh" },
        ]);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [authFetch]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "video/mp4",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "audio/mpeg",
        "audio/mp3",
      ];
      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".mp4",
        ".jpg",
        ".jpeg",
        ".png",
        ".mp3",
      ];

      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (
        !allowedExtensions.includes(fileExtension) &&
        !allowedTypes.includes(file.type)
      ) {
        setError(
          "Loại file không được hỗ trợ. Hỗ trợ: PDF, DOC, DOCX, MP4, JPG, PNG, MP3"
        );
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setError("File quá lớn. Tối đa 100MB");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".mp4",
        ".jpg",
        ".jpeg",
        ".png",
        ".mp3",
      ];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        setError(
          "Loại file không được hỗ trợ. Hỗ trợ: PDF, DOC, DOCX, MP4, JPG, PNG, MP3"
        );
        return;
      }

      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("File quá lớn. Tối đa 100MB");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submit
    if (uploading) return;

    if (!selectedFile) {
      setError("Vui lòng chọn file để upload");
      return;
    }

    if (!formData.title.trim()) {
      setError("Vui lòng nhập tiêu đề");
      return;
    }

    if (!formData.categoryId) {
      setError("Vui lòng chọn danh mục");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Chuẩn hóa tên file để dễ search (chỉ normalize title, filename sẽ được backend xử lý)
      // Normalize title để đảm bảo dễ search trong Gemini
      const normalizedTitle = normalizeFileName(formData.title.trim());

      // Upload file using RAG upload endpoint
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      // Sử dụng title đã normalize để đảm bảo display_name trong Gemini dễ search
      uploadFormData.append("title", normalizedTitle);
      uploadFormData.append("description", formData.description || "");
      uploadFormData.append("subject_id", formData.categoryId); // Use categoryId as subject_id
      uploadFormData.append("tags", formData.tags || "");

      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.AI_DATA_UPLOAD),
        {
          method: "POST",
          body: uploadFormData, // Don't set Content-Type for FormData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Không thể upload file");
      }

      const data = await response.json();
      const uploadedItem = mapApiResponseToItem(data);

      // Trigger indexing process và check status
      try {
        const indexResponse = await authFetch(
          getFullUrl(API_ENDPOINTS.AI_DATA_INDEX(data.id)),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (indexResponse.ok) {
          const indexData = await indexResponse.json();
          const indexedItem = mapApiResponseToItem(indexData);

          // Kiểm tra status sau khi index
          if (indexedItem.status === "COMPLETED") {
            showToast({
              type: "success",
              title: "Thành công",
              message: `Upload và xử lý thành công! Tài liệu đã sẵn sàng sử dụng.`,
            });
          } else if (indexedItem.status === "INDEXING") {
            showToast({
              type: "success",
              title: "Upload thành công",
              message: `Tài liệu đang được xử lý và tạo embeddings. Trạng thái sẽ được cập nhật tự động sau 30 giây.`,
            });
          } else {
            showToast({
              type: "success",
              title: "Upload thành công",
              message: indexData.message || "Tài liệu đã được upload.",
            });
          }
        } else {
          // Nếu không thể trigger index, vẫn báo upload thành công
          // Nhưng status có thể là PENDING hoặc INDEXING
          if (uploadedItem.status === "COMPLETED") {
            showToast({
              type: "success",
              title: "Thành công",
              message: "Upload thành công! Tài liệu đã sẵn sàng sử dụng.",
            });
          } else {
            showToast({
              type: "success",
              title: "Upload thành công",
              message:
                "Upload thành công! Tài liệu sẽ được xử lý và index trong vài phút. Bạn có thể dùng nút 'Làm mới' để kiểm tra trạng thái.",
            });
          }
        }
      } catch (indexError) {
        console.warn("Failed to trigger indexing:", indexError);
        // Vẫn báo upload thành công
        if (uploadedItem.status === "COMPLETED") {
          showToast({
            type: "success",
            title: "Thành công",
            message: "Upload thành công! Tài liệu đã sẵn sàng sử dụng.",
          });
        } else {
          showToast({
            type: "success",
            title: "Upload thành công",
            message:
              "Upload thành công! Tài liệu sẽ được xử lý và index trong vài phút. Bạn có thể dùng nút 'Làm mới' để kiểm tra trạng thái.",
          });
        }
      }

      onSuccess();
    } catch (err) {
      console.error("Error uploading RAG material:", err);
      setError(err instanceof Error ? err.message : "Lỗi khi upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !uploading) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0 bg-card text-card-foreground border border-border shadow-2xl">
        <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4 z-10">
          <DialogTitle className="text-2xl font-bold text-foreground">
            Tải lên tài liệu RAG
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tài liệu sẽ được xử lý và tạo embeddings để phục vụ hệ thống RAG
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <FieldGroup>
            {/* File Upload Area */}
            <Field>
              <FieldLabel htmlFor="ai-file-upload">
                Chọn file <span className="text-destructive">*</span>
              </FieldLabel>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? "border-primary/50 bg-primary/10"
                    : selectedFile
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10"
                    : "border-border hover:border-muted-foreground/60"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  id="ai-file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.mp4,.jpg,.jpeg,.png,.mp3"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-foreground font-medium">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-sm text-destructive hover:text-destructive/80"
                    >
                      Xóa file
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Kéo thả file vào đây hoặc{" "}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-primary hover:underline"
                      >
                        click để chọn
                      </button>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Hỗ trợ: PDF, DOC, DOCX, MP4, JPG, PNG, MP3 (Tối đa 100MB)
                    </p>
                  </>
                )}
              </div>
            </Field>

            {/* Subject Selection */}
            <Field>
              <FieldLabel htmlFor="categoryId">
                Môn học / Danh mục <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                required
                value={formData.categoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, categoryId: value })
                }
                disabled={loadingSubjects}
              >
                <SelectTrigger
                  id="categoryId"
                  className="w-full disabled:opacity-50"
                >
                  <SelectValue
                    placeholder={
                      loadingSubjects
                        ? "Đang tải môn học..."
                        : "Chọn môn học..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject: { id: number; name: string }) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Tài liệu sẽ được gán cho môn học này để phục vụ RAG
              </p>
            </Field>

            {/* Title */}
            <Field>
              <FieldLabel htmlFor="title">
                Tiêu đề <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full"
                placeholder="Nhập tiêu đề..."
              />
            </Field>

            {/* Tags */}
            <Field>
              <FieldLabel htmlFor="tags">
                Thẻ{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (Tùy chọn - phân cách bằng dấu phẩy)
                </span>
              </FieldLabel>
              <Input
                type="text"
                id="tags"
                value={formData.tags || ""}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                className="w-full"
                placeholder="Ví dụ: toán học, đại số, giải tích"
              />
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel htmlFor="description">
                Mô tả{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  (Tùy chọn)
                </span>
              </FieldLabel>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full"
                placeholder="Nhập mô tả..."
              />
            </Field>
          </FieldGroup>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-3 mt-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <DialogClose asChild>
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Spinner size="sm" inline />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Tải lên</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
