"use client";
import ProtectedRoute from '@/components/ProtectedRoute';
import InstructorStats from '@/components/InstructorStats';

export default function InstructorStatsPage() {
  return (
    <ProtectedRoute requiredRoles={['instructor','admin']}> 
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Thống kê giảng dạy</h1>
          <InstructorStats />
        </div>
      </div>
    </ProtectedRoute>
  );
}
