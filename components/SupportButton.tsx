"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Mail, Phone, FileQuestion } from "lucide-react";
import { brand } from "@/lib/data";

// Dezenter Support-Button unten rechts — öffnet ein kleines Hilfe-Panel.
export default function SupportButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-3">
      {/* Panel */}
      <div
        className={`w-[min(20rem,calc(100vw-2.5rem))] origin-bottom-right overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(33,28,23,0.35)] transition-all duration-300 ${
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="bg-night px-5 py-4 text-canvas">
          <p className="font-display text-lg font-semibold">Wie können wir helfen?</p>
          <p className="mt-0.5 text-sm text-white/65">Persönlich, ohne Warteschleife.</p>
        </div>
        <div className="p-2">
          <Link href="/kontakt" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><MessageCircle className="h-5 w-5" /></span>
            <span><span className="block text-sm font-medium text-ink">Anfrage stellen</span><span className="block text-xs text-muted">Formular & Pakete</span></span>
          </Link>
          <a href={`mailto:${brand.email}`} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><Mail className="h-5 w-5" /></span>
            <span><span className="block text-sm font-medium text-ink">E-Mail</span><span className="block text-xs text-muted">{brand.email}</span></span>
          </a>
          <a href={`tel:${brand.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><Phone className="h-5 w-5" /></span>
            <span><span className="block text-sm font-medium text-ink">Anrufen</span><span className="block text-xs text-muted">{brand.phone}</span></span>
          </a>
          <Link href="/stromrechner" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><FileQuestion className="h-5 w-5" /></span>
            <span><span className="block text-sm font-medium text-ink">Sparpotenzial?</span><span className="block text-xs text-muted">Strom-Spar-Rechner</span></span>
          </Link>
        </div>
      </div>

      {/* Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Support schließen" : "Support öffnen"}
        aria-expanded={open}
        className="grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-[0_12px_30px_-8px_rgba(176,84,58,0.6)] transition-all duration-300 hover:bg-accent-ink hover:scale-105 cursor-pointer"
      >
        <span className="relative block h-6 w-6">
          <MessageCircle className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
          <X className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
        </span>
      </button>
    </div>
  );
}
