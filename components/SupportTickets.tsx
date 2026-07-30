"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LifeBuoy, Send, Loader2, Check, Ticket as TicketIcon, ArrowLeft } from "lucide-react";
import { pressable } from "@/components/ui/motion";

type Msg = { from: "kunde" | "team"; text: string; createdAt: string };
type TicketView = { number: string; name: string; subject: string; status: string; statusLabel: string; createdAt: string; updatedAt: string; messages: Msg[] };
type Saved = { number: string; token: string };

const COOKIE = "sl_tickets";
const STATUS_STYLE: Record<string, string> = {
  offen: "bg-amber-100 text-amber-700",
  in_bearbeitung: "bg-sky-100 text-sky-700",
  beantwortet: "bg-emerald-100 text-emerald-700",
  geschlossen: "bg-surface-2 text-ink-soft",
};

// Cookie-Helfer: gespeicherte {number, token} des eigenen Browsers (1 Jahr).
function loadSaved(): Saved[] {
  if (typeof document === "undefined") return [];
  const m = document.cookie.match(/(?:^|;\s*)sl_tickets=([^;]+)/);
  if (!m) return [];
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return []; }
}
function persist(list: Saved[]) {
  const v = encodeURIComponent(JSON.stringify(list.slice(-20)));
  document.cookie = `${COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function SupportTickets() {
  const [mode, setMode] = useState<"list" | "new" | "view">("list");
  const [saved, setSaved] = useState<Saved[]>([]);
  const [active, setActive] = useState<{ view: TicketView; token: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Formularfelder (neues Ticket)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSaved(loadSaved()); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [active]);

  async function openTicket(number: string, token: string) {
    setLoading(true); setErr("");
    try {
      const r = await fetch(`/api/support?number=${encodeURIComponent(number)}&token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Nicht gefunden."); setLoading(false); return; }
      setActive({ view: d.ticket, token });
      setMode("view");
    } catch { setErr("Verbindungsfehler."); }
    setLoading(false);
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/support", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Konnte nicht erstellt werden."); setLoading(false); return; }
      const next = [...saved, { number: d.number, token: d.token }];
      setSaved(next); persist(next);
      setName(""); setEmail(""); setSubject(""); setMessage("");
      await openTicket(d.number, d.token);
    } catch { setErr("Verbindungsfehler."); }
    setLoading(false);
  }

  async function sendReply() {
    if (!active || !reply.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/support", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: active.view.number, token: active.token, text: reply.trim() }),
      });
      const d = await r.json();
      if (r.ok) { setActive({ view: d.ticket, token: active.token }); setReply(""); }
      else setErr(d.error || "Konnte nicht senden.");
    } catch { setErr("Verbindungsfehler."); }
    setLoading(false);
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted outline-none focus:border-accent focus:bg-surface";

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      {/* ── Übersicht ── */}
      {mode === "list" && (
        <>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent"><LifeBuoy className="h-6 w-6" /></span>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Support-Tickets</h2>
              <p className="text-sm text-muted">Stellen Sie eine Anfrage — Sie erhalten eine Ticketnummer und sehen jederzeit den Status.</p>
            </div>
          </div>

          {saved.length > 0 && (
            <div className="mt-6">
              <span className="eyebrow text-muted">Ihre Tickets auf diesem Gerät</span>
              <div className="mt-3 space-y-2">
                {saved.map((s) => (
                  <button key={s.number} onClick={() => openTicket(s.number, s.token)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-canvas px-4 py-3 text-left transition-colors hover:border-accent cursor-pointer">
                    <TicketIcon className="h-4 w-4 shrink-0 text-accent" />
                    <span className="font-mono text-sm font-semibold text-ink">{s.number}</span>
                    <span className="ml-auto text-xs text-accent">Öffnen →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {err && <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

          <motion.button {...pressable} onClick={() => { setErr(""); setMode("new"); }}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer">
            <Send className="h-4 w-4" /> Neues Ticket erstellen
          </motion.button>
        </>
      )}

      {/* ── Neues Ticket ── */}
      {mode === "new" && (
        <form onSubmit={createTicket} className="space-y-4">
          <button type="button" onClick={() => { setErr(""); setMode("list"); }} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink cursor-pointer"><ArrowLeft className="h-4 w-4" /> Zurück</button>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Neues Ticket</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block eyebrow text-muted">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={field} required /></div>
            <div><label className="mb-1.5 block eyebrow text-muted">E-Mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} required /></div>
          </div>
          <div><label className="mb-1.5 block eyebrow text-muted">Betreff</label><input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} required /></div>
          <div><label className="mb-1.5 block eyebrow text-muted">Ihr Anliegen</label><textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className={`${field} resize-none`} required /></div>
          <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <motion.button type="submit" {...pressable} disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Ticket absenden
          </motion.button>
        </form>
      )}

      {/* ── Ticketansicht ── */}
      {mode === "view" && active && (
        <div>
          <button type="button" onClick={() => { setErr(""); setMode("list"); }} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink cursor-pointer"><ArrowLeft className="h-4 w-4" /> Zurück</button>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-ink">{active.view.number}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[active.view.status] || "bg-surface-2 text-ink-soft"}`}>{active.view.statusLabel}</span>
          </div>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{active.view.subject}</h2>

          <div ref={scrollRef} className="mt-4 max-h-[min(24rem,50dvh)] space-y-3 overflow-y-auto overscroll-contain rounded-2xl bg-canvas/60 p-4">
            {active.view.messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "kunde" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.from === "kunde" ? "bg-accent text-white" : "border border-line bg-surface text-ink"}`}>
                  {m.from === "team" && <span className="mb-0.5 block text-xs font-semibold text-accent">STUDIO//LOKAL</span>}
                  <span className="whitespace-pre-wrap">{m.text}</span>
                  <span className={`mt-1 block text-right text-[10px] ${m.from === "kunde" ? "text-white/60" : "text-muted"}`}>{new Date(m.createdAt).toLocaleString("de-DE")}</span>
                </div>
              </div>
            ))}
          </div>

          {active.view.status !== "geschlossen" ? (
            <div className="mt-3 flex items-center gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendReply(); } }} placeholder="Antwort schreiben …" className={field} />
              <motion.button {...pressable} onClick={sendReply} disabled={loading} aria-label="Senden" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer"><Send className="h-4 w-4" /></motion.button>
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-muted">Dieses Ticket ist geschlossen. Erstellen Sie bei Bedarf ein neues.</p>
          )}
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}
