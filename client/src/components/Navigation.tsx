'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  MessageCircle, 
  FileText, 
  Users, 
  MessageSquare, 
  Settings,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserMenu from './UserMenu';
import NotificationsBell from './NotificationsBell';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, hasRole } = useAuth();


  const menuItems = [
    { href: '/library', label: 'Thư viện', icon: BookOpen },
    { href: '/chatbot', label: 'Chatbot', icon: MessageCircle },
    { href: '/exercises', label: 'Kiểm tra', icon: FileText },
  ];

  // Add instructor-specific menu items
  if (hasRole('instructor')) {
    menuItems.push(
      { href: '/instructor/courses', label: 'Khóa học của tôi', icon: BookOpen },
      { href: '/instructor/exercises', label: 'Bài tập', icon: FileText },
      { href: '/instructor/students', label: 'Sinh viên', icon: Users }
    );
  }

  // Add admin menu only for admins
  if (hasRole('admin')) {
    menuItems.push({ href: '/admin/dashboard', label: 'Quản trị', icon: Settings });
  }

  return (
    <nav className="bg-[#125093] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center">
                <span className="text-[#125093] font-bold text-2xl">SS</span>
              </div>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-8">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white px-5 py-5 rounded-full text-[22px] font-semibold transition-colors"
                  style={{fontFamily: 'SVN-Gilroy', letterSpacing: '0.44px'}}
                >
                  {item.label}
                </Link>
              );
            })}
            
            
            {/* User Menu or Login Button */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <NotificationsBell />
                <UserMenu />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Mobile Auth Buttons */}
            {!isAuthenticated && (
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href="/login"
                  className="flex items-center justify-center text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="flex items-center justify-center bg-blue-600 text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 mx-3 mt-2"
                  onClick={() => setIsOpen(false)}
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
