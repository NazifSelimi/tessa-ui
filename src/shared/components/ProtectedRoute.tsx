import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectToken, selectCurrentRole, selectAuthLoading } from '@/features/auth/slice';
import LoadingScreen from '@/components/LoadingScreen';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

/**
 * Route guard component.
 * - Auth loading → show LoadingScreen
 * - No token → redirect to /login
 * - Token present but role doesn't match requiredRole → redirect to /
 * - Otherwise render children
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const token = useAppSelector(selectToken);
  const currentRole = useAppSelector(selectCurrentRole);
  const isLoading = useAppSelector(selectAuthLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
