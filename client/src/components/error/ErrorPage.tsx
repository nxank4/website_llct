"use client";

import Link from "next/link";
import { Home, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorPageProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  showRetry?: boolean;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}

export default function ErrorPage({
  title = "Có lỗi xảy ra!",
  message,
  error,
  showRetry = true,
  onRetry,
  backHref = "/",
  backLabel = "Về trang chủ",
}: ErrorPageProps) {
  const errorMessage =
    message ||
    (error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Đã xảy ra lỗi không xác định. Vui lòng thử lại.");

  const isAuthError =
    errorMessage.includes("No authentication token available") ||
    errorMessage.includes("Session expired") ||
    errorMessage.includes("authentication");

  // Different emoticons based on error type
  const getEmoticon = () => {
    if (isAuthError) {
      return "(╯°□°）╯︵ ┻━┻"; // Table flip for auth errors
    }
    const errorMsg = errorMessage.toLowerCase();
    if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
      return "(´；ω；`)"; // Crying face for network errors
    }
    if (errorMsg.includes("timeout") || errorMsg.includes("time")) {
      return "（；￣Д￣）"; // Sweating face for timeout
    }
    if (errorMsg.includes("server") || errorMsg.includes("500")) {
      return "(╥﹏╥)"; // Crying face for server errors
    }
    if (errorMsg.includes("not found") || errorMsg.includes("404")) {
      return "(´･_･`)"; // Confused face for not found
    }
    return "(；´Д｀)"; // Default sad face for general errors
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {/* Emoticon Kawaii/Meme */}
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-red-500/10 dark:bg-transparent dark:border dark:border-red-400 flex items-center justify-center">
            <span
              aria-label="error emoticon"
              role="img"
              className="text-2xl md:text-3xl text-red-500 dark:text-red-400 whitespace-nowrap"
            >
              {getEmoticon()}
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {isAuthError ? "Lỗi xác thực" : title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {isAuthError
              ? "Phiên đăng nhập của bạn đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại."
              : errorMessage}
          </p>

          {isAuthError && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Chi tiết: {errorMessage}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthError ? (
              <Link href="/login" className="w-full sm:w-auto">
                <Button className="w-full" variant="default">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Đăng nhập lại
                </Button>
              </Link>
            ) : (
              <>
                {showRetry && onRetry && (
                  <Button onClick={onRetry} variant="default">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Thử lại
                  </Button>
                )}
                {showRetry && !onRetry && (
                  <Button
                    onClick={() => window.location.reload()}
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Thử lại
                  </Button>
                )}
              </>
            )}

            <Link href={backHref} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                {backLabel}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

