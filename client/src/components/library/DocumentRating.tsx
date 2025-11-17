"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";

interface DocumentRatingProps {
  documentId: string | number;
  currentRating: number; // Average rating (0-5)
  ratingCount: number; // Number of ratings
  onRatingSubmit?: (rating: number) => void;
  authFetch?: (url: string, options?: RequestInit) => Promise<Response>;
  getFullUrl?: (endpoint: string) => string;
  API_ENDPOINTS?: {
    LIBRARY_DOCUMENT_RATE: (id: string) => string;
  };
  disabled?: boolean;
}

export default function DocumentRating({
  documentId,
  currentRating,
  ratingCount,
  onRatingSubmit,
  authFetch,
  getFullUrl,
  API_ENDPOINTS,
  disabled = false,
}: DocumentRatingProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const displayRating = hoveredRating ?? selectedRating ?? currentRating;
  const hasRating = currentRating > 0;

  const handleStarClick = async (rating: number) => {
    if (disabled || isSubmitting) return;

    setSelectedRating(rating);

    // If onRatingSubmit callback is provided, use it
    if (onRatingSubmit) {
      try {
        setIsSubmitting(true);
        await onRatingSubmit(rating);
        showToast({
          type: "success",
          title: "Thành công",
          message: `Bạn đã đánh giá ${rating} sao cho tài liệu này`,
        });
      } catch (error) {
        showToast({
          type: "error",
          title: "Lỗi",
          message: "Không thể gửi đánh giá. Vui lòng thử lại.",
        });
        setSelectedRating(null);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Otherwise, call API directly
    if (authFetch && getFullUrl && API_ENDPOINTS) {
      try {
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("rating", rating.toString());
        const response = await authFetch(
          getFullUrl(API_ENDPOINTS.LIBRARY_DOCUMENT_RATE(String(documentId))),
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          const data = await response.json();
          showToast({
            type: "success",
            title: "Thành công",
            message: `Bạn đã đánh giá ${rating} sao cho tài liệu này`,
          });
          // Optionally refresh the page or update parent component
          if (window.location) {
            window.location.reload();
          }
        } else {
          throw new Error("Failed to submit rating");
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Lỗi",
          message: "Không thể gửi đánh giá. Vui lòng thử lại.",
        });
        setSelectedRating(null);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => !disabled && !isSubmitting && setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              disabled={disabled || isSubmitting}
              className={cn(
                "transition-colors focus:outline-none",
                disabled || isSubmitting
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:scale-110"
              )}
              aria-label={`Đánh giá ${star} sao`}
            >
              <Star
                className={cn(
                  "w-6 h-6 transition-colors",
                  star <= displayRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-gray-200 text-gray-300"
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">
            {displayRating > 0 ? displayRating.toFixed(1) : "Chưa có đánh giá"}
          </span>
          {ratingCount > 0 && (
            <span className="text-gray-500">({ratingCount} đánh giá)</span>
          )}
        </div>
      </div>
      {!hasRating && !disabled && (
        <p className="text-xs text-gray-500">
          Nhấn vào sao để đánh giá tài liệu này
        </p>
      )}
    </div>
  );
}

