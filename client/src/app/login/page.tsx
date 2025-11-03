'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User
} from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    emailOrUsername: 'admin@demo.com',
    password: 'demo123'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { login, user } = useAuth();

  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    console.log('Login attempt with:', { emailOrUsername: formData.emailOrUsername, password: formData.password });

    try {
      const success = await login(formData.emailOrUsername, formData.password);
      
      if (success) {
        setSuccess('Đăng nhập thành công!');
        
        // Redirect dựa trên role
        setTimeout(() => {
          if (user?.roles?.includes('admin')) {
            router.push('/admin');
          } else if (user?.roles?.includes('instructor')) {
            router.push('/instructor');
          } else {
            router.push('/');
          }
        }, 1000);
      } else {
        setError('Email/tên đăng nhập hoặc mật khẩu không đúng');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-[37.5px_245px]">
      {/* Main Card Container */}
      <div className="w-full max-w-[1430px] h-[825px] bg-white rounded-3xl shadow-lg flex overflow-hidden">
        {/* Left Side - Image */}
        <div className="w-1/2 relative">
          {/* Classroom Image Placeholder */}
          <div className="w-full h-full bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-10 left-10 w-20 h-20 bg-white bg-opacity-30 rounded-full"></div>
            <div className="absolute top-32 right-16 w-16 h-16 bg-white bg-opacity-20 rounded-full"></div>
            <div className="absolute bottom-20 left-20 w-24 h-24 bg-white bg-opacity-25 rounded-full"></div>
            
            {/* Main content - Student Image Placeholder */}
            <div className="text-center z-10">
              {/* Student figure placeholder */}
              <div className="w-48 h-64 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
                <div className="w-32 h-40 bg-white bg-opacity-30 rounded-lg flex items-center justify-center">
                  <User className="h-20 w-20 text-white" />
                </div>
                {/* Desk and notebook */}
                <div className="absolute bottom-4 left-4 w-16 h-8 bg-white bg-opacity-20 rounded"></div>
                <div className="absolute bottom-6 right-4 w-12 h-6 bg-white bg-opacity-15 rounded"></div>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Chào mừng đến với
              </h2>
              <h3 className="text-2xl font-semibold text-white opacity-90">
                Soft Skills Department
              </h3>
              <p className="text-white opacity-80 mt-4 max-w-md">
                Khám phá thư viện online và nâng cao kỹ năng mềm của bạn
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Logo and Header */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center relative">
                  <span className="text-white font-bold text-2xl">SS</span>
                  {/* Notification badge */}
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">284</span>
                  </div>
                </div>
              </div>
              <h1 className="text-lg font-semibold text-gray-600 mb-4">Soft Skills Department</h1>
              <h2 className="text-3xl font-bold text-gray-900">
                {isLogin ? 'MỪNG BẠN TRỞ LẠI ^0^' : 'XIN CHÀO ^v^'}
              </h2>
            </div>

            {/* Action Buttons */}
            <div className="flex mb-6 w-full max-w-[462px] mx-auto">
              <div className="flex w-full bg-[#92D6D6] rounded-[80px] p-3">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 px-4 rounded-[80px] font-medium transition-colors ${
                    isLogin 
                      ? 'bg-[#49BBBD] text-white' 
                      : 'bg-transparent text-[#49BBBD]'
                  }`}
                >
                  Đăng nhập
                </button>
                <Link
                  href="/register"
                  className={`flex-1 py-3 px-4 rounded-[80px] font-medium transition-colors text-center ${
                    !isLogin 
                      ? 'bg-[#49BBBD] text-white' 
                      : 'bg-transparent text-[#49BBBD]'
                  }`}
                >
                  Đăng ký
                </Link>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-center mb-8 leading-relaxed text-sm">
              Đăng nhập ngay để khám phá xem thư viện online của bộ môn Kỹ năng mềm có cập nhập gì mới nhất nhé
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success Message */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                  {success}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Email/Username Field */}
              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-2">
                  Email hoặc tên đăng nhập
                </label>
                <div className="relative">
                  <input
                    id="emailOrUsername"
                    name="emailOrUsername"
                    type="text"
                    required
                    value={formData.emailOrUsername}
                    onChange={handleInputChange}
                    className="w-full h-[54px] px-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                    placeholder="Nhập email hoặc tên đăng nhập"
                  />
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Username Field (only for registration) */}
              {!isLogin && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Tên đăng nhập
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full h-[54px] px-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                    placeholder="Nhập tên người dùng của bạn"
                  />
                </div>
              )}

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-[54px] px-8 py-[18px] pr-12 border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                    placeholder="Nhập mật khẩu của bạn"
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">Ghi nhớ tôi</span>
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-cyan-600 hover:text-cyan-500 font-medium transition-colors"
                >
                  Quên mật khẩu ?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#49BBBD] text-white py-3 px-4 rounded-[40px] hover:bg-[#3a9a9c] focus:ring-2 focus:ring-[#49BBBD] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                {isLoading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Tài khoản demo:</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div>Admin: admin@demo.com hoặc admin / demo123</div>
                <div>Giảng viên: instructor@demo.com hoặc instructor / demo123</div>
                <div>Sinh viên: student@demo.com hoặc student / demo123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}