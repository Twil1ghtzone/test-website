"use client";

import { useRef } from "react";

// Wiederverwendbarer 3D-Tilt-Wrapper — dieselbe Logik wie die vier
// „Versprechen"-Boxen, aber als eine Zeile um beliebige Karten legbar.
// Maus-getrackt (nur echte Maus), Touch & reduced-motion bleiben flach
// (das regelt die .card-3d-CSS). Setzt nur --rx/--ry → GPU-Transform,
// kein Layout-Reflow, keine Ruckler.
export default function TiltCard({
  children,
  className = "",
  max = 6,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${px * max * 2}deg`);
    el.style.setProperty("--ry", `${-py * max * 2}deg`);
  };
  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div style={{ perspective: "1000px" }} className={className.includes("h-full") ? "h-full" : undefined}>
      <Tag ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={`card-3d ${className}`}>
        {children}
      </Tag>
    </div>
  );
}
