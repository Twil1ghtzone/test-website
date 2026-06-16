"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Schlanke, durchsuchbare Auswahl im Stil der Seite (Ersatz für native <select>).
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Auswählen …",
  searchable = true,
  name,
  id,
  ariaLabel,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  searchable?: boolean;
  name?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = searchable && q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options;

  return (
    <div className="relative" ref={ref}>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-canvas px-4 py-3 text-left transition-colors hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none cursor-pointer"
      >
        <span className={value ? "text-ink" : "text-muted"}>{value || placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {open && (
        <div className="pop-in absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[0_18px_50px_-16px_rgba(33,28,23,0.25)]">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Suchen …"
                className="h-10 w-full bg-transparent text-sm text-ink placeholder:text-muted outline-none"
              />
            </div>
          )}
          <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nichts gefunden.</li>}
            {filtered.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o === value}
                  onClick={() => { onChange(o); setOpen(false); setQ(""); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-canvas cursor-pointer"
                >
                  <Check className={cn("h-4 w-4 shrink-0 text-accent", o === value ? "opacity-100" : "opacity-0")} />
                  <span className={o === value ? "font-medium text-ink" : "text-ink-soft"}>{o}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Combobox;
