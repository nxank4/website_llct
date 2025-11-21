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
  Download
} from 'lucide-react';
import ProtectedRouteWrapper from '@/components/ProtectedRouteWrapper';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useThemePreference } from '@/providers/ThemeProvider';
import { cn } from '@/lib/utils';

export default function SubjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  const resolvedParams = use(params);
  const router = useRouter();
  const subjectId = resolvedParams.id as string;
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for lectures
  const lectures = [
    {
      id: 1,
      title: 'Tên tài liệu',
      description: 'Mô tả tài liệu',
      icon: GraduationCap,
      iconColor: 'text-purple-600',
      actions: ['bookmark']
    },
    {
      id: 2,
      title: 'Tên tài liệu',
      description: 'Mô tả tài liệu',
      icon: Play,
      iconColor: 'text-blue-600',
      actions: ['download']
    },
    {
      id: 3,
      title: 'Tên tài liệu',
      description: 'Mô tả tài liệu',
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
    <ProtectedRouteWrapper>
      <div className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-background" : "bg-white"
      )}>
      {/* Hero Section */}
      <div className={cn(
        "relative py-16 px-4 overflow-hidden transition-colors",
        isDarkMode
          ? "bg-gradient-to-b from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.85)] to-[hsl(var(--primary)/0.7)]"
          : "bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700"
      )}>
        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 opacity-20">
          <div className={cn(
            "w-16 h-16 rounded-lg flex items-center justify-center border",
            isDarkMode ? "bg-card/80 border-white/30" : "bg-white border-white/50"
          )}>
            <div className="grid grid-cols-2 gap-1">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded",
                    isDarkMode ? "bg-white/70" : "bg-blue-500"
                  )}
                ></div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Floating Dots */}
        <div className="absolute top-20 left-1/4 w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
        <div className="absolute top-32 right-1/3 w-2 h-2 bg-green-400 rounded-full opacity-60"></div>
        <div className="absolute top-16 right-1/4 w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
        
        <div className="max-w-7.5xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            {/* Left Side - Back Button and Subject Code */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className={cn(
                "text-4xl font-bold",
                isDarkMode ? "text-primary-foreground" : "text-black"
              )}>
                {subjectId}
              </h1>
            </div>
            
            {/* Right Side - Search Bar */}
            <div className="flex-1 max-w-md ml-8">
              <form onSubmit={handleSearch}>
                <div className={cn(
                  "relative flex rounded-lg shadow-lg overflow-hidden transition-colors",
                  isDarkMode ? "bg-card" : "bg-white"
                )}>
                  <div className="flex items-center pl-4">
                    <Search className={cn(
                      "w-5 h-5",
                      isDarkMode ? "text-muted-foreground" : "text-gray-400"
                    )} />
                  </div>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập từ khóa... (ví dụ Hồ Chí Minh, Mác Lê-nin...)"
                    className="flex-1 border-0 focus-visible:ring-0 text-sm bg-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-[hsl(var(--brand-teal))] hover:bg-[hsl(var(--brand-teal)/0.85)] text-white px-6 py-3 font-medium transition-colors text-sm"
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
      <div className="max-w-7.5xl mx-auto px-4 py-12">
        {weeks.map((week) => (
          <div key={week.id} className="mb-16">
            {/* Week Header */}
            <h2 className={cn(
              "text-2xl font-bold mb-8",
              isDarkMode ? "text-foreground" : "text-gray-900"
            )}>
              {week.title}
            </h2>
            
            {/* Lecture Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {lectures.map((lecture) => {
                const IconComponent = lecture.icon;
                return (
                  <div
                    key={lecture.id}
                    className={cn(
                      "rounded-lg p-6 shadow-md hover:shadow-lg transition-all cursor-pointer border",
                      isDarkMode
                        ? "bg-card border-border"
                        : "bg-white border-gray-100"
                    )}
                  >
                    {/* Icon */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        isDarkMode
                          ? "border border-white/30 bg-transparent text-white"
                          : "bg-gray-50 text-gray-600"
                      )}>
                        <IconComponent className={cn(
                          "w-8 h-8",
                          isDarkMode ? "text-white" : lecture.iconColor
                        )} />
                      </div>
                      
                      {/* Action Icons */}
                      <div className="flex space-x-2">
                        {lecture.actions.includes('bookmark') && (
                          <button className={cn(
                            "p-2 transition-colors",
                            isDarkMode
                              ? "text-muted-foreground hover:text-foreground"
                              : "text-gray-400 hover:text-gray-600"
                          )}>
                            <Bookmark className="w-5 h-5" />
                          </button>
                        )}
                        {lecture.actions.includes('download') && (
                          <button className={cn(
                            "p-2 transition-colors",
                            isDarkMode
                              ? "text-muted-foreground hover:text-foreground"
                              : "text-gray-400 hover:text-gray-600"
                          )}>
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Content */}
                    <h3 className={cn(
                      "text-lg font-semibold mb-2",
                      isDarkMode ? "text-foreground" : "text-gray-900"
                    )}>
                      {lecture.title}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-muted-foreground" : "text-gray-600"
                    )}>
                      {lecture.description}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination */}
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    1
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ))}
      </div>
    </div>
    </ProtectedRouteWrapper>
  );
}
