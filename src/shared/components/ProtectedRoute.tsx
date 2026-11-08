import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectToken, selectCurrentRole, selectUser } from '@/features/auth/slice';
import { isProfileComplete } from '@/features/auth/profile';
import LoadingScreen from '@/components/LoadingScreen';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  allowIncompleteProfile?: boolean;
}

/**
 * Route guard component.
 * - Token present but profile not loaded yet → show LoadingScreen
 * - No token → redirect to /login
 * - Token present but role doesn't match requiredRole → redirect to /
 * - Otherwise render children
 */
export default function ProtectedRoute({ children, requiredRole, allowIncompleteProfile = false }: ProtectedRouteProps) {
  const location = useLocation();
  const token = useAppSelector(selectToken);
  const currentRole = useAppSelector(selectCurrentRole);
  const user = useAppSelector(selectUser);

  if (!token) {
    const continueTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?continue=${encodeURIComponent(continueTo)}`} state={{ from: continueTo }} replace />;
  }

  if (!user) {
    return <LoadingScreen />;
  }

  const allowedRoles = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : [];

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/" replace />;
  }

  // Staff accounts don't ship orders to themselves, so admins are never sent
  // to the shipping-profile form before reaching a page.
  if (!allowIncompleteProfile && currentRole !== 'admin' && user && !isProfileComplete(user)) {
    const continueTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/complete-profile?continue=${encodeURIComponent(continueTo)}`} replace />;
  }

  return <>{children}</>;
}
