"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <span
            aria-label="kawaii sad"
            role="img"
            className="text-xl text-red-600 whitespace-nowrap"
          >
            (；´Д｀)
          </span>
        </div>
        <h2 className="text-3xl font-bold text-red-600 mb-4">Có lỗi xảy ra!</h2>
        <p className="text-gray-600 mb-6">
          {error.message || "Đã xảy ra lỗi không xác định. Vui lòng thử lại."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
