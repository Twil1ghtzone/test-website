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

// Next-Link mit Motion-Fähigkeiten (für Button-artige Links).
export const MotionLink = motion.create(Link);
