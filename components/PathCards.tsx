"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { GlowCard } from "@/components/ui/spotlight-card";
import { LinkPreview } from "@/components/ui/link-preview";
import Reveal from "@/components/Reveal";
import { ArrowIcon } from "@/components/icons";
import { paths } from "@/lib/data";

// Canvas-2D-Dot-Reveal (three.js-frei), erst bei Bedarf geladen.
const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/canvas-reveal-effect").then((m) => m.CanvasRevealEffect),
  { ssr: false }
);

export default function PathCards() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div className="mt-14 grid items-start gap-8 md:grid-cols-3">
      {paths.map((p, i) => {
        const isOpen = openIdx === i;
        return (
          <Reveal key={p.no} delay={i * 110}>
            <GlowCard className="group flex flex-col rounded-3xl p-5">
              <div
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))}
                className="arch relative aspect-[3/4] overflow-hidden border border-line-strong"
              >
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
                />
                {/* Cooles Kärtchen-Design: Punkteraster schimmert beim Hover über dem Foto */}
                <AnimatePresence>
                  {hoverIdx === i && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pointer-events-none absolute inset-0 z-10"
                    >
                      <CanvasRevealEffect
                        animationSpeed={4}
                        containerClassName="bg-transparent"
                        colors={[
                          [176, 84, 58],
                          [212, 150, 110],
                        ]}
                        dotSize={3}
                        showGradient={false}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="mt-5 flex flex-1 flex-col">
                <span className="eyebrow text-accent">{p.no}</span>
                {/* Titel verweist mit Bild-Vorschau (LinkPreview) direkt auf die Leistungsseite */}
                <h3 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight">
                  <LinkPreview url={p.link.href} imageSrc={p.image} className="font-display text-2xl font-semibold leading-tight tracking-tight">
                    {p.title}
                  </LinkPreview>
                </h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{p.body}</p>

                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="mt-3 inline-flex w-fit items-center gap-2 font-medium text-accent transition-colors hover:text-accent-ink cursor-pointer"
                >
                  {isOpen ? "Weniger" : "Mehr erfahren"}
                  <ArrowIcon
                    className={`h-4 w-4 transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 rounded-2xl bg-canvas p-4">
                        <p className="text-sm leading-relaxed text-ink-soft">{p.more}</p>
                        <Link
                          href={p.link.href}
                          className="group mt-3 inline-flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white cursor-pointer"
                        >
                          {p.link.label}
                          <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlowCard>
          </Reveal>
        );
      })}
    </div>
  );
}
