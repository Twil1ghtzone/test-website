"use client";

import { useMemo } from "react";
import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";

// Deterministischer Pseudo-Zufall (mulberry32) — liefert auf Server UND
// Client exakt dieselbe Folge. Math.random() würde bei der Hydration
// abweichen und einen React-Fehler auslösen.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Particle = { x: number; y: number; size: number; opacity: number; depth: number; drift: number; delay: number; warm: boolean };

function buildParticles(count: number): Particle[] {
  const rand = mulberry32(1337);
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    size: 2 + rand() * 3.5,
    opacity: 0.12 + rand() * 0.26,
    depth: 0.06 + rand() * 0.22, // Parallax-Geschwindigkeit relativ zum Scroll
    drift: 10 + rand() * 14, // Amplitude der eigenen, langsamen Schwebe-Bewegung
    delay: rand() * 6,
    warm: rand() > 0.45,
  }));
}

// Dezente Partikel im Hintergrund der Startseite: schweben leicht in sich
// und verschieben sich beim Scrollen unterschiedlich schnell (Tiefenwirkung),
// ganz über GPU-Transforms — kein Canvas, kein rAF-Loop.
export default function ScrollParticles() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const s = useSpring(scrollY, { stiffness: 55, damping: 20, restDelta: 1 });
  const particles = useMemo(() => buildParticles(26), []);

  if (reduced) {
    // Statisch, ohne Bewegung — Position bleibt als leises Textur-Element.
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {particles.slice(0, 14).map((p, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${p.warm ? "bg-accent" : "bg-line-strong"}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity * 0.7 }}
          />
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {particles.map((p, i) => (
        <Dot key={i} particle={p} scrollY={s} />
      ))}
    </div>
  );
}

function Dot({ particle: p, scrollY }: { particle: Particle; scrollY: ReturnType<typeof useSpring> }) {
  // Zwei getrennte Bewegungsebenen, damit sich beide "y"-Transforms nicht
  // gegenseitig überschreiben: die äußere Hülle übernimmt den scroll-
  // gebundenen Parallax-Versatz, der innere Punkt die eigene, langsame
  // Schwebe-Schleife (per animate) plus das Ein-/Ausblenden.
  const parallaxY = useTransform(scrollY, (v) => v * p.depth * -1);

  return (
    <motion.span className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, y: parallaxY }}>
      <motion.span
        className="block rounded-full will-change-transform"
        style={{
          width: p.size,
          height: p.size,
          background: p.warm ? "var(--color-accent)" : "var(--color-line-strong)",
          boxShadow: p.warm ? "0 0 6px rgba(176,84,58,0.35)" : "none",
        }}
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, p.opacity, p.opacity, 0], y: [0, -p.drift, 0] }}
        transition={{
          opacity: { duration: 8 + p.delay, repeat: Infinity, ease: "easeInOut", delay: p.delay },
          y: { duration: 10 + p.delay, repeat: Infinity, ease: "easeInOut", delay: p.delay },
        }}
      />
    </motion.span>
  );
}
