'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User,
  UserCheck
} from 'lucide-react';

export default function RegisterPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setIsLoading(false);
      return;
    }

    try {
      const success = await register({
        full_name: formData.full_name,
        email: formData.email,
        username: formData.username,
        password: formData.password
      });

      if (success) {
        setSuccess('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError('Đăng ký thất bại. Email hoặc tên đăng nhập có thể đã được sử dụng.');
      }
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-8">
      {/* Main Card Container */}
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-lg flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Image */}
        <div className="w-full lg:w-1/2 relative min-h-[400px] lg:min-h-[600px]">
          {/* Classroom Image Placeholder */}
          <div className="w-full h-full bg-gradient-to-br from-cyan-200 via-teal-200 to-blue-200 flex items-center justify-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-10 left-10 w-20 h-20 bg-white bg-opacity-30 rounded-full"></div>
            <div className="absolute top-32 right-16 w-16 h-16 bg-white bg-opacity-20 rounded-full"></div>
            <div className="absolute bottom-20 left-20 w-24 h-24 bg-white bg-opacity-25 rounded-full"></div>
            
            {/* Main content - Student Image Placeholder */}
            <div className="text-center z-10">
              {/* Student figure placeholder */}
              <div className="w-48 h-64 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
                <div className="w-32 h-40 bg-white bg-opacity-30 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-20 w-20 text-white" />
                </div>
                {/* Desk and notebook */}
                <div className="absolute bottom-4 left-4 w-16 h-8 bg-white bg-opacity-20 rounded"></div>
                <div className="absolute bottom-6 right-4 w-12 h-6 bg-white bg-opacity-15 rounded"></div>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Tham gia cùng chúng tôi
              </h2>
              <h3 className="text-2xl font-semibold text-white opacity-90">
                Soft Skills Department
              </h3>
              <p className="text-white opacity-80 mt-4 max-w-md">
                Tạo tài khoản để bắt đầu hành trình học tập và phát triển kỹ năng mềm
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-4 sm:p-8 overflow-y-auto max-h-screen">
          <div className="w-full max-w-md mx-auto">
            {/* Logo and Header */}
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center relative">
                  <span className="text-white font-bold text-lg">SS</span>
                  {/* Notification badge */}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">284</span>
                  </div>
                </div>
              </div>
              <h1 className="text-lg font-semibold text-gray-600 mb-2">Soft Skills Department</h1>
              <h2 className="text-2xl font-bold text-gray-900">
                XIN CHÀO ^v^
              </h2>
            </div>

            {/* Action Buttons */}
            <div className="flex mb-4 w-full max-w-[400px] mx-auto">
              <div className="flex w-full bg-[#92D6D6] rounded-[80px] p-2">
                <Link
                  href="/login"
                  className="flex-1 py-2 px-4 rounded-[80px] font-medium transition-colors text-center bg-transparent text-[#49BBBD]"
                >
                  Đăng nhập
                </Link>
                <button
                  type="button"
                  className="flex-1 py-2 px-4 rounded-[80px] font-medium transition-colors bg-[#49BBBD] text-white"
                  onClick={() => {
                    // Scroll to form or focus on first input
                    if (typeof window !== 'undefined') {
                      const form = document.querySelector('form');
                      if (form) {
                        form.scrollIntoView({ behavior: 'smooth' });
                        const firstInput = form.querySelector('input');
                        if (firstInput) firstInput.focus();
                      }
                    }
                  }}
                >
                  Đăng ký
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-center mb-6 leading-relaxed text-sm">
              Tạo tài khoản sinh viên để khám phá thư viện online và tham gia các khóa học của bộ môn
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Full Name Field */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Họ và tên
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full h-[54px] px-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>

              {/* Email Field */}
              <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full h-[54px] px-8 py-[18px] border border-[#49BBBD] rounded-[40px] focus:ring-2 focus:ring-[#49BBBD] focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                placeholder="Nhập địa chỉ email của bạn"
              />
            </div>

            {/* Username Field */}
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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500 transition-colors"
                  placeholder="Nhập lại mật khẩu của bạn"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            {/* Account Type Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Tài khoản sinh viên
                  </h3>
                  <p className="text-sm text-blue-700">
                    Tài khoản mới sẽ được tạo với quyền sinh viên. Liên hệ admin để nâng cấp thành giảng viên.
                  </p>
                </div>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Ghi nhớ tôi</span>
            </div>

            {/* Submit Button */}
            <div className="mt-6 mb-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#49BBBD] text-white py-3 px-6 rounded-[40px] hover:bg-[#3a9a9c] focus:ring-2 focus:ring-[#49BBBD] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-lg border-2 border-[#49BBBD]"
              >
                {isLoading ? 'Đang xử lý...' : 'ĐĂNG KÝ'}
              </button>
            </div>
          </form>

            {/* Features */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Tại sao chọn chúng tôi?</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div>✓ Thư viện tài liệu phong phú</div>
                <div>✓ AI Chatbot hỗ trợ 24/7</div>
                <div>✓ Hệ thống kiểm tra thông minh</div>
                <div>✓ Cộng đồng học tập năng động</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}