'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Shield, 
  GraduationCap,
  BookOpen,
  BarChart3,
  TrendingUp
} from 'lucide-react';

export default function UserMenu() {
  const { user, logout, hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getRoleIcon = () => {
    if (hasRole('admin')) return <Shield className="h-4 w-4" />;
    if (hasRole('instructor')) return <GraduationCap className="h-4 w-4" />;
    return <BookOpen className="h-4 w-4" />;
  };

  const getRoleText = () => {
    if (hasRole('admin')) return 'Quản trị viên';
    if (hasRole('instructor')) return 'Giảng viên';
    return 'Sinh viên';
  };

  const getRoleColor = () => {
    if (hasRole('admin')) return 'text-red-600 bg-red-100';
    if (hasRole('instructor')) return 'text-blue-600 bg-blue-100';
    return 'text-green-600 bg-green-100';
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-gray-600" />
          </div>
          <div className="text-left">
            <div className="text-[20px] text-white leading-[30px]" style={{fontFamily: 'SVN-Gilroy'}}>{user.full_name}</div>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user.email}
                </div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor()}`}>
                  {getRoleIcon()}
                  <span className="ml-1">{getRoleText()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/profile');
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="h-4 w-4 mr-3" />
              Thông tin cá nhân
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/my-results');
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <BarChart3 className="h-4 w-4 mr-3" />
              Kết quả học tập
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/settings');
              }}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="h-4 w-4 mr-3" />
              Cài đặt
            </button>

            {hasRole('admin') && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/dashboard');
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Shield className="h-4 w-4 mr-3" />
                Quản trị hệ thống
              </button>
            )}

            {hasRole('instructor') && (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/instructor');
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <GraduationCap className="h-4 w-4 mr-3" />
                  Bảng điều khiển giảng viên
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/instructor/stats');
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <TrendingUp className="h-4 w-4 mr-3" />
                  Thống kê giảng dạy
                </button>
              </>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
