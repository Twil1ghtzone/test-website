"use client";

import React, { useEffect, useRef, ReactNode, CSSProperties } from "react";
import { motion } from "framer-motion";

/**
 * Spotlight-/Glow-Karte: ein leuchtender Rahmen, der dem Cursor folgt —
 * nur sichtbar, wenn man sich auf/an der Box befindet.
 *
 * Koordinaten werden LOKAL zur Karte berechnet (kein background-attachment: fixed),
 * damit der Effekt auch in transformierten Containern (z. B. Reveal) exakt sitzt.
 * Statische CSS-Regeln für [data-glow] liegen einmalig in app/globals.css.
 */

// Warme Clay/Terracotta-Töne, abgestimmt auf --color-accent (#b0543a ≈ hsl(14 50% 46%))
const warmGlowVars: CSSProperties = {
  ["--base" as keyof CSSProperties]: 14,
  ["--spread" as keyof CSSProperties]: 30,
  ["--saturation" as keyof CSSProperties]: 72,
  ["--lightness" as keyof CSSProperties]: 52,
  ["--radius" as keyof CSSProperties]: 24,
  ["--border" as keyof CSSProperties]: 2,
  ["--size" as keyof CSSProperties]: 230,
  ["--backdrop" as keyof CSSProperties]: "color-mix(in oklab, var(--color-surface) 90%, transparent)",
  ["--backup-border" as keyof CSSProperties]: "var(--color-line)",
  ["--bg-spot-opacity" as keyof CSSProperties]: 0.15,
  ["--border-spot-opacity" as keyof CSSProperties]: 1,
  ["--border-light-opacity" as keyof CSSProperties]: 0.45,
  ["--active" as keyof CSSProperties]: 0,
};

interface GlowCardProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const GlowCard: React.FC<GlowCardProps> = ({ children, className = "", style }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty("--x", x.toFixed(1));
      el.style.setProperty("--y", y.toFixed(1));
      el.style.setProperty("--xp", (x / r.width).toFixed(3));
      el.style.setProperty("--yp", (y / r.height).toFixed(3));
    };
    const onEnter = () => el.style.setProperty("--active", "1");
    const onLeave = () => el.style.setProperty("--active", "0");

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    // Karten lösen sich beim Hover organisch vom Hintergrund: leichtes Anheben +
    // minimale Vergrößerung (Spring) und ein weicher, getönter Schatten.
    <motion.div
      ref={ref}
      data-glow
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ ...warmGlowVars, ...style }}
      className={`relative transition-shadow duration-300 hover:shadow-2xl hover:shadow-ink/5 ${className}`}
    >
      {children}
    </motion.div>
  );
};

export { GlowCard };
export default GlowCard;
