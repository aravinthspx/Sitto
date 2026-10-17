import { useEffect, useRef } from 'react';

// Futuristic "constellation" layer: glowing points drift, link with light
// lines when close, and lean toward the pointer. Canvas-based for smoothness;
// pauses when the tab is hidden and renders a single still frame when the user
// prefers reduced motion.

const COLORS = ['139,107,255', '56,189,248', '236,72,153', '91,61,245'];
const LINK_DISTANCE = 140;
const POINTER_RADIUS = 180;

export function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -9999, y: -9999, active: false };
    let width = 0;
    let height = 0;
    let particles = [];
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density scales with screen area: ~40 on phones, up to ~110 on desktops
      const target = Math.round(Math.min(110, Math.max(36, (width * height) / 14000)));
      while (particles.length < target) particles.push(spawn());
      particles.length = target;
    };

    const spawn = () => {
      const speed = 0.12 + Math.random() * 0.28;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 1.8,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        phase: Math.random() * Math.PI * 2,
      };
    };

    const draw = (now) => {
      const dt = Math.min(48, now - last) / 16.67; // frame-rate independent motion
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (!reduceMotion) {
          // Gentle pull toward the pointer
          if (pointer.active) {
            const dx = pointer.x - p.x;
            const dy = pointer.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d < POINTER_RADIUS && d > 1) {
              const f = (1 - d / POINTER_RADIUS) * 0.035;
              p.vx += (dx / d) * f * dt;
              p.vy += (dy / d) * f * dt;
            }
          }
          // Keep speed bounded so the field stays calm
          const s = Math.hypot(p.vx, p.vy);
          if (s > 0.9) {
            p.vx *= 0.9 / s;
            p.vy *= 0.9 / s;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
          p.phase += 0.03 * dt;
        }
      }

      // Links
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DISTANCE * LINK_DISTANCE) {
            const alpha = (1 - Math.sqrt(d2) / LINK_DISTANCE) * 0.32;
            ctx.strokeStyle = `rgba(${a.color},${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Pointer links make the field react to the user
      if (pointer.active && !reduceMotion) {
        for (const p of particles) {
          const d = Math.hypot(pointer.x - p.x, pointer.y - p.y);
          if (d < POINTER_RADIUS) {
            ctx.strokeStyle = `rgba(${p.color},${((1 - d / POINTER_RADIUS) * 0.45).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        }
      }

      // Glowing points
      for (const p of particles) {
        const twinkle = 0.65 + Math.sin(p.phase) * 0.35;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        glow.addColorStop(0, `rgba(${p.color},${(0.55 * twinkle).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${(0.9 * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduceMotion) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="future-particles" aria-hidden="true" />;
}
