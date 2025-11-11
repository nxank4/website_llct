"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

/**
 * Component để xử lý Google OAuth callback ở bất kỳ trang nào
 * Component này sẽ chạy sau khi Google OAuth callback và NextAuth đã tạo session
 * Nó sẽ lấy token từ backend và lưu vào localStorage
 */
export default function GoogleOAuthHandler() {
  const { data: session, status } = useSession();
  const { isAuthenticated, user, syncFromToken } = useAuth();
  const router = useRouter();
  const oauthCallbackProcessed = useRef(false);

  // Reset flag khi session thay đổi
  useEffect(() => {
    if (status === "unauthenticated") {
      oauthCallbackProcessed.current = false;
    }
  }, [status]);

  useEffect(() => {
    const handleGoogleOAuthCallback = async () => {
      // Chỉ xử lý nếu:
      // 1. Session đã authenticated
      // 2. Có session và email
      // 3. Chưa có token trong localStorage
      // 4. Chưa được xử lý trước đó
      // 5. Chưa có user trong AuthContext
      // 6. Có image trong session (Google OAuth thường có avatar)
      const isGoogleOAuth = !!session?.user?.image;

      if (
        status === "authenticated" &&
        session?.user?.email &&
        isGoogleOAuth &&
        !oauthCallbackProcessed.current &&
        !isAuthenticated &&
        !user
      ) {
        const storedToken =
          typeof window !== "undefined"
            ? localStorage.getItem("access_token")
            : null;

        if (!storedToken) {
          oauthCallbackProcessed.current = true;
          console.log("GoogleOAuthHandler: Getting token from backend...", {
            email: session.user.email,
            name: session.user.name,
          });

          try {
            const API_BASE_URL =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            // Gọi backend API để lấy token
            const response = await fetch(
              `${API_BASE_URL}/api/v1/auth/oauth/google`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: session.user.email,
                  full_name: session.user.name || undefined,
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              console.log("GoogleOAuthHandler: Token received from backend", data);

              // Lưu token vào localStorage
              if (typeof window !== "undefined") {
                localStorage.setItem("access_token", data.access_token);
                if (data.refresh_token) {
                  localStorage.setItem("refresh_token", data.refresh_token);
                }
              }

              // Sync AuthContext với token
              if (data.access_token) {
                await syncFromToken(data.access_token);
                console.log("GoogleOAuthHandler: AuthContext synced successfully");

                // Force re-render bằng cách trigger một event
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("auth-state-changed"));
                }
              }
            } else {
              const errorData = await response.json().catch(() => ({}));
              console.error("GoogleOAuthHandler: Failed to get token from backend", {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
              });
              oauthCallbackProcessed.current = false;
            }
          } catch (error) {
            console.error("GoogleOAuthHandler: Error getting token from backend", error);
            oauthCallbackProcessed.current = false;
          }
        } else {
          console.log("GoogleOAuthHandler: Token already exists in localStorage");
        }
      }
    };

    handleGoogleOAuthCallback();
  }, [
    status,
    session,
    isAuthenticated,
    user,
    syncFromToken,
  ]);

  // Component này không render gì cả
  return null;
}

