'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';

export default function AdminPage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if user is admin
    if (user && hasRole('admin')) {
      router.push('/admin/dashboard');
    }
  }, [user, hasRole, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
      <div className="w-48 mx-auto mb-4">
        <Spinner />
      </div>
        <p className="text-gray-600">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}