"use client";

import { useState } from "react";

/*
 * Zahleneingabe fürs Admin-Panel.
 *
 * Behebt zwei Fehler, die in allen Panels dieselben waren:
 *
 * 1. Die Zahl ließ sich nicht löschen. Aus einem leeren Feld wurde über
 *    `+e.target.value` sofort wieder eine 0, die im nächsten Render zurück
 *    ins Feld sprang — man musste die alte Zahl umständlich überschreiben.
 *
 * 2. Wo bei jedem Tastendruck auf `min` geklemmt wurde, war es unmöglich,
 *    größere Werte zu tippen: Im Zeitlimit-Feld (min. 5) wurde aus der
 *    ersten "1" von "120" sofort eine "5", die nächste Ziffer landete
 *    dahinter — man kam nie bei 120 an.
 *
 * Lösung: Während des Tippens gilt der Rohtext, er darf auch leer oder
 * zwischenzeitlich außerhalb der Grenzen sein. Erst beim Verlassen des
 * Feldes wird begrenzt und der endgültige Wert gemeldet.
 */
export default function ZahlFeld({
  value, onChange, min, max, step, className, id, disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  // null = nicht in Bearbeitung, dann zeigt das Feld den echten Wert.
  const [roh, setRoh] = useState<string | null>(null);

  function begrenzen(n: number): number {
    if (!Number.isFinite(n)) return min ?? 0;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }

  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={className}
      value={roh ?? String(value)}
      onChange={(e) => {
        const text = e.target.value;
        setRoh(text);
        // Zwischenstände ohne gültige Zahl (leer, "-", "1e") nicht melden —
        // sonst landet NaN im Zustand.
        const n = Number(text);
        if (text !== "" && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const n = Number(roh ?? value);
        onChange(begrenzen(Number.isFinite(n) && (roh ?? "") !== "" ? n : value));
        setRoh(null);
      }}
    />
  );
}
