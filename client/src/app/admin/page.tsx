'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';
import { hasRole } from '@/lib/auth';

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  useEffect(() => {
    // Redirect to dashboard if user is admin
    if (user && hasRole(session, 'admin')) {
      router.push('/admin/dashboard');
    }
  }, [user, session, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Spinner size="xl" text="Đang chuyển hướng..." />
      </div>
    </div>
  );
}