"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LifeBuoy, Loader2, Send, Trash2, Search, Paperclip, StickyNote, History, User, X, Maximize2 } from "lucide-react";

type Anhang = { name: string; url: string; mime: string; size: number };
type Msg = { id: string; from: "kunde" | "team"; text: string; createdAt: string; anhaenge?: Anhang[]; intern?: boolean };
type LogEintrag = { at: string; action: string; by: string };
type Ticket = {
  id: string; number: string; name: string; email: string; subject: string;
  status: string; statusLabel: string;
  prio: string; prioLabel: string; bearbeiter: string;
  messages: Msg[]; log: LogEintrag[]; createdAt: string; updatedAt: string;
};

const STATUSES = ["offen", "in_bearbeitung", "warten_kunde", "geloest", "geschlossen"] as const;
const BADGE: Record<string, string> = {
  offen: "bg-amber-100 text-amber-700",
  in_bearbeitung: "bg-sky-100 text-sky-700",
  warten_kunde: "bg-violet-100 text-violet-700",
  geloest: "bg-emerald-100 text-emerald-700",
  geschlossen: "bg-surface-2 text-ink-soft",
};
const LABEL: Record<string, string> = {
  offen: "Offen", in_bearbeitung: "In Bearbeitung", warten_kunde: "Warten auf Rückmeldung",
  geloest: "Gelöst", geschlossen: "Geschlossen",
};
const PRIOS = ["niedrig", "mittel", "hoch", "dringend"] as const;
const PRIO_LABEL: Record<string, string> = { niedrig: "Niedrig", mittel: "Mittel", hoch: "Hoch", dringend: "Dringend" };
// Dringende Tickets sollen im Stapel sofort ins Auge fallen.
const PRIO_BADGE: Record<string, string> = {
  niedrig: "border-line-strong text-muted",
  mittel: "border-sky-300 text-sky-700",
  hoch: "border-amber-400 text-amber-700",
  dringend: "border-red-400 bg-red-50 text-red-700",
};
const PRIO_RANG: Record<string, number> = { dringend: 0, hoch: 1, mittel: 2, niedrig: 3 };
const kb = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export default function SupportPanel() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);
  const [verlaufOffen, setVerlaufOffen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"alle" | (typeof STATUSES)[number]>("alle");
  const [prioFilter, setPrioFilter] = useState<"alle" | (typeof PRIOS)[number]>("alle");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/support", { cache: "no-store" });
    if (r.ok) setTickets((await r.json()).tickets);
  }, []);
  // Initial laden + alle 5 s auf neue Kundennachrichten prüfen (Polling) —
  // vorher blieb ein offenes Ticket stehen, bis man die Seite neu lud.
  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [openId, tickets]);

  // Beim Wechsel des Tickets angefangene Eingaben verwerfen — sonst landete
  // eine halb getippte Antwort versehentlich beim nächsten Kunden.
  useEffect(() => { setReply(""); setNotiz(""); setVerlaufOffen(null); }, [openId]);

  // Escape schließt das Fenster (erwartetes Verhalten bei Dialogen). Der
  // Listener hängt nur, solange wirklich eines offen ist.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  async function sendReply(t: Ticket) {
    const text = reply.trim();
    if (!text) return;
    setBusy(true);
    await fetch("/api/admin/support", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, reply: text }),
    });
    setReply("");
    setBusy(false);
    load();
  }
  async function notizSpeichern(t: Ticket) {
    const text = notiz.trim();
    if (!text) return;
    setBusy(true);
    await fetch("/api/admin/support", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, notiz: text }),
    });
    setNotiz("");
    setBusy(false);
    load();
  }
  // Ein Weg fuer alle Feldaenderungen (Status, Prioritaet, Zuweisung).
  async function patch(t: Ticket, daten: Record<string, string>) {
    await fetch("/api/admin/support", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, ...daten }),
    });
    load();
  }
  async function del(t: Ticket) {
    if (!confirm(`Ticket ${t.number} endgültig löschen?`)) return;
    await fetch(`/api/admin/support?id=${t.id}`, { method: "DELETE" });
    if (openId === t.id) setOpenId(null);
    load();
  }

  if (!tickets) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const q = search.trim().toLowerCase();
  const shown = tickets
    .filter((t) => (filter === "alle" ? true : t.status === filter))
    .filter((t) => (prioFilter === "alle" ? true : t.prio === prioFilter))
    .filter((t) => !q || t.number.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
    // Offene und dringende zuerst, Abgeschlossene nach unten.
    .sort((a, b) => {
      const fertig = (t: Ticket) => (t.status === "geschlossen" || t.status === "geloest" ? 1 : 0);
      return (
        fertig(a) - fertig(b) ||
        (PRIO_RANG[a.prio] ?? 9) - (PRIO_RANG[b.prio] ?? 9) ||
        b.updatedAt.localeCompare(a.updatedAt)
      );
    });
  const openTicket = openId ? tickets.find((t) => t.id === openId) ?? null : null;
  const openCount = tickets.filter((t) => t.status === "offen").length;
  const dringend = tickets.filter((t) => t.prio === "dringend" && t.status !== "geschlossen" && t.status !== "geloest").length;
  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><LifeBuoy className="h-5 w-5 text-accent" /> Support-Tickets</h2>
          <p className="text-sm text-muted">
            {tickets.length} gesamt · {openCount} offen
            {dringend > 0 && <span className="font-medium text-red-600"> · {dringend} dringend</span>}
            {" "}— Kundenanfragen von /support
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2">
            <Search className="h-4 w-4 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nummer, Betreff, Name…" className="w-36 bg-transparent text-sm text-ink placeholder:text-muted outline-none sm:w-52" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-full border border-line bg-surface p-1">
        {(["alle", ...STATUSES] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${filter === f ? "bg-accent text-white" : "text-ink-soft hover:bg-canvas"}`}>
            {f === "alle" ? "alle" : LABEL[f]}
          </button>
        ))}
      </div>

      {/* Zweite Filterzeile: nach Dringlichkeit */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-muted">Priorität:</span>
        {(["alle", ...PRIOS] as const).map((p) => (
          <button
            key={p} onClick={() => setPrioFilter(p)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              prioFilter === p ? "border-accent bg-accent text-white" : `bg-surface ${PRIO_BADGE[p] || "border-line-strong text-ink-soft"}`
            }`}
          >
            {p === "alle" ? "alle" : PRIO_LABEL[p]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Keine Tickets{filter !== "alle" ? ` (${LABEL[filter]})` : ""}.</div>
      ) : (
        /* Kompakte Liste — ein Klick öffnet das Ticket als großes Fenster.
           Vorher klappte der Verlauf inline auf, wodurch die Seite bei langen
           Gesprächen unübersichtlich wurde und man viel scrollen musste. */
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          {shown.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setOpenId(t.id)}
              className={`flex w-full flex-wrap items-center gap-2 p-4 text-left transition-colors hover:bg-canvas/70 cursor-pointer ${i > 0 ? "border-t border-line" : ""}`}
            >
              <span className="font-mono text-xs font-semibold text-ink">{t.number}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${PRIO_BADGE[t.prio] || PRIO_BADGE.mittel}`}>{t.prioLabel}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[t.status] || BADGE.offen}`}>{t.statusLabel}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{t.subject}</span>
              {t.messages.some((m) => (m.anhaenge || []).length > 0) && <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" />}
              {t.bearbeiter && <span className="hidden shrink-0 items-center gap-1 text-xs text-muted sm:flex"><User className="h-3 w-3" />{t.bearbeiter}</span>}
              <span className="hidden text-xs text-muted sm:block">{t.name} · {new Date(t.updatedAt).toLocaleDateString("de-DE")}</span>
              <Maximize2 className="h-3.5 w-3.5 shrink-0 text-muted" />
            </button>
          ))}
        </div>
      )}

      {/* ── Großes Ticket-Fenster ──
          Aufbau wie beim Benutzer-Modal: fester Kopf, scrollender Rumpf,
          fester Fuß. Ohne diese Dreiteilung wäre der Rumpf bei langen
          Gesprächen nicht erreichbar (derselbe Fehler, der beim
          Benutzer-Modal schon einmal behoben werden musste). */}
      {openTicket && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-ink/60 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setOpenId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Ticket ${openTicket.number}`}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_40px_100px_-30px_rgba(33,28,23,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kopf */}
            <div className="flex items-start gap-4 border-b border-line bg-night p-5 text-canvas sm:px-7">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent"><LifeBuoy className="h-5 w-5 text-white" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-white/70">{openTicket.number}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${PRIO_BADGE[openTicket.prio] || PRIO_BADGE.mittel}`}>{openTicket.prioLabel}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[openTicket.status] || BADGE.offen}`}>{openTicket.statusLabel}</span>
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">{openTicket.subject}</h3>
                <p className="mt-0.5 truncate text-xs text-white/60">
                  {openTicket.name} · <a href={`mailto:${openTicket.email}`} className="underline-offset-2 hover:underline">{openTicket.email}</a>
                  {" · angelegt "}{new Date(openTicket.createdAt).toLocaleString("de-DE")}
                </p>
              </div>
              <button
                type="button" onClick={() => setOpenId(null)} aria-label="Fenster schließen"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Rumpf: Gesprächsverlauf */}
            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain bg-canvas/60 p-4 sm:p-6">
              {openTicket.messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "team" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.intern
                      ? "border border-dashed border-amber-400 bg-amber-50 text-ink"
                      : m.from === "team" ? "bg-accent text-white" : "border border-line bg-surface text-ink"
                  }`}>
                    <span className={`mb-0.5 flex items-center gap-1 text-xs font-semibold ${
                      m.intern ? "text-amber-700" : m.from === "team" ? "text-white/80" : "text-accent"
                    }`}>
                      {m.intern && <StickyNote className="h-3 w-3" />}
                      {m.intern ? "Interne Notiz — für den Kunden unsichtbar" : m.from === "team" ? "Team" : openTicket.name}
                    </span>
                    <span className="whitespace-pre-wrap break-words">{m.text}</span>
                    {(m.anhaenge || []).length > 0 && (
                      <span className={`mt-1.5 block border-t pt-1.5 ${m.from === "team" && !m.intern ? "border-white/25" : "border-line"}`}>
                        {(m.anhaenge || []).map((a) => (
                          <a
                            key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-xs underline-offset-2 hover:underline ${m.from === "team" && !m.intern ? "text-white/90" : "text-accent-ink"}`}
                          >
                            <Paperclip className="h-3 w-3 shrink-0" />
                            <span className="truncate">{a.name}</span>
                            <span className="shrink-0 opacity-70">{kb(a.size)}</span>
                          </a>
                        ))}
                      </span>
                    )}
                    <span className={`mt-0.5 block text-right text-[10px] ${m.from === "team" && !m.intern ? "text-white/60" : "text-muted"}`}>{new Date(m.createdAt).toLocaleString("de-DE")}</span>
                  </div>
                </div>
              ))}

              {verlaufOffen === openTicket.id && (
                <ul className="mt-3 space-y-1.5 rounded-2xl border border-line bg-surface p-3 text-xs">
                  <li className="mb-1 font-semibold text-ink">Bearbeitungsverlauf</li>
                  {openTicket.log.length === 0 && <li className="text-muted">Kein Verlauf vorhanden.</li>}
                  {[...openTicket.log].reverse().map((l, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-ink-soft">
                      <span className="tabular-nums text-muted">{new Date(l.at).toLocaleString("de-DE")}</span>
                      <span>{l.action}</span>
                      <span className="text-muted">· {l.by}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Fuß: Antworten und Verwalten */}
            <div className="border-t border-line p-4 sm:px-6">
              <div className="flex items-center gap-2">
                <input
                  value={reply} onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendReply(openTicket); } }}
                  placeholder="Antwort an den Kunden…" className={field}
                />
                <button onClick={() => sendReply(openTicket)} disabled={busy} aria-label="Antwort senden" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>

              {/* Interne Notiz — landet nie im Kundenverlauf */}
              <div className="mt-2.5 flex items-center gap-2">
                <input
                  value={notiz} onChange={(e) => setNotiz(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); notizSpeichern(openTicket); } }}
                  placeholder="Interne Notiz (nur fürs Team sichtbar)…"
                  className="w-full rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-2.5 text-sm text-ink outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => notizSpeichern(openTicket)} disabled={busy} aria-label="Notiz speichern"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-300 text-amber-700 hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
                >
                  <StickyNote className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted">Priorität</span>
                  <select
                    value={openTicket.prio} onChange={(e) => patch(openTicket, { prio: e.target.value })}
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent cursor-pointer"
                  >
                    {PRIOS.map((p) => <option key={p} value={p}>{PRIO_LABEL[p]}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted">Zugewiesen an</span>
                  <input
                    key={openTicket.bearbeiter}
                    defaultValue={openTicket.bearbeiter}
                    onBlur={(e) => { if (e.target.value.trim() !== openTicket.bearbeiter) patch(openTicket, { bearbeiter: e.target.value }); }}
                    placeholder="niemand"
                    className="h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {STATUSES.filter((s) => s !== openTicket.status).map((s) => (
                  <button key={s} onClick={() => patch(openTicket, { status: s })} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink hover:border-ink cursor-pointer">→ {LABEL[s]}</button>
                ))}
                <button
                  onClick={() => setVerlaufOffen(verlaufOffen === openTicket.id ? null : openTicket.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink hover:border-ink cursor-pointer"
                >
                  <History className="h-3.5 w-3.5" /> Verlauf
                </button>
                <button onClick={() => del(openTicket)} className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Löschen</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
