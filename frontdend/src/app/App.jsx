import { useEffect, useLayoutEffect } from 'react';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import { useNavigate } from '../hooks/useNavigate';
import { AppRoutes } from './routes';
import { StorageNotice } from '../legal/StorageNotice';
import { LiquidBackground } from '../components/liquid/LiquidBackground';
import { useLiquidRipple } from '../components/liquid/useLiquidRipple';
import { internalLinkTarget, signalRouteCommit } from './viewTransition';

// Animates every in-app page switch (see app/viewTransition.js):
// - tells a running view transition when React has committed the new route
// - routes plain <Link> clicks through the transition-aware navigate
function RouteTransitions() {
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    signalRouteCommit();
  }, [location.key]);

  useEffect(() => {
    const onClick = (event) => {
      const to = internalLinkTarget(event);
      if (!to) return;
      event.preventDefault();
      event.stopPropagation();
      navigate(to);
    };
    // Capture phase runs before React Router's own <Link> handler
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  return null;
}

function Root() {
  return (
    <AuthProvider>
      <RouteTransitions />
      <AppRoutes />
      <StorageNotice />
    </AuthProvider>
  );
}

const router = createBrowserRouter([{ path: '*', element: <Root /> }]);

export function App() {
  useLiquidRipple();

  return (
    <>
      <LiquidBackground />
      <RouterProvider router={router} />
    </>
  );
}
