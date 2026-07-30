"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LifeBuoy, Loader2, Send, Trash2, Search, Mail } from "lucide-react";

type Msg = { id: string; from: "kunde" | "team"; text: string; createdAt: string };
type Ticket = {
  id: string; number: string; name: string; email: string; subject: string;
  status: "offen" | "in_bearbeitung" | "beantwortet" | "geschlossen";
  statusLabel: string; messages: Msg[]; createdAt: string; updatedAt: string;
};

const STATUSES = ["offen", "in_bearbeitung", "beantwortet", "geschlossen"] as const;
const BADGE: Record<string, string> = {
  offen: "bg-amber-100 text-amber-700",
  in_bearbeitung: "bg-sky-100 text-sky-700",
  beantwortet: "bg-emerald-100 text-emerald-700",
  geschlossen: "bg-surface-2 text-ink-soft",
};
const LABEL: Record<string, string> = {
  offen: "Offen", in_bearbeitung: "In Bearbeitung", beantwortet: "Beantwortet", geschlossen: "Geschlossen",
};

export default function SupportPanel() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"alle" | (typeof STATUSES)[number]>("alle");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/support", { cache: "no-store" });
    if (r.ok) setTickets((await r.json()).tickets);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [openId, tickets]);

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
  async function setStatus(t: Ticket, status: string) {
    await fetch("/api/admin/support", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, status }),
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
    .filter((t) => !q || t.number.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q));
  const openCount = tickets.filter((t) => t.status === "offen").length;
  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><LifeBuoy className="h-5 w-5 text-accent" /> Support-Tickets</h2>
          <p className="text-sm text-muted">{tickets.length} gesamt · {openCount} offen — Kundenanfragen von /support</p>
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

      {shown.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Keine Tickets{filter !== "alle" ? ` (${LABEL[filter]})` : ""}.</div>
      ) : (
        <div className="space-y-3">
          {shown.map((t) => {
            const isOpen = openId === t.id;
            return (
              <div key={t.id} className="overflow-hidden rounded-3xl border border-line bg-surface">
                <button onClick={() => setOpenId(isOpen ? null : t.id)} className="flex w-full flex-wrap items-center gap-2 p-4 text-left cursor-pointer">
                  <span className="font-mono text-sm font-semibold text-ink">{t.number}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[t.status]}`}>{t.statusLabel}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{t.subject}</span>
                  <span className="hidden text-xs text-muted sm:block">{t.name} · {new Date(t.updatedAt).toLocaleDateString("de-DE")}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-line p-4">
                    <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-ink cursor-pointer">
                      <Mail className="h-3.5 w-3.5" /> {t.email}
                    </a>

                    <div ref={scrollRef} className="mt-3 max-h-[min(22rem,50dvh)] space-y-2.5 overflow-y-auto overscroll-contain rounded-2xl bg-canvas/60 p-3">
                      {t.messages.map((m) => (
                        <div key={m.id} className={`flex ${m.from === "team" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.from === "team" ? "bg-accent text-white" : "border border-line bg-surface text-ink"}`}>
                            <span className={`mb-0.5 block text-xs font-semibold ${m.from === "team" ? "text-white/80" : "text-accent"}`}>{m.from === "team" ? "Team" : t.name}</span>
                            <span className="whitespace-pre-wrap">{m.text}</span>
                            <span className={`mt-0.5 block text-right text-[10px] ${m.from === "team" ? "text-white/60" : "text-muted"}`}>{new Date(m.createdAt).toLocaleString("de-DE")}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendReply(t); } }} placeholder="Antwort an den Kunden…" className={field} />
                      <button onClick={() => sendReply(t)} disabled={busy} aria-label="Antwort senden" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {STATUSES.filter((s) => s !== t.status).map((s) => (
                        <button key={s} onClick={() => setStatus(t, s)} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink hover:border-ink cursor-pointer">→ {LABEL[s]}</button>
                      ))}
                      <button onClick={() => del(t)} className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Löschen</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
