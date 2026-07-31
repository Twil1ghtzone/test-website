"use client";
import * as React from "react";

import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "framer-motion";
import { useReducedMotionSafe } from "@/components/ui/motion";

interface iISmoothScrollHeroProps {
  /** Height of the scroll section in pixels @default 800 */
  scrollHeight?: number;
  /** Background image URL for desktop view */
  desktopImage: string;
  /** Background image URL for mobile view (defaults to desktopImage) */
  mobileImage?: string;
  /** Initial clip path percentage @default 30 */
  initialClipPercentage?: number;
  /** Final clip path percentage @default 70 */
  finalClipPercentage?: number;
}

const SmoothScrollHeroBackground: React.FC<Required<iISmoothScrollHeroProps>> = ({
  scrollHeight,
  desktopImage,
  mobileImage,
  initialClipPercentage,
  finalClipPercentage,
}) => {
  const { scrollY } = useScroll();

  const clipStart = useTransform(scrollY, [0, scrollHeight], [initialClipPercentage, 0]);
  const clipEnd = useTransform(scrollY, [0, scrollHeight], [finalClipPercentage, 100]);

  const clipPath = useMotionTemplate`polygon(${clipStart}% ${clipStart}%, ${clipEnd}% ${clipStart}%, ${clipEnd}% ${clipEnd}%, ${clipStart}% ${clipEnd}%)`;

  // sanfter Zoom-out: das Bild „breitet sich aus", während der Rahmen wächst
  const backgroundSize = useTransform(scrollY, [0, scrollHeight + 500], ["180%", "112%"]);

  return (
    <motion.div
      className="sticky top-0 h-screen w-full bg-canvas"
      style={{ clipPath, willChange: "clip-path" }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: `url(${mobileImage})`,
          backgroundSize,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <motion.div
        className="absolute inset-0 hidden md:block"
        style={{
          backgroundImage: `url(${desktopImage})`,
          backgroundSize,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    </motion.div>
  );
};

/**
 * Smooth-Scroll-Hero mit Parallax-/Clip-Path-Reveal.
 * Respektiert `prefers-reduced-motion`: zeigt dann das Bild statisch.
 */
const SmoothScrollHero: React.FC<iISmoothScrollHeroProps> = ({
  scrollHeight = 800,
  desktopImage,
  mobileImage,
  initialClipPercentage = 30,
  finalClipPercentage = 70,
}) => {
  const reduced = useReducedMotionSafe();
  const mobile = mobileImage ?? desktopImage;

  if (reduced) {
    return (
      <div className="relative w-full bg-canvas">
        <div
          className="h-[70vh] w-full bg-canvas"
          style={{
            backgroundImage: `url(${desktopImage})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
          role="img"
          aria-label="Querschnitt eines smarten Zuhauses mit Server, Steuerung und Solar"
        />
      </div>
    );
  }

  return (
    <div style={{ height: `calc(${scrollHeight}px + 100vh)` }} className="relative w-full">
      <SmoothScrollHeroBackground
        scrollHeight={scrollHeight}
        desktopImage={desktopImage}
        mobileImage={mobile}
        initialClipPercentage={initialClipPercentage}
        finalClipPercentage={finalClipPercentage}
      />
    </div>
  );
};

export default SmoothScrollHero;
