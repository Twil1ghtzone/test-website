"use client";

import { motion, useScroll, useSpring } from "framer-motion";

// Fortschrittsleiste am oberen Rand — framer-motion useScroll + scaleX.
// Mobil kräftig sichtbar, auf dem Desktop nur eine dezente, dünne Linie.
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 380, damping: 40, restDelta: 0.001 });

  return (
    <>
      {/* Mobil: gut sichtbarer Fortschritt */}
      <motion.div
        aria-hidden
        style={{ scaleX, originX: 0 }}
        className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left rounded-r-full bg-gradient-to-r from-accent to-accent-ink shadow-[0_0_10px_rgba(176,84,58,0.55)] lg:hidden"
      />
      {/* Desktop: dezente, dünne Linie */}
      <motion.div
        aria-hidden
        style={{ scaleX, originX: 0 }}
        className="fixed inset-x-0 top-0 z-[60] hidden h-[2px] origin-left bg-accent/50 lg:block"
      />
    </>
  );
}
