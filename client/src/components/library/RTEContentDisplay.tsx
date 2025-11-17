"use client";

import { cn } from "@/lib/utils";

interface RTEContentDisplayProps {
  content: string | null | undefined;
  className?: string;
}

/**
 * Component để hiển thị nội dung Rich Text Editor (HTML)
 * Sử dụng dangerouslySetInnerHTML để render HTML content từ Tiptap
 */
export default function RTEContentDisplay({
  content,
  className,
}: RTEContentDisplayProps) {
  if (!content || !content.trim()) {
    return null;
  }

  return (
    <div
      className={cn(
        "prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none",
        "prose-headings:font-semibold",
        "prose-p:text-gray-700 prose-p:leading-relaxed",
        "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
        "prose-img:rounded-lg prose-img:shadow-md",
        "prose-ul:list-disc prose-ol:list-decimal",
        "prose-strong:font-semibold prose-strong:text-gray-900",
        "prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "prose-pre:bg-gray-900 prose-pre:text-gray-100",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

