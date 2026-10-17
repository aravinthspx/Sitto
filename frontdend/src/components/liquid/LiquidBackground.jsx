// Animated "water" scene painted behind the whole app: drifting light blobs,
// shimmering caustics, layered waves and rising bubbles. Purely decorative —
// hidden from assistive tech and frozen when the user prefers reduced motion.

// Deterministic bubble layout so renders are stable (no Math.random in render)
const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 6 + ((i * 13) % 18),
  duration: 14 + ((i * 7) % 12),
  delay: -((i * 5) % 20),
  drift: (i % 2 ? 1 : -1) * (10 + ((i * 3) % 20)),
}));

function Wave({ className, d }) {
  return (
    <svg className={`liquid-wave ${className}`} viewBox="0 0 2880 160" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// Two identical periods side by side, so translating by -50% loops seamlessly
const WAVE_A = 'M0 80 C 360 20 720 140 1080 80 S 1800 20 2160 80 S 2880 140 2880 80 V160 H0 Z';
const WAVE_B = 'M0 90 C 240 140 480 40 720 90 S 1200 140 1440 90 S 1920 40 2160 90 S 2640 140 2880 90 V160 H0 Z';

export function LiquidBackground() {
  return (
    <div className="liquid-scene" aria-hidden="true">
      <div className="liquid-blob liquid-blob--violet" />
      <div className="liquid-blob liquid-blob--aqua" />
      <div className="liquid-blob liquid-blob--pink" />
      <div className="liquid-blob liquid-blob--mint" />

      <div className="liquid-caustics" />

      <div className="liquid-bubbles">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="liquid-bubble"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              '--drift': `${b.drift}px`,
            }}
          />
        ))}
      </div>

      <div className="liquid-waves">
        <Wave className="liquid-wave--back" d={WAVE_B} />
        <Wave className="liquid-wave--mid" d={WAVE_A} />
        <Wave className="liquid-wave--front" d={WAVE_B} />
      </div>
    </div>
  );
}
