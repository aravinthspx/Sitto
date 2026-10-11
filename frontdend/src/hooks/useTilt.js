import { useEffect, useRef } from 'react';

export function useTilt({ max = 8, disabled = false } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    
    if (prefersReducedMotion || isTouch || disabled) return;

    let rafId;
    let bounds;
    
    const onPointerEnter = () => {
      bounds = el.getBoundingClientRect();
      el.style.transition = 'transform 50ms ease-out'; // Fast response while moving
    };

    const onPointerMove = (e) => {
      if (!bounds) bounds = el.getBoundingClientRect();
      
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;

      const px = x / bounds.width;
      const py = y / bounds.height;

      const rx = (0.5 - py) * max * 2; // e.g. -8 to 8
      const ry = (px - 0.5) * max * 2; 

      rafId = requestAnimationFrame(() => {
        el.style.setProperty('--rx', `${rx}deg`);
        el.style.setProperty('--ry', `${ry}deg`);
        el.style.setProperty('--px', `${px * 100}%`);
        el.style.setProperty('--py', `${py * 100}%`);
      });
    };

    const onPointerLeave = () => {
      cancelAnimationFrame(rafId);
      el.style.transition = 'transform 250ms ease-out'; // Slower reset
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--px', '50%');
      el.style.setProperty('--py', '50%');
      bounds = null;
    };

    // Use pointer events
    el.addEventListener('pointerenter', onPointerEnter);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerleave', onPointerLeave);

    return () => {
      el.removeEventListener('pointerenter', onPointerEnter);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerleave', onPointerLeave);
      cancelAnimationFrame(rafId);
    };
  }, [max, disabled]);

  return ref;
}
