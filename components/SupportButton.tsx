"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Mail, Phone, FileQuestion, Bot, Send, ArrowLeft, Sparkles } from "lucide-react";
import { brand } from "@/lib/data";
import { pressSpring, Tilt } from "@/components/ui/motion";

type Msg = { from: "bot" | "user"; text: string };

const DEFAULT_GREETING = "Hallo! 👋 Wie kann ich dir rund um Smart-Home, Server & Energie sparen helfen?";

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "chat">("menu");
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: DEFAULT_GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Begrüßung + KI-Status aus den Einstellungen laden.
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        setAiOn(!!d?.enabled);
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
    <div className="pointer-events-none fixed bottom-5 right-4 z-[90] flex flex-col items-end gap-3 pb-safe sm:right-5">
      {/* Panel — Spring-Einblendung, verlässt das DOM beim Schließen (AnimatePresence) */}
      <AnimatePresence>
      {open && (
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96, transition: { duration: 0.16, ease: "easeIn" } }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="pointer-events-auto flex w-[min(21rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(33,28,23,0.35)]"
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
            <p className="flex items-center gap-1.5 truncate text-xs text-white/60">
              {view === "chat" ? (
                <>
                  <span className={`h-1.5 w-1.5 rounded-full ${aiOn ? "bg-emerald-400" : "bg-white/40"}`} />
                  {aiOn ? "KI online — direkt antworten" : "Antwort per Nachricht"}
                </>
              ) : (
                "Persönlich, ohne Warteschleife."
              )}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
        {view === "menu" ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="p-2"
          >
            <button type="button" onClick={() => setView("chat")} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-canvas cursor-pointer">
              <Tilt><span className="relative grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                <Bot className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" /></span></Tilt>
              <span><span className="block text-sm font-medium text-ink">Mit Assistent chatten</span><span className="block text-xs text-muted">Schnelle Fragen — sofort</span></span>
            </button>
            <Link href="/kontakt" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
              <Tilt><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><MessageCircle className="h-5 w-5" /></span></Tilt>
              <span><span className="block text-sm font-medium text-ink">Anfrage stellen</span><span className="block text-xs text-muted">Formular & Pakete</span></span>
            </Link>
            <a href={`mailto:${brand.email}`} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
              <Tilt><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><Mail className="h-5 w-5" /></span></Tilt>
              <span><span className="block text-sm font-medium text-ink">E-Mail</span><span className="block text-xs text-muted">{brand.email}</span></span>
            </a>
            <a href={`tel:${brand.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
              <Tilt><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><Phone className="h-5 w-5" /></span></Tilt>
              <span><span className="block text-sm font-medium text-ink">Anrufen</span><span className="block text-xs text-muted">{brand.phone}</span></span>
            </a>
            <Link href="/stromrechner" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
              <Tilt><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><FileQuestion className="h-5 w-5" /></span></Tilt>
              <span><span className="block text-sm font-medium text-ink">Sparpotenzial?</span><span className="block text-xs text-muted">Energie-Spar-Rechner</span></span>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <div ref={scrollRef} className="flex max-h-[min(15rem,40dvh)] min-h-[9rem] flex-col gap-2 overflow-y-auto overscroll-contain bg-canvas/60 p-3">
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
              <Sparkles className="h-3 w-3" /> {aiOn ? "KI-Assistent aktiv" : "Assistent · KI im Admin aktivierbar"}
            </p>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
      )}
      </AnimatePresence>

      {/* Schwebe-Button — Spring-Physik: leichtes Anheben, knackiges Eindrücken */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Support schließen" : "Support öffnen"}
        aria-expanded={open}
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.92 }}
        transition={pressSpring}
        className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-[0_12px_30px_-8px_rgba(176,84,58,0.5)] transition-colors hover:bg-accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer"
      >
        <span className="relative block h-6 w-6">
          <motion.span
            className="absolute inset-0"
            animate={{ rotate: open ? 90 : 0, scale: open ? 0 : 1, opacity: open ? 0 : 1 }}
            transition={pressSpring}
          >
            <MessageCircle className="h-6 w-6" />
          </motion.span>
          <motion.span
            className="absolute inset-0"
            animate={{ rotate: open ? 0 : -90, scale: open ? 1 : 0, opacity: open ? 1 : 0 }}
            transition={pressSpring}
          >
            <X className="h-6 w-6" />
          </motion.span>
        </span>
      </motion.button>
    </div>
  );
}
