"use client";

import { useState } from "react";

import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";
import {
  BookOpen,
  FileText,
  BarChart3,
  Brain,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";

export default function AdminLecturesPage() {
  const [activeSidebarItem] = useState("lectures");

  const sidebarItems = [
    {
      id: "dashboard",
      label: "Bảng tổng kết",
      icon: BarChart3,
      href: "/admin/dashboard",
    },
    { id: "ai-data", label: "Dữ liệu AI", icon: Brain, href: "/admin/ai-data" },
    {
      id: "library",
      label: "Thư viện môn học",
      icon: BookOpen,
      href: "/admin/library",
    },
    {
      id: "products",
      label: "Sản phẩm học tập",
      icon: FileText,
      href: "/admin/products",
    },
    {
      id: "tests",
      label: "Bài kiểm tra",
      icon: FileText,
      href: "/admin/tests",
    },
    { id: "news", label: "Tin tức", icon: MessageSquare, href: "/admin/news" },
  ];

  const courseSections = [
    {
      code: "MLN111",
      name: "Triết học Mác - Lê-nin",
      items: [
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
      ],
    },
    {
      code: "MLN122",
      name: "Kinh tế chính trị Mác - Lê-nin",
      items: [
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
      ],
    },
    {
      code: "MLN131",
      name: "Chủ nghĩa xã hội khoa học",
      items: [
        {
          title: "Tuần 1 - Tên bài kiểm tra",
          instructor: "Nguyễn Văn Hình",
          date: "20/06/2025",
          duration: "30 câu",
        },
        {
          title: "Tuần 1 - Tên bài kiểm tra",
          instructor: "Nguyễn Văn Hình",
          date: "20/06/2025",
          duration: "30 câu",
        },
        {
          title: "Tuần 1 - Tên bài kiểm tra",
          instructor: "Nguyễn Văn Hình",
          date: "20/06/2025",
          duration: "30 câu",
        },
      ],
    },
    {
      code: "HCM202",
      name: "Tư tưởng Hồ Chí Minh",
      items: [
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
        {
          title: "Tên giáo trình",
          instructor: "Nguyễn Văn Bình",
          date: "20/04/2025",
          duration: "20 phút",
        },
      ],
    },
    {
      code: "VNR202",
      name: "Lịch sử Đảng Cộng sản Việt Nam",
      items: [],
    },
  ];

  return (
    <ProtectedRouteWrapper requiredRoles={["admin", "instructor"]}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-56 bg-blue-600 text-white">
          <div className="p-4 md:p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm md:text-lg">
                  SS
                </span>
              </div>
              <div>
                <div className="text-base md:text-lg font-semibold">
                  Soft Skills
                </div>
                <div className="text-xs md:text-sm opacity-90">Department</div>
              </div>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`w-full flex items-center space-x-3 px-3 py-2 md:px-4 md:py-3 rounded-lg transition-colors ${
                      activeSidebarItem === item.id
                        ? "bg-blue-500 text-white"
                        : "text-blue-100 hover:bg-blue-500 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="text-sm md:text-base">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm md:text-lg">
                    SS
                  </span>
                </div>
                <div>
                  <h1 className="text-lg md:text-xl font-semibold text-gray-900">
                    Soft Skills Department
                  </h1>
                  <p className="text-xs md:text-sm text-gray-600">
                    Trường ĐH FPT
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900 font-medium text-sm md:text-base">
                      Chào mừng, Nguyễn Văn Bình
                    </span>
                    <Pencil className="h-4 w-4 text-gray-500" />
                  </div>
                  <p className="text-xs md:text-sm text-gray-600">
                    Quản trị viên
                  </p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs md:text-sm">B</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 md:p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Bài giảng
              </h2>
              <button className="bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm md:text-base">
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
                <span>Thêm bài giảng</span>
              </button>
            </div>

            {/* Course Sections */}
            <div className="space-y-8">
              {courseSections.map((section) => (
                <div
                  key={section.code}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {section.code}
                  </h3>

                  {section.items.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {section.items.map((item, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="mb-4">
                              <div className="w-full h-28 md:h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                                <div className="text-center">
                                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                    <BookOpen className="h-7 w-7 md:h-8 md:w-8 text-gray-500" />
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    Video call with coffee
                                  </p>
                                </div>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">
                                {item.title}
                              </h4>
                              <p className="text-xs md:text-sm text-gray-600 mb-1">
                                {item.instructor}
                              </p>
                              <p className="text-xs md:text-sm text-gray-600 mb-1">
                                {item.date}
                              </p>
                              <p className="text-xs md:text-sm text-gray-500">
                                {item.duration}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              <button className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-xs md:text-sm">
                                Chỉnh sửa
                              </button>
                              <button className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-center mt-4 md:mt-6">
                        <div className="flex items-center space-x-2">
                          <button className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm">
                            ‹
                          </button>
                          <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm">
                            1
                          </button>
                          <button className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm">
                            2
                          </button>
                          <button className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm">
                            3
                          </button>
                          <button className="px-2 py-1 text-gray-500 hover:text-gray-700 text-sm">
                            ›
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 md:py-12">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Plus className="h-10 w-10 md:h-12 md:w-12 text-gray-400" />
                      </div>
                      <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                        Chưa có tài liệu
                      </h4>
                      <p className="text-sm md:text-base text-gray-600 mb-6">
                        Hãy tải lên nội dung đầu tiên cho khóa học này
                      </p>
                      <button className="bg-blue-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base">
                        Tải lên tài liệu
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-blue-800 text-white">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm md:text-lg">
                        SS
                      </span>
                    </div>
                    <div className="text-white">
                      <div className="text-base md:text-lg font-semibold">
                        Soft Skills Department
                      </div>
                      <div className="text-xs md:text-sm opacity-90">
                        Trường ĐH FPT
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Column */}
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-4">
                    Nếu bạn có thắc mắc hay cần giúp đỡ, liên hệ ngay
                  </h3>
                  <div className="space-y-2 text-xs md:text-sm">
                    <div>
                      <strong>Văn phòng Bộ môn Kỹ năng mềm</strong>
                    </div>
                    <div>Địa chỉ:</div>
                    <div>Email: vanbinh@fpt.edu.vn</div>
                    <div>Zalo: 090.xxx.xxx</div>
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-4">
                    Thầy Văn Bình
                  </h3>
                  <div className="space-y-2 text-xs md:text-sm">
                    <div>Chức vụ:</div>
                    <div>Email: vanbinh@fpt.edu.vn</div>
                    <div>Zalo: 090.xxx.xxx</div>
                  </div>
                </div>
              </div>

              {/* Bottom Line */}
              <div className="border-t border-blue-700 mt-6 md:mt-8 pt-6 md:pt-8 text-center">
                <p className="text-xs md:text-sm opacity-90">
                  Soft Skills Department | Trường Đại học FPT
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
