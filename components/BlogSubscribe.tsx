"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

// Kostenloses Blog-Abo (wie novum): E-Mail eintragen, bei konfiguriertem
// SMTP kommt eine Bestätigungs-Mail (Double-Opt-In), Abmelden per Link.
export default function BlogSubscribe() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "verified" | "pending">("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Anmeldung fehlgeschlagen."); setBusy(false); return; }
      setDone(d.verified ? "verified" : "pending");
    } catch {
      setError("Verbindungsfehler — bitte später erneut versuchen.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-16 rounded-3xl border border-line bg-surface p-7 sm:p-9">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Mail className="h-6 w-6" /></span>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Blog kostenlos abonnieren</h2>
        <p className="mt-2 text-ink-soft">
          Neue Beiträge direkt ins Postfach — kostenlos, ohne Tracking, jederzeit mit einem Klick abbestellbar.
        </p>

        {done ? (
          <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            {done === "pending" ? "Fast geschafft — bitte den Link in der Bestätigungs-Mail anklicken." : "Abonniert! Sie erhalten ab jetzt neue Beiträge per E-Mail."}
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              className="h-12 w-full rounded-full border border-line bg-canvas px-5 text-ink placeholder:text-muted outline-none focus:border-accent"
            />
            {/* Honeypot */}
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
            <button type="submit" disabled={busy} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Abonnieren
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
