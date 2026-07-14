"use client";

import { motion, useScroll, useSpring, useTransform, useReducedMotion } from "framer-motion";

// Parallax-Schicht hinter dem Inhalt: weiche Lichtfelder in den Markentönen,
// die beim Scrollen spürbar (aber ruhig) driften und leicht rotieren — damit
// sofort Bewegung sichtbar ist und die Seite lebendig wirkt.
// Läuft komplett über GPU-Transforms; respektiert prefers-reduced-motion.
export default function ScrollBackdrop() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  // Gefederte Scroll-Position → geschmeidige, nachlaufende Bewegung.
  const s = useSpring(scrollY, { stiffness: 60, damping: 22, restDelta: 1 });

  const y1 = useTransform(s, (v) => v * 0.18);
  const r1 = useTransform(s, (v) => v * 0.02);
  const y2 = useTransform(s, (v) => v * -0.14);
  const x2 = useTransform(s, (v) => v * -0.07);
  const y3 = useTransform(s, (v) => v * 0.26);
  const r3 = useTransform(s, (v) => v * -0.018);

  const blob = "absolute rounded-full blur-[80px] will-change-transform";

  if (reduced) {
    // Statische, ruhige Variante ohne Bewegung.
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className={`${blob} -right-40 -top-40 h-[36rem] w-[36rem] opacity-80`} style={{ background: "radial-gradient(closest-side, rgba(176,84,58,0.22), transparent 70%)" }} />
        <div className={`${blob} -left-52 top-[40%] h-[42rem] w-[42rem] opacity-90`} style={{ background: "radial-gradient(closest-side, rgba(211,200,181,0.5), transparent 70%)" }} />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* warmes Clay-Feld oben rechts */}
      <motion.div
        className={`${blob} -right-40 -top-44 h-[38rem] w-[38rem] opacity-90`}
        style={{ y: y1, rotate: r1, background: "radial-gradient(closest-side, rgba(176,84,58,0.24), transparent 70%)" }}
      />
      {/* sandiges Feld links mittig */}
      <motion.div
        className={`${blob} -left-56 top-[36%] h-[44rem] w-[44rem] opacity-95`}
        style={{ y: y2, x: x2, background: "radial-gradient(closest-side, rgba(211,200,181,0.55), transparent 70%)" }}
      />
      {/* zartes Akzentfeld unten rechts */}
      <motion.div
        className={`${blob} -bottom-56 right-[10%] h-[40rem] w-[40rem] opacity-80`}
        style={{ y: y3, rotate: r3, background: "radial-gradient(closest-side, rgba(236,217,207,0.7), transparent 70%)" }}
      />
    </div>
  );
}
