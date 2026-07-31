"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/* ════════════════════════════════════════════════════════════════════════
   Parallax-Schicht hinter dem Inhalt: weiche Lichtfelder in den Markentönen,
   die beim Scrollen ruhig driften, dazu eine feine Korn- und Leinen-Textur
   für ein hochwertiges Papiergefühl statt einer leeren Fläche.

   WICHTIG — warum hier NICHT auf prefers-reduced-motion verzweigt wird:
   Vorher stand hier `if (reduced) return (…)` mit einer anderen Struktur als
   im Normalfall. `useReducedMotion()` kann auf dem Server aber nichts messen
   (kein matchMedia) und liefert dort null, während es im Browser den echten
   Wert kennt. Ergebnis: Der Server lieferte 5 Kindelemente, ein Client mit
   aktivierter Bewegungsreduzierung rechnete mit 3 — React meldete einen
   Hydration-Fehler und verwarf den ganzen Teilbaum.

   Deshalb rendert die Komponente jetzt IMMER dieselbe Struktur. Ob Bewegung
   gezeigt wird, entscheidet ausschließlich CSS (siehe globals.css,
   @media (prefers-reduced-motion: reduce)): dort wird der Drift der Felder
   mit `transform: none !important` stillgestellt. Eine Regel aus dem
   Stylesheet gewinnt gegen einen nicht-!important-Inline-Stil — genau das,
   was Framer Motion schreibt.
   ════════════════════════════════════════════════════════════════════════ */
export default function ScrollBackdrop() {
  const { scrollY } = useScroll();
  // Gefederte Scroll-Position → geschmeidige, nachlaufende Bewegung.
  const s = useSpring(scrollY, { stiffness: 60, damping: 22, restDelta: 1 });

  const y1 = useTransform(s, (v) => v * 0.18);
  const r1 = useTransform(s, (v) => v * 0.02);
  const y2 = useTransform(s, (v) => v * -0.14);
  const x2 = useTransform(s, (v) => v * -0.07);
  const y3 = useTransform(s, (v) => v * 0.26);
  const r3 = useTransform(s, (v) => v * -0.018);

  // `backdrop-drift` ist der Haken für die Reduzierungs-Regel in globals.css.
  const blob = "backdrop-drift absolute rounded-full blur-[80px] will-change-transform";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* warmes Clay-Feld oben rechts */}
      <motion.div
        className={`${blob} -right-40 -top-44 h-[38rem] w-[38rem] opacity-90`}
        style={{ y: y1, rotate: r1, background: "radial-gradient(closest-side, rgba(176,84,58,0.24), transparent 70%)" }}
      />
      {/* sandiges Feld links mittig */}
      <motion.div
        className={`${blob} -left-56 top-[36%] h-[44rem] w-[44rem] opacity-95`}
        style={{ y: y2, x: x2, background: "radial-gradient(closest-side, rgba(211,200,181,0.55), transparent 70%)" }}
      />
      {/* zartes Akzentfeld unten rechts */}
      <motion.div
        className={`${blob} -bottom-56 right-[10%] h-[40rem] w-[40rem] opacity-80`}
        style={{ y: y3, rotate: r3, background: "radial-gradient(closest-side, rgba(236,217,207,0.7), transparent 70%)" }}
      />
      {/* Feine Korn-Textur — statisch, kostet nichts an Performance/Akku. */}
      <div aria-hidden className="grain absolute inset-0 opacity-[0.035]" />
      {/* Feines Leinen-Kreuzmuster, darüber eine sehr sanfte Vignette zu den
          Rändern. Beides rein statisch (kein Repaint, keine Animation) — gibt
          der Fläche Tiefe und Materialität, ohne dass es wie Bewegung wirkt. */}
      <div aria-hidden className="linen absolute inset-0" />
      <div aria-hidden className="vignette absolute inset-0" />
    </div>
  );
}
