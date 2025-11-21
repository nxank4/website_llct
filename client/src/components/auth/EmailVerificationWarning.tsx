"use client";

import { useState } from "react";
import { AlertCircle, X, Mail, CheckCircle } from "lucide-react";

interface EmailVerificationWarningProps {
  email: string;
  onDismiss?: () => void;
}

export default function EmailVerificationWarning({
  email,
  onDismiss,
}: EmailVerificationWarningProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendSuccess(false);
    
    try {
      // Gọi API route để gửi lại email xác nhận qua Supabase Auth
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Lỗi không xác định" }));
        throw new Error(errorData.error || "Lỗi khi gửi lại email xác nhận");
      }

      await response.json();
     
      setResendSuccess(true);
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Error resending verification email:", error);
      // Optionally show error message to user
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Email chưa được xác thực
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            Vui lòng kiểm tra email <strong>{email}</strong> và click vào link xác thực để kích hoạt tài khoản.
          </p>
          
          {resendSuccess && (
            <div className="mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
              <CheckCircle className="h-4 w-4" />
              <span>Email xác thực đã được gửi lại!</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="h-4 w-4" />
              <span>{isResending ? "Đang gửi..." : "Gửi lại email xác thực"}</span>
            </button>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 flex-shrink-0 text-yellow-400 hover:text-yellow-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

