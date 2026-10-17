import { ParticleField } from './ParticleField';

// Animated futuristic scene painted behind the whole app: drifting colour
// blobs, flowing aurora ribbons, an interactive particle network, a
// holographic grid floor and an occasional light sweep. Purely decorative —
// hidden from assistive tech and frozen when the user prefers reduced motion.
export function LiquidBackground() {
  return (
    <div className="liquid-scene" aria-hidden="true">
      <div className="liquid-blob liquid-blob--violet" />
      <div className="liquid-blob liquid-blob--aqua" />
      <div className="liquid-blob liquid-blob--pink" />
      <div className="liquid-blob liquid-blob--mint" />

      <div className="future-aurora">
        <span className="future-aurora__band future-aurora__band--1" />
        <span className="future-aurora__band future-aurora__band--2" />
        <span className="future-aurora__band future-aurora__band--3" />
      </div>

      <div className="future-grid">
        <div className="future-grid__plane" />
        <div className="future-grid__horizon" />
      </div>

      <ParticleField />

      <div className="future-sweep" />
    </div>
  );
}
