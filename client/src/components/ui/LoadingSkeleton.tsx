"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  type?: "card" | "text" | "avatar" | "list";
  className?: string;
}

export default function LoadingSkeleton({
  type = "card",
  className = "",
}: LoadingSkeletonProps) {
  if (type === "card") {
    return (
      <div
        className={cn("bg-card rounded-lg shadow-md border border-border p-6", className)}
      >
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-3 w-1/2 mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (type === "avatar") {
    return (
      <div className={className}>
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return null;
}

