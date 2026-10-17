import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { AppRoutes } from './routes';
import { StorageNotice } from '../legal/StorageNotice';
import { LiquidBackground } from '../components/liquid/LiquidBackground';
import { useLiquidRipple } from '../components/liquid/useLiquidRipple';

export function App() {
  useLiquidRipple();

  return (
    <BrowserRouter>
      <LiquidBackground />
      <AuthProvider>
        <AppRoutes />
        <StorageNotice />
      </AuthProvider>
    </BrowserRouter>
  );
}
