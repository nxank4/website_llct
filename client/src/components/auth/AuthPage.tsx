"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Mail, Lock, User, UserCheck } from "lucide-react";

type InitialTab = "login" | "register";

export default function AuthPage({
  initialTab = "login",
}: {
  initialTab?: InitialTab;
}) {
  const [activeTab, setActiveTab] = useState<InitialTab>(initialTab);
  const isLogin = activeTab === "login";

  const router = useRouter();
  const { login, register, user } = useAuth();

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
  const [success, setSuccess] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isLogin) {
        const ok = await login(loginData.emailOrUsername, loginData.password);
        if (ok) {
          setSuccess("Đăng nhập thành công!");
          setTimeout(() => {
            if (user?.roles?.includes("admin")) router.push("/admin");
            else if (user?.roles?.includes("instructor"))
              router.push("/instructor");
            else router.push("/");
          }, 800);
        } else setError("Email/tên đăng nhập hoặc mật khẩu không đúng");
      } else {
        if (registerData.password !== registerData.confirmPassword) {
          setError("Mật khẩu xác nhận không khớp");
          return;
        }
        if (registerData.password.length < 6) {
          setError("Mật khẩu phải có ít nhất 6 ký tự");
          return;
        }
        const ok = await register({
          full_name: registerData.full_name,
          email: registerData.email,
          username: registerData.username,
          password: registerData.password,
        });
        if (ok) {
          setSuccess("Đăng ký thành công! Đang chuyển hướng...");
          setTimeout(() => router.push("/login"), 1200);
        } else {
          setError(
            "Đăng ký thất bại. Email hoặc tên đăng nhập có thể đã được sử dụng."
          );
        }
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

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
                />
              </div>
              <h1 className="text-lg font-semibold text-gray-600 mb-4">
                Soft Skills Department
              </h1>
              <h2 className="text-3xl font-bold text-gray-900">
                {isLogin ? "MỪNG BẠN TRỞ LẠI ^0^" : "XIN CHÀO ^v^"}
              </h2>
            </div>

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

            <p className="text-gray-600 text-center mb-8 leading-relaxed text-sm">
              {isLogin
                ? "Đăng nhập ngay để khám phá xem thư viện online của bộ môn Kỹ năng mềm có cập nhập gì mới nhất nhé"
                : "Tạo tài khoản sinh viên để khám phá thư viện online và tham gia các khóa học của bộ môn"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
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
                        name="emailOrUsername"
                        type="text"
                        required
                        value={loginData.emailOrUsername}
                        onChange={(e) =>
                          setLoginData({
                            ...loginData,
                            emailOrUsername: e.target.value,
                          })
                        }
                        className="w-full h-[54px] pl-12 pr-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                        autoComplete="username"
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
                        name="password_login"
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
                        name="password_reg"
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
