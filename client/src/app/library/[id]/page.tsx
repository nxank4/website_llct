'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ArrowLeft, 
  GraduationCap, 
  Play, 
  FileText, 
  Bookmark, 
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const subjectId = resolvedParams.id as string;
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for lectures
  const lectures = [
    {
      id: 1,
      title: 'Tên bài giảng',
      description: 'Mô tả bài giảng',
      icon: GraduationCap,
      iconColor: 'text-purple-600',
      actions: ['bookmark']
    },
    {
      id: 2,
      title: 'Tên bài giảng',
      description: 'Mô tả bài giảng',
      icon: Play,
      iconColor: 'text-blue-600',
      actions: ['download']
    },
    {
      id: 3,
      title: 'Tên bài giảng',
      description: 'Mô tả bài giảng',
      icon: FileText,
      iconColor: 'text-teal-600',
      actions: ['download']
    }
  ];

  const weeks = [
    { id: 1, title: 'Tuần 1' },
    { id: 2, title: 'Tuần 2' },
    { id: 3, title: 'Tuần 3' }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  const handleBack = () => {
    router.push('/library');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 py-16 px-4 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 opacity-20">
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
        <div className="absolute top-20 left-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
        <div className="absolute top-32 right-1/3 w-2 h-2 bg-green-400 rounded-full opacity-60"></div>
        <div className="absolute top-16 right-1/4 w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            {/* Left Side - Back Button and Subject Code */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-4xl font-bold text-black">
                {subjectId}
              </h1>
            </div>
            
            {/* Right Side - Search Bar */}
            <div className="flex-1 max-w-md ml-8">
              <form onSubmit={handleSearch}>
                <div className="relative flex bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="flex items-center pl-4">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập từ khóa... (ví dụ Hồ Chí Minh, Mác Lê-nin...)"
                    className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-500 focus:outline-none text-sm"
                  />
                  <button
                    type="submit"
                    className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-3 font-medium transition-colors text-sm"
                  >
                    Tìm kiếm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {weeks.map((week) => (
          <div key={week.id} className="mb-16">
            {/* Week Header */}
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              {week.title}
            </h2>
            
            {/* Lecture Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {lectures.map((lecture) => {
                const IconComponent = lecture.icon;
                return (
                  <div
                    key={lecture.id}
                    className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                  >
                    {/* Icon */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-gray-50`}>
                        <IconComponent className={`w-8 h-8 ${lecture.iconColor}`} />
                      </div>
                      
                      {/* Action Icons */}
                      <div className="flex space-x-2">
                        {lecture.actions.includes('bookmark') && (
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <Bookmark className="w-5 h-5" />
                          </button>
                        )}
                        {lecture.actions.includes('download') && (
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {lecture.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {lecture.description}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-center items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex space-x-1">
                <button className="w-8 h-8 bg-teal-500 text-white rounded-full text-sm font-medium">
                  1
                </button>
                <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded-full text-sm font-medium transition-colors">
                  2
                </button>
                <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded-full text-sm font-medium transition-colors">
                  3
                </button>
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </ProtectedRoute>
  );
}
