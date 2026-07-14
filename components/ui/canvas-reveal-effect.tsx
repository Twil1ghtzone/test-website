"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

// Schlanke Canvas-2D-Umsetzung des Dot-Matrix-Reveals (ohne three.js/R3F):
// animiertes Punkteraster, das von der Mitte nach außen „aufgeht" und flackert.
export const CanvasRevealEffect = ({
  animationSpeed = 4,
  colors = [[176, 84, 58]],
  containerClassName,
  dotSize = 3,
  showGradient = true,
}: {
  animationSpeed?: number;
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  // Farben stabilisieren, damit der Effekt nicht bei jedem Render neu startet.
  const colorKey = JSON.stringify(colors);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = JSON.parse(colorKey) as number[][];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const gap = 14; // Rasterabstand in CSS-Pixeln
    const start = performance.now();
    let raf = 0;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const cell = gap * dpr;
    const size = dotSize * dpr;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.hypot(cx, cy) || 1;

      for (let y = 0; y < h; y += cell) {
        for (let x = 0; x < w; x += cell) {
          const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
          const r = seed - Math.floor(seed); // 0..1 pseudo-zufällig, aber stabil pro Zelle
          const flick = 0.25 + 0.75 * Math.abs(Math.sin(t * animationSpeed * 0.6 + r * 6.283));
          const dist = Math.hypot(x - cx, y - cy) / maxDist;
          const reveal = Math.min(1, Math.max(0, (t * animationSpeed * 0.16 - dist) * 4));
          const op = flick * reveal;
          if (op <= 0.02) continue;
          const c = cols[Math.floor(r * cols.length) % cols.length];
          ctx.globalAlpha = op;
          ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.fillRect(x, y, size, size);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [animationSpeed, dotSize, colorKey]);

  return (
    <div className={cn("h-full relative w-full overflow-hidden", containerClassName)}>
      <canvas ref={ref} className="block h-full w-full" />
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
      )}
    </div>
  );
};
