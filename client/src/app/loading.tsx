"use client";

import Spinner from "@/components/ui/Spinner";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-6 text-center">
        <Spinner size="xl" />
        <p className="mt-3 text-sm text-muted-foreground">
          Đang tải, vui lòng chờ…
        </p>
      </div>
    </div>
  );
}
