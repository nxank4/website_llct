'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter((p) => {
    if (totalPages <= 7) return true;
    if (p === 1 || p === totalPages) return true;
    if (Math.abs(p - currentPage) <= 1) return true;
    return false;
  });

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded border border-gray-700 hover:bg-gray-100 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Trước
      </button>
      {visiblePages.map((page, idx) => {
        const prevPage = visiblePages[idx - 1];
        const showEllipsis = prevPage && page - prevPage > 1;
        return (
          <div key={page} className="flex items-center gap-2">
            {showEllipsis && <span className="px-2">...</span>}
            <button
              onClick={() => onPageChange(page)}
              className={`px-4 py-2 rounded border ${
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-700 hover:bg-gray-100 hover:bg-gray-800'
              }`}
            >
              {page}
            </button>
          </div>
        );
      })}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded border border-gray-700 hover:bg-gray-100 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Sau →
      </button>
    </div>
  );
}

