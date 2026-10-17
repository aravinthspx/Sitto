import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <div className="glass-panel rounded-2xl px-8 py-6 text-[#0F0D26] text-center">
          <div className="w-8 h-8 border-4 border-[#6B3DF5] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not logged in, they are caught by ProtectedRoute first, but just in case
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin role
  if (user.role !== 'admin') {
    // Return them to their dashboard or show a 403. Let's send them to dashboard.
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
