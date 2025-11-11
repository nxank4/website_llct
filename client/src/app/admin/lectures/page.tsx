"use client";

import { useState } from "react";

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
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Overview Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#125093] rounded-full flex items-center justify-center text-white poppins-bold">
              SS
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 poppins-semibold">
                Soft Skills Department
              </h1>
              <p className="text-sm text-gray-600 arimo-regular">
                Trường Đại học FPT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-gray-900 font-medium text-sm md:text-base">
                  Chào mừng, Nguyễn Văn Bình
                </span>
                <Pencil className="h-4 w-4 text-gray-500" />
              </div>
              <p className="text-xs md:text-sm text-gray-600">Quản trị viên</p>
            </div>
            <div className="w-10 h-10 bg-[#125093] rounded-full flex items-center justify-center text-white">
              B
            </div>
          </div>
        </div>

        {/* Lectures Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 px-6 py-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 poppins-bold">
              Bài giảng
            </h2>
            <button className="bg-[#125093] hover:bg-[#0f4278] text-white px-4 py-3 md:px-6 md:py-3 rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base">
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              <span>Thêm bài giảng</span>
            </button>
          </div>

          <div className="space-y-8 p-6">
            {courseSections.map((section) => (
              <div
                key={section.code}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 poppins-semibold">
                      {section.code}
                    </h3>
                    <p className="text-sm text-gray-600 arimo-regular">
                      {section.name}
                    </p>
                  </div>
                </div>

                {section.items.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {section.items.map((item, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
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
                            <button className="bg-[#125093] text-white px-3 py-2 rounded-lg hover:bg-[#0f4278] transition-colors text-xs md:text-sm">
                              Chỉnh sửa
                            </button>
                            <button className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center mt-6">
                      <div className="flex items-center gap-2 text-sm">
                        <button className="px-2 py-1 text-gray-500 hover:text-gray-700">
                          ‹
                        </button>
                        <button className="px-2 py-1 bg-[#125093] text-white rounded">
                          1
                        </button>
                        <button className="px-2 py-1 text-gray-500 hover:text-gray-700">
                          2
                        </button>
                        <button className="px-2 py-1 text-gray-500 hover:text-gray-700">
                          3
                        </button>
                        <button className="px-2 py-1 text-gray-500 hover:text-gray-700">
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
                    <button className="bg-[#125093] text-white px-4 py-2 md:px-6 md:py-3 rounded-lg hover:bg-[#0f4278] transition-colors text-sm md:text-base">
                      Tải lên tài liệu
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
