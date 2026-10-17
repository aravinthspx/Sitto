import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { AppRoutes } from './routes';
import { StorageNotice } from '../legal/StorageNotice';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <StorageNotice />
      </AuthProvider>
    </BrowserRouter>
  );
}
