"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Check, X } from "lucide-react";

type Order = { id: string; customer: string; title: string; status: "angefragt" | "geplant" | "in_arbeit" | "abgeschlossen"; value: number; notes: string; createdAt: string; updatedAt: string };

const STATUSES: Order["status"][] = ["angefragt", "geplant", "in_arbeit", "abgeschlossen"];
const BADGE = { angefragt: "bg-surface-2 text-ink-soft", geplant: "bg-sky-100 text-sky-700", in_arbeit: "bg-amber-100 text-amber-700", abgeschlossen: "bg-emerald-100 text-emerald-700" } as const;
const LABEL = { angefragt: "angefragt", geplant: "geplant", in_arbeit: "in Arbeit", abgeschlossen: "abgeschlossen" } as const;
const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [edit, setEdit] = useState<Order | "new" | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/orders", { cache: "no-store" });
    if (r.ok) setOrders((await r.json()).orders);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(o: Order) {
    if (!confirm(`Auftrag „${o.title}" löschen?`)) return;
    await fetch(`/api/admin/orders?id=${o.id}`, { method: "DELETE" });
    load();
  }
  async function setStatus(id: string, status: Order["status"]) {
    await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }

  if (!orders) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const active = orders.filter((o) => o.status !== "abgeschlossen");
  const pipeline = active.reduce((s, o) => s + o.value, 0);
  const done = orders.filter((o) => o.status === "abgeschlossen").reduce((s, o) => s + o.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Aufträge</h2>
          <p className="text-sm text-muted">{active.length} aktiv · Pipeline {eur(pipeline)} · abgeschlossen {eur(done)}</p>
        </div>
        <button onClick={() => setEdit("new")} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-ink cursor-pointer"><Plus className="h-4 w-4" /> Neuer Auftrag</button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Noch keine Aufträge.</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          {orders.map((o, i) => (
            <div key={o.id} className={`p-4 ${i > 0 ? "border-t border-line" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{o.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[o.status]}`}>{LABEL[o.status]}</span>
                <span className="ml-auto font-display font-semibold text-ink">{eur(o.value)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{o.customer}{o.notes ? ` · ${o.notes.slice(0, 100)}` : ""}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {STATUSES.filter((s) => s !== o.status).map((s) => (
                  <button key={s} onClick={() => setStatus(o.id, s)} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink hover:border-ink cursor-pointer">→ {LABEL[s]}</button>
                ))}
                <button onClick={() => setEdit(o)} aria-label="Bearbeiten" className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink cursor-pointer"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(o)} aria-label="Löschen" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && <OrderModal order={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function OrderModal({ order, onClose, onSaved }: { order: Order | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !order;
  const [customer, setCustomer] = useState(order?.customer ?? "");
  const [title, setTitle] = useState(order?.title ?? "");
  const [value, setValue] = useState(order?.value ?? 0);
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const payload = { customer, title, value, notes };
    const r = isNew
      ? await fetch("/api/admin/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: order!.id, ...payload }) });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    onSaved();
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold tracking-tight">{isNew ? "Neuer Auftrag" : "Auftrag bearbeiten"}</h3>
          <button onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="mt-5 space-y-4">
          <div><label className={lbl}>Kunde</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} className={field} required /></div>
          <div><label className={lbl}>Titel / Leistung</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={field} required /></div>
          <div><label className={lbl}>Auftragswert (€)</label><input type="number" min={0} step={0.01} value={value} onChange={(e) => setValue(+e.target.value)} className={field} /></div>
          <div><label className={lbl}>Notizen</label><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${field} resize-none`} /></div>
          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Speichern
          </button>
        </form>
      </div>
    </div>
  );
}
