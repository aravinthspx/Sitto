import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Remember where they were going (e.g. a link from a phone notification)
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
