import { useCallback } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { withViewTransition } from '../app/viewTransition';

// Drop-in replacement for react-router's useNavigate that animates every page
// switch with the View Transitions API (see app/viewTransition.js and
// styles/ios.css). Pass { viewTransition: false } to opt out.
export function useNavigate() {
  const navigate = useRouterNavigate();
  return useCallback(
    (to, options = {}) => {
      const { viewTransition = true, ...rest } = options;
      const go = () => (typeof to === 'number' ? navigate(to) : navigate(to, rest));
      if (viewTransition) withViewTransition(go);
      else go();
    },
    [navigate],
  );
}
