import { useEffect } from 'react';

const RIPPLE_TARGETS = 'button, [role="tab"], a[class*="rounded"]';

// Water-drop ripple on press. The ripple lives in its own fixed overlay that
// copies the pressed element's box and corner radius, so we never have to
// change the element's own position/overflow (which would break layouts such
// as absolutely positioned icon buttons).
export function useLiquidRipple() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      const target = event.target.closest?.(RIPPLE_TARGETS);
      if (!target || target.disabled || target.closest('[data-no-ripple]')) return;

      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const host = document.createElement('span');
      host.className = 'liquid-ripple-host';
      host.style.left = `${rect.left}px`;
      host.style.top = `${rect.top}px`;
      host.style.width = `${rect.width}px`;
      host.style.height = `${rect.height}px`;
      host.style.borderRadius = getComputedStyle(target).borderRadius;

      const size = Math.hypot(rect.width, rect.height) * 2;
      const drop = document.createElement('span');
      drop.className = 'liquid-ripple';
      drop.style.width = `${size}px`;
      drop.style.height = `${size}px`;
      drop.style.left = `${event.clientX - rect.left - size / 2}px`;
      drop.style.top = `${event.clientY - rect.top - size / 2}px`;

      host.appendChild(drop);
      document.body.appendChild(host);
      drop.addEventListener('animationend', () => host.remove(), { once: true });
      // Safety net if the animation never runs (e.g. tab hidden)
      setTimeout(() => host.remove(), 1200);
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);
}
