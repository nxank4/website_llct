"use client";

import { useState } from "react";
import Link from "next/link";
import { Building, BookOpen, Users, FileText, BarChart3 } from "lucide-react";
import ProtectedRouteWrapper from "@/components/ProtectedRouteWrapper";

export default function ExercisesPage() {
  const [subjects] = useState([
    {
      id: "mln111",
      code: "MLN111",
      name: "Triết học Mác - Lê-nin",
      icon: BookOpen,
      color: "#125093",
      description: "Các kỹ năng mềm cơ bản trong công việc",
    },
    {
      id: "mln122",
      code: "MLN122",
      name: "Kinh tế chính trị Mác - Lê-nin",
      icon: Users,
      color: "#29B9E7",
      description: "Kỹ năng giao tiếp và thuyết trình",
    },
    {
      id: "mln131",
      code: "MLN131",
      name: "Chủ nghĩa xã hội khoa học",
      icon: FileText,
      color: "#49BBBD",
      description: "Phát triển tư duy logic và phản biện",
    },
    {
      id: "hcm202",
      code: "HCM202",
      name: "Tư tưởng Hồ Chí Minh",
      icon: BarChart3,
      color: "#49BBBD",
      description: "Kỹ năng lãnh đạo và quản lý nhóm",
    },
    {
      id: "vnr202",
      code: "VNR202",
      name: "Lịch sử Đảng Cộng sản Việt Nam",
      icon: Building,
      color: "#5B72EE",
      description: "Hiểu biết về văn hóa và môi trường làm việc",
    },
  ]);

  return (
    <ProtectedRouteWrapper>
      <div className="min-h-screen bg-[#125093] relative overflow-hidden">
        {/* Background Elements - Responsive positioning */}
        <div className="hidden lg:block absolute w-5 h-5 right-[10%] top-[40%] bg-[#00CBB8] rounded-full opacity-60 animate-pulse"></div>
        <div className="hidden lg:block absolute w-6 h-6 left-[20%] top-[45%] bg-[#29B9E7] rounded-full opacity-60 animate-pulse delay-300"></div>
        <div className="hidden lg:block absolute w-5 h-5 left-[50%] top-[50%] bg-[#8C7AFF] rounded-full opacity-60 animate-pulse delay-700"></div>

        {/* Floating Cards - Responsive */}
        <div className="hidden xl:block absolute w-20 h-20 left-[15%] top-[20%] transform -rotate-12 bg-white/90 shadow-lg rounded-2xl backdrop-blur-sm"></div>
        <div className="hidden xl:block absolute w-16 h-16 right-[10%] top-[18%] transform rotate-12 bg-white/90 shadow-lg rounded-2xl backdrop-blur-sm"></div>

        {/* Hero Section */}
        <div className="relative z-10 pt-24 md:pt-32 pb-12 md:pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#00CBB8] mb-4 md:mb-6 leading-tight poppins-bold">
              Kiểm tra
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white leading-relaxed arimo-regular max-w-3xl mx-auto">
              Kiểm tra và củng cố kiến thức để chuẩn bị cho những bài test sắp
              tới của bộ môn Kỹ năng mềm tại trường ĐH FPT
            </p>
          </div>
        </div>

        {/* Subject Selection Section */}
        <div className="relative z-10 py-12 md:py-16 bg-white">
          <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4 leading-tight poppins-bold">
                Chọn môn học và
                <br className="hidden md:block" />
                <span className="md:hidden"> </span>
                kiểm tra xem bạn có &quot;pass&quot; hay không nhé!
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {subjects.map((subject) => {
                const Icon = subject.icon;
                return (
                  <Link
                    key={subject.id}
                    href={`/exercises/${subject.id}`}
                    className="group"
                  >
                    <div
                      className="w-full h-[200px] md:h-[220px] rounded-2xl flex flex-col justify-center items-center gap-4 md:gap-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                      style={{ backgroundColor: subject.color }}
                    >
                      <div className="flex flex-col justify-center items-center gap-4 md:gap-6">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                          <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                        </div>
                        <div className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight poppins-bold">
                          {subject.code}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
