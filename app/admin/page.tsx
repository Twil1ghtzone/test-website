"use client";

import { useState } from "react";
import { LogIn, LogOut, Star, Inbox, ReceiptText, FileText, ShieldCheck, UserPlus } from "lucide-react";
import Login from "@/components/ui/animated-characters-login-page";

const adminCards = [
  { icon: Star, title: "Bewertungen", body: "Eingereichte Kundenbewertungen prüfen und freigeben." },
  { icon: Inbox, title: "Anfragen", body: "Kontaktanfragen und Konfigurator-Auswahlen einsehen." },
  { icon: ReceiptText, title: "Rechnungen", body: "Rechnungsnummern verwalten — schalten Bewertungen frei." },
  { icon: FileText, title: "Inhalte", body: "Texte, Leistungen und Bilder der Website pflegen." },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);

  // Login- / Registrierungs-Overlay (Prototyp) — gleiche Charakter-Animation, Registrierung mit Sprechblasen
  if (authMode) {
    return (
      <div className="fixed inset-0 z-[200] bg-canvas">
        <Login mode={authMode} onSuccess={() => { setAuthed(true); setAuthMode(null); }} onClose={() => setAuthMode(null)} />
      </div>
    );
  }

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <span className="inline-flex items-center gap-2 eyebrow text-accent">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white"><ShieldCheck className="h-5 w-5" /></span>
          Admin-Bereich
        </span>

        {!authed ? (
          <div className="mt-8 flex max-w-xl flex-col items-start rounded-3xl border border-line bg-surface p-8">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Interner Bereich</h1>
            <p className="mt-3 text-ink-soft">
              Dieser Bereich ist geschützt. Bitte melden Sie sich an, um Bewertungen, Anfragen,
              Rechnungen und Inhalte zu verwalten.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer"
              >
                <LogIn className="h-5 w-5" />
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-7 py-3.5 font-medium text-ink transition-colors hover:border-ink cursor-pointer"
              >
                <UserPlus className="h-5 w-5" />
                Konto erstellen
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight">Übersicht</h1>
                <p className="mt-2 text-ink-soft">Willkommen zurück. Hier verwalten Sie Ihre Website.</p>
              </div>
              <button
                type="button"
                onClick={() => setAuthed(false)}
                className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Abmelden
              </button>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {adminCards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.title} className="group rounded-3xl border border-line bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_22px_50px_-22px_rgba(176,84,58,0.4)]">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 font-display text-lg font-semibold tracking-tight">{c.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{c.body}</p>
                    <span className="mt-4 inline-block rounded-full bg-canvas px-3 py-1 text-xs text-muted">Demnächst</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
