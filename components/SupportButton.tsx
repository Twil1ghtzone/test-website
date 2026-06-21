"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Mail, Phone, FileQuestion, Bot, Send, ArrowLeft, Sparkles } from "lucide-react";
import { brand } from "@/lib/data";

type Msg = { from: "bot" | "user"; text: string };

const DEFAULT_GREETING = "Hallo! 👋 Wie kann ich dir rund um Smart-Home, Server & Energie sparen helfen?";

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "chat">("menu");
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: DEFAULT_GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Begrüßung aus den KI-Einstellungen laden.
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (d?.greeting) setMessages((m) => (m.length === 1 && m[0].from === "bot" ? [{ from: "bot", text: d.greeting }] : m));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (view === "chat") scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, view, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || busy) return;
    const next: Msg[] = [...messages, { from: "user", text: t }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.from === "user" ? "user" : "assistant", text: m.text })) }),
      });
      const d = await r.json();
      setMessages((m) => [...m, { from: "bot", text: d.reply || "Entschuldige, das hat nicht geklappt." }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Verbindungsfehler. Bitte später erneut versuchen." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-[90] flex flex-col items-end gap-3 sm:right-5">
      {/* Panel */}
      <div
        className={`flex w-[min(21rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(33,28,23,0.4)] transition-all duration-300 ${
          open ? "pointer-events-auto translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        {/* Kopf */}
        <div className="flex items-center gap-3 bg-night px-5 py-4 text-canvas">
          {view === "chat" && (
            <button type="button" onClick={() => setView("menu")} aria-label="Zurück" className="-ml-1 text-white/70 transition-colors hover:text-white cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-white">
            {view === "chat" ? <Bot className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold leading-tight">
              {view === "chat" ? "Assistent" : "Wie können wir helfen?"}
            </p>
            <p className="truncate text-xs text-white/60">
              {view === "chat" ? "Platzhalter — bald mit KI" : "Persönlich, ohne Warteschleife."}
            </p>
          </div>
        </div>

        {view === "menu" ? (
          <div className="p-2">
            <button type="button" onClick={() => setView("chat")} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-canvas cursor-pointer">
              <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                <Bot className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
              </span>
              <span><span className="block text-sm font-medium text-ink">Mit Assistent chatten</span><span className="block text-xs text-muted">Schnelle Fragen — sofort</span></span>
            </button>
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
        ) : (
          <>
            <div ref={scrollRef} className="flex max-h-[15rem] min-h-[9rem] flex-col gap-2 overflow-y-auto bg-canvas/60 p-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <span
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.from === "user" ? "bg-accent text-white" : "border border-line bg-surface text-ink-soft"
                    }`}
                  >
                    {m.text}
                  </span>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <span className="flex items-center gap-1 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                  </span>
                </div>
              )}
            </div>
            <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-2.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nachricht schreiben …"
                className="h-10 w-full rounded-full border border-line bg-canvas px-4 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
              />
              <button type="submit" aria-label="Senden" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-ink cursor-pointer">
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="flex items-center justify-center gap-1 pb-2.5 text-center text-[11px] text-muted">
              <Sparkles className="h-3 w-3" /> KI-Assistent · im Admin konfigurierbar
            </p>
          </>
        )}
      </div>

      {/* Button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Support schließen" : "Support öffnen"}
        aria-expanded={open}
        className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-[0_12px_30px_-8px_rgba(176,84,58,0.6)] transition-all duration-300 hover:scale-105 hover:bg-accent-ink cursor-pointer"
      >
        <span className="relative block h-6 w-6">
          <MessageCircle className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
          <X className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
        </span>
      </button>
    </div>
  );
}
