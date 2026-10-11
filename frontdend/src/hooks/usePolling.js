import { useEffect, useRef } from 'react';

export function usePolling(callback, intervalMs, isPaused = false) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!intervalMs) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && !isPaused) {
        savedCallback.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const id = setInterval(() => {
      if (!document.hidden && !isPaused) {
        savedCallback.current();
      }
    }, intervalMs);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, isPaused]);
}
