"use client";

import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WarningPageProps {
  title?: string;
  message?: string;
  warning?: string | null;
  showRetry?: boolean;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}

export default function WarningPage({
  title = "Cảnh báo",
  message,
  warning,
  showRetry = false,
  onRetry,
  backHref = "/",
  backLabel = "Về trang chủ",
}: WarningPageProps) {
  const warningMessage =
    message ||
    (typeof warning === "string" ? warning : "Có cảnh báo từ hệ thống.");

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {/* Emoticon Kawaii/Meme */}
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-amber-500/10 dark:bg-transparent dark:border dark:border-amber-400 flex items-center justify-center">
            <span
              aria-label="warning emoticon"
              role="img"
              className="text-2xl md:text-3xl text-amber-500 dark:text-amber-400 whitespace-nowrap"
            >
              (´･ω･`)
            </span>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{warningMessage}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showRetry && onRetry && (
              <Button onClick={onRetry} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử lại
              </Button>
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
