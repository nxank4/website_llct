"use client";

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
        className={`bg-white rounded-lg shadow-md p-6 animate-pulse ${className}`}
      >
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (type === "text") {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (type === "avatar") {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return null;
}

