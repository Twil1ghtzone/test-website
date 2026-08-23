"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation, type Variants, type TargetAndTransition } from "framer-motion";

interface GridConfig {
  numCards: number;
  cols: number;
  xBase: number;
  yBase: number;
  xStep: number;
  yStep: number;
}

// Lade-Skeleton, an die warme Clay-Palette der Seite angepasst.
const AnimatedLoadingSkeleton = ({ numCards = 6 }: { numCards?: number }) => {
  const [windowWidth, setWindowWidth] = useState(0);
  const controls = useAnimation();

  const getGridConfig = (width: number): GridConfig => ({
    numCards,
    cols: width >= 1024 ? 3 : width >= 640 ? 2 : 1,
    xBase: 40,
    yBase: 60,
    xStep: 210,
    yStep: 230,
  });

  // `TargetAndTransition` ist exakt das, was `controls.start()` erwartet:
  // Zielwerte plus eigene Transition. Vorher stand hier `any` — ein Tippfehler
  // in einem der Feldnamen wäre stillschweigend durchgegangen.
  const generateSearchPath = (config: GridConfig): TargetAndTransition => {
    const { numCards, cols, xBase, yBase, xStep, yStep } = config;
    const rows = Math.ceil(numCards / cols);
    const allPositions: { x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (row * cols + col < numCards) {
          allPositions.push({ x: xBase + col * xStep, y: yBase + row * yStep });
        }
      }
    }
    const shuffled = allPositions.sort(() => Math.random() - 0.5).slice(0, 4);
    if (shuffled.length === 0) return {};
    shuffled.push(shuffled[0]);
    return {
      x: shuffled.map((p) => p.x),
      y: shuffled.map((p) => p.y),
      scale: Array(shuffled.length).fill(1.2),
      transition: {
        duration: shuffled.length * 2,
        repeat: Infinity,
        ease: [0.4, 0, 0.2, 1],
        times: shuffled.map((_, i) => i / (shuffled.length - 1)),
      },
    };
  };

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth === 0) return;
    controls.start(generateSearchPath(getGridConfig(windowWidth)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowWidth, controls]);

  const frameVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  };
  // Variante als Funktion: bekommt den `custom`-Wert der Karte (ihren Index)
  // und staffelt daraus die Verzögerung.
  const cardVariants: Variants = {
    hidden: { y: 16, opacity: 0 },
    visible: (i: number) => ({ y: 0, opacity: 1, transition: { delay: i * 0.08, duration: 0.4 } }),
  };
  const glowVariants: Variants = {
    animate: {
      boxShadow: [
        "0 0 20px rgba(176, 84, 58, 0.18)",
        "0 0 34px rgba(176, 84, 58, 0.4)",
        "0 0 20px rgba(176, 84, 58, 0.18)",
      ],
      scale: [1, 1.1, 1],
      transition: { duration: 1, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const config = getGridConfig(windowWidth);

  // Shimmer zwischen unseren Linien-Tönen
  const shimmer = { background: ["#efe9dd", "#e4dccd", "#efe9dd"] };
  const shimmerTransition = { duration: 1.5, repeat: Infinity };

  return (
    <motion.div
      className="mx-auto w-full max-w-4xl rounded-2xl border border-line bg-surface p-6 shadow-[0_18px_50px_-20px_rgba(33,28,23,0.15)]"
      variants={frameVariants}
      initial="hidden"
      animate="visible"
      aria-hidden="true"
    >
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-canvas to-surface-2 p-8">
        <motion.div className="absolute z-10 pointer-events-none" animate={controls} style={{ left: 24, top: 24 }}>
          <motion.div className="rounded-full bg-accent/15 p-3 backdrop-blur-sm" variants={glowVariants} animate="animate">
            <svg className="h-6 w-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(config.numCards)].map((_, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              className="rounded-lg border border-line/60 bg-surface p-4 shadow-sm"
            >
              <motion.div className="mb-3 h-32 rounded-md bg-surface-2" animate={shimmer} transition={shimmerTransition} />
              <motion.div className="mb-2 h-3 w-3/4 rounded bg-surface-2" animate={shimmer} transition={shimmerTransition} />
              <motion.div className="h-3 w-1/2 rounded bg-surface-2" animate={shimmer} transition={shimmerTransition} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AnimatedLoadingSkeleton;
