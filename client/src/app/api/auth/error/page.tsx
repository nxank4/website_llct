"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";

// Error messages mapping
const errorMessages: Record<string, string> = {
  Configuration: "Có lỗi cấu hình hệ thống. Vui lòng liên hệ quản trị viên.",
  AccessDenied: "Bạn không có quyền truy cập. Vui lòng liên hệ quản trị viên.",
  Verification: "Liên kết xác thực đã hết hạn hoặc không hợp lệ.",
  Default: "Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.",
  CredentialsSignin: "Email/tên đăng nhập hoặc mật khẩu không đúng.",
  OAuthSignin: "Lỗi đăng nhập với OAuth. Vui lòng thử lại.",
  OAuthCallback: "Lỗi xử lý callback từ OAuth. Vui lòng thử lại.",
  OAuthCreateAccount: "Không thể tạo tài khoản từ OAuth. Vui lòng thử lại.",
  EmailCreateAccount: "Không thể tạo tài khoản. Email có thể đã được sử dụng.",
  Callback: "Lỗi xử lý callback. Vui lòng thử lại.",
  OAuthAccountNotLinked:
    "Tài khoản này đã được liên kết với một email khác. Vui lòng đăng nhập bằng email gốc.",
  EmailSignin: "Lỗi gửi email đăng nhập. Vui lòng thử lại.",
  SessionRequired: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>

        {/* Error Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Lỗi xác thực
        </h1>

        {/* Error Message */}
        <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed">
          {errorMessage}
        </p>

        {/* Error Code (if available) */}
        {error && (
          <div className="mb-6 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-500 font-mono">
              Mã lỗi: <span className="font-semibold">{error}</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#125093] text-white rounded-lg font-semibold hover:bg-[#0d3d6f] transition-colors duration-300 hover:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại đăng nhập
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-300"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Nếu vấn đề vẫn tiếp tục, vui lòng{" "}
            <Link href="/contact" className="text-[#125093] hover:underline font-medium">
              liên hệ hỗ trợ
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#125093] mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}

