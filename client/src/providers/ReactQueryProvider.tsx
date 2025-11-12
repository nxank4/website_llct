"use client";

import { PropsWithChildren, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function ReactQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Retry logic: chỉ retry khi là lỗi mạng thực sự
            // Không retry cho các lỗi HTTP như 401, 404, 422, 500
            retry: (failureCount, error) => {
              // Không retry nếu đã thử quá 2 lần
              if (failureCount >= 2) {
                return false;
              }

              // Kiểm tra nếu là lỗi HTTP (có status code)
              if (error && typeof error === "object" && "status" in error) {
                const status = error.status as number;
                // Không retry cho các lỗi HTTP client/server (4xx, 5xx)
                // Chỉ retry cho lỗi mạng (TypeError: Failed to fetch)
                return false;
              }

              // Kiểm tra nếu là lỗi mạng (TypeError: Failed to fetch)
              if (
                error instanceof TypeError &&
                error.message?.toLowerCase().includes("fetch")
              ) {
                // Retry cho lỗi mạng thực sự
                return true;
              }

              // Kiểm tra nếu error có message chứa "network" hoặc "timeout"
              if (
                error &&
                typeof error === "object" &&
                "message" in error &&
                typeof error.message === "string"
              ) {
                const message = error.message.toLowerCase();
                if (
                  message.includes("network") ||
                  message.includes("timeout") ||
                  message.includes("failed to fetch")
                ) {
                  return true;
                }
              }

              // Mặc định: không retry
              return false;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}


