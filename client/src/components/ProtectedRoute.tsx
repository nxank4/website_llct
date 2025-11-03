'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'instructor' | 'student'; // legacy single-role
  requiredRoles?: Array<'admin' | 'instructor' | 'student'>; // preferred multi-role
  fallbackPath?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredRoles,
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      const rolesToCheck = requiredRoles && requiredRoles.length > 0 ? requiredRoles : (requiredRole ? [requiredRole] : []);

      if (rolesToCheck.length > 0 && !rolesToCheck.some(r => hasRole(r))) {
        // Redirect based on user's actual role
        const userRole = hasRole('admin') ? 'admin' : 
                        hasRole('instructor') ? 'instructor' : 'student';
        
        switch (userRole) {
          case 'admin':
            router.push('/admin');
            break;
          case 'instructor':
            router.push('/instructor');
            break;
          default:
            router.push('/');
            break;
        }
        return;
      }
    }
  }, [isAuthenticated, hasRole, requiredRole, requiredRoles, isLoading, router, fallbackPath]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or doesn't have required role
  const rolesToCheck = requiredRoles && requiredRoles.length > 0 ? requiredRoles : (requiredRole ? [requiredRole] : []);
  if (!isAuthenticated || (rolesToCheck.length > 0 && !rolesToCheck.some(r => hasRole(r)))) {
    return null;
  }

  return <>{children}</>;
}
