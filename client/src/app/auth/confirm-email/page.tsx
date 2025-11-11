"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import EmailVerificationWarning from "@/components/EmailVerificationWarning";

export default function ConfirmEmailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Redirect if already authenticated and email confirmed
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.isEmailConfirmed || session.user.emailVerified) {
        // Email already confirmed, redirect to home
        router.push("/");
      }
    } else if (status === "unauthenticated") {
      // Not authenticated, redirect to login
      router.push("/login");
    }
  }, [status, session, router]);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" />
          <p className="mt-4 text-gray-600">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  // Show nothing if redirecting
  if (status === "unauthenticated" || (status === "authenticated" && (session?.user?.isEmailConfirmed || session?.user?.emailVerified))) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 rounded-full p-4">
              <Mail className="h-12 w-12 text-yellow-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Xác nhận Email
          </h1>
          <p className="text-gray-600">
            Tài khoản của bạn chưa được kích hoạt
          </p>
        </div>

        {session?.user?.email && (
          <EmailVerificationWarning
            email={session.user.email}
            onDismiss={() => {
              // Optional: allow user to dismiss
            }}
          />
        )}

        <div className="mt-6 space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Vui lòng kiểm tra email <strong>{session?.user?.email}</strong> và
                  click vào link xác thực để kích hoạt tài khoản.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Quay lại trang đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

