"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { register, type RegisterData } from "@/services/auth";
import { getErrorReportLink } from "@/lib/api";
import EmailVerificationWarning from "@/components/EmailVerificationWarning";
import { useRouter as useNextRouter } from "next/navigation";

type InitialTab = "login" | "register";

export default function AuthPage({
  initialTab = "login",
}: {
  initialTab?: InitialTab;
}) {
  const [activeTab, setActiveTab] = useState<InitialTab>(initialTab);
  const isLogin = activeTab === "login";

  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = !!session;
  const user = session?.user;

  const [loginData, setLoginData] = useState({
    emailOrUsername: "",
    password: "",
  });
  const [registerData, setRegisterData] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showPasswordReg, setShowPasswordReg] = useState(false);
  const [showConfirmPasswordReg, setShowConfirmPasswordReg] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [errorObject, setErrorObject] = useState<Error | null>(null);
  const [success, setSuccess] = useState<string>("");
  const [showVerificationWarning, setShowVerificationWarning] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string>("");
  const [isUserError, setIsUserError] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setErrorObject(null);
    setSuccess("");
    setIsUserError(false);

    try {
      if (isLogin) {
        // Use NextAuth signIn with credentials provider
        const result = await signIn("credentials", {
          email: loginData.emailOrUsername,
          password: loginData.password,
          redirect: false,
        });

        if (result?.error) {
          // Luôn gọi backend API để kiểm tra lỗi chi tiết
          let errorMsg = "Email hoặc mật khẩu không đúng";
          let isEmailNotVerified = false;

          try {
            const API_BASE_URL =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const formData = new URLSearchParams();
            formData.append("username", loginData.emailOrUsername);
            formData.append("password", loginData.password);

            const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString(),
            });

            if (response.status === 403) {
              // Email chưa được verify
              const errorData = await response
                .json()
                .catch(() => ({ detail: "Email chưa được xác thực" }));
              errorMsg =
                errorData.detail ||
                "Email chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập.";
              isEmailNotVerified = true;
            } else if (response.status === 401) {
              // Invalid credentials
              const errorData = await response
                .json()
                .catch(() => ({ detail: "Email hoặc mật khẩu không đúng" }));
              errorMsg =
                errorData.detail ||
                "Email hoặc mật khẩu không đúng. Nếu bạn chưa có tài khoản, vui lòng đăng ký mới.";
            } else {
              // Lỗi khác
              const errorData = await response
                .json()
                .catch(() => ({ detail: "Đã xảy ra lỗi khi đăng nhập" }));
              errorMsg =
                errorData.detail ||
                "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.";
            }
          } catch (fetchError) {
            // Nếu backend call fails, kiểm tra lỗi từ NextAuth
            console.error(
              "Error checking backend for email verification:",
              fetchError
            );

            // Kiểm tra lỗi từ NextAuth
            if (
              result.error === "CredentialsSignin" ||
              result.error?.includes("EMAIL_NOT_VERIFIED") ||
              result.error?.includes("Email not confirmed") ||
              result.error?.includes("email not confirmed")
            ) {
              errorMsg =
                "Email chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập.";
              isEmailNotVerified = true;
            } else {
              errorMsg =
                "Email hoặc mật khẩu không đúng. Nếu bạn chưa có tài khoản, vui lòng đăng ký mới.";
            }
          }

          setError(errorMsg);
          setErrorObject(new Error(errorMsg));
          // Đánh dấu đây là lỗi do user (sai password, email chưa xác thực)
          setIsUserError(true);

          if (isEmailNotVerified) {
            setShowVerificationWarning(true);
            setUnverifiedEmail(loginData.emailOrUsername);
          }
        } else if (result?.ok) {
          // Get token from backend API directly (NextAuth authorize runs on server, can't access localStorage)
          try {
            const API_BASE_URL =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const formData = new URLSearchParams();
            formData.append("username", loginData.emailOrUsername);
            formData.append("password", loginData.password);

            const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString(),
            });

            if (response.ok) {
              const data = await response.json();

              // NextAuth handles session automatically
              // No need to sync AuthContext or save to localStorage
            } else if (response.status === 403) {
              // Email chưa được verify
              const errorData = await response
                .json()
                .catch(() => ({ detail: "Email chưa được xác thực" }));
              const errorMessage =
                errorData.detail ||
                "Email chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản trước khi đăng nhập.";
              setError(errorMessage);
              setErrorObject(new Error(errorMessage));
              setIsUserError(true); // Lỗi do user
              setShowVerificationWarning(true);
              setUnverifiedEmail(loginData.emailOrUsername);
            } else if (response.status === 401) {
              const errorMsg = "Email/tên đăng nhập hoặc mật khẩu không đúng";
              setError(errorMsg);
              setErrorObject(new Error(errorMsg));
              setIsUserError(true); // Lỗi do user
            }
          } catch (error) {
            console.error("Error fetching token:", error);
            // NextAuth handles session automatically
          }

          setSuccess("Đăng nhập thành công!");
          setTimeout(() => {
            router.push("/");
            router.refresh();
          }, 800);
        }
      } else {
        // Registration - call backend API
        if (registerData.password !== registerData.confirmPassword) {
          const errorMsg = "Mật khẩu xác nhận không khớp";
          setError(errorMsg);
          setErrorObject(new Error(errorMsg));
          setIsLoading(false);
          return;
        }
        if (registerData.password.length < 6) {
          const errorMsg = "Mật khẩu phải có ít nhất 6 ký tự";
          setError(errorMsg);
          setErrorObject(new Error(errorMsg));
          setIsLoading(false);
          return;
        }

        try {
          const registerPayload: RegisterData = {
            email: registerData.email,
            username: registerData.username,
            full_name: registerData.full_name,
            password: registerData.password,
            is_active: true,
            is_instructor: false,
          };

          const result = await register(registerPayload);

          // Show success message from API response
          setSuccess(
            result.message ||
              "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản."
          );

          // Redirect to login page after 2 seconds
          setTimeout(() => {
            setActiveTab("login");
            setLoginData({
              emailOrUsername: registerData.email,
              password: "",
            });
            // Redirect to login page
            router.push("/login");
          }, 2000);
        } catch (err) {
          console.error("Register error:", err);
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Đăng ký thất bại. Vui lòng thử lại.";

          // Kiểm tra xem có phải lỗi do user không (email đã tồn tại, validation, etc.)
          const isUserErrorMsg =
            errorMessage.includes("đã được sử dụng") ||
            errorMessage.includes("đã tồn tại") ||
            errorMessage.includes("không hợp lệ") ||
            errorMessage.includes("không khớp") ||
            errorMessage.includes("phải có ít nhất");

          setError(errorMessage);
          setIsUserError(isUserErrorMsg);
          if (err instanceof Error) {
            setErrorObject(err);
          }
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Lỗi kết nối. Vui lòng thử lại.");
      setIsUserError(false); // Lỗi kết nối là lỗi code, không phải lỗi user
      if (err instanceof Error) {
        setErrorObject(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/", redirect: true });
    } catch (err) {
      console.error("Google login error:", err);
      setError("Lỗi đăng nhập với Google. Vui lòng thử lại.");
      if (err instanceof Error) {
        setErrorObject(err);
      }
      setIsLoading(false);
    }
  };

  // Google OAuth được xử lý tự động bởi NextAuth.js
  // Không cần code thủ công ở đây - NextAuth.js sẽ tự động:
  // 1. Redirect sang Google
  // 2. Nhận callback từ Google
  // 3. Tạo user trong Supabase Auth (qua SupabaseAdapter)
  // 4. Lưu session vào cookie

  // Redirect nếu đã authenticated và có user
  // Chỉ redirect nếu đang ở trang login/register và đã đăng nhập thành công
  useEffect(() => {
    if (isAuthenticated && user && status === "authenticated") {
      // Đã đăng nhập thành công, redirect về trang chủ
      // Chỉ redirect nếu đang ở trang login/register
      const currentPath = window.location.pathname;
      if (currentPath === "/login" || currentPath === "/register") {
        router.push("/");
      }
      return;
    }
  }, [isAuthenticated, user, router, status]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl rounded-3xl shadow-lg flex flex-col overflow-hidden">
        <div className="w-full flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Image
                  src="/logo-blue.png"
                  alt="Logo"
                  width={200}
                  height={56}
                  className="h-14 w-auto object-contain"
                  unoptimized
                />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                {isLogin ? "MỪNG BẠN TRỞ LẠI ^0^" : "XIN CHÀO ^v^"}
              </h2>
            </div>

            <p className="text-gray-600 text-center mb-8 leading-relaxed text-sm">
              {isLogin
                ? "Đăng nhập ngay để khám phá xem thư viện online của bộ môn Kỹ năng mềm có cập nhập gì mới nhất nhé"
                : "Tạo tài khoản sinh viên để khám phá thư viện online và tham gia các khóa học của bộ môn"}
            </p>

            <div className="flex mb-6 w-full max-w-[462px] mx-auto">
              <div className="flex w-full bg-gray-100 dark:bg-gray-800 rounded-[80px] p-2">
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 py-3 px-4 rounded-[80px] font-semibold transition-colors ${
                    isLogin
                      ? "bg-[#49BBBD] text-white hover:bg-[#3aa8ad] shadow-sm"
                      : "bg-transparent text-blue-700 dark:text-blue-300 hover:bg-white/60 dark:hover:bg-white/5"
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => setActiveTab("register")}
                  className={`flex-1 py-3 px-4 rounded-[80px] font-semibold transition-colors ${
                    !isLogin
                      ? "bg-[#49BBBD] text-white hover:bg-[#3aa8ad] shadow-sm"
                      : "bg-transparent text-blue-700 dark:text-blue-300 hover:bg-white/60 dark:hover:bg-white/5"
                  }`}
                >
                  Đăng ký
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              method="post"
              action="#"
              className="space-y-6"
            >
              {showVerificationWarning && unverifiedEmail && (
                <EmailVerificationWarning
                  email={unverifiedEmail}
                  onDismiss={() => setShowVerificationWarning(false)}
                />
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                  {success}
                </div>
              )}
              {/* Chỉ hiển thị error message nếu không có EmailVerificationWarning */}
              {error && !showVerificationWarning && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium mb-1">Lỗi xảy ra</p>
                      <p className="mb-2">{error}</p>
                      {/* Chỉ hiển thị nút báo cáo lỗi cho lỗi code/logic, không phải lỗi do user */}
                      {!isUserError && (
                        <a
                          href={
                            errorObject
                              ? getErrorReportLink(errorObject, {
                                  action: isLogin ? "login" : "register",
                                })
                              : getErrorReportLink(new Error(error), {
                                  action: isLogin ? "login" : "register",
                                  errorMessage: error,
                                })
                          }
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 underline transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Báo cáo lỗi đến nhà phát triển
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isLogin ? (
                <>
                  <div>
                    <label
                      htmlFor="emailOrUsername"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Email hoặc tên đăng nhập
                    </label>
                    <div className="relative">
                      <input
                        id="emailOrUsername"
                        name="email"
                        type="email"
                        required
                        value={loginData.emailOrUsername}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            emailOrUsername: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="username email"
                        placeholder="Nhập email hoặc tên đăng nhập"
                      />
                      <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="password_login"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="password_login"
                        name="password"
                        type={showPasswordLogin ? "text" : "password"}
                        required
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            password: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-12 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="current-password"
                        placeholder="Nhập mật khẩu của bạn"
                      />
                      <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswordLogin ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="full_name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Họ và tên
                    </label>
                    <div className="relative">
                      <input
                        id="full_name"
                        name="full_name"
                        type="text"
                        required
                        value={registerData.full_name}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            full_name: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="name"
                        placeholder="Nhập họ và tên của bạn"
                      />
                      <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Địa chỉ email
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={registerData.email}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            email: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="email"
                        placeholder="Nhập địa chỉ email của bạn"
                      />
                      <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Tên đăng nhập
                    </label>
                    <div className="relative">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={registerData.username}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            username: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="username"
                        placeholder="Nhập tên người dùng của bạn"
                      />
                      <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="password_reg"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="password_reg"
                        name="password"
                        type={showPasswordReg ? "text" : "password"}
                        required
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            password: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-12 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="new-password"
                        placeholder="Nhập mật khẩu của bạn"
                      />
                      <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => setShowPasswordReg(!showPasswordReg)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showPasswordReg ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPasswordReg ? "text" : "password"}
                        required
                        value={registerData.confirmPassword}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-12 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="new-password"
                        placeholder="Nhập lại mật khẩu của bạn"
                      />
                      <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPasswordReg(!showConfirmPasswordReg)
                        }
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      >
                        {showConfirmPasswordReg ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#49BBBD] text-white py-3 px-6 rounded-[40px] hover:bg-[#3a9a9c] focus:ring-2 focus:ring-[#49BBBD] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-lg border-2 border-[#49BBBD]"
              >
                {isLoading
                  ? "Đang xử lý..."
                  : isLogin
                  ? "Đăng nhập"
                  : "Đăng ký"}
              </button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Hoặc</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="mt-4 w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-[40px] hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isLogin ? "Đăng nhập với Google" : "Đăng ký với Google"}
              </button>
            </div>

            {!isLogin && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Tài khoản sinh viên
                    </h3>
                    <p className="text-sm text-blue-700">
                      Tài khoản mới sẽ được tạo với quyền sinh viên. Liên hệ
                      admin để nâng cấp thành giảng viên.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
