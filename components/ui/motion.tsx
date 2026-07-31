"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import Link from "next/link";

/**
 * Hydration-sicherer Ersatz für `useReducedMotion()`.
 *
 * Das Problem mit dem Original: Auf dem Server gibt es kein `matchMedia`, es
 * liefert dort also `null`. Im Browser kennt es den echten Wert. Wer damit die
 * gerenderte STRUKTUR verzweigt (`if (reduced) return <anderesMarkup/>`),
 * erzeugt bei jedem Besucher mit aktivierter Bewegungsreduzierung einen
 * Hydration-Fehler — React verwirft dann den ganzen Teilbaum und baut ihn neu.
 *
 * Dieser Hook liefert im ERSTEN Render immer `false`, auf Server und Client
 * gleichermaßen. Erst nach dem Mounten kommt der echte Wert, und die
 * Umschaltung ist dann eine gewöhnliche React-Aktualisierung statt eines
 * Abgleichfehlers. Für Besucher mit reduzierter Bewegung heißt das: einen
 * Wimpernschlag lang die bewegte Variante, danach die ruhige.
 */
export function useReducedMotionSafe(): boolean {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduced;
}

// Einheitliche „snappy" Physik für ALLE Button-Interaktionen der Seite.
// Leichtes Anheben beim Hover, knackiges Eindrücken beim Klick — Spring-Physik.
export const pressSpring = { type: "spring", stiffness: 400, damping: 15 } as const;

export const pressable = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.95 },
  transition: pressSpring,
} as const;

// Info-Karten: lösen sich beim Hover organisch vom Hintergrund
// (leichtes Anheben + minimale Vergrößerung, weiche Feder).
export const cardLift = {
  whileHover: { y: -4, scale: 1.015 },
  transition: { type: "spring", stiffness: 300, damping: 20 },
} as const;

// Icon-Tilt: verspieltes, subtiles Kippen bei Interaktion (max. 6°).
export const iconTilt = {
  whileHover: { scale: 1.1, rotate: 6 },
  whileTap: { scale: 0.9, rotate: -3 },
  transition: { type: "spring", stiffness: 300, damping: 12 },
} as const;

// Wrapper für Icon-Chips: macht jedes Icon-Quadrat interaktiv kippbar,
// ohne die bestehenden Styles anzufassen (einfach drumlegen).
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.span {...iconTilt} className={className} style={{ display: "inline-grid" }}>
      {children}
    </motion.span>
  );
}

// Next-Link mit Motion-Fähigkeiten (für Button-artige Links).
export const MotionLink = motion.create(Link);

// ── Magnetischer Hover-Wrapper ──
// Zieht das Kind sanft zum Cursor (max. ~`strength` px) und federt beim
// Verlassen zurück. Rein transform-basiert (GPU) über gefederte MotionValues.
// Kein Effekt auf Touch-Geräten und bei „reduzierte Bewegung" — dort ein
// simpler Passthrough, damit nichts hakt oder springt.
export function Magnetic({
  children,
  className,
  strength = 8,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Weiche Feder für organisches Nachziehen statt hartem 1:1-Folgen.
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  if (reduced) return <span className={className}>{children}</span>;

  const onMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    // Nur echte Maus (fine pointer) zieht magnetisch — Finger nicht.
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    // Auf ±strength begrenzen, relativ zur halben Kartengröße.
    x.set(Math.max(-1, Math.min(1, dx / (r.width / 2))) * strength);
    y.set(Math.max(-1, Math.min(1, dy / (r.height / 2))) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy, display: "inline-block" }}
      className={className}
    >
      {children}
    </motion.span>
  );
}
