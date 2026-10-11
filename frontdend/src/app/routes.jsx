import { Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { UpdatePasswordPage } from '../pages/UpdatePasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { CampusPage } from '../pages/CampusPage';
import { BuildingPage } from '../pages/BuildingPage';
import { FloorPage } from '../pages/FloorPage';
import { SpacePage } from '../pages/SpacePage';
import { MyReservationsPage } from '../pages/MyReservationsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AdminRoute } from '../components/layout/AdminRoute';
import { CheckInPage } from '../pages/CheckInPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <DashboardPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/campus" element={<CampusPage />} />
          <Route path="/campus/:buildingId" element={<BuildingPage />} />
          <Route path="/campus/:buildingId/floor/:floorId" element={<FloorPage />} />
          <Route path="/space/:spaceId" element={<SpacePage />} />
          <Route path="/reservations/*" element={<MyReservationsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/scanner" element={<CheckInPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
