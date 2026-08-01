"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X, Mail, Phone, FileQuestion, Bot, Send, ArrowLeft, Sparkles, RotateCcw, ShieldCheck, Maximize2, Minimize2 } from "lucide-react";
import { brand } from "@/lib/data";
import { pressSpring, Tilt } from "@/components/ui/motion";

type Msg = { from: "bot" | "user"; text: string };

const DEFAULT_GREETING = "Hallo! 👋 Wie kann ich dir rund um Smart-Home, Server & Energie sparen helfen?";

/** Rückfall, solange das echte Limit aus /api/chat noch nicht geladen ist. */
const DEFAULT_TIMEOUT_MS = 120000;
/**
 * Kleiner Zuschlag auf das Server-Zeitlimit, bevor der Browser selbst abbricht.
 * Damit gewinnt im Normalfall die AUSSAGEKRÄFTIGE Server-Antwort das Rennen
 * ("Zeitüberschreitung nach X s — Modell war noch nicht fertig") statt eines
 * blanken Client-Abbruchs. Der Client-Abbruch greift nur, wenn der Server
 * wirklich nicht antwortet (hängende Verbindung).
 */
const TIMEOUT_ZUSCHLAG_MS = 5000;

export default function SupportButton({
  email = brand.email,
  phone = brand.phone,
}: {
  /** Kommen serverseitig aus dem Admin ("Rechtstexte & Kontakt") — brand.* nur als Rückfall. */
  email?: string;
  phone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "chat">("menu");
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: DEFAULT_GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  /**
   * Vergangene Sekunden der laufenden Anfrage. Ein hochzählender Wert statt
   * eines starren Hinweises: Vorher stand "Das Modell rechnet noch" bis zu
   * zwei Minuten unverändert da und sah aus wie ein Absturz.
   */
  const [wartet, setWartet] = useState(0);
  /** Erlaubt das Abbrechen einer laufenden Anfrage — von Hand oder automatisch. */
  const abbruchRef = useRef<AbortController | null>(null);
  const [resetting, setResetting] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  /**
   * Zeitlimit aus den KI-Einstellungen im Admin ("Zeitlimit (Sekunden)").
   * Der Browser hält sich an denselben Wert wie der Server — vorher wartete er
   * unbegrenzt weiter, obwohl der Server längst abgebrochen hatte.
   */
  const [timeoutMs, setTimeoutMs] = useState(DEFAULT_TIMEOUT_MS);
  const [hadReturningChat, setHadReturningChat] = useState(false);
  /** Vergrößerte Ansicht — mehr Platz für lange Antworten, ohne extra Klick auf eine Unterseite. */
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Begrüßung + KI-Status laden. Läuft ausschließlich über den HttpOnly-
  // Cookie: gibt es einen gültigen, noch nicht abgelaufenen Chat, kommt der
  // gespeicherte (und hier erst entschlüsselte) Verlauf gleich mit zurück —
  // ganz ohne dass das Frontend irgendetwas selbst gespeichert hätte.
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        setAiOn(!!d?.enabled);
        if (d?.greeting) setGreeting(d.greeting);
        if (typeof d?.timeoutMs === "number" && d.timeoutMs > 0) setTimeoutMs(d.timeoutMs);
        if (Array.isArray(d?.messages) && d.messages.length > 0) {
          setMessages(d.messages.map((m: { from: string; text: string }) => ({ from: m.from === "user" ? "user" : "bot", text: m.text })));
          setHadReturningChat(true);
        } else if (d?.greeting) {
          setMessages([{ from: "bot", text: d.greeting }]);
        }
      })
      .catch(() => {});
  }, []);

  // `wartet` gehört mit in die Abhängigkeiten: Der Sekundenzähler wächst
  // während des Wartens und schiebt den Inhalt nach unten. Ohne ihn blieb das
  // Fenster stehen und man musste von Hand nachscrollen, um den Hinweis und
  // den Abbrechen-Knopf überhaupt zu sehen.
  useEffect(() => {
    if (view !== "chat") return;
    // Kleiner Delay, damit das DOM den neuen Inhalt (Nachricht, Lade-Punkte,
    // Sekundenzähler) schon eingefügt hat, bevor gescrollt wird. Ohne Delay
    // springt scrollTo manchmal ins Leere, weil die Höhe noch nicht stimmt.
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, view, busy, wartet]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || busy) return;
    setMessages((m) => [...m, { from: "user", text: t }]);
    setInput("");
    setBusy(true);
    setWartet(0);

    // Sekundenzähler: macht sichtbar, dass die Anfrage lebt.
    const start = Date.now();
    const ticker = window.setInterval(() => setWartet(Math.floor((Date.now() - start) / 1000)), 1000);

    const controller = new AbortController();
    abbruchRef.current = controller;

    // Automatischer Abbruch am eingestellten Zeitlimit (plus Zuschlag, damit
    // die erklärende Server-Antwort Vorrang hat). Ohne das wartete der Browser
    // unbegrenzt und der Chat sah dauerhaft "beschäftigt" aus.
    let zeitlimitErreicht = false;
    const notbremse = window.setTimeout(() => {
      zeitlimitErreicht = true;
      controller.abort();
    }, timeoutMs + TIMEOUT_ZUSCHLAG_MS);

    try {
      // Nur die NEUE Nachricht geht raus — der Verlauf lebt serverseitig,
      // verschlüsselt, hinter dem Sitzungs-Cookie. So kann niemand über die
      // Entwicklertools erfundene KI-Antworten in den Kontext einschleusen.
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
        signal: controller.signal,
      });
      const d = await r.json().catch(() => null);
      // Der Server liefert auf JEDEM Pfad ein `reply` mit. Fehlt es trotzdem,
      // zeigen wir die echte Server-Meldung statt eines nichtssagenden Satzes —
      // sonst sucht man den Fehler an der falschen Stelle.
      const antwort =
        d?.reply ||
        (d?.error ? `Es gab ein Problem: ${d.error}` : `Der Server antwortete unerwartet (HTTP ${r.status}).`);
      setMessages((m) => [...m, { from: "bot", text: antwort }]);
      setHadReturningChat(true);
    } catch (e) {
      // Drei Fälle klar auseinanderhalten — sonst rätselt man, warum keine
      // Antwort kam: selbst abgebrochen, Zeitlimit erreicht, Netzfehler.
      const abgebrochen = e instanceof DOMException && e.name === "AbortError";
      const sekunden = Math.round((timeoutMs + TIMEOUT_ZUSCHLAG_MS) / 1000);
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: !abgebrochen
            ? "Verbindungsfehler. Bitte später erneut versuchen."
            : zeitlimitErreicht
              ? `Das Zeitlimit von ${sekunden} s ist erreicht — das Modell hat nicht rechtzeitig geantwortet. ` +
                "Schreib uns gern direkt, dann antwortet ein Mensch."
              : "Abgebrochen. Du kannst die Frage neu stellen — oder uns direkt schreiben, dann antwortet ein Mensch.",
        },
      ]);
    } finally {
      window.clearInterval(ticker);
      window.clearTimeout(notbremse);
      abbruchRef.current = null;
      setWartet(0);
      setBusy(false);
    }
  }

  /** Bricht die laufende Anfrage ab (der Server rechnet ggf. noch fertig). */
  function abbrechen() {
    abbruchRef.current?.abort();
  }

  // "Neuer Chat" — löscht den Verlauf serverseitig vollständig und beginnt
  // sauber neu. Gedacht für: falls man mit der KI nicht weiterkommt, oder
  // einfach ein neues Thema anfangen möchte.
  async function startOver() {
    if (resetting) return;
    setResetting(true);
    try {
      await fetch("/api/chat", { method: "DELETE" });
    } catch {
      /* Cookie ist client-seitig ohnehin nicht lesbar — im Zweifel einfach lokal zurücksetzen. */
    }
    setMessages([{ from: "bot", text: greeting }]);
    setHadReturningChat(false);
    setResetting(false);
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
        className={`pointer-events-auto flex max-h-[calc(100dvh-2.5rem)] ${
          expanded ? "w-[min(26rem,calc(100vw-2rem))]" : "w-[min(21rem,calc(100vw-2rem))]"
        } panel-texture origin-bottom-right flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(33,28,23,0.35)] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
      >
        {/* Kopf */}
        <div className="relative flex items-center gap-3 bg-night px-5 py-4 text-canvas">
          <div aria-hidden className="panel-texture-dark pointer-events-none absolute inset-0" />
          {view === "chat" && (
            <button type="button" onClick={() => setView("menu")} aria-label="Zurück" className="relative -ml-1 text-white/70 transition-colors hover:text-white cursor-pointer">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <span className="relative z-10 grid h-9 w-9 place-items-center rounded-lg bg-accent text-white">
            {view === "chat" ? <Bot className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          </span>
          <div className="relative z-10 min-w-0 flex-1">
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
          {/* Fenster vergrößern/verkleinern — mehr Platz für lange
              KI-Antworten, ohne dass man dafür eine Unterseite öffnen muss. */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Fenster verkleinern" : "Fenster vergrößern"}
            aria-label={expanded ? "Fenster verkleinern" : "Fenster vergrößern"}
            className="relative z-10 shrink-0 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          {/* "Neuer Chat" — löscht den bisherigen Verlauf serverseitig und
              beginnt sauber neu; hilfreich, falls man mit der KI nicht
              weiterkommt oder ein neues Thema anfangen möchte. */}
          {view === "chat" && (hadReturningChat || messages.length > 1) && (
            <button
              type="button"
              onClick={startOver}
              disabled={resetting}
              title="Neuer Chat — löscht den bisherigen Verlauf"
              aria-label="Neuer Chat"
              className="relative z-10 shrink-0 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
            </button>
          )}
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
            <a href={`mailto:${email}`} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
              <Tilt><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><Mail className="h-5 w-5" /></span></Tilt>
              <span><span className="block text-sm font-medium text-ink">E-Mail</span><span className="block text-xs text-muted">{email}</span></span>
            </a>
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas cursor-pointer">
              <Tilt><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent"><Phone className="h-5 w-5" /></span></Tilt>
              <span><span className="block text-sm font-medium text-ink">Anrufen</span><span className="block text-xs text-muted">{phone}</span></span>
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
            <div
              ref={scrollRef}
              className={`panel-texture flex ${
                expanded ? "max-h-[min(26rem,56dvh)]" : "max-h-[min(15rem,40dvh)]"
              } min-h-[9rem] flex-col gap-2 overflow-y-auto overscroll-contain bg-canvas/60 p-3 transition-[max-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
            >
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
                <div className="flex flex-col items-start gap-1.5">
                  <span className="flex items-center gap-1 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                  </span>
                  {/* Ein lokales Modell kann 30–120 s brauchen. Statt eines
                      starren Hinweises laufen hier Sekunden hoch — so ist
                      sichtbar, dass die Anfrage lebt und nicht hängt. Ab 8 s
                      kommt der Abbrechen-Knopf dazu. */}
                  {wartet >= 3 && (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-[11px] text-muted">
                      {/* Bewusst OHNE Zeitlimit und ohne Hinweis auf lokale
                          Modelle: Das ist Betriebsinnenleben, das einen Kunden
                          nichts angeht und nur verunsichert. Nur die
                          verstrichene Zeit, damit sichtbar ist, dass es läuft. */}
                      <span className="tabular-nums">Einen Moment … {wartet} s</span>
                      {wartet >= 8 && (
                        <button
                          type="button"
                          onClick={abbrechen}
                          className="rounded-full border border-line px-2 py-0.5 font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent-ink cursor-pointer"
                        >
                          Abbrechen
                        </button>
                      )}
                    </span>
                  )}
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
            <p className="flex items-center justify-center gap-1.5 pb-2.5 text-center text-[11px] text-muted">
              <ShieldCheck className="h-3 w-3 shrink-0" />
              Verschlüsselt gespeichert · löscht sich nach 7 Tagen selbst
            </p>
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
