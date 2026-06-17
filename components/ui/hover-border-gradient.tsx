"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

// An die warme Clay-Palette angepasst (statt Schwarz/Weiß).
const movingMap: Record<Direction, string> = {
  TOP: "radial-gradient(20.7% 50% at 50% 0%, var(--color-accent) 0%, rgba(176,84,58,0) 100%)",
  LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, var(--color-accent) 0%, rgba(176,84,58,0) 100%)",
  BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, var(--color-accent) 0%, rgba(176,84,58,0) 100%)",
  RIGHT: "radial-gradient(16.2% 41.2% at 100% 50%, var(--color-accent) 0%, rgba(176,84,58,0) 100%)",
};

const highlight = "radial-gradient(75% 181% at 50% 50%, #b0543a 0%, rgba(176,84,58,0) 100%)";

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Element = "button",
  duration = 1,
  clockwise = true,
  tone = "light",
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
    duration?: number;
    clockwise?: boolean;
    tone?: "light" | "dark";
  } & Record<string, unknown>
>) {
  const [hovered, setHovered] = useState(false);
  const [direction, setDirection] = useState<Direction>("TOP");

  const rotateDirection = (current: Direction): Direction => {
    const dirs: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
    const i = dirs.indexOf(current);
    const next = clockwise ? (i - 1 + dirs.length) % dirs.length : (i + 1) % dirs.length;
    return dirs[next];
  };

  useEffect(() => {
    if (!hovered) {
      const interval = setInterval(() => setDirection((p) => rotateDirection(p)), duration * 1000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  return (
    <Element
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex h-min w-fit flex-nowrap content-center items-center justify-center gap-2 overflow-visible rounded-full border p-px transition-transform duration-300 hover:scale-[1.02] cursor-pointer",
        tone === "dark" ? "border-white/15 bg-white/5" : "border-line bg-surface",
        containerClassName
      )}
      {...props}
    >
      <div className={cn("z-10 rounded-[inherit] bg-accent px-7 py-3.5 font-medium text-white", className)}>
        {children}
      </div>
      <motion.div
        className="absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
        style={{ filter: "blur(2px)", width: "100%", height: "100%" }}
        initial={{ background: movingMap[direction] }}
        animate={{ background: hovered ? [movingMap[direction], highlight] : movingMap[direction] }}
        transition={{ ease: "linear", duration: duration ?? 1 }}
      />
      <div className="absolute inset-[2px] z-[1] flex-none rounded-[inherit] bg-accent" />
    </Element>
  );
}

export default HoverBorderGradient;
