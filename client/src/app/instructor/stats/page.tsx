"use client";
import ProtectedRouteWrapper from '@/components/ProtectedRouteWrapper';
import InstructorStats from '@/components/stats/InstructorStats';
import { useThemePreference } from '@/providers/ThemeProvider';
import { cn } from '@/lib/utils';

export default function InstructorStatsPage() {
  const { theme } = useThemePreference();
  const isDarkMode = theme === "dark";
  
  return (
    <ProtectedRouteWrapper requiredRoles={['instructor','admin']}> 
      <div className={cn(
        "min-h-screen transition-colors",
        isDarkMode ? "bg-background" : "bg-white"
      )}>
        <div className="max-w-7.5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className={cn(
            "text-2xl font-bold mb-6",
            isDarkMode ? "text-foreground" : "text-gray-900"
          )}>Thống kê giảng dạy</h1>
          <InstructorStats />
        </div>
      </div>
    </ProtectedRouteWrapper>
  );
}
