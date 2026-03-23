import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectToken, selectCurrentRole, selectAuthLoading, selectUser } from '@/features/auth/slice';
import { isProfileComplete } from '@/features/auth/profile';
import LoadingScreen from '@/components/LoadingScreen';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowIncompleteProfile?: boolean;
}

/**
 * Route guard component.
 * - Auth loading → show LoadingScreen
 * - No token → redirect to /login
 * - Token present but role doesn't match requiredRole → redirect to /
 * - Otherwise render children
 */
export default function ProtectedRoute({ children, requiredRole, allowIncompleteProfile = false }: ProtectedRouteProps) {
  const location = useLocation();
  const token = useAppSelector(selectToken);
  const currentRole = useAppSelector(selectCurrentRole);
  const isLoading = useAppSelector(selectAuthLoading);
  const user = useAppSelector(selectUser);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  if (!allowIncompleteProfile && user && !isProfileComplete(user)) {
    const continueTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/complete-profile?continue=${encodeURIComponent(continueTo)}`} replace />;
  }

  return <>{children}</>;
}
