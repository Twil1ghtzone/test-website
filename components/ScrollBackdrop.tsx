"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/* ════════════════════════════════════════════════════════════════════════
   Parallax-Schicht hinter dem Inhalt: weiche Lichtfelder in den Markentönen,
   die beim Scrollen ruhig driften, dazu eine feine Korn-Textur und ein sehr
   dezenter Lichtstreif.

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
   mit `transform: none !important` stillgestellt und die Schimmer-Animation
   abgeschaltet. Eine Regel aus dem Stylesheet gewinnt gegen einen
   nicht-!important-Inline-Stil — genau das, was Framer Motion schreibt.
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
      {/* Dezenter Lichtstreif, zieht alle paar Sekunden einmal quer über die
          Seite. Reines CSS, pausiert bei prefers-reduced-motion. */}
      <div aria-hidden className="sheen absolute inset-0" />
      {/* Dezente Schimmer-Partikel — winzige Lichtpunkte, die langsam
          aufsteigen und das Leere zwischen den Blobs etwas lebendiger machen.
          Feste Positionen (keine Zufallswerte), damit SSR und Client dasselbe
          rendern. Pausiert bei prefers-reduced-motion (über globals.css). */}
      <div aria-hidden className="shimmer-field">
        <span style={{ left: "8%", bottom: "-5%", ["--dur" as string]: "22s", ["--delay" as string]: "0s" } as React.CSSProperties} />
        <span style={{ left: "18%", bottom: "-12%", ["--dur" as string]: "26s", ["--delay" as string]: "4s" } as React.CSSProperties} />
        <span style={{ left: "32%", bottom: "-8%", ["--dur" as string]: "19s", ["--delay" as string]: "2s" } as React.CSSProperties} />
        <span style={{ left: "45%", bottom: "-15%", ["--dur" as string]: "24s", ["--delay" as string]: "7s" } as React.CSSProperties} />
        <span style={{ left: "58%", bottom: "-3%", ["--dur" as string]: "21s", ["--delay" as string]: "1s" } as React.CSSProperties} />
        <span style={{ left: "67%", bottom: "-10%", ["--dur" as string]: "28s", ["--delay" as string]: "5s" } as React.CSSProperties} />
        <span style={{ left: "78%", bottom: "-7%", ["--dur" as string]: "20s", ["--delay" as string]: "3s" } as React.CSSProperties} />
        <span style={{ left: "88%", bottom: "-14%", ["--dur" as string]: "25s", ["--delay" as string]: "8s" } as React.CSSProperties} />
        <span style={{ left: "25%", bottom: "-20%", ["--dur" as string]: "30s", ["--delay" as string]: "10s" } as React.CSSProperties} />
        <span style={{ left: "52%", bottom: "-18%", ["--dur" as string]: "27s", ["--delay" as string]: "6s" } as React.CSSProperties} />
        <span style={{ left: "72%", bottom: "-22%", ["--dur" as string]: "23s", ["--delay" as string]: "9s" } as React.CSSProperties} />
        <span style={{ left: "40%", bottom: "-25%", ["--dur" as string]: "32s", ["--delay" as string]: "12s" } as React.CSSProperties} />
      </div>
    </div>
  );
}
