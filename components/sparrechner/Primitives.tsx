"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { eur } from "./format";

// Sanft zählende Zahl — macht Änderungen im Ergebnis spürbar statt sprunghaft.
export function useAnimatedNumber(target: number, duration = 550): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * (1 - Math.pow(1 - t, 3));
      setValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

export function Slider({
  id, label, value, min, max, step, onChange, display, hint,
}: {
  id: string; label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        <span className="font-display text-base font-semibold tabular-nums text-accent-ink">{display}</span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="range mt-2"
        style={{ "--p": `${pct}%` } as React.CSSProperties}
      />
      {hint && <p className="text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, ariaLabel,
}: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-1.5 rounded-2xl border border-line bg-canvas p-1.5">
      {options.map((o) => (
        <button
          key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`h-10 flex-1 rounded-xl px-2 text-sm font-medium transition-colors cursor-pointer ${
            value === o.value ? "bg-accent text-white shadow-[0_6px_16px_-8px_rgba(176,84,58,0.9)]" : "text-ink-soft hover:bg-surface-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function OptionCard({
  on, onClick, title, hint, right,
}: {
  on: boolean; onClick: () => void; title: string; hint: string; right?: string;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      /*
       * Ausgewählte Karten bekommen einen weichen Akzent-Schein statt nur
       * einer Rahmenfarbe. Auf dem Handy fehlt der Hover-Zustand komplett —
       * ohne diesen Schein war nach dem Antippen kaum zu erkennen, was
       * gerade aktiv ist. `active:` gibt zusätzlich sofortiges Feedback im
       * Moment der Berührung, noch bevor der Zustand umschaltet.
       */
      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-300 active:scale-[0.98] cursor-pointer ${
        on
          ? "border-accent bg-accent-soft/45 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_18%,transparent),0_10px_28px_-14px_color-mix(in_oklab,var(--color-accent)_65%,transparent)]"
          : "border-line bg-canvas hover:border-line-strong active:border-accent/60"
      }`}
    >
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
        on ? "border-accent bg-accent text-white" : "border-line-strong"
      }`}>
        {on && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-tight text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">{hint}</span>
      </span>
      {right && <span className="shrink-0 text-sm tabular-nums text-muted">{right}</span>}
    </button>
  );
}

export function Step({ no, title, subtitle, children }: { no: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6 transition-shadow duration-300 hover:shadow-[0_18px_44px_-24px_rgba(33,28,23,0.22)] sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong bg-canvas font-display text-sm font-semibold text-accent-ink">
          {no}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-snug text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Zeile({ farbe, label, zusatz, wert }: { farbe: string; label: string; zusatz?: string; wert: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex min-w-0 items-center gap-2 text-white/60">
        <span className={`h-2 w-2 shrink-0 rounded-full ${farbe}`} />
        <span className="truncate">{label}</span>
        {zusatz && <span className="shrink-0 text-white/35">{zusatz}</span>}
      </dt>
      <dd className="shrink-0 tabular-nums">{eur.format(wert)}</dd>
    </div>
  );
}

export function PrintRow({ label, wert }: { label: string; wert: string }) {
  return (
    <tr>
      <td className="py-[1.2mm] pr-3 text-[#4d453c]">{label}</td>
      <td className="py-[1.2mm] text-right tabular-nums text-[#211c17]">{wert}</td>
    </tr>
  );
}
