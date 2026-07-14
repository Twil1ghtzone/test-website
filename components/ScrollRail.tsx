"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent, useReducedMotion } from "framer-motion";

// Dezenter Scroll-Indikator am rechten Rand (nur Desktop, nur Startseite):
// eine feine Schiene im Hintergrund, deren Füllung gefedert mitwächst,
// dazu ein leuchtender Punkt und die Prozentzahl — visualisiert die
// Scroll-Position, ohne vom Inhalt abzulenken.
export default function ScrollRail() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });

  // Füllhöhe der Schiene + Position des Punkts
  const fillScale = progress;
  const dotY = useTransform(progress, [0, 1], ["0%", "100%"]);

  // Prozentanzeige (gerundet, nur bei Änderung neu rendern)
  const [pct, setPct] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    const next = Math.round(v * 100);
    setPct((p) => (p === next ? p : next));
  });

  // Erst nach kleinem Scroll einblenden — im Hero bleibt alles clean.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      initial={false}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 12 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex"
    >
      {/* Prozent — klein, getrackt, im Markenton */}
      <span className="eyebrow tabular-nums text-muted">{pct}%</span>

      {/* Schiene mit gefederter Füllung */}
      <div className="relative h-56 w-px overflow-visible rounded-full bg-line-strong/60">
        <motion.div
          style={{ scaleY: fillScale, originY: 0 }}
          className="absolute inset-0 w-px rounded-full bg-gradient-to-b from-accent/70 to-accent"
        />
        {/* leuchtender Punkt, läuft mit */}
        <motion.span
          style={{ top: dotY }}
          className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_rgba(176,84,58,0.55)] ring-2 ring-canvas"
        />
      </div>

      {/* kleiner Fußpunkt als optischer Abschluss */}
      <span className="h-1 w-1 rounded-full bg-line-strong" />
    </motion.div>
  );
}
