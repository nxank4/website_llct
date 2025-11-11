"use client";

import Spinner from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <Spinner size="xl" />
        <p className="mt-3 text-center text-sm text-gray-600">
          Đang tải, vui lòng chờ…
        </p>
      </div>
    </div>
  );
}