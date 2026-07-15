"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { pressable } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import { Component as ReviewStack, type CardData } from "@/components/ui/morphing-card-stack";

type ApiReview = { id: string; name: string; rating: number; text: string; createdAt: string; kind: "teil" | "end"; phaseLabel: string };
type Phase = "invoice" | "form" | "done";
type VerifyResult = { valid: boolean; alreadyReviewed?: boolean; kindLabel?: string; phaseLabel?: string; error?: string };

export default function Testimonials() {
  const [enabled, setEnabled] = useState(true);
  const [reviews, setReviews] = useState<CardData[]>([]);
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("invoice");
  const [invoice, setInvoice] = useState("");
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [donePending, setDonePending] = useState(true);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot — bleibt für Menschen leer
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Echte, freigegebene Bewertungen vom Server laden.
  async function load() {
    try {
      const r = await fetch("/api/reviews", { cache: "no-store" });
      const d = await r.json();
      setEnabled(!!d.enabled);
      setAverage(d.average || 0);
      setCount(d.count || 0);
      setReviews(
        (d.reviews as ApiReview[]).map((r) => ({
          id: r.id,
          author: r.name,
          rating: r.rating,
          text: r.text,
          meta: r.kind === "teil"
            ? `Teilbewertung · ${r.phaseLabel} · Verifizierte Rechnung`
            : `${new Date(r.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" })} · Verifizierte Rechnung`,
        }))
      );
    } catch {
      setEnabled(false);
    }
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  function reset() {
    setPhase("invoice"); setInvoice(""); setVerify(null); setError("");
    setRating(0); setHover(0); setName(""); setText("");
  }

  // Schritt 1: Rechnungsnummer ECHT gegen das System prüfen.
  async function checkInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice.trim()) return;
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", invoice }),
      });
      const d: VerifyResult = await r.json();
      if (!d.valid) { setError(d.error || "Rechnungsnummer nicht gefunden."); setBusy(false); return; }
      if (d.alreadyReviewed) {
        setError(`Für diese Rechnung wurde im aktuellen Status („${d.phaseLabel}") bereits bewertet. Nach dem nächsten Projektschritt ist eine weitere Bewertung möglich.`);
        setBusy(false);
        return;
      }
      setVerify(d);
      setPhase("form");
    } catch {
      setError("Verbindungsfehler — bitte später erneut versuchen.");
    }
    setBusy(false);
  }

  // Schritt 2: Bewertung absenden (serverseitig versiegelt).
  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || !name.trim() || text.trim().length < 10) {
      setError("Bitte Sterne, Name und mindestens 10 Zeichen Text angeben.");
      return;
    }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rating, text: text.trim(), invoice, website }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Senden fehlgeschlagen."); setBusy(false); return; }
      setDonePending(!!d.pending);
      setPhase("done");
      if (!d.pending) load();
    } catch {
      setError("Verbindungsfehler — bitte später erneut versuchen.");
    }
    setBusy(false);
  }

  if (loaded && !enabled) return null; // System im Admin deaktiviert → Sektion ausblenden

  const field =
    "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted transition-colors focus:border-accent focus:bg-surface";

  return (
    <section id="bewertungen" className="px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-accent">Kundenstimmen</span>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-[3rem]">
            Das sagen unsere <span className="emph">Kunden.</span>
          </h2>
          {count > 0 ? (
            <p className="mt-4 inline-flex items-center gap-2 text-lg leading-relaxed text-ink-soft">
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                {average.toFixed(1)} <Star className="h-5 w-5 fill-accent text-accent" />
              </span>
              aus {count} {count === 1 ? "Bewertung" : "Bewertungen"} — nur mit echter Rechnung, serverseitig versiegelt.
            </p>
          ) : (
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              Bewertungen sind nur mit gültiger Rechnungsnummer möglich — echte Stimmen aus echten Projekten.
            </p>
          )}
        </div>

        {reviews.length > 0 && (
          <div className="mt-14">
            <ReviewStack cards={reviews} />
          </div>
        )}

        <div className="mx-auto mt-16 max-w-md text-center">
          {!open && (
            <>
              <motion.button
                type="button"
                onClick={() => { reset(); setOpen(true); }}
                {...pressable}
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-7 py-3.5 font-medium text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
              >
                <Star className="h-5 w-5 text-accent" />
                Service bewerten
              </motion.button>
              <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-sm text-muted">
                <ShieldCheck className="h-4 w-4" />
                Nur mit Rechnungsnummer — auch Teilbewertungen während der Umsetzung.
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
                    Bewertungen sind nur für echte Kunden möglich. Bitte geben Sie die Rechnungsnummer
                    aus Ihrer Rechnung ein — sie wird direkt in unserem System geprüft.
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
                  {error && <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                  <button
                    type="submit"
                    disabled={busy || !invoice.trim()}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-40 cursor-pointer"
                  >
                    {busy && <Loader2 className="h-5 w-5 animate-spin" />} Prüfen & weiter
                  </button>
                </form>
              )}

              {phase === "form" && verify && (
                <form onSubmit={submitReview}>
                  <span className="inline-flex items-center gap-1.5 eyebrow text-accent">
                    <ShieldCheck className="h-4 w-4" /> Rechnung bestätigt
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">Ihre Bewertung</h3>
                  <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
                    Projektstatus: <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-ink">{verify.phaseLabel}</span>
                    → Sie geben eine <b>{verify.kindLabel}</b> ab.
                  </p>

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
                  <input id="rev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Familie Müller" className={field} maxLength={80} />

                  <label htmlFor="rev-text" className="mt-4 mb-1.5 block eyebrow text-muted">Ihre Erfahrung</label>
                  <textarea id="rev-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Was hat Ihnen gefallen — bisher oder insgesamt?" className={cn(field, "resize-none")} maxLength={1200} />

                  {/* Honeypot gegen Bots — für Menschen unsichtbar */}
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
                  />

                  {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

                  <button
                    type="submit"
                    disabled={busy || !rating || !name.trim() || !text.trim()}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    {busy && <Loader2 className="h-5 w-5 animate-spin" />} Bewertung absenden
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
                    {donePending
                      ? "Ihre Bewertung wurde sicher übermittelt, versiegelt und erscheint nach kurzer Prüfung."
                      : "Ihre Bewertung ist jetzt online — versiegelt und verifiziert."}
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
