'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart3, 
  Brain,
  BookOpen,
  FileText,
  MessageSquare,
  Edit,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const sidebarItems = [
    { id: 'dashboard', title: 'Bảng tổng kết', icon: BarChart3, color: '#125093', href: '/admin/dashboard', active: true },
    { id: 'ai-data', title: 'Dữ liệu AI', icon: Brain, color: '#00CBB8', href: '/admin/ai-data' },
    { id: 'library', title: 'Thư viện môn học', icon: BookOpen, color: '#5B72EE', href: '/admin/library' },
    { id: 'products', title: 'Sản phẩm học tập', icon: FileText, color: '#F48C06', href: '/admin/products' },
    { id: 'tests', title: 'Bài kiểm tra', icon: FileText, color: '#29B9E7', href: '/admin/tests' },
    { id: 'news', title: 'Tin tức', icon: MessageSquare, color: '#00CBB8', href: '/admin/news' },
    { id: 'members', title: 'Thành viên', icon: Users, color: '#8B5CF6', href: '/admin/members' }
  ];

  const courses = [
    {
      code: 'MLN111',
      products: [
        { id: 1, title: 'Tên sản phẩm', code: 'MLN111', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 2, title: 'Tên sản phẩm', code: 'MLN111', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 3, title: 'Tên sản phẩm', code: 'MLN111', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' }
      ]
    },
    {
      code: 'MLN122',
      products: [
        { id: 4, title: 'Tên sản phẩm', code: 'MLN122', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 5, title: 'Tên sản phẩm', code: 'MLN122', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 6, title: 'Tên sản phẩm', code: 'MLN122', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' }
      ]
    },
    {
      code: 'MLN131',
      products: [
        { id: 7, title: 'Tên sản phẩm', code: 'MLN131', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 8, title: 'Tên sản phẩm', code: 'MLN131', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 9, title: 'Tên sản phẩm', code: 'MLN131', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' }
      ]
    },
    {
      code: 'HCM202',
      products: [
        { id: 10, title: 'Tên sản phẩm', code: 'HCM202', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 11, title: 'Tên sản phẩm', code: 'HCM202', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' },
        { id: 12, title: 'Tên sản phẩm', code: 'HCM202', instructor: 'Nguyễn Văn Bình', date: '20 / 04 /2025', image: 'https://placehold.co/415x240' }
      ]
    },
    {
      code: 'VNR202',
      products: []
    }
  ];

  return (
    <ProtectedRoute requiredRoles={['admin', 'instructor']}>
      <div className="min-h-screen bg-white flex">
        {/* Sidebar */}
        <div className="w-56 bg-white p-4 border-r border-gray-100">
          {/* Logo */}
          <div className="mb-6">
            <img 
              src="https://placehold.co/192x192" 
              alt="Logo" 
              className="w-24 h-24 md:w-32 md:h-32 mb-6"
            />
          </div>

          {/* Sidebar Menu */}
          <div className="space-y-8">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.active;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-4 hover:opacity-90"
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded"
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`flex-1 text-sm md:text-base ${isActive ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{item.title}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white">
          {/* Header */}
          <div className="flex items-center gap-6 md:gap-8 p-4 md:p-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="mb-1">
                <span className="text-gray-900 text-base md:text-lg">Chào mừng, </span>
                <span className="text-[#125093] text-xl md:text-2xl font-bold">Nguyễn Văn Bình</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-gray-900 text-base md:text-lg font-semibold">Quản trị viên</div>
                <Edit className="w-5 h-5 md:w-6 md:h-6 text-[#1A1A1A]" />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="px-4 md:px-6 pb-12 md:pb-16">
            {/* Title and Update Button */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sản phẩm học tập</h1>
              <button 
                onClick={() => console.log('Update clicked')}
                className="px-4 py-2 bg-[#125093] text-white text-sm md:text-base rounded-full shadow"
              >
                Cập nhập
              </button>
            </div>

            {/* Course Sections */}
            <div className="space-y-12">
              {courses.map((course, courseIndex) => (
                <div key={course.code} className="space-y-6">
                  {/* Course Title */}
                  <h2 className="text-lg md:text-xl font-bold text-black">{course.code}</h2>

                  {/* Products Grid */}
                  {course.products.length > 0 ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {course.products.map((product, productIndex) => (
                          <div 
                            key={product.id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 pb-6 flex flex-col gap-4"
                          >
                            <div className="flex flex-col gap-6">
                              <img 
                                src={product.image} 
                                alt={product.title}
                                className="w-full h-40 sm:h-44 md:h-48 object-cover rounded-t-2xl"
                              />
                              <div className="px-6 flex flex-col gap-3">
                                <div className="flex items-center justify-between h-8">
                                  <div className="text-gray-900 text-base font-semibold">{product.title}</div>
                                  <div className="text-gray-700 text-xs font-medium">{product.code}</div>
                                </div>
                                <div className="flex flex-col gap-3">
                                  <div className="text-gray-500 text-sm">{product.instructor}</div>
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="text-gray-500 text-sm">{product.date}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="px-6 flex items-center justify-between">
                              <button 
                                onClick={() => console.log('Edit clicked', product.id)}
                                className="px-4 py-2 bg-[#49BBBD] text-white text-sm rounded-full shadow"
                              >
                                Chỉnh sửa
                              </button>
                              <button 
                                onClick={() => console.log('Delete clicked', product.id)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-5 h-5 text-[#1A1A1A]" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Pagination */}
                      <div className="flex items-center justify-center gap-4">
                        <button 
                          onClick={() => console.log('Previous page')}
                          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#AEACAC]" />
                        </button>
                        <span className="text-gray-900 text-base font-bold">1</span>
                        <span className="text-gray-900 text-base">2</span>
                        <span className="text-gray-900 text-base">3</span>
                        <button 
                          onClick={() => console.log('Next page')}
                          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100"
                        >
                          <ChevronRight className="w-5 h-5 text-[#010514]" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="flex items-center gap-5">
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 pb-6 flex flex-col gap-6">
                        <div className="flex flex-col gap-6">
                          <div className="w-full sm:w-[360px] h-40 bg-[#C4C4C4] rounded-t-2xl"></div>
                          <div className="w-20 h-20 mx-auto">
                            <div className="w-16 h-16 border-4 border-[#5B5B5B] rounded-full"></div>
                          </div>
                          <div className="px-6 flex flex-col gap-3">
                            <div className="h-8 flex flex-col justify-start gap-4">
                              <div className="text-gray-900 text-base font-semibold">Chưa có sản phẩm</div>
                            </div>
                            <div className="flex flex-col gap-3">
                              <div className="text-gray-500 text-sm">Hiện tại môn học này chưa có sản phẩm học tập nào, hãy cập nhập ngay !</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div 
        className="w-full bg-[#125093] flex flex-col items-center"
        style={{ paddingTop: 40, paddingBottom: 40 }}
      >
        <div className="w-full max-w-7xl flex flex-col justify-between items-center gap-8 px-4">
          <div className="flex items-center gap-6">
            <img 
              src="https://placehold.co/112x112" 
              alt="Logo" 
              className="w-14 h-14 md:w-20 md:h-20"
            />
            <div 
              className="w-16 h-0 border border-white border-opacity-30"
              style={{ transform: 'rotate(90deg)' }}
            ></div>
            <div className="text-white text-sm md:text-base">Soft Skill Department         Trường ĐH FPT</div>
          </div>
          
          <div className="w-full flex flex-col items-center gap-8">
            <div className="w-full text-center text-white/70 text-sm md:text-base">Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay</div>
            
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="text-white text-sm md:text-base">
                Văn phòng Bộ môn Kỹ năng mềm          Địa chỉ: <br/>
                Email: vanbinh@fpt.edu.vn          Zalo: 090.xxx.xxx
              </div>
              <div className="text-white text-sm md:text-base">
                Thầy Văn Bình          Chức vụ: <br/>
                Email: vanbinh@fpt.edu.vn          Zalo: 090.xxx.xxx
              </div>
              <div className="text-white text-sm md:text-base">
                Thầy Văn Bình          Chức vụ<br/>
                Email: vanbinh@fpt.edu.vn          Zalo: 090.xxx.xxx
              </div>
            </div>
          </div>
          
          <div className="w-full text-center text-white/70 text-sm md:text-base">Soft Skills Department | Trường Đại học FPT</div>
        </div>
      </div>
    </ProtectedRoute>
  );
}