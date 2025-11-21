"use client";

import { useState, ReactNode } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  ArrowUpDown,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: unknown, item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => ReactNode;
  emptyMessage?: string;
  className?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = "Tìm kiếm...",
  pagination = true,
  pageSize = 10,
  sortable = true,
  onSort,
  onRowClick,
  actions,
  emptyMessage = "Không có dữ liệu",
  className = "",
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter data based on search term
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;

    return columns.some((column) => {
      const value =
        typeof column.key === "string"
          ? item[column.key]
          : item[column.key as keyof T];
      return String(value).toLowerCase().includes(searchTerm.toLowerCase());
    });
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0;

    const aValue = a[sortKey];
    const bValue = b[sortKey];

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Convert to comparable values
    const aStr = String(aValue);
    const bStr = String(bValue);

    if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
    if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = pagination
    ? sortedData.slice(startIndex, startIndex + pageSize)
    : sortedData;

  const handleSort = (key: string) => {
    if (!sortable) return;

    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }

    onSort?.(key, sortDirection);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getValue = (item: T, key: string | keyof T) => {
    if (typeof key === "string") {
      return item[key];
    }
    return item[key as keyof T];
  };

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}
      >
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      {(searchable || actions) && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-64"
                />
              </div>
            )}

            {actions && (
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <Download className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-700">
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={cn(
                    column.align === "center"
                      ? "text-center"
                      : column.align === "right"
                      ? "text-right"
                      : "text-left"
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {sortable && column.sortable !== false && (
                      <button
                        onClick={() => handleSort(column.key as string)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && (
                <TableHead className="text-right">Thao tác</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    "hover:bg-gray-50 dark:hover:bg-gray-700",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={colIndex}
                      className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100",
                        column.align === "center"
                          ? "text-center"
                          : column.align === "right"
                          ? "text-right"
                          : "text-left"
                      )}
                    >
                      {column.render
                        ? column.render(getValue(item, column.key), item)
                        : String(getValue(item, column.key) ?? "")}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {actions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Hiển thị {startIndex + 1} đến{" "}
              {Math.min(startIndex + pageSize, sortedData.length)} trong{" "}
              {sortedData.length} kết quả
            </div>

            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Trang đầu"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                </PaginationItem>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage - 1);
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage =
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  
                  if (!showPage) {
                    // Show ellipsis
                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  }

                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Trang cuối"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
