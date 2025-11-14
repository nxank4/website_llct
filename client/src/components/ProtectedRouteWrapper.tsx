/**
 * Re-export ProtectedRouteWrapper from auth folder
 * This file exists for backward compatibility with imports like:
 * import ProtectedRouteWrapper from '@/components/ProtectedRouteWrapper'
 * 
 * The actual component is located at @/components/auth/ProtectedRouteWrapper
 */
export { default } from './auth/ProtectedRouteWrapper';

