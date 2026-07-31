"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "framer-motion";
import { hero } from "@/lib/data";
import { ArrowIcon } from "./icons";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { MotionLink, Magnetic, pressable, useReducedMotionSafe } from "@/components/ui/motion";

export default function Hero() {
  const reduced = useReducedMotionSafe();
  const { scrollY } = useScroll();
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll-Distanz der Reveal-Animation: auf Mobil kürzer (weniger Scrollen).
  const [SCROLL_HEIGHT, setScrollHeight] = useState(900);
  useEffect(() => {
    const update = () => setScrollHeight(window.innerWidth < 640 ? 480 : 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Klick auf „Scrollen": langsam (halbe Geschwindigkeit) bis zum nächsten Abschnitt scrollen —
  // dabei läuft die scroll-gebundene Bild-Animation sichtbar und gemächlich ab.
  const scrollToNext = () => {
    const next = sectionRef.current?.nextElementSibling as HTMLElement | null;
    const targetY = next
      ? next.getBoundingClientRect().top + window.scrollY
      : window.scrollY + window.innerHeight;

    if (reduced) {
      window.scrollTo(0, targetY);
      return;
    }

    const startY = window.scrollY;
    const distance = targetY - startY;
    // ~0.4 px/ms ≈ halb so schnell wie der native Smooth-Scroll
    const duration = Math.min(3000, Math.max(1200, Math.abs(distance) / 0.4));
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let start: number | null = null;

    // Globales scroll-behavior: smooth würde mit dem per-Frame-Scroll kollidieren → kurz abschalten.
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(p));
      if (p < 1) requestAnimationFrame(step);
      else root.style.scrollBehavior = prev;
    };
    requestAnimationFrame(step);
  };

  // Bild-Fenster: startet klein & mittig mit abgerundeten Ecken, wächst auf Vollbild —
  // die Ecken werden dabei bis zum Schluss eckig.
  const clipInset = useTransform(scrollY, [0, SCROLL_HEIGHT], [36, 0]); // % rundum
  const clipRadius = useTransform(scrollY, [0, SCROLL_HEIGHT], [28, 0]); // px Eckenradius
  const clipPath = useMotionTemplate`inset(${clipInset}% round ${clipRadius}px)`;

  // Bild zoomt sanft raus, während es sich ausbreitet
  const backgroundSize = useTransform(scrollY, [0, SCROLL_HEIGHT + 300], ["220%", "110%"]);

  // Frost-Karte hinter dem Text: erscheint wenn das Bild stark genug ist
  const cardOpacity = useTransform(scrollY, [SCROLL_HEIGHT * 0.15, SCROLL_HEIGHT * 0.55], [0, 1]);
  const cardBlur = useTransform(scrollY, [SCROLL_HEIGHT * 0.15, SCROLL_HEIGHT * 0.55], [0, 12]);

  if (reduced) {
    return (
      <section ref={sectionRef} className="relative px-5 pt-32 pb-12 text-center sm:pt-40">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: "url(/haus-illustration.png)",
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.18,
          }}
          role="img"
          aria-label="Querschnitt eines smarten Zuhauses mit Server, Steuerung und Solar"
        />
        <HeroText onScrollClick={scrollToNext} />
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      style={{ height: `calc(${SCROLL_HEIGHT}px + 100vh)` }}
      className="relative w-full"
    >
      <div className="sticky top-0 flex h-screen w-full items-start justify-center overflow-hidden pt-28 sm:items-center sm:pt-0">

        {/* ── LAYER 1: expandierendes Bild (ganz hinten) ── */}
        <motion.div
          className="absolute inset-0 bg-canvas"
          style={{ clipPath, willChange: "clip-path" }}
          aria-hidden="true"
        >
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: "url(/haus-illustration.png)",
              backgroundSize,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              // Bild startet sehr transparent, wird beim Scrollen sichtbarer
              opacity: useTransform(scrollY, [0, SCROLL_HEIGHT * 0.5], [0.22, 1]),
            }}
          />
        </motion.div>

        {/* ── LAYER 2: starkes Cream-Overlay am Anfang → schwindet beim Scrollen ── */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-canvas"
          style={{
            // Startet fast deckend, blendet aus wenn Bild groß genug ist
            opacity: useTransform(scrollY, [0, SCROLL_HEIGHT * 0.55], [0.82, 0]),
          }}
          aria-hidden="true"
        />

        {/* ── LAYER 3: Text mit Frost-Karte (erscheint wenn Bild sichtbar wird) ── */}
        <div className="relative z-10 px-5 text-center">
          {/* Frost-Karte — transparent am Anfang, weich einblendend beim Scrollen */}
          <motion.div
            className="absolute inset-[-1.25rem_-1rem] rounded-3xl border border-white/40 sm:inset-[-2rem_-2.5rem]"
            style={{
              opacity: cardOpacity,
              backdropFilter: useMotionTemplate`blur(${cardBlur}px)`,
              WebkitBackdropFilter: useMotionTemplate`blur(${cardBlur}px)`,
              background: "color-mix(in oklab, var(--color-canvas) 72%, transparent)",
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <HeroText onScrollClick={scrollToNext} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroText({ onScrollClick }: { onScrollClick?: () => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <span className="eyebrow inline-flex items-center gap-2 text-accent">
        <span className="h-px w-8 bg-accent" />
        {hero.eyebrow}
        <span className="h-px w-8 bg-accent" />
      </span>
      <h1 className="mt-6 font-display text-[2.15rem] font-semibold leading-[1.06] tracking-tight text-balance sm:text-[4.6rem] sm:leading-[1.04]">
        {hero.titleLead} <span className="emph">{hero.titleEmph}</span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:mt-7 sm:text-lg">
        {hero.body}
      </p>
      <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:items-center">
        <Magnetic strength={10} className="w-full sm:w-auto">
          <HoverBorderGradient
            as="a"
            href="/kontakt"
            containerClassName="w-full sm:w-auto"
            className="group flex w-full items-center justify-center gap-2 px-7 py-4"
          >
            {hero.ctaPrimary}
            <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </HoverBorderGradient>
        </Magnetic>
        <Magnetic strength={8} className="w-full sm:w-auto">
          <MotionLink
            href="#ablauf"
            {...pressable}
            className="block rounded-full border border-line-strong bg-surface/90 px-7 py-4 text-center font-medium text-ink transition-colors hover:border-ink cursor-pointer"
          >
            {hero.ctaSecondary}
          </MotionLink>
        </Magnetic>
      </div>
      <motion.button
        type="button"
        onClick={onScrollClick}
        aria-label="Zum nächsten Abschnitt scrollen"
        whileTap={{ scale: 0.9 }}
        transition={pressable.transition}
        className="group mt-12 inline-flex animate-bounce flex-col items-center gap-1 text-muted transition-colors hover:text-accent cursor-pointer"
      >
        <span className="eyebrow">Scrollen</span>
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M6 13l6 6 6-6" />
        </svg>
      </motion.button>
    </div>
  );
}
