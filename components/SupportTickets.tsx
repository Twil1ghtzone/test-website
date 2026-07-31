"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  LifeBuoy, Send, Loader2, Check, Ticket as TicketIcon, ArrowLeft,
  Paperclip, X, AlertTriangle, ShieldCheck, LogOut, FileText, Copy,
} from "lucide-react";
import { pressable } from "@/components/ui/motion";

type Anhang = { name: string; url: string; mime: string; size: number };
type Msg = { from: "kunde" | "team"; text: string; createdAt: string; anhaenge?: Anhang[] };
type TicketView = {
  number: string; name: string; subject: string;
  status: string; statusLabel: string; prio: string; prioLabel: string;
  createdAt: string; updatedAt: string; messages: Msg[];
};

const STATUS_STYLE: Record<string, string> = {
  offen: "bg-amber-100 text-amber-700",
  in_bearbeitung: "bg-sky-100 text-sky-700",
  warten_kunde: "bg-violet-100 text-violet-700",
  geloest: "bg-emerald-100 text-emerald-700",
  geschlossen: "bg-surface-2 text-ink-soft",
};
const PRIO_STYLE: Record<string, string> = {
  niedrig: "border-line-strong text-muted",
  mittel: "border-sky-300 text-sky-700",
  hoch: "border-amber-400 text-amber-700",
  dringend: "border-red-400 text-red-700",
};
const PRIOS = [
  { key: "niedrig", label: "Niedrig", hint: "Frage, kein Zeitdruck" },
  { key: "mittel", label: "Mittel", hint: "sollte diese Woche laufen" },
  { key: "hoch", label: "Hoch", hint: "behindert den Alltag" },
  { key: "dringend", label: "Dringend", hint: "Ausfall, Sicherheit" },
];

const MAX_DATEIEN = 3;
const MAX_MB = 6;
const ERLAUBT = "image/png,image/jpeg,image/gif,image/webp,application/pdf";

const datum = (s: string) =>
  new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const kb = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function SupportTickets() {
  const [mode, setMode] = useState<"list" | "new" | "view">("list");
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [active, setActive] = useState<TicketView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hinweis, setHinweis] = useState("");
  /** Zugriffscode wird EINMAL nach dem Anlegen gezeigt — danach nie wieder. */
  const [neuerCode, setNeuerCode] = useState<{ number: string; token: string; mail: boolean } | null>(null);
  const [kopiert, setKopiert] = useState(false);

  // Formular „neues Ticket"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [prio, setPrio] = useState("mittel");
  const [website, setWebsite] = useState(""); // Honeypot
  const [dateien, setDateien] = useState<File[]>([]);

  // Manueller Zugang (anderes Gerät)
  const [manNummer, setManNummer] = useState("");
  const [manCode, setManCode] = useState("");
  const [manOffen, setManOffen] = useState(false);

  const [reply, setReply] = useState("");
  const [replyDateien, setReplyDateien] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Lädt alle Tickets, auf die dieser Browser Zugriff hat. Der Zugriffscode
   * steckt in einem HttpOnly-Cookie — JavaScript sieht ihn nie, es genügt,
   * den Endpunkt ohne Parameter aufzurufen.
   */
  const laden = useCallback(async (oeffneNummer?: string) => {
    try {
      const r = await fetch("/api/support", { cache: "no-store" });
      const d = await r.json();
      const liste: TicketView[] = d.tickets || [];
      setTickets(liste);
      const ziel = oeffneNummer || d.offen;
      const treffer = ziel ? liste.find((t) => t.number === ziel) : null;
      if (treffer) { setActive(treffer); setMode("view"); }
    } catch {
      setErr("Verbindungsfehler.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Rückmeldung vom Magic-Link auswerten und aus der Adresszeile entfernen.
    const p = new URLSearchParams(window.location.search);
    const z = p.get("zugang");
    if (z === "ok") setHinweis("Zugang bestätigt — Ihr Ticket ist geöffnet.");
    else if (z === "abgelaufen") setErr("Der Link ist abgelaufen. Öffnen Sie Ihr Ticket mit Nummer und Zugriffscode.");
    else if (z === "ungueltig") setErr("Der Link ist ungültig.");
    else if (z === "limit") setErr("Zu viele Versuche — bitte kurz warten.");
    if (z) window.history.replaceState({}, "", window.location.pathname);
    laden();
  }, [laden]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [active]);

  function dateienPruefen(neu: FileList | null, vorhanden: File[]): File[] | string {
    if (!neu) return vorhanden;
    const liste = [...vorhanden];
    for (const f of Array.from(neu)) {
      if (liste.length >= MAX_DATEIEN) return `Höchstens ${MAX_DATEIEN} Dateien.`;
      if (f.size > MAX_MB * 1024 * 1024) return `„${f.name}" ist größer als ${MAX_MB} MB.`;
      liste.push(f);
    }
    return liste;
  }

  async function ticketAnlegen(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.set("name", name); fd.set("email", email); fd.set("subject", subject);
    fd.set("message", message); fd.set("prio", prio); fd.set("website", website);
    dateien.forEach((f) => fd.append("dateien", f));
    try {
      const r = await fetch("/api/support", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Konnte nicht gesendet werden."); setBusy(false); return; }
      setNeuerCode({ number: d.number, token: d.token, mail: !!d.mailVersandt });
      setName(""); setEmail(""); setSubject(""); setMessage(""); setPrio("mittel"); setDateien([]);
      await laden(d.number);
    } catch { setErr("Verbindungsfehler."); }
    setBusy(false);
  }

  async function antworten(e: React.FormEvent) {
    e.preventDefault();
    if (!active || busy || (!reply.trim() && replyDateien.length === 0)) return;
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.set("number", active.number); fd.set("text", reply);
    replyDateien.forEach((f) => fd.append("dateien", f));
    try {
      const r = await fetch("/api/support", { method: "PATCH", body: fd });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Konnte nicht gesendet werden."); setBusy(false); return; }
      setActive(d.ticket); setReply(""); setReplyDateien([]);
      setTickets((ts) => ts.map((t) => (t.number === d.ticket.number ? d.ticket : t)));
    } catch { setErr("Verbindungsfehler."); }
    setBusy(false);
  }

  async function manuellOeffnen(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(
        `/api/support?number=${encodeURIComponent(manNummer)}&token=${encodeURIComponent(manCode)}`,
        { cache: "no-store" }
      );
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Nicht gefunden."); setBusy(false); return; }
      setManNummer(""); setManCode(""); setManOffen(false);
      await laden(d.ticket.number);
    } catch { setErr("Verbindungsfehler."); }
    setBusy(false);
  }

  async function abmelden() {
    await fetch("/api/support", { method: "DELETE" });
    setTickets([]); setActive(null); setMode("list");
    setHinweis("Dieser Browser hat keinen Zugriff mehr auf Ihre Tickets.");
  }

  const feld = "h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent";
  const label = "mb-1.5 block text-sm font-medium text-ink";

  return (
    <div className="space-y-5">
      {(err || hinweis) && (
        <div className={`flex items-start gap-2.5 rounded-2xl border p-4 text-sm ${err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {err ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{err || hinweis}</span>
          <button type="button" onClick={() => { setErr(""); setHinweis(""); }} aria-label="Schließen" className="shrink-0 opacity-60 hover:opacity-100 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Zugriffscode einmalig anzeigen */}
      {neuerCode && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-accent/40 bg-accent-soft/50 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-semibold tracking-tight">Ticket angelegt: {neuerCode.number}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Dieser Browser bleibt angemeldet. <strong className="font-semibold text-ink">Notieren Sie den Zugriffscode</strong> —
                er wird nur jetzt angezeigt und ist der einzige Weg, das Ticket von einem anderen Gerät zu öffnen.
                {neuerCode.mail && " Wir haben Ihnen außerdem eine E-Mail mit einem Direktlink geschickt."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-xs text-ink">
                  {neuerCode.token}
                </code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(neuerCode.token); setKopiert(true); setTimeout(() => setKopiert(false), 2000); }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-xs font-medium text-ink transition-colors hover:border-accent cursor-pointer"
                >
                  {kopiert ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {kopiert ? "Kopiert" : "Kopieren"}
                </button>
              </div>
            </div>
            <button type="button" onClick={() => setNeuerCode(null)} aria-label="Schließen" className="shrink-0 text-muted hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}

      {/* ── Ticket-Ansicht ── */}
      {mode === "view" && active && (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:px-6">
            <button type="button" onClick={() => { setMode("list"); setActive(null); }} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink cursor-pointer">
              <ArrowLeft className="h-4 w-4" /> Übersicht
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${PRIO_STYLE[active.prio] || PRIO_STYLE.mittel}`}>{active.prioLabel}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[active.status] || STATUS_STYLE.offen}`}>{active.statusLabel}</span>
            </div>
          </div>
          <div className="border-b border-line px-4 py-3 sm:px-6">
            <h3 className="font-display text-lg font-semibold leading-tight tracking-tight">{active.subject}</h3>
            <p className="mt-0.5 text-xs text-muted">{active.number} · angelegt {datum(active.createdAt)}</p>
          </div>

          <div ref={scrollRef} className="flex max-h-[min(28rem,60dvh)] flex-col gap-3 overflow-y-auto overscroll-contain bg-canvas/60 p-4 sm:p-6">
            {active.messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "kunde" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.from === "kunde" ? "bg-accent text-white" : "border border-line bg-surface text-ink"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {(m.anhaenge || []).length > 0 && (
                    <div className={`mt-2 space-y-1 border-t pt-2 ${m.from === "kunde" ? "border-white/25" : "border-line"}`}>
                      {(m.anhaenge || []).map((a) => (
                        <a
                          key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 text-xs underline-offset-2 hover:underline ${m.from === "kunde" ? "text-white/90" : "text-accent-ink"}`}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{a.name}</span>
                          <span className="shrink-0 opacity-70">{kb(a.size)}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  <p className={`mt-1 text-[0.7rem] ${m.from === "kunde" ? "text-white/60" : "text-muted"}`}>
                    {m.from === "kunde" ? "Sie" : "Team"} · {datum(m.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {active.status === "geschlossen" ? (
            <p className="border-t border-line p-4 text-center text-sm text-muted sm:px-6">
              Dieses Ticket ist geschlossen. Für ein neues Anliegen legen Sie bitte ein neues Ticket an.
            </p>
          ) : (
            <form onSubmit={antworten} className="border-t border-line p-4 sm:px-6">
              <textarea
                value={reply} onChange={(e) => setReply(e.target.value)} rows={3}
                placeholder="Ihre Antwort …" maxLength={4000}
                className="w-full resize-none rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
              />
              <DateiWahl
                dateien={replyDateien}
                onAdd={(fl) => { const r = dateienPruefen(fl, replyDateien); typeof r === "string" ? setErr(r) : setReplyDateien(r); }}
                onRemove={(i) => setReplyDateien((d) => d.filter((_, x) => x !== i))}
              />
              <div className="mt-2.5 flex justify-end">
                <motion.button
                  type="submit" {...pressable} disabled={busy || (!reply.trim() && replyDateien.length === 0)}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-50 cursor-pointer"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Senden
                </motion.button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Neues Ticket ── */}
      {mode === "new" && (
        <form onSubmit={ticketAnlegen} className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMode("list")} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink cursor-pointer">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </button>
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">Neues Ticket</h3>
          <p className="mt-1 text-sm text-ink-soft">Kein Konto nötig. Sie bekommen eine Ticketnummer und bleiben in diesem Browser angemeldet.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="t-name" className={label}>Name</label><input id="t-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className={feld} /></div>
            <div><label htmlFor="t-mail" className={label}>E-Mail</label><input id="t-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={160} className={feld} /></div>
          </div>
          <div className="mt-4"><label htmlFor="t-subj" className={label}>Betreff</label><input id="t-subj" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={160} className={feld} /></div>

          <div className="mt-4">
            <span className={label}>Dringlichkeit</span>
            <div className="grid gap-2 sm:grid-cols-4">
              {PRIOS.map((p) => (
                <button
                  key={p.key} type="button" onClick={() => setPrio(p.key)} aria-pressed={prio === p.key}
                  className={`rounded-2xl border p-3 text-left transition-colors cursor-pointer ${prio === p.key ? "border-accent bg-accent-soft/45" : "border-line bg-canvas hover:border-line-strong"}`}
                >
                  <span className="block text-sm font-medium text-ink">{p.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="t-msg" className={label}>Ihr Anliegen</label>
            <textarea id="t-msg" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={4000} rows={5}
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-muted outline-none focus:border-accent"
              placeholder="Was ist passiert? Seit wann? Welches Gerät ist betroffen?" />
          </div>

          <DateiWahl
            dateien={dateien}
            onAdd={(fl) => { const r = dateienPruefen(fl, dateien); typeof r === "string" ? setErr(r) : setDateien(r); }}
            onRemove={(i) => setDateien((d) => d.filter((_, x) => x !== i))}
          />

          {/* Honeypot — für Menschen unsichtbar */}
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />

          <motion.button type="submit" {...pressable} disabled={busy}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer sm:w-auto">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Ticket absenden
          </motion.button>
        </form>
      )}

      {/* ── Übersicht ── */}
      {mode === "list" && (
        <>
          <div className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><LifeBuoy className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight">Ihre Tickets</h3>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {loading ? "wird geladen …" : tickets.length === 0 ? "In diesem Browser sind noch keine Tickets hinterlegt." : `${tickets.length} Ticket${tickets.length === 1 ? "" : "s"} in diesem Browser`}
                  </p>
                </div>
              </div>
              <motion.button type="button" {...pressable} onClick={() => setMode("new")}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
                <TicketIcon className="h-4 w-4" /> Neues Ticket
              </motion.button>
            </div>

            {loading ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Tickets werden geladen …</div>
            ) : tickets.length > 0 && (
              <ul className="mt-5 space-y-2">
                {tickets.map((t) => (
                  <li key={t.number}>
                    <button type="button" onClick={() => { setActive(t); setMode("view"); }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-canvas p-3.5 text-left transition-colors hover:border-line-strong cursor-pointer">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{t.subject}</span>
                        <span className="mt-0.5 block text-xs text-muted">{t.number} · {datum(t.updatedAt)}</span>
                      </span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${PRIO_STYLE[t.prio] || PRIO_STYLE.mittel}`}>{t.prioLabel}</span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[t.status] || STATUS_STYLE.offen}`}>{t.statusLabel}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {tickets.length > 0 && (
              <button type="button" onClick={abmelden}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline cursor-pointer">
                <LogOut className="h-3.5 w-3.5" /> Zugriff in diesem Browser entfernen
              </button>
            )}
          </div>

          {/* Manueller Zugang von einem anderen Gerät */}
          <div className="rounded-3xl border border-line bg-surface/60 p-5 sm:p-7">
            <button type="button" onClick={() => setManOffen(!manOffen)}
              className="flex w-full items-center justify-between gap-4 text-left cursor-pointer">
              <span>
                <span className="block font-display text-base font-semibold tracking-tight">Ticket von einem anderen Gerät öffnen</span>
                <span className="mt-0.5 block text-sm text-muted">Mit Ticketnummer und Zugriffscode aus der E-Mail</span>
              </span>
              <span className="shrink-0 text-muted">{manOffen ? "−" : "+"}</span>
            </button>
            {manOffen && (
              <form onSubmit={manuellOeffnen} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input value={manNummer} onChange={(e) => setManNummer(e.target.value)} placeholder="TK-XXXX-XXXX-XXXX" required className={`${feld} font-mono`} />
                <input value={manCode} onChange={(e) => setManCode(e.target.value)} placeholder="Zugriffscode" required className={`${feld} font-mono`} />
                <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink transition-colors hover:border-accent disabled:opacity-60 cursor-pointer">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Öffnen
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Datei-Auswahl ─────────────────────────── */

function DateiWahl({
  dateien, onAdd, onRemove,
}: {
  dateien: File[]; onAdd: (fl: FileList | null) => void; onRemove: (i: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent-ink cursor-pointer">
          <Paperclip className="h-3.5 w-3.5" /> Datei anhängen
        </button>
        <span className="text-xs text-muted">Bilder oder PDF, max. {MAX_DATEIEN} × {MAX_MB} MB</span>
      </div>
      <input ref={ref} type="file" accept={ERLAUBT} multiple className="hidden"
        onChange={(e) => { onAdd(e.target.files); if (ref.current) ref.current.value = ""; }} />
      {dateien.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {dateien.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2 text-xs">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
              <span className="shrink-0 text-muted">{kb(f.size)}</span>
              <button type="button" onClick={() => onRemove(i)} aria-label={`${f.name} entfernen`} className="shrink-0 text-muted hover:text-red-600 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
