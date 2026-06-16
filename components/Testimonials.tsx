"use client";

import { useState } from "react";
import { Star, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Component as ReviewStack, type CardData } from "@/components/ui/morphing-card-stack";

// Beispiel-Bewertungen (Platzhalter — später durch echte ersetzen).
const SEED_REVIEWS: CardData[] = [
  {
    id: "s1",
    author: "Familie M.",
    rating: 5,
    text: "Endlich keine monatlichen Cloud-Gebühren mehr. Die Kameras laufen komplett im Haus, alles sauber verkabelt und ordentlich montiert.",
    meta: "Einfamilienhaus · Verifizierte Bewertung",
  },
  {
    id: "s2",
    author: "Herr K.",
    rating: 5,
    text: "Sehr verständlich erklärt, auch für uns als Laien. Der Server läuft seit Monaten ohne Probleme, unsere Fotos sichern sich automatisch.",
    meta: "Reihenhaus · Verifizierte Bewertung",
  },
  {
    id: "s3",
    author: "Frau B.",
    rating: 5,
    text: "Die 3D-gedruckten Halterungen sitzen perfekt. Handwerklich top und technisch durchdacht — man merkt, dass beide Welten zusammenkommen.",
    meta: "Altbau · Verifizierte Bewertung",
  },
  {
    id: "s4",
    author: "Familie S.",
    rating: 4,
    text: "Tolle Beratung rund ums Energiesparen. Heizung und Licht lassen sich jetzt clever steuern, das macht sich bemerkbar.",
    meta: "Neubau · Verifizierte Bewertung",
  },
];

/**
 * PROTOTYP: Eine Bewertung ist nur mit gültiger Rechnungsnummer möglich.
 * Diese Prüfung später durch echtes Backend ersetzen (Abgleich mit erstellten Rechnungen).
 * Testcode für die Demo: DEMO-1234  (oder Muster RG-2026-001).
 */
function verifyInvoice(code: string): boolean {
  const c = code.trim().toUpperCase();
  if (!c) return false;
  if (c === "DEMO-1234") return true;
  return /^RG-\d{4}-\d{3,}$/.test(c);
}

type Phase = "invoice" | "form" | "done";

export default function Testimonials() {
  const [reviews, setReviews] = useState<CardData[]>(SEED_REVIEWS);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("invoice");

  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  function reset() {
    setPhase("invoice");
    setInvoice("");
    setError("");
    setRating(0);
    setHover(0);
    setName("");
    setText("");
  }

  function checkInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (verifyInvoice(invoice)) {
      setError("");
      setPhase("form");
    } else {
      setError("Diese Rechnungsnummer konnten wir nicht bestätigen. Eine Bewertung ist nur mit gültiger Rechnung möglich.");
    }
  }

  function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || !name.trim() || !text.trim()) return;
    const newReview: CardData = {
      id: `u-${Date.now()}`,
      author: name.trim(),
      rating,
      text: text.trim(),
      meta: "Verifizierte Bewertung",
    };
    setReviews((prev) => [newReview, ...prev]);
    setPhase("done");
  }

  const field =
    "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted transition-colors focus:border-accent focus:bg-surface";

  return (
    <section id="bewertungen" className="px-5 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-accent">Kundenstimmen</span>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-[3rem]">
            Das sagen unsere <span className="emph">Kunden.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Echte Rückmeldungen aus echten Projekten. Tippen Sie eine Karte an oder wechseln Sie die Ansicht.
          </p>
        </div>

        <div className="mt-14">
          <ReviewStack cards={reviews} />
        </div>

        {/* Bewerten — nur mit Rechnung */}
        <div className="mx-auto mt-16 max-w-md text-center">
          {!open && (
            <>
              <button
                type="button"
                onClick={() => { reset(); setOpen(true); }}
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-7 py-3.5 font-medium text-ink transition-colors hover:border-ink cursor-pointer"
              >
                <Star className="h-5 w-5 text-accent" />
                Service bewerten
              </button>
              <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm text-muted">
                <ShieldCheck className="h-4 w-4" />
                Nur mit Rechnungsnummer möglich — für echte Bewertungen.
              </p>
            </>
          )}

          {open && (
            <div className="relative rounded-3xl border border-line bg-surface p-6 text-left sm:p-8">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {phase === "invoice" && (
                <form onSubmit={checkInvoice}>
                  <span className="eyebrow text-accent">Schritt 1 von 2</span>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">Rechnung bestätigen</h3>
                  <p className="mt-2 text-ink-soft">
                    Bewertungen sind nur für echte Kunden möglich. Bitte geben Sie Ihre Rechnungsnummer ein.
                  </p>
                  <label htmlFor="invoice" className="mt-5 mb-1.5 block eyebrow text-muted">Rechnungsnummer</label>
                  <input
                    id="invoice"
                    value={invoice}
                    onChange={(e) => setInvoice(e.target.value)}
                    placeholder="z. B. RG-2026-001"
                    className={field}
                    autoComplete="off"
                  />
                  {error && <p className="mt-2 text-sm text-accent-ink">{error}</p>}
                  <p className="mt-2 text-xs text-muted">Prototyp — Testcode: <span className="font-mono">DEMO-1234</span></p>
                  <button
                    type="submit"
                    className="mt-5 w-full rounded-xl bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer"
                  >
                    Weiter
                  </button>
                </form>
              )}

              {phase === "form" && (
                <form onSubmit={submitReview}>
                  <span className="inline-flex items-center gap-1.5 eyebrow text-accent">
                    <ShieldCheck className="h-4 w-4" /> Rechnung bestätigt
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">Ihre Bewertung</h3>

                  <label className="mt-5 mb-1.5 block eyebrow text-muted">Ihre Sterne</label>
                  <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHover(n)}
                        onClick={() => setRating(n)}
                        aria-label={`${n} von 5 Sternen`}
                        className="cursor-pointer p-0.5"
                      >
                        <Star className={cn("h-8 w-8 transition-colors", (hover || rating) >= n ? "fill-accent text-accent" : "fill-transparent text-line-strong")} />
                      </button>
                    ))}
                  </div>

                  <label htmlFor="rev-name" className="mt-5 mb-1.5 block eyebrow text-muted">Name</label>
                  <input id="rev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Familie Müller" className={field} />

                  <label htmlFor="rev-text" className="mt-4 mb-1.5 block eyebrow text-muted">Ihre Erfahrung</label>
                  <textarea id="rev-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Was hat Ihnen gefallen?" className={cn(field, "resize-none")} />

                  <button
                    type="submit"
                    disabled={!rating || !name.trim() || !text.trim()}
                    className="mt-5 w-full rounded-xl bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    Bewertung absenden
                  </button>
                </form>
              )}

              {phase === "done" && (
                <div className="py-4 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
                    <ShieldCheck className="h-7 w-7" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-semibold">Vielen Dank!</h3>
                  <p className="mx-auto mt-2 max-w-sm text-ink-soft">
                    Ihre Bewertung wurde hinzugefügt. Im Live-Betrieb wird sie nach kurzer Prüfung veröffentlicht.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button type="button" onClick={reset} className="rounded-full border border-line-strong bg-surface px-6 py-3 font-medium text-ink transition-colors hover:border-ink cursor-pointer">
                      Weitere Bewertung
                    </button>
                    <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
                      Schließen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
