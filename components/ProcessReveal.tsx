"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/Reveal";
import { process } from "@/lib/data";

// Three.js-frei: schlanke Canvas-2D-Reveal, erst bei Bedarf geladen.
const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/canvas-reveal-effect").then((m) => m.CanvasRevealEffect),
  { ssr: false }
);

export default function ProcessReveal() {
  return (
    <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {process.map((p, i) => (
        <StepCard key={p.step} step={p.step} title={p.title} body={p.body} delay={i * 90} />
      ))}
    </div>
  );
}

function StepCard({ step, title, body, delay }: { step: string; title: string; body: string; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay} className="h-full">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group/rc relative h-full overflow-hidden rounded-3xl border border-line bg-surface p-6 transition-colors duration-300 hover:border-accent/40"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-0"
            >
              <CanvasRevealEffect
                animationSpeed={4}
                containerClassName="bg-night"
                colors={[
                  [176, 84, 58],
                  [212, 150, 110],
                ]}
                dotSize={3}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-accent font-display text-lg font-semibold text-accent transition-colors duration-300 group-hover/rc:border-white/70 group-hover/rc:text-white">
            {step}
          </span>
          <h3 className="mt-5 font-display text-xl font-semibold tracking-tight transition-colors duration-300 group-hover/rc:text-white">
            {title}
          </h3>
          <p className="mt-2 leading-relaxed text-ink-soft transition-colors duration-300 group-hover/rc:text-white/80">
            {body}
          </p>
        </div>
      </div>
    </Reveal>
  );
}
