'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, GraduationCap, Smile, Puzzle, Lightbulb, Building2 } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const subjects = [
    {
      id: 'MLN111',
      name: 'Triết học Mác - Lê-nin',
      icon: GraduationCap,
      bgColor: 'bg-blue-900',
      description: 'Triết học Mác - Lê-nin'
    },
    {
      id: 'MLN122',
      name: 'Kinh tế chính trị Mác - Lê-nin',
      icon: Smile,
      bgColor: 'bg-blue-500',
      description: 'Kinh tế chính trị Mác - Lê-nin'
    },
    {
      id: 'MLN131',
      name: 'Chủ nghĩa xã hội khoa học',
      icon: Puzzle,
      bgColor: 'bg-teal-500',
      description: 'Chủ nghĩa xã hội khoa học'
    },
    {
      id: 'HCM202',
      name: 'Tư tưởng Hồ Chí Minh',
      icon: Lightbulb,
      bgColor: 'bg-cyan-400',
      description: 'Tư tưởng Hồ Chí Minh'
    },
    {
      id: 'VNR202',
      name: 'Lịch sử Đảng Cộng sản Việt Nam',
      icon: Building2,
      bgColor: 'bg-purple-600',
      description: 'Lịch sử Đảng Cộng sản Việt Nam'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic here
    console.log('Searching for:', searchQuery);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 py-20 px-4 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 opacity-20">
          <Puzzle className="w-16 h-16 text-blue-300" />
        </div>
        <div className="absolute top-20 right-20 opacity-20">
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
            <div className="grid grid-cols-2 gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded"></div>
              <div className="w-2 h-2 bg-blue-500 rounded"></div>
              <div className="w-2 h-2 bg-blue-500 rounded"></div>
              <div className="w-2 h-2 bg-blue-500 rounded"></div>
            </div>
          </div>
        </div>
        
        {/* Floating Dots */}
        <div className="absolute top-32 left-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
        <div className="absolute top-40 right-1/3 w-2 h-2 bg-green-400 rounded-full opacity-60"></div>
        <div className="absolute top-16 right-1/4 w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl font-bold text-white mb-6">
            Thư viện môn học
          </h1>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            Nơi giải đáp thắc mắc cho sinh viên về khái niệm và gợi ý tài liệu học tập.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative flex bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-center pl-4">
                <Search className="w-6 h-6 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập từ khóa.... (Ví dụ: Hồ Chí Minh, Mác Lê - nin,.....)"
                className="flex-1 px-4 py-4 text-gray-700 placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 font-medium transition-colors"
              >
                Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-12">
          Khám phá thư viện giáo trình đầy đủ của bộ môn Kỹ năng mềm
        </h2>
        
         {/* Subject Cards Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {subjects.map((subject) => {
             const IconComponent = subject.icon;
             return (
               <Link
                 key={subject.id}
                 href={`/library/${subject.id}`}
                 className={`${subject.bgColor} rounded-lg p-8 text-center text-white cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl block`}
               >
                 <div className="flex justify-center mb-6">
                   <IconComponent className="w-16 h-16" />
                 </div>
                 <h3 className="text-2xl font-bold mb-2">{subject.id}</h3>
                 <p className="text-white/80 text-sm">{subject.description}</p>
               </Link>
             );
           })}
         </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
