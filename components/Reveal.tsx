"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof React.JSX.IntrinsicElements;
};

// Leichtes Scroll-Reveal. Robust auf Mobil: triggert sobald das Element
// auch nur leicht in den Viewport kommt + Sicherheits-Fallback, damit
// nie etwas unsichtbar (und damit „tot") hängen bleibt.
export default function Reveal({ children, className = "", delay = 0, as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Schon sichtbar beim Laden? Sofort zeigen.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setShown(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      // threshold 0 = sobald 1px sichtbar (fix für hohe Sektionen auf Mobil)
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);

    // Fallback: nach 1.2s auf jeden Fall zeigen.
    const fallback = window.setTimeout(() => setShown(true), 1200);

    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
