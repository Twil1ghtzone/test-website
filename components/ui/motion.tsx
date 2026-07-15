"use client";

import { motion } from "framer-motion";
import Link from "next/link";

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
