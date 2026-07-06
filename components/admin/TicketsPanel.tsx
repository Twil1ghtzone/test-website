"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Check, X } from "lucide-react";

type Ticket = { id: string; title: string; description: string; priority: "niedrig" | "mittel" | "hoch"; status: "offen" | "in_arbeit" | "erledigt"; assignee: string; createdBy: string; createdAt: string; updatedAt: string };

const PRIO = { niedrig: "bg-surface-2 text-ink-soft", mittel: "bg-amber-100 text-amber-700", hoch: "bg-red-100 text-red-700" } as const;
const STATUS_LABEL = { offen: "offen", in_arbeit: "in Arbeit", erledigt: "erledigt" } as const;

export default function TicketsPanel() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/tickets", { cache: "no-store" });
    if (r.ok) setTickets((await r.json()).tickets);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Ticket["status"]) {
    await fetch("/api/admin/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }
  async function del(t: Ticket) {
    if (!confirm(`Ticket „${t.title}" löschen?`)) return;
    await fetch(`/api/admin/tickets?id=${t.id}`, { method: "DELETE" });
    load();
  }

  if (!tickets) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const cols: Ticket["status"][] = ["offen", "in_arbeit", "erledigt"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">Tickets</h2>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-ink cursor-pointer"><Plus className="h-4 w-4" /> Neues Ticket</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((col) => (
          <div key={col} className="rounded-3xl border border-line bg-surface p-4">
            <h3 className="eyebrow text-muted">{STATUS_LABEL[col]} · {tickets.filter((t) => t.status === col).length}</h3>
            <div className="mt-3 space-y-3">
              {tickets.filter((t) => t.status === col).map((t) => (
                <div key={t.id} className="rounded-2xl border border-line bg-canvas p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-ink">{t.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIO[t.priority]}`}>{t.priority}</span>
                  </div>
                  {t.description && <p className="mt-1.5 line-clamp-3 text-sm text-ink-soft">{t.description}</p>}
                  <p className="mt-2 text-xs text-muted">{t.assignee ? `→ ${t.assignee} · ` : ""}von {t.createdBy} · {new Date(t.createdAt).toLocaleDateString("de-DE")}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cols.filter((s) => s !== t.status).map((s) => (
                      <button key={s} onClick={() => setStatus(t.id, s)} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink hover:border-ink cursor-pointer">→ {STATUS_LABEL[s]}</button>
                    ))}
                    <button onClick={() => del(t)} aria-label="Löschen" className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
              {tickets.filter((t) => t.status === col).length === 0 && <p className="py-4 text-center text-sm text-muted">—</p>}
            </div>
          </div>
        ))}
      </div>

      {showNew && <NewTicket onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function NewTicket({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Ticket["priority"]>("mittel");
  const [assignee, setAssignee] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, priority, assignee }) });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    onSaved();
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold tracking-tight">Neues Ticket</h3>
          <button onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="mt-5 space-y-4">
          <div><label className={lbl}>Titel</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={field} required /></div>
          <div><label className={lbl}>Beschreibung</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} resize-none`} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Priorität</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Ticket["priority"])} className={`${field} cursor-pointer`}>
                <option value="niedrig">niedrig</option><option value="mittel">mittel</option><option value="hoch">hoch</option>
              </select>
            </div>
            <div><label className={lbl}>Zuständig (optional)</label><input value={assignee} onChange={(e) => setAssignee(e.target.value)} className={field} /></div>
          </div>
          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Erstellen
          </button>
        </form>
      </div>
    </div>
  );
}
