"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, AlertCircle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase trả về hash fragment trong URL
        // Ví dụ: http://localhost:3000/auth/callback#access_token=...&type=signup&...
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);

        // Kiểm tra xem có hash fragment không
        if (!hash || hashParams.toString().length === 0) {
          // Nếu không có hash, kiểm tra query params (fallback)
          const type = searchParams.get("type");
          const token = searchParams.get("token");
          const error = searchParams.get("error");
          const errorDescription = searchParams.get("error_description");

          if (error) {
            setStatus("error");
            setMessage(
              errorDescription || "Đã xảy ra lỗi khi xác nhận email. Vui lòng thử lại."
            );
            return;
          }

          if (type === "signup" && token) {
            // Xử lý token từ query params (nếu có)
            setStatus("success");
            setMessage("Email đã được xác nhận thành công!");
            setTimeout(() => {
              router.push("/login");
            }, 2000);
            return;
          }

          // Không có thông tin xác nhận
          setStatus("error");
          setMessage("Không tìm thấy thông tin xác nhận. Vui lòng kiểm tra lại email.");
          return;
        }

        // Xử lý hash fragment từ Supabase
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");
        const error = hashParams.get("error");
        const errorDescription = hashParams.get("error_description");

        if (error) {
          setStatus("error");
          setMessage(
            errorDescription || "Đã xảy ra lỗi khi xác nhận email. Vui lòng thử lại."
          );
          return;
        }

        if (!accessToken) {
          setStatus("error");
          setMessage("Thông tin xác nhận không hợp lệ.");
          return;
        }

        // Xác nhận session với Supabase
        // Supabase client sẽ tự động xử lý hash fragment nếu detectSessionInUrl = true
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (sessionError) {
          console.error("Supabase session error:", sessionError);
          setStatus("error");
          setMessage("Không thể xác nhận phiên đăng nhập. Vui lòng thử lại.");
          return;
        }

        if (!sessionData.session || !sessionData.user) {
          setStatus("error");
          setMessage("Không thể lấy thông tin người dùng. Vui lòng thử lại.");
          return;
        }

        // Kiểm tra xem email đã được xác nhận chưa
        if (!sessionData.user.email_confirmed_at) {
          setStatus("error");
          setMessage("Email chưa được xác nhận. Vui lòng kiểm tra lại.");
          return;
        }

        const email = sessionData.user.email;

        if (!email) {
          setStatus("error");
          setMessage("Không tìm thấy email. Vui lòng thử lại.");
          return;
        }

        // Thành công - email đã được xác nhận
        setStatus("success");
        setMessage("Email đã được xác nhận thành công! Đang chuyển hướng...");

        // Xóa hash fragment khỏi URL
        window.history.replaceState(null, "", window.location.pathname);

        // Redirect đến trang đăng nhập sau 2 giây
        setTimeout(() => {
          router.push("/login?emailConfirmed=true");
        }, 2000);
      } catch (error) {
        console.error("Callback error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi không xác định. Vui lòng thử lại."
        );
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === "loading" && (
          <>
            <Spinner size="xl" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Đang xác nhận email...
            </h2>
            <p className="text-gray-600">
              Vui lòng đợi trong giây lát.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Xác nhận thành công!
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              Đang chuyển hướng đến trang đăng nhập...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Xác nhận thất bại
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => router.push("/register")}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Đăng ký lại
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

